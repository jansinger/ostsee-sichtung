import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
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

describe('app.js', () => {
	it('startet und meldet Port und Datenverzeichnis', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-app-'));
		const { ausgabe } = await starte({ LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' });

		expect(ausgabe).toContain('lauscht auf Port');
		expect(ausgabe).toContain(verzeichnis);

		await rm(verzeichnis, { recursive: true, force: true });
	});

	it('bricht ohne LEGACY_INBOX_DATA_DIR mit klarer Meldung ab', async () => {
		const { ausgabe, code } = await starte({ LEGACY_INBOX_DATA_DIR: '' });

		expect(code).not.toBe(0);
		expect(ausgabe).toContain('LEGACY_INBOX_DATA_DIR');
	});
});
