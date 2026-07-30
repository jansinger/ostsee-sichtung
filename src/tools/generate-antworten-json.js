/**
 * Erzeugt die eingefrorenen antworten.json-Dateien für den Legacy-Posteingang.
 *
 * Der Posteingang schreibt die vierzehn formOptions-Enums nicht ab, sondern
 * bekommt das Ergebnis einmal erzeugt. Der Drift-Test in
 * src/routes/rest_sichtungen/antworten.json/frozen.test.ts hält beide
 * Fassungen zusammen.
 *
 * Aufruf: npm run generate:antworten
 *
 * Das npm-Skript setzt `TEST=true` vor dem vite-node-Aufruf. Das ist kein
 * Test-Flag im üblichen Sinn, sondern schaltet einen Guard in @sveltejs/kit's
 * Vite-Plugin ab: Es prüft beim Laden von `$lib/server/*`-Importen, ob
 * Client-Code versehentlich Server-Code mitzieht, und läuft dafür den
 * Import-Graphen bis zu einem bekannten Einstiegspunkt zurück. Außerhalb von
 * `vite dev`/`vite build` — wie hier beim Laden über vite-node — existiert
 * dieser Graph nicht, und der Guard bricht mit "An impossible situation
 * occurred" ab. `TEST=true` ist der vom Plugin selbst vorgesehene Ausweg dafür
 * (dieselbe Bedingung, die Vitest für Server-Route-Tests wie frozen.test.ts
 * nutzt). Es muss vor dem Prozessstart gesetzt sein — ein `process.env.TEST =
 * 'true'` in diesem Modul kommt zu spät, weil vite-node den importierten
 * Modulgraphen (inkl. +server.js) aus ESM-Hoisting-Gründen schon lädt, bevor
 * die erste Codezeile dieser Datei ausgeführt wird.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GET } from '../routes/rest_sichtungen/antworten.json/+server.js';

const ZIEL = path.resolve('legacy-inbox/data');

async function hole(pfad) {
	const antwort = await GET({
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	});
	return antwort.json();
}

const de = await hole('/rest_sichtungen/antworten.json');
const en = await hole('/en/rest_sichtungen/antworten.json');

await writeFile(path.join(ZIEL, 'antworten.de.json'), JSON.stringify(de, null, '\t') + '\n');
await writeFile(path.join(ZIEL, 'antworten.en.json'), JSON.stringify(en, null, '\t') + '\n');

console.log('antworten.de.json und antworten.en.json neu erzeugt.');
