import { expect, test, type Page } from '@playwright/test';
import { formatRatio, measureContrast } from './helpers/contrast';

/**
 * design-tokens.spec.ts — Kontrast-Vertrag des Design Systems
 *
 * Warum im Browser: oklch() und color-mix(in oklab, …) lassen sich erst nach
 * dem Gamut-Mapping nach sRGB als Kontrastwert lesen. Ein Test über die
 * CSS-Quelle würde eine Regression nicht bemerken — dieselbe Begründung wie
 * bei den bestehenden Tests in form-a11y.spec.ts.
 *
 * Warum gegen /styleguide: dort steht jede Token-Kombination genau einmal im
 * DOM. Ein Scan über die App würde ungenutzte Kombinationen verfehlen — und
 * genau die sind gefährlich, weil sie beim nächsten Einsatz sofort zuschlagen.
 *
 * Dieser Test hätte die beiden kritischen Befunde des Reviews am Tag ihrer
 * Entstehung gefunden: weißer Text auf warning (3,26:1) und auf secondary
 * (3,19:1).
 */

const AA_TEXT = 4.5;
const AA_GRAPHIC = 3;

/* Seit PR 2 aktiv: /styleguide existiert samt der Attribute
   data-token-surface / data-token-fg / data-token-icon, gegen die hier
   selektiert wird. Diese Gruppe ist damit der Kontrast-Vertrag und muss grün
   sein.

   Die Route ist über `dev`-Guard nur im Entwicklungsmodus erreichbar — das
   passt, weil `playwright.config.ts` in beiden Umgebungen einen Vite-Dev-Server
   startet (lokal `npm run dev`, in CI `vite dev --config vite.config.ci.ts`).
   Gegen einen Production-Build würde diese Gruppe in 404 laufen; dann ist der
   Guard die Ursache, nicht ein Token. */
test.describe('Design-Tokens — Kontrast', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/styleguide');
		// :focus und getComputedStyle brauchen ein fokussiertes Fenster.
		await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
	});

	/* Vollton-Flächen mit ihrem *-content. Erwartung: ≥ 4,5:1 für Text.
	   info und success liegen knapp darüber (4,66 / 4,54) — sinkt einer der
	   Werte, ist das eine Regression und kein Rundungsfehler. */
	for (const token of [
		'primary',
		'secondary',
		'accent',
		'neutral',
		'info',
		'success',
		'warning',
		'error'
	]) {
		test(`${token}: *-content auf Vollton ≥ ${AA_TEXT}:1`, async ({ page }) => {
			const [measured] = await measureContrast(page, [
				{
					name: `text-${token}-content auf bg-${token}`,
					selector: `[data-token-surface="${token}"]`,
					backdrop: 'var(--color-base-100)'
				}
			]);
			expect(
				measured.ratio,
				`${measured.name}: ${formatRatio(measured.ratio)}:1 (${measured.foreground} auf ${measured.background})`
			).toBeGreaterThanOrEqual(AA_TEXT);
		});
	}

	/* Vordergrund-Varianten auf base-100 und base-200.
	   base-300 ist bewusst NICHT geprüft: alle -strong-Werte liegen dort bei
	   ~3,77:1. Das ist dieselbe Grenze wie bei error und in
	   design-system.md als Verbot festgehalten, nicht als Testfall. */
	for (const token of [
		'info-strong',
		'success-strong',
		'warning-strong',
		'secondary-strong',
		'accent-strong',
		'error'
	]) {
		for (const surface of ['base-100', 'base-200']) {
			test(`${token} als Textfarbe auf ${surface} ≥ ${AA_TEXT}:1`, async ({ page }) => {
				const [measured] = await measureContrast(page, [
					{
						name: `text-${token} auf ${surface}`,
						selector: `[data-token-fg="${token}-on-${surface}"]`,
						backdrop: `var(--color-${surface})`
					}
				]);
				expect(
					measured.ratio,
					`${measured.name}: ${formatRatio(measured.ratio)}:1`
				).toBeGreaterThanOrEqual(AA_TEXT);
			});
		}
	}

	test('Deckkraft-Stufen: /60 ist die Untergrenze', async ({ page }) => {
		const measured = await measureContrast(
			page,
			['base-100', 'base-200'].map((surface) => ({
				name: `base-content/60 auf ${surface}`,
				selector: `[data-token-fg="fg-subtle-on-${surface}"]`,
				backdrop: `var(--color-${surface})`
			}))
		);
		for (const probe of measured) {
			expect(probe.ratio, `${probe.name}: ${formatRatio(probe.ratio)}:1`).toBeGreaterThanOrEqual(
				AA_TEXT
			);
		}
	});

	test('Icons in Statusfarbe erreichen 3:1', async ({ page }) => {
		const measured = await measureContrast(
			page,
			['info-strong', 'success-strong', 'warning-strong', 'error'].map((token) => ({
				name: `Icon in ${token}`,
				selector: `[data-token-icon="${token}"]`,
				backdrop: 'var(--color-base-100)'
			}))
		);
		for (const probe of measured) {
			expect(probe.ratio, `${probe.name}: ${formatRatio(probe.ratio)}:1`).toBeGreaterThanOrEqual(
				AA_GRAPHIC
			);
		}
	});
});

