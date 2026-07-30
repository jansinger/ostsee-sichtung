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

export async function importiere({
	datenVerzeichnis,
	mappe = mapLegacyToCurrentSchema,
	speichere = saveSighting
}) {
	const eingang = path.join(datenVerzeichnis, 'posteingang');
	const erledigt = path.join(datenVerzeichnis, 'importiert');

	const dateien = (await readdir(eingang)).filter((d) => d.endsWith('.json')).sort();

	let uebernommen = 0;
	let fehlgeschlagen = 0;

	for (const datei of dateien) {
		try {
			const umschlag = JSON.parse(await readFile(path.join(eingang, datei), 'utf8'));

			if (!umschlag.payload) {
				// Ohne geparsten Payload ist nichts zu übernehmen. Der Rohtext
				// bleibt liegen und braucht einen Menschen.
				console.error(`${datei}: kein Payload — bleibt liegen`);
				fehlgeschlagen++;
				continue;
			}

			const gespeichert = await speichere(mappe(vereinheitliche(umschlag.payload)));

			await rename(path.join(eingang, datei), path.join(erledigt, datei));
			uebernommen++;
			console.log(`${datei} → Sichtung ${gespeichert.id}`);
		} catch (fehler) {
			// Ein Fehler in einer Datei darf den Rest nicht aufhalten.
			console.error(`${datei}: ${fehler.message}`);
			fehlgeschlagen++;
		}
	}

	return { uebernommen, fehlgeschlagen };
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
	process.exit(ergebnis.fehlgeschlagen > 0 ? 1 : 0);
}
