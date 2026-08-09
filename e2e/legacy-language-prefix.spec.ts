import { expect, test } from '@playwright/test';

/**
 * Sprachpräfix der abgelösten CakePHP-Anwendung: Jeder Legacy-Pfad war dort
 * zusätzlich unter `/de/…` und `/en/…` erreichbar, mit byte-identischer
 * (deutscher) Antwort. Umgesetzt ist das im `reroute`-Hook (`src/hooks.ts`).
 *
 * Die Regel selbst ist als Unit-Test abgedeckt
 * (`src/lib/legacy-api/languagePrefix.test.ts`). Hier steht das, was nur über
 * HTTP prüfbar ist: dass SvelteKit den Hook überhaupt anwendet — ein
 * vergessenes oder falsch benanntes `src/hooks.ts` fiele sonst nirgends auf.
 *
 * Ohne Browser: `request` spricht direkt mit dem Server.
 */
test.describe('Legacy-API: Sprachpräfix /de/ und /en/', () => {
	const legacyGets = [
		'/rest_sichtungen/antworten.json',
		'/rest_sichtungen/inBaltic.json?location=54.5,12.5',
		'/sichtungen/showreports.json?year=2024'
	];

	for (const pfad of legacyGets) {
		for (const sprache of ['de', 'en']) {
			test(`/${sprache}${pfad} antwortet identisch zu ${pfad}`, async ({ request }) => {
				const ohne = await request.get(pfad);
				const mit = await request.get(`/${sprache}${pfad}`);

				expect(ohne.status()).toBe(200);
				expect(mit.status()).toBe(200);
				// Byte-identisch: Das Präfix ist Routenkosmetik, keine Übersetzung.
				expect(await mit.body()).toEqual(await ohne.body());
			});
		}
	}

	test('POST /en/rest_sichtungen erreicht denselben Endpunkt', async ({ request }) => {
		// Leerer Body: Die Fehlerantwort der Validierung genügt als Nachweis, dass
		// die Route bedient wird — angelegt wird dabei nichts.
		const ohne = await request.post('/rest_sichtungen', { data: {} });
		const mit = await request.post('/en/rest_sichtungen', { data: {} });

		expect(mit.status()).toBe(ohne.status());
		expect(await mit.body()).toEqual(await ohne.body());
	});

	test('vor Seitenrouten und /admin gilt das Präfix bewusst nicht', async ({ request }) => {
		// Die Anwendung ist einsprachig deutsch; /admin hängt zusätzlich an
		// event.url.pathname, das reroute nicht verändert.
		for (const pfad of ['/en/', '/en/admin', '/en/api/sightings']) {
			const antwort = await request.get(pfad, { maxRedirects: 0 });
			expect(antwort.status(), pfad).toBe(404);
		}
	});
});
