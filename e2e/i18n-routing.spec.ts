import { expect, test } from '@playwright/test';

/**
 * Name des Locale-Cookies — bewusst als Literal und nicht importiert aus
 * `$lib/i18n/localeCookie.ts`: Kein anderer Spec in diesem Verzeichnis
 * importiert aus `$lib` (Playwright läuft hier ohne den Vite-Alias-Resolver
 * der Anwendung), und ein Import wäre ungetesteter Neuboden. Einzige
 * verlässliche Quelle bleibt `LOCALE_COOKIE` in `localeCookie.ts` — dessen
 * eigener Kommentar verbietet, den Wert zu raten; er ist hier deshalb
 * abgeschrieben, nicht neu erfunden.
 */
const LOCALE_COOKIE = 'PARAGLIDE_LOCALE';

/**
 * Wächter über die Ausschlussliste aus `languagePrefix.ts`.
 *
 * Die Liste ist bewusst eine Ausschluss- und keine Positivliste: Ein vergessener
 * Eintrag erzeugt einen zusätzlichen, erreichbaren Pfad — sichtbar hier, statt
 * still im Betrieb. `/en/admin` ist dabei kein Umfangs-, sondern ein
 * Sicherheitsbefund: Der Schutz in `hooks.server.ts` hängt an
 * `event.url.pathname`.
 */
test.describe('Sprachpräfix-Routing', () => {
	for (const pfad of [
		'/en/api/sightings',
		'/en/admin',
		'/en/admin/sichtungen',
		'/en/uploads/test.jpg',
		'/en/health',
		'/en/rest_sichtungen/view/1840.json',
		'/de',
		'/de/sichtungen'
	]) {
		test(`${pfad} liefert 404`, async ({ request }) => {
			expect((await request.get(pfad)).status()).toBe(404);
		});
	}

	test('/en liefert die Seite aus', async ({ page }) => {
		await page.goto('/en');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});

	test('/en/admin ist kein zweiter Weg auf /admin', async ({ request }) => {
		// Getrennt geprüft, weil ein 404 aus dem falschen Grund entstehen könnte:
		// Antwortet der Auth-Ablauf auf /admin mit 302 auf den Login, muss
		// /en/admin sich davon unterscheiden — es darf gar keine Route treffen.
		const geschuetzt = await request.get('/admin', { maxRedirects: 0 });
		const praefix = await request.get('/en/admin', { maxRedirects: 0 });
		expect(praefix.status()).toBe(404);
		expect(praefix.status()).not.toBe(geschuetzt.status());
	});

	test('Legacy-Präfix liefert weiterhin deutsche Werte', async ({ request }) => {
		const antwort = await request.get('/en/rest_sichtungen/antworten.json');
		expect(antwort.status()).toBe(200);
		expect(JSON.stringify(await antwort.json())).toContain('Grobe See');
	});
});

/**
 * `/` ohne englische Präferenz bleibt deutsch — eigene Gruppe mit
 * `test.use({ locale })`, statt den Header per `context.setExtraHTTPHeaders`
 * zu setzen.
 *
 * `setExtraHTTPHeaders` überschreibt `Accept-Language` bei einer echten
 * Chromium-Top-Level-Navigation NICHT zuverlässig — nachgewiesen per
 * `page.on('request', ...)`: Mit `setExtraHTTPHeaders({ 'Accept-Language':
 * 'de-DE,de;q=0.9' })' kam beim Server weiterhin Chromiums Standard `en-US`
 * an, während `test.use({ locale: 'de-DE' })` den Header korrekt auf
 * `de-DE` setzt. Ohne diesen Fund wäre der Test von Chromiums Default
 * abhängig gewesen (der zufällig ohnehin auf Englisch steht) und hätte nie
 * wirklich geprüft, was er behauptet.
 */
test.describe('/ ohne Präferenz', () => {
	test.use({ locale: 'de-DE' });

	test('/ bleibt deutsch', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'de');
	});
});

