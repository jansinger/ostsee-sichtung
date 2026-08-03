import { expect, test, type Page } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { formatRatio, measureContrast } from './helpers/contrast';

/**
 * navbar-structure.spec.ts — die TopBar bleibt einzeilig, auch als Admin.
 *
 * **Der Bug:** DaisyUI gibt `.navbar-end` fest `width: 50%`, und `.menu` ist
 * `flex-flow: column wrap` — `menu-horizontal` dreht nur die Richtung, das
 * `wrap` bleibt. Die sieben Admin-Links mussten damit in die halbe
 * Containerbreite, während die Logo-Seite die andere Hälfte fast leer ließ.
 * Zwischen 1024px und 1440px brach das Menü in eine zweite Zeile um; der
 * Header wuchs von 66px auf 99px und schob den Seiteninhalt nach unten.
 *
 * Zwei Ursachen, zwei Zusicherungen:
 *  1. Die 50%-Fessel ist weg (`w-auto`) — der Test misst die Zeilenzahl.
 *  2. Die oberste Ebene trägt nur noch die Produkt-Navigation; Admin-Ziele
 *     liegen in einer Gruppe. Der Test zählt die Einträge, damit ein achter
 *     Link nicht unbemerkt wieder in die Zeile gedrückt wird.
 *
 * Zugang über `seedAdminSession` (dort steht, warum nicht über Auth0).
 */

/* Unterhalb von lg (1024px) übernimmt der Burger — darüber sind das die
   Breiten, bei denen der Umbruch auftrat, plus eine schmale Reserve. */
const DESKTOP_BREITEN = [1024, 1280, 1440] as const;

async function menueZeilen(page: Page): Promise<number> {
	return page.evaluate(() => {
		const menu = document.querySelector('header ul.menu-horizontal');
		if (!menu) throw new Error('Desktop-Menü nicht gefunden');
		const oberkanten = Array.from(menu.children).map((li) =>
			Math.round(li.getBoundingClientRect().top)
		);
		return new Set(oberkanten).size;
	});
}

