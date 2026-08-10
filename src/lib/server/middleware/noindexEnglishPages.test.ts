import { describe, it, expect } from 'vitest';
import type { Handle } from '@sveltejs/kit';
import { noindexEnglishPages } from '$lib/server/middleware/noindexEnglishPages';

function createMockEvent(pathname: string) {
	return {
		url: new URL(`https://localhost${pathname}`),
		request: new Request(`https://localhost${pathname}`),
		locals: {},
		cookies: {},
		params: {},
		route: { id: '/' },
		isDataRequest: false,
		isSubRequest: false,
		platform: undefined
	};
}

async function runHandler(pathname: string): Promise<Response> {
	const event = createMockEvent(pathname);
	const resolve = async () => new Response(null);
	return noindexEnglishPages({
		event: event as Parameters<Handle>[0]['event'],
		resolve: resolve as Parameters<Handle>[0]['resolve']
	});
}

describe('noindexEnglishPages', () => {
	it('setzt X-Robots-Tag auf /en', async () => {
		const response = await runHandler('/en');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
	});

	it('setzt X-Robots-Tag auf /en/map', async () => {
		const response = await runHandler('/en/map');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
	});

	it('setzt X-Robots-Tag NICHT auf /', async () => {
		const response = await runHandler('/');
		expect(response.headers.get('X-Robots-Tag')).toBeNull();
	});

	it('setzt X-Robots-Tag NICHT auf präfixlose Pfade wie /map', async () => {
		const response = await runHandler('/map');
		expect(response.headers.get('X-Robots-Tag')).toBeNull();
	});

	// Der Legacy-Client (siehe CLAUDE.md, Legacy-REST-API) ruft weiterhin
	// `/en/rest_sichtungen/...` — byte-identisch zur deutschen Antwort, reine
	// Routenkosmetik der abgelösten CakePHP-Anwendung. Der Riegel unterscheidet
	// hier bewusst NICHT nach Content-Type: Die Erkennung hängt einzig am ersten
	// Pfadsegment, wie in der Aufgabenstellung verlangt, und eine mobile App
	// interessiert sich ohnehin nicht für Indexierungs-Header. Eine Ausnahme für
	// Legacy-Pfade wäre zusätzliche, gegen nichts geprüfte Komplexität.
	it('setzt X-Robots-Tag auch auf Legacy-Pfade unter /en/', async () => {
		const response = await runHandler('/en/rest_sichtungen/antworten.json');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
	});

	it('erkennt das Sprachpräfix case-insensitiv wie toLocale()', async () => {
		const response = await runHandler('/EN/map');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
	});

	it('behält vorhandene Antwort-Header bei', async () => {
		const event = createMockEvent('/en');
		const resolve = async () => new Response(null, { headers: { 'X-Test': 'wert' } });
		const response = await noindexEnglishPages({
			event: event as Parameters<Handle>[0]['event'],
			resolve: resolve as Parameters<Handle>[0]['resolve']
		});
		expect(response.headers.get('X-Test')).toBe('wert');
		expect(response.headers.get('X-Robots-Tag')).toBe('noindex, follow');
	});
});
