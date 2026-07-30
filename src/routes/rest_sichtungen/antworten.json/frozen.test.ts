import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { GET } from './+server';

/**
 * Keeps frozen legacy inbox files in sync with this route. When a label changes
 * here, `npm run generate:antworten` must run — otherwise the app and inbox
 * will serve different enum tables.
 */
async function routeResponse(routePath: string) {
	const response = await GET({
		url: new URL(`https://localhost${routePath}`),
		getClientAddress: () => '127.0.0.1',
		request: new Request(`https://localhost${routePath}`)
	} as never);
	return response.json();
}

async function frozenFile(filename: string) {
	const content = await readFile(path.resolve('legacy-inbox/data', filename), 'utf8');
	return JSON.parse(content);
}

describe('Frozen antworten.json', () => {
	it('should match the German route', async () => {
		expect(await frozenFile('antworten.de.json')).toEqual(
			await routeResponse('/rest_sichtungen/antworten.json')
		);
	});

	it('should match the English route', async () => {
		expect(await frozenFile('antworten.en.json')).toEqual(
			await routeResponse('/en/rest_sichtungen/antworten.json')
		);
	});
});
