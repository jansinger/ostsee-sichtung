import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WURZEL = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(WURZEL, 'app.js');

/**
 * Budget für einen Kindprozess. Überschreitet er es, meldet der Helfer selbst
 * einen Fehler — mit der bis dahin gesammelten Ausgabe. Das ist der Unterschied
 * zwischen „app.js hat sich nach 45 s nicht beendet, Ausgabe war: …" und dem
 * nackten `Test timed out in 5000ms`, das wie eine Regression des eigenen Diffs
 * aussieht, obwohl `legacy-inbox/` nichts aus `src/` importiert.
 *
 * Die Zahl ist gemessen, nicht geraten (2026-08-02, macOS 26/Node 24, unter
 * vollem `npm run test:unit`): Das Prozessende trat spätestens nach 15,1 s ein.
 * 45 s sind das Dreifache und damit Reserve, keine Erwartung — im Normalfall
 * wartet hier niemand, siehe `fertigWenn` unten.
 */
const PROZESS_BUDGET_MS = 45_000;
const TEST_TIMEOUT_MS = PROZESS_BUDGET_MS + 5_000;

/**
 * Startet einen Kindprozess und sammelt stdout und stderr.
 *
 * **Warum `fertigWenn` existiert.** Wer nur die Ausgabe prüft, darf nicht auf
 * das Prozessende warten. Ein Prozess, der `node:http` geladen hat — jedes
 * `app.js`, das bis zum Server kommt —, braucht auf dieser Plattform nach
 * `process.exit()` noch 0,4 bis 15 s, bis das Betriebssystem ihn abräumt. Der
 * JavaScript-Teil ist dabei längst fertig: gemessen steht die erwartete Ausgabe
 * nach ~90 ms, der `exit`-Handler des Kindes läuft nach ~16 ms, und die
 * restliche Zeit vergeht in der nativen Abbau-Phase (praktisch ohne CPU-Last,
 * mit der Systemlast wachsend). Ursache ist das Laden von `node:http`/`node:tls`
 * allein — ohne diesen Import beendet sich derselbe Prozess in ~35 ms.
 *
 * Genau daran hingen die sporadischen Timeouts: Nicht der Start war langsam,
 * sondern das Sterben, und die Tests warteten darauf, obwohl ihr Beweis
 * längst vorlag. Wer `fertigWenn` angibt, wartet deshalb auf das Signal in der
 * Ausgabe und beendet den Prozess danach selbst (SIGTERM räumt sofort ab, ohne
 * die Abbau-Phase). Nur wer den Exit-Code prüft, wartet auf `exit` — dafür
 * gibt es kein früheres Signal, das Betriebssystem meldet den Status erst dann.
 *
 * @param {object} optionen
 * @param {string[]} optionen.argumente Argumente für `node`.
 * @param {Record<string, string>} optionen.umgebung Zusätzliche Umgebungsvariablen.
 * @param {(ausgabe: string) => boolean} [optionen.fertigWenn] Abbruchsignal auf
 *   der gesammelten Ausgabe. Ohne Angabe wird auf das Prozessende gewartet.
 * @returns {Promise<{ ausgabe: string, code: number | null }>} `code` ist `null`,
 *   wenn `fertigWenn` gegriffen hat — dann wurde der Prozess beendet, statt sich
 *   selbst zu beenden.
 */
