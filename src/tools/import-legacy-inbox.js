/**
 * Übernimmt die Dateien des Legacy-Posteingangs in die Hauptanwendung.
 *
 * Ruft dieselben Bausteine auf wie POST /rest_sichtungen — mapLegacyToCurrentSchema
 * und saveSighting —, statt über HTTP zu gehen. Grund: Der Endpunkt begrenzt auf
 * 20 Sichtungen pro Stunde und IP (rateLimit.ts:78), was einen Sammelimport
 * unbrauchbar machen würde. Ein zweites Mapping entsteht dadurch nicht; es ist
 * wörtlich dieselbe Funktion.
 *
 * Übernommene Dateien wandern nach importiert/. Die Datei selbst ist damit das
 * Protokoll: Ein zweiter Lauf kann nichts doppelt anlegen, und was liegen
 * bleibt, ist genau das, was noch offen ist.
 *
 * Aufruf über die Kommandozeile: npm run import:legacy-inbox -- <datenverzeichnis>
 * Der Einstiegspunkt dafür liegt in import-legacy-inbox-cli.js; diese Datei ist
 * reines Modul und führt beim Import nichts aus.
 */
import { readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { mapLegacyToCurrentSchema } from '../lib/legacy-api/field-mapping.js';
import { saveSighting } from '../lib/server/db/sightingRepository.js';
import { EmailService } from '../lib/server/services/emailService.js';
import { ServerConfigService } from '../lib/services/configService.js';
import { resolveEntryClient } from '../lib/server/utils/resolveEntryClient.js';

// Kleine, feste Obergrenze für Verschiebe-Versuche: Sie räumt transiente
// Ursachen (kurzzeitig volle Platte, Race mit einem parallelen Aufräumjob)
// aus dem Weg, ohne den Lauf endlos zu blockieren.
const MAX_RENAME_ATTEMPTS = 3;
const DEFAULT_RENAME_RETRY_DELAY_MS = 50;

/**
 * Leitet aus einem geworfenen Wert eine Meldung ab, ohne selbst zu werfen.
 *
 * JavaScript erlaubt `throw` mit beliebigen Werten, und die Fehler hier kommen
 * aus fremdem Gebiet: `JSON.parse` über Dateien, die ein Client geschrieben
 * hat, sowie die injizierbaren Stellen `mappe`, `speichere` und `notify`. Ein
 * `throw null` würde beim Zugriff auf `.message` einen zweiten Fehler auslösen
 * — ausgerechnet im `catch`, der dafür sorgen soll, dass eine kaputte Datei den
 * Rest des Laufs nicht aufhält.
 */
export function fehlerText(fehler) {
	if (fehler instanceof Error && typeof fehler.message === 'string') {
		return fehler.message;
	}
	if (typeof fehler === 'string') {
		return fehler;
	}
	try {
		return String(fehler);
	} catch {
		// Ein Objekt mit einem werfenden toString() bleibt übrig.
		return 'Unbekannter Fehler';
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Benachrichtigt über eine importierte Sichtung, wie es POST /rest_sichtungen
 * für eine über HTTP gemeldete tut (src/routes/rest_sichtungen/+server.ts).
 *
 * Der Entwurf (docs/archive/LEGACY_INBOX_ENTWURF_2026-07-30.md, Abschnitt 12)
 * begründet den fehlenden Mailversand des Posteingang-Dienstes ausdrücklich
 * damit, dass die Hauptanwendung beim Import benachrichtigt. Ohne diesen
 * Aufruf wäre das schlicht nicht wahr — ein Totfund läge dann in der
 * Datenbank, ohne dass jemand davon erführe.
 *
 * Anders als die Route wird hier gewartet: Die Route darf den HTTP-Client
 * nicht aufhalten und stößt den Versand nur an. Ein CLI-Prozess endet dagegen
 * mit der Ereignisschleife und würde einen nur angestoßenen Versand
 * abschneiden.
 */
async function sendeBenachrichtigung(sightingId) {
	const emailConfig = await ServerConfigService.getEmailConfig();
	if (!emailConfig.enabled || !emailConfig.recipient) return;
	await EmailService.sendNewSightingNotification(sightingId);
}

export async function importiere({
	datenVerzeichnis,
	mappe = mapLegacyToCurrentSchema,
	speichere = saveSighting,
	notify = sendeBenachrichtigung,
	renameFile = rename,
	renameRetryDelayMs = DEFAULT_RENAME_RETRY_DELAY_MS
}) {
	const eingang = path.join(datenVerzeichnis, 'posteingang');
	const erledigt = path.join(datenVerzeichnis, 'importiert');

	const dateien = (await readdir(eingang)).filter((d) => d.endsWith('.json')).sort();

	let uebernommen = 0;
	let fehlgeschlagen = 0;
	let moveFailure = null;

	for (const datei of dateien) {
		let gespeichert;

		try {
			const umschlag = JSON.parse(await readFile(path.join(eingang, datei), 'utf8'));

			if (!umschlag.payload) {
				// Ohne geparsten Payload ist nichts zu übernehmen. Der Rohtext
				// bleibt liegen und braucht einen Menschen.
				console.error(`${datei}: kein Payload — bleibt liegen`);
				fehlgeschlagen++;
				continue;
			}

			// Der ursprüngliche User-Agent aus dem Umschlag, nicht der dieses
			// Werkzeugs: Sonst stünde bei jeder nachgespielten Meldung der
			// Importer statt des Clients, der sie tatsächlich geschickt hat.
			gespeichert = await speichere(
				mappe(vereinheitliche(umschlag.payload)),
				undefined,
				undefined,
				resolveEntryClient({ source: 'agent', userAgent: umschlag.quelle?.user_agent })
			);

			if (gespeichert.id === undefined) {
				// speichere() kann laut eigenem Vertrag eine undefinierte ID
				// liefern, ohne zu werfen. Ohne ID gibt es nichts, worauf ein
				// Verschieben aufbauen könnte — als gewöhnlicher Fehlschlag
				// behandeln, die Datei bleibt für den nächsten Lauf liegen.
				console.error(`${datei}: speichere() lieferte keine Sichtungs-ID — bleibt liegen`);
				fehlgeschlagen++;
				continue;
			}
		} catch (fehler) {
			// Ein Fehler beim Lesen, Mappen oder Speichern darf den Rest nicht
			// aufhalten — die Sichtung wurde nicht angelegt, die Datei bleibt
			// unverändert liegen und wird beim nächsten Lauf erneut versucht.
			console.error(`${datei}: ${fehlerText(fehler)}`);
			fehlgeschlagen++;
			continue;
		}

		// Ab hier ist die Sichtung angelegt — jetzt darf benachrichtigt werden.
		// Ein gescheiterter Versand darf den Import nicht scheitern lassen: Die
		// Sichtung steht bereits in der Datenbank, und sie nach importiert/ zu
		// verschieben bleibt richtig. Sonst legte der nächste Lauf sie ein
		// zweites Mal an, nur weil eine Mail nicht rausging.
		try {
			await notify(gespeichert.id);
		} catch (fehler) {
			console.error(
				`${datei}: Sichtung ${gespeichert.id} wurde angelegt, aber die Benachrichtigung ` +
					`schlug fehl (${fehlerText(fehler)}). Der Import läuft weiter.`
			);
		}

		// Ab hier ist die Sichtung bereits in der Datenbank angelegt. Ein
		// Fehler beim Verschieben ist deshalb kein "Speichern ist
		// fehlgeschlagen" mehr, sondern eine gescheiterte Aufräumarbeit an
		// einem bereits abgeschlossenen Vorgang — das darf weder als
		// `fehlgeschlagen` gezählt noch mit einem stillen Weiterlaufen
		// beantwortet werden, sonst legt der nächste Lauf dieselbe Sichtung
		// noch einmal an.
		let verschoben = false;
		let letzterFehler;

		for (let versuch = 1; versuch <= MAX_RENAME_ATTEMPTS; versuch++) {
			try {
				await renameFile(path.join(eingang, datei), path.join(erledigt, datei));
				verschoben = true;
				break;
			} catch (fehler) {
				letzterFehler = fehler;
				if (versuch < MAX_RENAME_ATTEMPTS) {
					await sleep(renameRetryDelayMs);
				}
			}
		}

		if (!verschoben) {
			console.error(
				`${datei}: Sichtung ${gespeichert.id} wurde in der Datenbank angelegt, aber die Datei ` +
					`konnte nach ${MAX_RENAME_ATTEMPTS} Versuchen nicht nach importiert/ verschoben werden ` +
					`(${fehlerText(letzterFehler)}). Datei von Hand nach importiert/ verschieben, bevor der ` +
					`Import erneut läuft — sonst wird die Sichtung doppelt angelegt.`
			);
			moveFailure = { file: datei, sightingId: gespeichert.id, message: fehlerText(letzterFehler) };
			break;
		}

		uebernommen++;
		console.log(`${datei} → Sichtung ${gespeichert.id}`);
	}

	return { uebernommen, fehlgeschlagen, moveFailure };
}

/**
 * Der Vertrag schreibt sonstige_auffaelligkeiten mit "ae", die Hauptanwendung
 * erwartet den Umlaut (Entwurf, Abschnitt 2.2). Ohne diese Übersetzung verlöre
 * der Import den Freitext still.
 *
 * Läuft die parallele Korrektur der Hauptanwendung durch, akzeptiert
 * mapLegacyToCurrentSchema beide Schreibweisen und diese Funktion wird
 * überflüssig — sie schadet dann aber auch nicht.
 */
function vereinheitliche(payload) {
	if (!('sonstige_auffaelligkeiten' in payload)) return payload;

	const { sonstige_auffaelligkeiten, ...rest } = payload;
	return { ...rest, sonstige_auffälligkeiten: sonstige_auffaelligkeiten };
}