/**
 * Der Cookie-Fall aus Task 4/5, der dort nie über einen echten Browser lief.
 *
 * `curl` sendet kein `Sec-Fetch-Dest: document` — genau daran hängt Paraglides
 * eigener Redirect-Zweig in `paraglideMiddleware` (siehe
 * `src/lib/paraglide/server.js`: `request.headers.get("Sec-Fetch-Dest") ===
 * "document"`). Task 4/5 haben den Cookie-Fall deshalb nur per `curl`
 * verifiziert — ein Pfad, der beim echten Browser nie durchlief. Playwrights
 * `request`-Fixture ist derselbe unbrowserte HTTP-Client wie `curl` und würde
 * hier denselben blinden Fleck reproduzieren; deshalb ausschließlich über
 * `page.goto`, das als echte Chromium-Top-Level-Navigation den Header setzt.
 *
 * **Befund, der die ursprünglich erwartete erste Prüfung ersetzt:** Ein
 * `PARAGLIDE_LOCALE=en`-Cookie leitet `/` NICHT nach `/en` um — auch mit
 * echtem `Sec-Fetch-Dest: document`. Grund: `strategy: ['url', 'cookie',
 * 'baseLocale']` in `vite.config.ts` prüft die `url`-Strategie zuerst, und die
 * unpräfigierte `/` erfüllt deren Muster für `baseLocale` ('de') bereits
 * vollständig — die `cookie`-Strategie kommt für diesen Pfad nie zum Zug.
 * Direkt nachvollzogen über `runtime.shouldRedirect({ request })` (liefert
 * `{ shouldRedirect: false, locale: 'de' }` trotz gesetztem Cookie) und über
 * `curl -sk -H "Cookie: PARAGLIDE_LOCALE=en" -H "Sec-Fetch-Dest: document"
 * https://localhost:4000/` (liefert `lang="de"`, kein Redirect). Der Test
 * unten sichert dieses tatsächliche Verhalten ab, nicht die ursprünglich
 * angenommene Weiterleitung — Details im Task-6-Bericht.
 */
test.describe('Cookie-gesteuerte Sprachwahl (Browser-Navigation)', () => {
	// `en-GB` für die ganze Gruppe: Der erste Test ist davon unabhängig (das
	// gesetzte Cookie blockiert die Accept-Language-Vermutung in
	// `zielFuerStartseite` unabhängig vom Sprachwert), der zweite Test
	// braucht genau diese Präferenz. Aus demselben Grund wie bei „/ ohne
	// Präferenz" oben: `context.setExtraHTTPHeaders` überschreibt
	// `Accept-Language` bei einer echten Navigation nicht zuverlässig,
	// `test.use({ locale })` schon.
	test.use({ locale: 'en-GB' });

	test('Cookie PARAGLIDE_LOCALE=en allein leitet / nicht nach /en um', async ({
		page,
		context,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		await context.addCookies([
			{
				name: LOCALE_COOKIE,
				value: 'en',
				url: baseURL
			}
		]);

		await page.goto('/');

		expect(new URL(page.url()).pathname).toBe('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'de');
	});

	test('Cookie PARAGLIDE_LOCALE=de schlägt englischen Accept-Language-Header', async ({
		page,
		context,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		// Die ausdrückliche frühere Wahl (Cookie) muss die Vermutung aus
		// Accept-Language schlagen — in beide Richtungen, siehe
		// zielFuerStartseite() in startseitenWeiterleitung.ts. Die englische
		// Präferenz kommt aus `test.use({ locale: 'en-GB' })' oben.
		await context.addCookies([
			{
				name: LOCALE_COOKIE,
				value: 'de',
				url: baseURL
			}
		]);

		await page.goto('/');

		expect(new URL(page.url()).pathname).toBe('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'de');
	});
});

/**
 * Deckung für die Verdrahtung aus Task 5: `handleStartseitenSprache` in der
 * `sequence` von `src/hooks.server.ts`, mit dem richtigen Cookie-Namen.
 *
 * Ohne diese Tests bliebe eine entfernte Verdrahtung unsichtbar — die
 * eigentliche Entscheidungslogik (`zielFuerStartseite`) ist bereits als
 * Unit-Test abgedeckt und liefe auch dann weiter grün, weil sie die
 * `sequence` gar nicht kennt. Genau diese Lücke benennt der Kommentar über
 * `zielFuerStartseite` in `startseitenWeiterleitung.ts` ausdrücklich.
 *
 * `maxRedirects: 0`, sonst folgt `request` der Weiterleitung automatisch und
 * die 302 selbst — inklusive `Vary` — wird nie sichtbar.
 */
test.describe('Verdrahtung: handleStartseitenSprache in der sequence', () => {
	test('Accept-Language en-GB ohne Cookie leitet / nach /en um, mit Vary', async ({ request }) => {
		const antwort = await request.get('/', {
			maxRedirects: 0,
			headers: { 'Accept-Language': 'en-GB,en;q=0.9' }
		});

		expect(antwort.status()).toBe(302);
		expect(antwort.headers()['location']).toBe('/en');

		const vary = antwort.headers()['vary'] ?? '';
		expect(vary).toContain('Accept-Language');
		expect(vary).toContain('Cookie');
	});

	test('deutscher Accept-Language-Header leitet / nicht um', async ({ request }) => {
		const antwort = await request.get('/', {
			maxRedirects: 0,
			headers: { 'Accept-Language': 'de-DE,de;q=0.9' }
		});

		expect(antwort.status()).toBe(200);
	});
});