/**
 * Die Seite selbst — sie ist Entwickler-Werkzeug, aber ein bedienbares.
 *
 * Zwei Dinge sind hier keine Kosmetik:
 *
 * 1. Der Dichte-Umschalter schreibt auf `<html>`, also außerhalb der eigenen
 *    Komponente. Bleibt `data-density="field"` beim Verlassen der Route
 *    stehen, läuft die ganze App im Feldmodus weiter — mit 56-px-Zielen und
 *    14-px-Hilfetext, und ohne ein Bedienelement, das ihn zurücknimmt.
 * 2. Ein Umschalter ohne `aria-pressed` sagt Screenreader-Nutzenden nicht,
 *    welcher Modus aktiv ist; die Farbdifferenz `btn-primary`/`btn-outline`
 *    ist die einzige andere Anzeige.
 *
 * Gemessen wird im Browser aus demselben Grund wie oben in `form-a11y.spec.ts`:
 * `:focus-visible` und die aufgelösten Theme-Farben gibt es nur dort.
 */
test.describe('Styleguide — Bedienung', () => {
	/* Anders als die Kontrastgruppe oben klickt diese hier — und ein Klick vor
	   der Hydration tut nichts, weil `onclick` dann noch nicht am Element
	   hängt. `networkidle` plus ein hydrationsabhängiges Element ist dasselbe
	   Muster wie in `FormPage.goto()`; hier dient `data-density` als Signal:
	   das Attribut entsteht erst durch den `$effect` der Seite. */
	test.beforeEach(async ({ page }) => {
		await page.goto('/styleguide');
		await page.waitForLoadState('networkidle');
		await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
		await expect
			.poll(() => page.evaluate(() => document.documentElement.dataset.density ?? null))
			.toBe('comfortable');
	});

	const densityAttribute = (page: Page) =>
		page.evaluate(() => document.documentElement.dataset.density ?? null);

	test('Dichte-Umschalter meldet seinen Zustand über aria-pressed', async ({ page }) => {
		const comfortable = page.getByRole('button', { name: /Normal/ });
		const field = page.getByRole('button', { name: /Feldmodus/ });

		await expect(comfortable).toHaveAttribute('aria-pressed', 'true');
		await expect(field).toHaveAttribute('aria-pressed', 'false');

		await field.click();

		await expect(comfortable).toHaveAttribute('aria-pressed', 'false');
		await expect(field).toHaveAttribute('aria-pressed', 'true');
	});

	test('Feldmodus schaltet data-density und nimmt es zurück', async ({ page }) => {
		await page.getByRole('button', { name: /Feldmodus/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('field');

		await page.getByRole('button', { name: /Normal/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('comfortable');
	});

	/* Der eigentliche Fallstrick: nicht der Umschalter, sondern das Verlassen
	   der Route. Deshalb per Klick auf die Navigation — ein `page.goto()` würde
	   das Dokument neu laden und den Feldmodus auch dann verlieren, wenn die
	   Aufräumfunktion fehlt. */
	test('Feldmodus überlebt die Route nicht', async ({ page }) => {
		await page.getByRole('button', { name: /Feldmodus/ }).click();
		await expect.poll(() => densityAttribute(page)).toBe('field');

		await page.getByRole('link', { name: 'Meldung' }).click();
		await expect(page).toHaveURL(/\/$/);

		await expect
			.poll(() => densityAttribute(page), {
				message: 'data-density bleibt nach dem Verlassen von /styleguide auf <html> stehen'
			})
			.toBeNull();
	});

	test('Tastatur-Fokus ist auf dem Umschalter sichtbar', async ({ page }) => {
		const field = page.getByRole('button', { name: /Feldmodus/ });
		// Fokus über die Tastatur setzen, damit :focus-visible greift.
		await field.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(field).toBeFocused();

		await expect
			.poll(async () =>
				field.evaluate((el) => {
					const probe = document.createElement('span');
					probe.style.cssText =
						'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--color-primary)';
					document.body.appendChild(probe);
					const primary = getComputedStyle(probe).color;
					probe.remove();

					const style = getComputedStyle(el);
					return {
						focusVisible: el.matches(':focus-visible'),
						style: style.outlineStyle,
						width: style.outlineWidth,
						colorIsPrimary: style.outlineColor === primary
					};
				})
			)
			.toEqual({ focusVisible: true, style: 'solid', width: '2px', colorIsPrimary: true });
	});

	/* Das Muster aus PR 1, an der Stelle geprüft, an der die Seite es zeigt:
	   die 44px trägt das Label, das Control bleibt auf --control-size (28px).
	   Im Feldmodus wächst nur das Label. */
	for (const control of ['checkbox', 'toggle', 'radio']) {
		test(`${control}: das Ziel ist das Label, nicht das Control`, async ({ page }) => {
			const label = page.locator(`[data-token-target="${control}"]`);
			const input = label.locator('input');

			expect((await label.boundingBox())?.height).toBeGreaterThanOrEqual(44);
			expect((await input.boundingBox())?.height).toBeCloseTo(28, 0);

			await page.getByRole('button', { name: /Feldmodus/ }).click();
			await expect.poll(async () => (await label.boundingBox())?.height).toBeGreaterThanOrEqual(56);
			expect((await input.boundingBox())?.height).toBeCloseTo(28, 0);
		});
	}
});

/* Bekannt rot bis PR 4 — läuft deshalb bewusst NICHT mit.
   Die Gruppe scannt den Bestand und listet jede Aufrufstelle, die eine
   Flächen-Statusfarbe als Vordergrund verwendet, Text unter Deckkraft /60
   setzt oder eine Tailwind-Paletten-Farbe am Theme vorbei nutzt (Befunde F2,
   F3 und F11 des Reviews — über 60 Stellen).

   `describe.fixme` überspringt die Tests, sie erzeugen im normalen Lauf also
   weder Rot noch Ausgabe — das ist hier der Zweck: CI bleibt grün, ohne dass
   die Assertions aufgeweicht werden. Die Arbeitsliste holt man sich gezielt,
   indem man `.fixme` temporär entfernt und nur diese Datei laufen lässt:

     npx playwright test e2e/design-tokens.spec.ts --reporter=list

   Die Fehlermeldung jedes Tests enthält dann die gefundenen Aufrufstellen
   (max. 20 pro Route). PR 4 arbeitet sie ab; danach fällt `.fixme` dauerhaft
   weg und die Gruppe wird zum echten Guard.

   Die Regex NICHT aufweichen, um die Gruppe grün zu bekommen: sie wäre genau
   dann wertlos, wenn sie nur noch findet, was ohnehin konform ist. */
test.describe.fixme('Design-Tokens — verbotene Kombinationen im DOM', () => {
	/* Ruhezustand-Scan. Hover-Zustände tauchen in getComputedStyle nicht auf
	   und sind hier deshalb nicht prüfbar — dafür gilt die Regel in
	   design-system.md („text-error nicht auf base-300"). */
	const ROUTES = ['/', '/map', '/about'];

	for (const route of ROUTES) {
		test(`${route}: keine Statusfarbe als Textfarbe`, async ({ page }) => {
			await page.goto(route);
			const offenders = await page.evaluate(() => {
				/* getAttribute('class'), NICHT el.className: bei SVG-Elementen ist
				   className ein SVGAnimatedString, das als "[object SVGAnimatedString]"
				   stringifiziert — der Scan würde ausgerechnet die Icons verfehlen, für
				   die diese Regel gedacht ist (Icon.svelte rendert <svg class="…">). */
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned = /(^|\s)text-(info|success|warning|secondary|accent)(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)))
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(
				offenders,
				'Flächen-Statusfarben als Vordergrund verwenden — stattdessen text-*-strong'
			).toEqual([]);
		});

		test(`${route}: keine Textfarbe unter Deckkraft /60`, async ({ page }) => {
			await page.goto(route);
			const offenders = await page.evaluate(() => {
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned = /(^|\s)(text-base-content\/(40|50)|opacity-(40|50))(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)) && (el.textContent ?? '').trim().length > 0)
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(offenders, '/40 und /50 sind dekorativ, nicht für Text').toEqual([]);
		});

		test(`${route}: keine Tailwind-Paletten-Farben`, async ({ page }) => {
			await page.goto(route);
			const offenders = await page.evaluate(() => {
				const cls = (el: Element) => el.getAttribute('class') ?? '';
				const banned =
					/(^|\s)(bg|text|border)-(gray|slate|zinc|red|green|blue|yellow|amber|emerald|sky|indigo|orange)-\d{2,3}(\s|$)/;
				return [...document.querySelectorAll('[class]')]
					.filter((el) => banned.test(cls(el)))
					.map((el) => `${el.tagName.toLowerCase()}.${cls(el)}`)
					.slice(0, 20);
			});
			expect(offenders, 'Theme-Tokens statt Tailwind-Palette (daisyui.md)').toEqual([]);
		});
	}
});