function fuehreAus({ argumente, umgebung, fertigWenn }) {
	return new Promise((erfuelle, lehneAb) => {
		const prozess = spawn(process.execPath, argumente, {
			env: { ...process.env, ...umgebung }
		});
		let ausgabe = '';
		let erledigt = false;

		const wecker = setTimeout(() => {
			if (erledigt) return;
			erledigt = true;
			prozess.kill('SIGKILL');
			lehneAb(
				new Error(
					`app.js hat sich nach ${PROZESS_BUDGET_MS} ms nicht beendet. ` +
						`Ausgabe bis dahin: ${ausgabe.trim() ? JSON.stringify(ausgabe.trim()) : '(keine)'}`
				)
			);
		}, PROZESS_BUDGET_MS);
		// Ein hängengebliebener Timer soll den Worker nicht offenhalten.
		wecker.unref?.();

		const beende = (wert) => {
			if (erledigt) return;
			erledigt = true;
			clearTimeout(wecker);
			erfuelle(wert);
		};

		/*
		 * Ohne diesen Handler bliebe ein fehlgeschlagener spawn (unter Last etwa
		 * EAGAIN) unbeantwortet: Node meldet dann 'error', und 'exit' folgt laut
		 * Dokumentation nicht zwingend. Die Promise würde nie erfüllt, und der
		 * Test liefe in den generischen Timeout statt in eine lesbare Meldung.
		 */
		prozess.on('error', (fehler) => {
			if (erledigt) return;
			erledigt = true;
			clearTimeout(wecker);
			lehneAb(new Error(`app.js ließ sich nicht starten: ${fehler.message}`));
		});

		const pruefeSignal = () => {
			if (!erledigt && fertigWenn?.(ausgabe)) {
				prozess.kill();
				beende({ ausgabe, code: null });
			}
		};
		// setEncoding statt Buffer-Konkatenation: Sonst zerfällt ein Umlaut, der
		// genau auf eine Chunk-Grenze fällt. Die geprüften Teilstrings sind
		// umlautfrei, die Meldungen aus startPruefung.js („prüfen", „größerer")
		// nicht — und die stehen im Diagnosetext des Budget-Fehlers.
		prozess.stdout.setEncoding('utf8');
		prozess.stderr.setEncoding('utf8');
		prozess.stdout.on('data', (daten) => {
			ausgabe += daten;
			pruefeSignal();
		});
		prozess.stderr.on('data', (daten) => {
			ausgabe += daten;
			pruefeSignal();
		});
		// 'close' statt 'exit': Erst dann sind stdout und stderr sicher am Ende.
		// Bei 'exit' dürfen sie laut Node-Doku noch offen sein — für die beiden
		// Tests, die Ausgabe *und* Exit-Code zusichern, wäre das die falsche
		// Kante. app.js startet keinen Enkelprozess, der die Pipes offenhielte.
		prozess.on('close', (code) => beende({ ausgabe, code }));
	});
}

function starte({ umgebung, fertigWenn }) {
	return fuehreAus({ argumente: [APP], umgebung, fertigWenn });
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
 *
 * Das `setTimeout` im Kind ist die Notbremse für den Fall, dass der Start
 * weder die erwartete Zeile ausgibt noch abbricht: Dann endet der Prozess von
 * selbst, und der Test scheitert an der Ausgabe statt am Budget.
 */
function starteWiePassenger({ umgebung, fertigWenn }) {
	return fuehreAus({
		argumente: [
			'--input-type=commonjs',
			'-e',
			`require(${JSON.stringify(APP)});setTimeout(() => process.exit(0), 2000);`
		],
		umgebung,
		fertigWenn
	});
}

describe('app.js', { timeout: TEST_TIMEOUT_MS }, () => {
	it('lässt sich laden, wie Passenger es lädt', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-passenger-'));
		const { ausgabe } = await starteWiePassenger({
			umgebung: { LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' },
			fertigWenn: (bisher) => bisher.includes('lauscht auf Port')
		});

		expect(ausgabe).not.toContain('ERR_REQUIRE_ASYNC_MODULE');
		expect(ausgabe).toContain('lauscht auf Port');

		await rm(verzeichnis, { recursive: true, force: true });
	});

	it('startet und meldet Port und Datenverzeichnis', async () => {
		const verzeichnis = await mkdtemp(path.join(tmpdir(), 'inbox-app-'));
		const { ausgabe } = await starte({
			umgebung: { LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' },
			// Auf den Pfad warten, nicht nur auf das Label davor: Zugesichert wird
			// unten `verzeichnis`, und der steht erst in der zweiten Zeile. Ein
			// Signal, das schon bei „Datenverzeichnis:" greift, könnte den Prozess
			// beenden, bevor sein Beweis vollständig angekommen ist — die beiden
			// console.log-Aufrufe landen nicht garantiert im selben 'data'-Ereignis.
			fertigWenn: (bisher) => bisher.includes('lauscht auf Port') && bisher.includes(verzeichnis)
		});

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

			// Ohne `fertigWenn`: Der Exit-Code ist hier Teil der Zusicherung.
			const { ausgabe, code } = await starte({
				umgebung: { LEGACY_INBOX_DATA_DIR: verzeichnis, PORT: '0' }
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
		// Ohne `fertigWenn`: Der Exit-Code ist hier Teil der Zusicherung.
		const { ausgabe, code } = await starte({ umgebung: { LEGACY_INBOX_DATA_DIR: '' } });

		expect(code).not.toBe(0);
		expect(ausgabe).toContain('LEGACY_INBOX_DATA_DIR');
	});
});
