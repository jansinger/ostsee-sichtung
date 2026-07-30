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
 * Aufruf: node src/tools/import-legacy-inbox.js <datenverzeichnis>
 */
import { readdir, readFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { mapLegacyToCurrentSchema } from '../lib/legacy-api/field-mapping.js';
import { saveSighting } from '../lib/server/db/sightingRepository.js';

// Kleine, feste Obergrenze für Verschiebe-Versuche: Sie räumt transiente
// Ursachen (kurzzeitig volle Platte, Race mit einem parallelen Aufräumjob)
// aus dem Weg, ohne den Lauf endlos zu blockieren.
const MAX_RENAME_ATTEMPTS = 3;
const DEFAULT_RENAME_RETRY_DELAY_MS = 50;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function importiere({
	datenVerzeichnis,
	mappe = mapLegacyToCurrentSchema,
	speichere = saveSighting,
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

			gespeichert = await speichere(mappe(vereinheitliche(umschlag.payload)));

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
			console.error(`${datei}: ${fehler.message}`);
			fehlgeschlagen++;
			continue;
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
					`(${letzterFehler.message}). Datei von Hand nach importiert/ verschieben, bevor der ` +
					`Import erneut läuft — sonst wird die Sichtung doppelt angelegt.`
			);
			moveFailure = { file: datei, sightingId: gespeichert.id, message: letzterFehler.message };
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

// Direkter Aufruf über die Kommandozeile
if (import.meta.url === `file://${process.argv[1]}`) {
	const [datenVerzeichnis] = process.argv.slice(2);
	if (!datenVerzeichnis) {
		console.error('Aufruf: node src/tools/import-legacy-inbox.js <datenverzeichnis>');
		process.exit(1);
	}
	const ergebnis = await importiere({ datenVerzeichnis });
	console.log(`${ergebnis.uebernommen} übernommen, ${ergebnis.fehlgeschlagen} offen.`);
	if (ergebnis.moveFailure) {
		console.error(
			`Lauf abgebrochen: ${ergebnis.moveFailure.file} (Sichtung ${ergebnis.moveFailure.sightingId}) ` +
				'konnte nicht verschoben werden — siehe Fehlermeldung oben.'
		);
	}
	process.exit(ergebnis.fehlgeschlagen > 0 || ergebnis.moveFailure ? 1 : 0);
}