test.describe('TopBar — Struktur und Umbruchfreiheit', () => {
	test('als Admin bleibt das Menü auf allen Desktop-Breiten einzeilig', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext();
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			for (const breite of DESKTOP_BREITEN) {
				await page.setViewportSize({ width: breite, height: 900 });
				await page.goto('/');
				await expect(page.locator('header ul.menu-horizontal')).toBeVisible();

				expect(await menueZeilen(page), `Menü bricht bei ${breite}px um`).toBe(1);
			}
		} finally {
			await context.close();
		}
	});

	test('die oberste Menüebene trägt die Produkt-Navigation plus eine Admin-Gruppe', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/');
			const menu = page.locator('header ul.menu-horizontal');

			/* Vier statt sieben: Meldung, Karte, Bestimmungshilfe + „Verwaltung".
			   API-Docs sind kein Ziel für Museumsbesuchende und stehen als
			   „Dokumentation" weiterhin im Footer. */
			await expect(menu.locator('> li')).toHaveCount(4);
			await expect(menu.getByRole('link', { name: 'Meldung' })).toBeVisible();
			await expect(menu.getByRole('link', { name: 'Karte' })).toBeVisible();
			await expect(menu.getByRole('link', { name: 'Bestimmungshilfe' })).toBeVisible();
			await expect(menu.getByRole('link', { name: 'API-Docs' })).toHaveCount(0);

			/* Die drei Admin-Ziele sind erreichbar — aber erst nach dem Aufklappen,
			   damit sie die oberste Ebene nicht mehr belasten. */
			/* `getByRole('group', { name })` greift hier nicht: `<details>` bildet auf
			   `group` ab, bekommt aus dem `<summary>` aber keinen Accessible Name —
			   „Verwaltung" ist Textinhalt, nicht Name. Geprüft wird deshalb die
			   einzige Gruppe im Menü samt ihrer Beschriftung. */
			const gruppe = menu.getByRole('group');
			await expect(gruppe).toBeVisible();
			await expect(gruppe).toContainText('Verwaltung');
			await expect(gruppe.getByRole('link', { name: 'Sichtungen' })).toBeHidden();

			await gruppe.locator('summary').click();
			await expect(gruppe.getByRole('link', { name: 'Sichtungen' })).toBeVisible();
			await expect(gruppe.getByRole('link', { name: 'Statistiken' })).toBeVisible();
			await expect(gruppe.getByRole('link', { name: 'Einstellungen' })).toBeVisible();
		} finally {
			await context.close();
		}
	});

	/**
	 * Die Gruppe in der TopBar ist der Einstieg von außen. Innerhalb der
	 * Verwaltung wäre sie der falsche Weg: Wer zwischen den drei Seiten
	 * wechselt, bräuchte pro Wechsel zwei Klicks (aufklappen, wählen). Die
	 * Unternavigation macht daraus einen.
	 */
	test('der Admin-Bereich trägt eine eigene Unternavigation mit aktiver Seite', async ({
		browser,
		baseURL
	}) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin/statistics');
			const unternav = page.getByRole('navigation', { name: 'Verwaltung' });

			await expect(unternav.getByRole('link', { name: 'Sichtungen' })).toBeVisible();
			await expect(unternav.getByRole('link', { name: 'Statistiken' })).toBeVisible();
			await expect(unternav.getByRole('link', { name: 'Einstellungen' })).toBeVisible();

			/* aria-current statt einer reinen Farbklasse: Screenreader müssen die
			   aktive Seite ebenso erkennen wie das Auge. */
			await expect(unternav.getByRole('link', { name: 'Statistiken' })).toHaveAttribute(
				'aria-current',
				'page'
			);
			await expect(unternav.getByRole('link', { name: 'Sichtungen' })).not.toHaveAttribute(
				'aria-current',
				'page'
			);

			await unternav.getByRole('link', { name: 'Einstellungen' }).click();
			await expect(page).toHaveURL(/\/admin\/settings$/);
			await expect(unternav.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
				'aria-current',
				'page'
			);
		} finally {
			await context.close();
		}
	});

	/**
	 * DaisyUI färbt inaktive Reiter mit
	 * `color-mix(in oklab, var(--color-base-content) 50%, transparent)` — fest
	 * verdrahtet, ohne Theme-Variable. Auf `base-100` sind das gemessene
	 * 3,54:1 und damit unter WCAG 1.4.3; es ist exakt die `/50`-Zeile aus der
	 * Deckkraft-Tabelle in `design-system.md`, die dort als unzulässig steht.
	 * `app.css` hebt die Stufe deshalb auf `/70` an (7,04:1).
	 *
	 * Die Messung muss im Browser laufen: `oklch()` und `color-mix(in oklab, …)`
	 * sind erst nach dem Gamut-Mapping nach sRGB als Kontrastwert lesbar.
	 */
	test('inaktive Reiter der Unternavigation erfüllen WCAG AA', async ({ browser, baseURL }) => {
		if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

		const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		await seedAdminSession(context, baseURL);
		const page = await context.newPage();

		try {
			await page.goto('/admin/statistics');
			await expect(page.getByRole('navigation', { name: 'Verwaltung' })).toBeVisible();

			const [inaktiv, aktiv] = await measureContrast(page, [
				{
					name: 'inaktiver Reiter',
					selector: 'nav[aria-label="Verwaltung"] a:not([aria-current])',
					backdrop: 'var(--color-base-100)'
				},
				{
					name: 'aktiver Reiter',
					selector: 'nav[aria-label="Verwaltung"] a[aria-current]',
					backdrop: 'var(--color-base-100)'
				}
			]);

			expect(
				inaktiv.ratio,
				`inaktiver Reiter: ${formatRatio(inaktiv.ratio)}:1 (${inaktiv.foreground} auf ${inaktiv.background})`
			).toBeGreaterThanOrEqual(4.5);

			/* Der Override darf nicht über sein Ziel hinausschießen: ohne
			   `:not(.tab-active)` schlägt er auch DaisyUIs Aktiv-Regel, beide
			   Reiter messen dann denselben Wert und der Farbunterschied ist weg. */
			expect(
				aktiv.ratio,
				`aktiver Reiter (${formatRatio(aktiv.ratio)}:1) muss kräftiger sein als der inaktive (${formatRatio(inaktiv.ratio)}:1)`
			).toBeGreaterThan(inaktiv.ratio);
		} finally {
			await context.close();
		}
	});

	test('ohne Admin-Rechte gibt es keine Verwaltungsgruppe', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');

		const menu = page.locator('header ul.menu-horizontal');
		await expect(menu.locator('> li')).toHaveCount(3);
		await expect(menu.getByRole('group')).toHaveCount(0);
		expect(await menueZeilen(page)).toBe(1);
	});
});
