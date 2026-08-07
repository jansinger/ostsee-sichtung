import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';
import { expectNoHorizontalOverflow } from './helpers/overflow';

/**
 * admin-table-mobile-status-overflow.spec.ts — Mobilkarte der Sichtungstabelle
 * bei sehr schmalen Viewports.
 *
 * **Der Befund (Review Task 5, Befund 2):** In der Mobilkarte (`+page.svelte`)
 * saß in einer `flex items-center justify-between`-Zeile der Zeitstempel
 * „Gemeldet: …" neben dem `SightingStatusControl` mit `size="md"` — drei
 * beschriftete Segmente. DaisyUI gibt `.btn` `flex-shrink: 0`; die Gruppe
 * konnte also nicht schrumpfen. Gemessen mit `expectNoHorizontalOverflow`
 * (`e2e/helpers/overflow.ts`) auf `/admin/sichtungen`:
 *
 * | Breite | Überlauf vorher (`size="md"`) |
 * | ------ | ------------------------------ |
 * | 320px  | 155px                          |
 * | 375px  | 100px                          |
 *
 * Beide Male benannte der Helfer `fieldset.join` (das Status-Control) als
 * Verursacher. Behoben durch `size="sm"` an dieser einen Aufrufstelle — wie im
 * `sm`-Aufruf der Desktop-Spalte zeigt das Control dann nur Icons, der `title`
 * am Segment trägt die Bedeutung weiter.
 *
 * **Warum hier NICHT `expectNoHorizontalOverflow` auf die ganze Seite läuft:**
 * Nach der Behebung bleibt bei 320px/375px ein *zweiter*, unabhängiger
 * Überlauf bestehen (97px/42px, Verursacher `a.font-mono` — eine lange
 * Referenz-ID, die als Fließtext nicht umbricht). Der existierte bereits vor
 * dieser Änderung (nachgestellt per `git stash`) und gehört nicht zu Befund 2
 * — ein Test gegen den Seiten-Gesamtüberlauf wäre an dieser fremden Ursache
 * dauerhaft rot und würde nichts über das Status-Control aussagen. Separat
 * gemeldet, siehe Bericht.
 *
 * Der Regressionstest hier misst deshalb gezielt: Ragt irgendein
 * Status-Control über den rechten Rand des Viewports hinaus? Das ist genau
 * die Wirkung, die `size="md"` hatte, und bleibt unempfindlich gegenüber der
 * fremden Referenz-ID-Ursache.
 */
test.describe('Admin-Sichtungstabelle — Mobilkarte bei schmalen Viewports', () => {
	for (const width of [320, 375]) {
		test(`Status-Control ragt bei ${width}px nicht über den Viewport hinaus`, async ({
			browser,
			baseURL
		}) => {
			if (!baseURL) throw new Error('baseURL fehlt — playwright.config.ts setzt sie normalerweise');

			const context = await browser.newContext({ viewport: { width, height: 900 } });
			await seedAdminSession(context, baseURL);
			const page = await context.newPage();

			try {
				await page.goto('/admin/sichtungen');
				await expect(page.getByRole('heading', { name: 'Sichtungen' })).toBeVisible();

				const controls = page.locator('.md\\:hidden fieldset[role="radiogroup"]');
				const count = await controls.count();
				expect(count, 'Keine Mobilkarte mit Status-Control gefunden').toBeGreaterThan(0);

				const overhang = await page.evaluate((viewportWidth) => {
					return Array.from(document.querySelectorAll('.md\\:hidden fieldset[role="radiogroup"]'))
						.map((el) => Math.round(el.getBoundingClientRect().right - viewportWidth))
						.filter((delta) => delta > 0);
				}, width);

				expect(
					overhang,
					`Status-Control ragt über den Viewport hinaus (px): ${overhang.join(', ')}`
				).toEqual([]);
			} finally {
				await context.close();
			}
		});
	}
});

/**
 * Hält den vollständigen Messwert von Befund 2 fest (Seiten-Gesamtüberlauf vor
 * dem Fix) — bewusst `.skip`, damit er nicht dauerhaft an der fremden
 * Referenz-ID-Ursache rot bleibt. Dient als Beleg im Review-Bericht, nicht als
 * laufender Guard; der laufende Guard ist der Test oben.
 */
test.describe
	.skip('Befund-2-Rohmessung (Dokumentation, siehe .superpowers/sdd/task-5-report.md)', () => {
	for (const width of [320, 375]) {
		test(`voller Seiten-Überlauf bei ${width}px`, async ({ browser, baseURL }) => {
			if (!baseURL) throw new Error('baseURL fehlt');
			const context = await browser.newContext({ viewport: { width, height: 900 } });
			await seedAdminSession(context, baseURL);
			const page = await context.newPage();
			try {
				await page.goto('/admin/sichtungen');
				await expectNoHorizontalOverflow(page, `/admin/sichtungen bei ${width}px`);
			} finally {
				await context.close();
			}
		});
	}
});
