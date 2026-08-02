import { expect, test } from '@playwright/test';

/**
 * about-page.spec.ts — was die Über-uns-Seite tragen muss
 *
 * Die beiden Vorgänger-Tests hingen beide am Technologie-Abschnitt: einer
 * suchte das Versions-Badge über `.badge-neutral` *im* diesem Block, der andere
 * prüfte dessen Überschrift samt „SvelteKit"- und „PostGIS"-Badges. Damit war
 * ausgerechnet der Teil der Seite festgenagelt, der am wenigsten mit „Über uns"
 * zu tun hat — und jede Kürzung dort hätte Tests gebrochen, ohne dass etwas
 * kaputt gewesen wäre.
 *
 * Die Tests hier prüfen stattdessen Aussagen, die unabhängig vom Layout gelten
 * sollen: die Version ist auffindbar, die Lizenz ist verlinkt statt ausgebreitet,
 * und die Handlungsaufforderungen führen dorthin, wo ein Bürger etwas tun kann.
 */
test.describe('About Page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/about', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { name: 'Über Ostsee-Tiere', level: 1 })).toBeVisible({
			timeout: 15000
		});
	});

	/* Bewusst ohne Bezug auf den umgebenden Abschnitt oder die Badge-Variante:
	   Geprüft ist, dass die laufende Version überhaupt ablesbar ist — nicht, in
	   welcher Kachel sie steht. Genau diese Kopplung hat der Vorgänger gehabt. */
	test('die laufende Version ist auf der Seite ablesbar', async ({ page }) => {
		const versionBadge = page.locator('.badge').filter({ hasText: /Version \d+\.\d+\.\d+/ });

		await expect(versionBadge).toBeVisible({ timeout: 10000 });
		expect(await versionBadge.textContent()).toMatch(/Version \d+\.\d+\.\d+/);
	});

	/* Der MIT-Volltext stand als scrollbarer 190-Wörter-Block auf einer
	   deutschsprachigen Seite für Bürger. Die Lizenz gehört genannt und
	   verlinkt — nicht ausgebreitet. Der Test hält beide Hälften fest, damit die
	   Kürzung nicht versehentlich die Angabe ganz verliert. */
	test('die Lizenz ist genannt und verlinkt, nicht ausgebreitet', async ({ page }) => {
		await expect(page.getByText('MIT-Lizenz').first()).toBeVisible();

		await expect(
			page.getByRole('link', { name: /Lizenz|LICENSE/ }),
			'Die Lizenz muss als Link erreichbar bleiben, sonst ist die Angabe eine Behauptung ohne Beleg.'
		).toHaveAttribute('href', /github\.com\/.+/);

		await expect(
			page.getByText('THE SOFTWARE IS PROVIDED "AS IS"'),
			'Der MIT-Volltext gehört nicht auf die Seite — er ist über den Lizenz-Link erreichbar.'
		).toHaveCount(0);
	});

	/* `/docs` ist die OpenAPI-Dokumentation („Testen Sie alle Endpunkte direkt im
	   Browser") und damit für die Zielgruppe dieser Schaltflächen das falsche
	   Ziel. Der Test verbietet es ausdrücklich, statt nur die richtigen Ziele
	   aufzuzählen: Sonst wäre ein dritter Knopf zurück auf /docs wieder erlaubt. */
	test('die Handlungsaufforderungen führen ins Formular und auf die Karte', async ({ page }) => {
		const cta = page.locator('.hero');

		await expect(cta.getByRole('link', { name: /Sichtung melden/ })).toHaveAttribute('href', '/');
		await expect(cta.getByRole('link', { name: /Karte erkunden/ })).toHaveAttribute('href', '/map');

		await expect(
			cta.locator('a[href="/docs"]'),
			'Die API-Dokumentation ist kein Ziel für Bürger. Sobald es eine Bestimmungshilfen-Seite gibt, gehört der dritte Knopf dorthin.'
		).toHaveCount(0);
	});
});
