import { expect, test } from '@playwright/test';
import { seedAdminSession } from './helpers/adminSession';

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
 *
 * **Rohmessung des vollen Seiten-Überlaufs vor der `size="sm"`-Behebung**
 * (`expectNoHorizontalOverflow` auf die ganze Seite, nicht nur das
 * Status-Control): 155px bei 320px, 100px bei 375px — identisch mit der
 * Tabelle oben, weil das Status-Control zu diesem Zeitpunkt der einzige
 * Verursacher war. Nach der Behebung bleibt ein *zweiter*, unabhängiger
 * Seitenüberlauf (97px/42px, Verursacher `a.font-mono`, eine lange
 * Referenz-ID ohne Umbruch) — vorbestehend, nicht Teil dieses Befunds, hier
 * nur zur Einordnung festgehalten.
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

		/**
		 * Review-Befund 1: Prüft die Trefferfläche der einzelnen `sm`-Segmente,
		 * nicht nur die Gesamtbreite der Gruppe. Gemessen am 2026-08-07 (dieselbe
		 * Mobilkarte, `label.btn` innerhalb des Status-Control): 50×44px pro
		 * Segment — bereits über der 44px-Grenze aus `design-system.md`
		 * („Feldmodus und Touch-Targets"). Grund, warum das trotz `btn-sm`
		 * nicht auf ~40px absackt: `.btn` setzt `--btn-p` (Innenabstand) in der
		 * CSS-Layer-Schicht `daisyui.l1.l2.l3`, `.btn-sm` versucht denselben
		 * Wert in `daisyui.l1.l2` zu überschreiben — bei `@layer` entscheidet die
		 * Deklarationsreihenfolge der Schicht, nicht die Selektor-Spezifität oder
		 * Quellreihenfolge, `.btn-sm` verliert also strukturell gegen `.btn` und
		 * der Innenabstand bleibt bei `1rem`. Kein Fix nötig — dieser Test hält
		 * den Ist-Zustand als Regressionsschutz fest, falls ein künftiges
		 * DaisyUI-Update oder ein Utility-Override (`px-*`) die Breite wieder
		 * unter 44px drückt.
		 */
		test(`Segmente des Status-Control sind bei ${width}px mindestens 44px breit`, async ({
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

				const segmentWidths = await page.evaluate(() => {
					return Array.from(
						document.querySelectorAll('.md\\:hidden fieldset[role="radiogroup"] label.btn')
					).map((el) => el.getBoundingClientRect().width);
				});

				expect(segmentWidths.length, 'Keine Segmente im Status-Control gefunden').toBeGreaterThan(
					0
				);
				for (const w of segmentWidths) {
					expect(
						w,
						`Segmentbreite ${w}px unterschreitet die 44px-Touch-Target-Grenze`
					).toBeGreaterThanOrEqual(44);
				}
			} finally {
				await context.close();
			}
		});
	}
});
