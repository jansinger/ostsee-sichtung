import { expect, test } from '@playwright/test';

/**
 * Vorübergehender Auslieferungs-Riegel für Etappe 0 der Mehrsprachigkeit
 * (siehe `src/lib/server/middleware/noindexEnglishPages.ts` für die
 * vollständige Begründung und die Entfernungsbedingung).
 *
 * `/en` ist bereits erreichbar, aber noch kein Text ist übersetzt — bis die
 * Übersetzung (Etappen 1–3) ausgeliefert ist, tragen alle Antworten unter
 * `/en` den Header `X-Robots-Tag: noindex, follow`, damit Suchmaschinen den
 * deutschen Inhalt nicht unter der englischen URL indexieren.
 *
 * Ohne Browser: `request` genügt, es geht ausschließlich um Antwort-Header.
 */
test.describe('Auslieferungs-Riegel: X-Robots-Tag auf /en', () => {
	test('/en trägt noindex, follow', async ({ request }) => {
		const antwort = await request.get('/en');
		expect(antwort.headers()['x-robots-tag']).toBe('noindex, follow');
	});

	test('/en/map trägt noindex, follow', async ({ request }) => {
		const antwort = await request.get('/en/map');
		expect(antwort.headers()['x-robots-tag']).toBe('noindex, follow');
	});

	test('/ trägt den Header NICHT', async ({ request }) => {
		const antwort = await request.get('/');
		expect(antwort.headers()['x-robots-tag']).toBeUndefined();
	});

	// Legacy-Pfad unter /en/: byte-identische deutsche Antwort, reine
	// Routenkosmetik der abgelösten CakePHP-Anwendung (siehe
	// `src/lib/legacy-api/languagePrefix.ts`). Die Erkennung des Riegels hängt
	// bewusst nur am ersten Pfadsegment, nicht am Content-Type — der Header
	// steht deshalb auch hier, obwohl es sich um eine JSON-Antwort für eine
	// mobile App handelt, die ihn ohnehin nicht auswertet.
	test('/en/rest_sichtungen/antworten.json trägt noindex, follow', async ({ request }) => {
		const antwort = await request.get('/en/rest_sichtungen/antworten.json');
		expect(antwort.status()).toBe(200);
		expect(antwort.headers()['x-robots-tag']).toBe('noindex, follow');
	});
});
