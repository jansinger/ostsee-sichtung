import { expect, test, type Page } from '@playwright/test';
import { istAusgeschlossen } from '../src/lib/legacy-api/languagePrefix';
import { FormPage } from './pages/FormPage';
import { fillStep1, fillStep2, fillStep4, waitForNextEnabled } from './helpers/form-helpers';

/**
 * Sweep-Test: JEDER interne Verweis auf einer `/en`-Seite trägt das
 * `/en`-Präfix — oder zeigt auf einen Pfad aus der Ausschlussliste, der es
 * bewusst NICHT tragen darf.
 *
 * Anlass: `e2e/i18n-links.spec.ts` (Task 8) deckt drei `localizeHref`-Stellen
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
 *
 * Nicht erfasst, bewusst:
 * - `/en/map` steht auf keiner der drei Seiten unten UND nicht auf der
 *   Erfolgsseite als eigene Route im Sweep — die Karte selbst wird nirgends
 *   per `page.goto` besucht, nur auf sie VERWIESEN (Navbar/Footer/CTAs). Als
 *   Linkziel ist sie damit sehr wohl geprüft, nur nicht als Seite, von der aus
 *   gesweept wird.
 * - `src/routes/+error.svelte:20` (`goto(localizeHref('/'))`) ist ein
 *   programmatischer `goto()`-Aufruf, kein `<a href>` — für einen Sweep über
 *   `a[href]` prinzipiell unerreichbar, unabhängig von Selektor-Feinheiten.
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
 * herausgefiltert. Der Filter `startsWith('/')` verwirft dabei auch
 * dokumentrelative Verweise ohne führenden Schrägstrich (`href="bild.png"`,
 * `href="./unterordner"`) — im aktuellen Bestand kommt das nirgends vor
 * (jeder interne `localizeHref`- oder Literal-Pfad ist root-relativ), ein
 * künftiger relativer Link würde hier aber stillschweigend nicht geprüft.
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
 *
 * `istAusgeschlossen` erwartet einen Pfad OHNE Sprachpräfix — genau wie die
 * Anwendung ihn übergibt (`deLocalizeUrl(...).pathname` in `hooks.ts` und
 * `LanguageSwitcher.svelte`). Ein lokalisierter Verweis wie `/en/docs` muss
 * deshalb erst um `/en` gekürzt werden, bevor er gegen die Ausschlussliste
 * geprüft wird — sonst ist `ausgenommen` für jeden `/en`-präfigierten Verweis
 * strukturell `false` und der ganze „ausgenommen, trägt aber /en"-Zweig
 * unerreichbar (Review-Fund 2026-08-10, siehe Mutationsnachweis in
 * `pre-etappe1-tests-report.md`).
 */
function pruefeVerweise(verweise: string[], seite: string): void {
	const fehler: string[] = [];

	for (const href of verweise) {
		const pfad = href.split(/[?#]/)[0] || href;
		const traegtPraefix = pfad === '/en' || pfad.startsWith('/en/');
		const ohnePraefix = traegtPraefix ? pfad.slice(3) || '/' : pfad;
		const ausgenommen = istAusgeschlossen(ohnePraefix);

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

/**
 * Untergrenzen aus einer echten Messung (2026-08-10, siehe
 * `pre-etappe1-tests-report.md`), nicht `toBeGreaterThan(0)`: Ein einzelner
 * verbliebener Link (z. B. weil `csr = false` — dokumentierte Falle in diesem
 * Projekt — Navbar und Footer aus dem DOM nimmt) hätte die alte Schwelle
 * anstandslos bestanden. Die Grenzen liegen 2 unter dem gemessenen Wert, nicht
 * exakt darauf: Ein einzelner harmloser Duplikat-Unterschied (z. B. durch eine
 * spätere Layout-Änderung an Mobil-/Desktop-Menü) soll nicht sofort rot
 * werden, ein fehlender Navbar- oder Footer-Block (mehrere Links auf einmal)
 * schon.
 */
const MINDEST_VERWEISE: Record<string, number> = {
	'/en': 14,
	'/en/about': 17,
	'/en/bestimmungshilfe': 14,
	'/en Erfolgsseite (SubmissionSuccess)': 14
};

test.describe('Sweep: interne Verweise tragen das /en-Präfix', () => {
	for (const pfad of ['/en', '/en/about', '/en/bestimmungshilfe']) {
		test(`${pfad}: alle internen Verweise sind lokalisiert oder bewusst ausgenommen`, async ({
			page
		}) => {
			await page.goto(pfad, { waitUntil: 'networkidle' });

			const verweise = await interneVerweise(page);
			expect(
				verweise.length,
				`nur ${verweise.length} interne Verweise auf ${pfad} gefunden, erwartet mindestens ${MINDEST_VERWEISE[pfad]} — Navbar oder Footer könnten fehlen (z. B. durch csr:false)`
			).toBeGreaterThanOrEqual(MINDEST_VERWEISE[pfad]);

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

		const seite = '/en Erfolgsseite (SubmissionSuccess)';
		const verweise = await interneVerweise(page);
		expect(
			verweise.length,
			`nur ${verweise.length} interne Verweise auf der Erfolgsseite gefunden, erwartet mindestens ${MINDEST_VERWEISE[seite]}`
		).toBeGreaterThanOrEqual(MINDEST_VERWEISE[seite]);

		pruefeVerweise(verweise, seite);
	});
});
