import { expect, test, type Page } from '@playwright/test';
import { istAusgeschlossen } from '../src/lib/legacy-api/languagePrefix';
import { FormPage } from './pages/FormPage';
import { fillStep1, fillStep2, fillStep4, waitForNextEnabled } from './helpers/form-helpers';

/**
 * Sweep-Test: JEDER interne Verweis auf einer `/en`-Seite trägt das
 * `/en`-Präfix — oder zeigt auf einen Pfad aus der Ausschlussliste, der es
 * bewusst NICHT tragen darf.
 *
 * Anlass: `e2e/i18n-links.spec.ts` (Task 8) deckt vier `localizeHref`-Stellen
 * gezielt ab (Navbar-Link, der `$effect`-Nachtrag und „Ändern" in
 * `+page.svelte`). Von rund 18 Stellen im Branch blieben damit 14 unbewacht —
 * unter anderem alle vier Links in `PublicFooter.svelte`, der Logo-Link in
 * `OstseeTiereLogo.svelte`, drei in `about/+page.svelte`, zwei in
 * `bestimmungshilfe/+page.svelte` und zwei in `SubmissionSuccess.svelte`.
 * Genau diese Klasse hat in diesem Branch bereits einen Critical geliefert
 * (siehe Kommentar in `i18n-links.spec.ts`). Ein Sweep statt einzelner
 * Stichproben schließt die Fehlerklasse, nicht nur die bereits gefundenen
 * Einzelfälle — ein fünfter vergessener `localizeHref`-Aufruf an noch
 * unbekannter Stelle fiele hier genauso auf.
 *
 * Die Ausschlussliste kommt aus derselben Quelle wie die Anwendung
 * (`istAusgeschlossen` aus `languagePrefix.ts`, siehe deren Export-Begründung
 * für `e2e/i18n-routing.spec.ts`) — keine eigene Literalliste, die von der
 * echten wieder auseinanderlaufen könnte.
 */

/**
 * Sammelt alle internen `<a href>`-Verweise einer Seite.
 *
 * Ausgenommen ist der Sprachumschalter (`LanguageSwitcher.svelte`, erkennbar
 * am `hreflang`-Attribut): Sein Ziel ist bewusst die JEWEILS ANDERE Sprache —
 * auf einer `/en`-Seite verweist er auf die deutsche Fassung und trägt damit
 * so gut wie nie das `/en`-Präfix. Das ist keine Lücke, sondern sein Zweck.
 *
 * Externe Verweise (`http(s)://`, `mailto:`, `tel:`), reine Anker (`#…`) und
 * protokollrelative URLs (`//…`) sind keine internen Verweise und werden
 * herausgefiltert.
 */
async function interneVerweise(page: Page): Promise<string[]> {
	const hrefs = await page
		.locator('a[href]:not([hreflang])')
		.evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href') ?? ''));

	return hrefs.filter((href) => href.startsWith('/') && !href.startsWith('//'));
}

/**
 * Prüft eine Liste von Verweisen gegen die Lokalisierungsregel und meldet
 * JEDEN Verstoß einzeln — mit Verweis UND Seite im Text. Bei einem Sweep über
 * Dutzende Links ist „expect(x).toBe(true)" ohne Pfad wertlos; die Meldung
 * hier sagt exakt, welcher Link auf welcher Seite fehlt.
 */
function pruefeVerweise(verweise: string[], seite: string): void {
	const fehler: string[] = [];

	for (const href of verweise) {
		const pfad = href.split(/[?#]/)[0] || href;
		const traegtPraefix = pfad === '/en' || pfad.startsWith('/en/');
		const ausgenommen = istAusgeschlossen(pfad);

		if (ausgenommen && traegtPraefix) {
			fehler.push(
				`${href} (auf ${seite}): zeigt auf einen von der Lokalisierung ausgeschlossenen Pfad, trägt aber /en — das wäre ein 404`
			);
		} else if (!ausgenommen && !traegtPraefix) {
			fehler.push(
				`${href} (auf ${seite}): kein /en-Präfix — fehlendes localizeHref() lässt den Nutzer auf Deutsch zurückfallen`
			);
		}
	}

	expect(
		fehler,
		`${fehler.length} von ${verweise.length} Verweisen auf ${seite} verstoßen:\n${fehler.join('\n')}`
	).toEqual([]);
}

test.describe('Sweep: interne Verweise tragen das /en-Präfix', () => {
	for (const pfad of ['/en', '/en/about', '/en/bestimmungshilfe']) {
		test(`${pfad}: alle internen Verweise sind lokalisiert oder bewusst ausgenommen`, async ({
			page
		}) => {
			await page.goto(pfad, { waitUntil: 'networkidle' });

			const verweise = await interneVerweise(page);
			expect(
				verweise.length,
				`keine internen Verweise auf ${pfad} gefunden — Sweep liefe leer`
			).toBeGreaterThan(0);

			pruefeVerweise(verweise, pfad);
		});
	}

	/**
	 * `SubmissionSuccess.svelte` ist keine eigene Route — sie erscheint erst
	 * nach einer erfolgreichen Formular-Übermittlung (`+page.svelte`,
	 * `submissionSuccess`-State). Der Sweep oben kann sie deshalb nicht über
	 * `page.goto` erreichen; dieser Test fährt stattdessen den Formular-Flow
	 * bis zum Absenden, mit gemocktem API-Endpunkt (dasselbe Muster wie
	 * „Happy Path" in `form-submit.spec.ts`) — kein Datenbank-Schreibzugriff,
	 * CI-tauglich ohne Aufräumen.
	 */
	test('/en Erfolgsseite: alle internen Verweise sind lokalisiert oder bewusst ausgenommen', async ({
		page
	}) => {
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, id: 42, referenceId: 'REF-42' })
			});
		});

		const formPage = new FormPage(page);
		await page.goto('/en/?meldung=lebend');
		await page.waitForLoadState('networkidle');

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await formPage.skipStep();
		await fillStep4(formPage);
		await formPage.clickSubmit();

		await expect(page.getByRole('heading', { name: /Vielen Dank/i })).toBeVisible({
			timeout: 10000
		});

		const verweise = await interneVerweise(page);
		expect(
			verweise.length,
			'keine internen Verweise auf der Erfolgsseite gefunden — Sweep liefe leer'
		).toBeGreaterThan(0);

		pruefeVerweise(verweise, '/en Erfolgsseite (SubmissionSuccess)');
	});
});
