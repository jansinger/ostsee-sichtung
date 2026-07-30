import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GET } from './+server';

/**
 * Hält die eingefrorenen Dateien des Legacy-Posteingangs mit dieser Route
 * zusammen. Wird hier ein Label geändert, muss `npm run generate:antworten`
 * laufen — sonst liefern App und Posteingang unterschiedliche Enum-Tabellen.
 */
async function routeAntwort(pfad: string) {
	const antwort = await GET({
		url: new URL(`https://localhost${pfad}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${pfad}`)
	} as never);
	return antwort.json();
}

async function eingefroren(datei: string) {
	const inhalt = await readFile(path.resolve('legacy-inbox/data', datei), 'utf8');
	return JSON.parse(inhalt);
}

describe('eingefrorene antworten.json', () => {
	it('stimmt mit der deutschen Route überein', async () => {
		expect(await eingefroren('antworten.de.json')).toEqual(
			await routeAntwort('/rest_sichtungen/antworten.json')
		);
	});

	it('stimmt mit der englischen Route überein', async () => {
		expect(await eingefroren('antworten.en.json')).toEqual(
			await routeAntwort('/en/rest_sichtungen/antworten.json')
		);
	});
});
