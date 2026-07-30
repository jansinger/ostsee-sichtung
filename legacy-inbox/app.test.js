import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WURZEL = path.dirname(fileURLToPath(import.meta.url));

function starte(umgebung) {
	return new Promise((fertig) => {
		const prozess = spawn(process.execPath, [path.join(WURZEL, 'app.js')], {
			env: { ...process.env, ...umgebung }
		});
		let ausgabe = '';
		prozess.stdout.on('data', (d) => {
			ausgabe += d;
			// Beide Zeilen abwarten, nicht nur die erste: console.log-Aufrufe
			// werden vom Betriebssystem-Pipe nicht garantiert in einem
			// gemeinsamen 'data'-Ereignis ausgeliefert — ein Kill direkt nach
			// der ersten Zeile wäre ein rassebehafteter Fehlschlag.
			if (ausgabe.includes('lauscht auf Port') && ausgabe.includes('Datenverzeichnis:')) {
				prozess.kill();
				fertig({ ausgabe, code: 0 });
			}
		});
		prozess.stderr.on('data', (d) => (ausgabe += d));
		prozess.on('exit', (code) => fertig({ ausgabe, code }));
	});
}

/**
 * Lädt app.js so, wie Phusion Passenger es auf dem Plesk-Server tut: per
 * `require()` aus einem CJS-Kontext heraus
 * (`/usr/share/passenger/helper-scripts/node-loader.js`).
 *
 * Dieser Ladeweg unterscheidet sich vom direkten `node app.js` in genau einem
 * Punkt, und der hat den Dienst beim ersten Deploy am Starten gehindert: Node
 * lädt ESM aus CJS nur, wenn der Modulgraph kein Top-Level-`await` enthält.
 * Sonst gibt es ERR_REQUIRE_ASYNC_MODULE, bevor eigener Code läuft — und
 * `node app.js` allein hätte das nie gezeigt.
 */
function starteWiePassenger(umgebung) {
	return new Promise((fertig) => {
		const prozess = spawn(
			process.execPath,
			[
				'--input-type=commonjs',
				'-e',
				`require(${JSON.stringify(path.join(WURZEL, 'app.js'))});` +
					'setTimeout(() => process.exit(0), 2000);'
			],
			{ env: { ...process.env, ...umgebung } }
		);
		let ausgabe = '';
		prozess.stdout.on('data', (d) => (ausgabe += d));
		prozess.stderr.on('data', (d) => (ausgabe += d));
		prozess.on('exit', (code) => fertig({ ausgabe, code }));
	});
}

describe('app.js', () => {
	it('lässt sich laden, wie Passenger es lädt', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-passenger-'));
		const { ausgabe } = await starteWiePassenger({
			LEGACY_INBOX_DATA_DIR: verzeichnis,
			PORT: '0'
		});

		expect(ausgabe).not.toContain('ERR_REQUIRE_ASYNC_MODULE');
		expect(ausgabe).toContain('lauscht auf Port');

		await rm(verzeichnis, { recursive: true, force: true });
	}, 20_000);

	it('startet und meldet Port und Datenverzeichnis', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-app-'));
		const { ausgabe } = await starte({ LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' });

		expect(ausgabe).toContain('lauscht auf Port');
		expect(ausgabe).toContain(verzeichnis);

		await rm(verzeichnis, { recursive: true, force: true });
	});

	// Als root greifen Dateirechte nicht — die Prüfung wäre dann nie rot.
	it.skipIf(process.getuid?.() === 0)(
		'bricht ab, wenn das Datenverzeichnis nicht beschreibbar ist',
		async () => {
			const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-ro-'));
			// Die Unterverzeichnisse existieren bereits — genau der Fall, in dem
			// mkdir(..., { recursive: true }) Erfolg meldet, obwohl kein Schreiben
			// mehr möglich ist (Rechte nach einem Plesk-Update).
			for (const unter of ['posteingang', 'abgewiesen', 'importiert']) {
				await mkdir(path.join(verzeichnis, unter), { recursive: true });
				await chmod(path.join(verzeichnis, unter), 0o500);
			}

			const { ausgabe, code } = await starte({
				LEGACY_INBOX_DATA_DIR: verzeichnis,
				PORT: '0'
			});

			expect(code).not.toBe(0);
			expect(ausgabe).toContain('nicht beschreibbar');
			expect(ausgabe).toContain(verzeichnis);

			for (const unter of ['posteingang', 'abgewiesen', 'importiert']) {
				await chmod(path.join(verzeichnis, unter), 0o700);
			}
			await rm(verzeichnis, { recursive: true, force: true });
		}
	);

	it('bricht ohne LEGACY_INBOX_DATA_DIR mit klarer Meldung ab', async () => {
		const { ausgabe, code } = await starte({ LEGACY_INBOX_DATA_DIR: '' });

		expect(code).not.toBe(0);
		expect(ausgabe).toContain('LEGACY_INBOX_DATA_DIR');
	});
});
