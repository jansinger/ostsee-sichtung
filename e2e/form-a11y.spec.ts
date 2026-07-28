import { test, expect, type Locator } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1, fillStep2, expectCurrentStep } from './helpers/form-helpers';

// ── Phase 5A: FormSteps Indicator ──────────────────────────────────────────

test.describe('FormSteps — Step-Indikator', () => {
	test('zeigt 4 Step-Indikatoren', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const steps = page.locator('.step-button');
		await expect(steps).toHaveCount(4);
	});

	test('aktueller Step hat aria-current="step"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const activeStep = page.locator('[aria-current="step"]');
		await expect(activeStep).toBeVisible();
		await expect(activeStep).toHaveAttribute('aria-label', /Position & Zeit/i);
	});

	test('Klick auf navigierbaren Step wechselt Step', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 2
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Click on Step 1 indicator (backward = always allowed)
		const step1Button = page.locator('.step-button').nth(0);
		await step1Button.click();
		await expectCurrentStep(page, /Position & Zeit/i);
	});
});

// ── Phase 5B: RequiredConsent ──────────────────────────────────────────────

test.describe('RequiredConsent — Datenschutz', () => {
	test('Consent-Block ist auf Step 4 sichtbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 4
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();

		// Fill Step 2 (sightingFrom = Land → boatDrive bleibt ausgeblendet, keine Pflicht)
		await formPage.selectSpecies(0);
		await formPage.fillTotalCount(2);
		await formPage.selectDistance(1);
		await formPage.selectSightingFrom(3);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();

		// Skip Step 3
		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		// Privacy consent checkbox should be visible
		const consent = page.locator('[data-testid="field-privacyConsent"]');
		await expect(consent).toBeVisible();
	});

	test('Consent-Block ist auf Step 1 NICHT sichtbar', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Privacy consent should not be on Step 1
		const consent = page.locator('[data-testid="field-privacyConsent"]');
		await expect(consent).not.toBeVisible();
	});
});

// ── Phase 5C: Keyboard Navigation & Accessibility ──────────────────────────

test.describe('Accessibility — Keyboard Navigation', () => {
	test('Tab navigiert durch Formularfelder', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Tab into the form - should reach the date field
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');
		await page.keyboard.press('Tab');

		// Some focusable element should be focused
		const focused = page.locator(':focus');
		await expect(focused).toBeVisible();
	});

	test('Error-Messages haben role="alert"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ist mit fillStep1() valide → Navigation zu Step 2 gelingt ohne Fehler
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Step 2 hat leere Pflichtfelder → erst der Klick auf "Weiter" löst die
		// Inline-Fehlermeldung aus (kein automatisches Erscheinen beim Betreten)
		await formPage.clickNext();

		// Inline validation error is shown above the Next button
		await page.locator('[role="alert"]').first().waitFor({ state: 'visible' });

		// Check role="alert" elements exist
		await expect(page.locator('[role="alert"]').first()).toBeVisible();
	});

	test('Formular hat korrekte aria-labels auf Navigation', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigation should have aria-label
		const nav = page.locator('nav[aria-label="Formular-Schritte"]');
		await expect(nav).toBeVisible();

		// Buttons should have aria-labels
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Vorheriger Schritt/i })).toBeVisible();
	});
});

// ── Phase 5D: Fokus-Indikator auf Formularfeldern ──────────────────────────

/**
 * Schützt den Override `.input/.select/.textarea:focus` aus `src/app.css`
 * (3px-Outline in `--color-primary`, siehe `.claude/rules/daisyui.md`).
 *
 * Der Test muss im echten Browser laufen: DaisyUI setzt für dieselben Felder
 * ein eigenes `outline: 2px solid var(--input-color)` (= `--color-base-content`)
 * innerhalb von `@layer utilities`. Dass der projekteigene, ungelayerte Override
 * gewinnt, ergibt sich erst aus der vollständigen Kaskade des gebauten CSS —
 * ein Unit-Test über die CSS-Quelle würde eine Regression hier nicht bemerken.
 *
 * Achtung bei manueller Nachprüfung: `:focus` greift nur, wenn das Browser-
 * fenster den Fokus hat. Ein `getComputedStyle`-Sample aus einem unfokussierten
 * Fenster liefert stattdessen DaisyUIs 2px und `currentColor`
 * (= `--color-base-content`) und sieht fälschlich nach einem Bug aus.
 */
async function readFocusIndicator(field: Locator) {
	return field.evaluate((el) => {
		// `--color-primary` über ein Probe-Element auflösen, damit Soll- und
		// Ist-Farbe durch dieselbe Browser-Serialisierung laufen (oklch(...)).
		// Das Element hängt an `document.body` (die Variable kommt vom Theme-Root)
		// und ist layout-neutral — es darf das Formular-DOM nicht beeinflussen.
		const probe = document.createElement('span');
		probe.style.cssText =
			'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;color:var(--color-primary)';
		document.body.appendChild(probe);
		const primary = getComputedStyle(probe).color;
		probe.remove();

		const style = getComputedStyle(el);
		return {
			width: style.outlineWidth,
			style: style.outlineStyle,
			color: style.outlineColor,
			offset: style.outlineOffset,
			boxShadow: style.boxShadow,
			primary,
			focusVisible: el.matches(':focus-visible')
		};
	});
}

/**
 * Gepollt, weil `BaseSelect` und `BaseTextarea` `transition-all duration-200`
 * setzen: `outline-offset` wird dadurch mit-animiert und ist unmittelbar nach
 * dem Fokussieren noch `0px`. Ein einmaliges `getComputedStyle` würde je nach
 * Timing den Zwischenwert sehen.
 */
async function expectPrimaryFocusRing(field: Locator) {
	await expect
		.poll(async () => {
			const indicator = await readFocusIndicator(field);
			return {
				style: indicator.style,
				width: indicator.width,
				offset: indicator.offset,
				// Farbe muss `--color-primary` sein — nicht DaisyUIs `--color-base-content`
				colorIsPrimary: indicator.color === indicator.primary,
				// Zusätzlicher 4px-Ring aus demselben Regelblock; DaisyUIs
				// Fokus-Regel setzt an dieser Stelle einen 1px-Inset-Schatten.
				hasOuterRing: indicator.boxShadow.includes('0px 0px 0px 4px')
			};
		})
		.toEqual({
			style: 'solid',
			width: '3px',
			offset: '2px',
			colorIsPrimary: true,
			hasOuterRing: true
		});
}

test.describe('Accessibility — Fokus-Indikator', () => {
	test('Text-Input zeigt bei Tastatur-Fokus den 3px-Primary-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const field = page.locator('[data-testid="field-waterway"]');
		// Shift+Tab und zurück → echter Tastatur-Fokus (setzt :focus-visible),
		// ohne die Tab-Stopps ab Seitenanfang abzählen zu müssen.
		await field.focus();
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.press('Tab');
		await expect(field).toBeFocused();

		expect((await readFocusIndicator(field)).focusVisible).toBe(true);
		await expectPrimaryFocusRing(field);
	});

	test('Select zeigt denselben Fokus-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		const field = page.locator('[data-testid="field-species"]');
		await field.focus();
		await expect(field).toBeFocused();

		await expectPrimaryFocusRing(field);
	});

	test('Textarea zeigt denselben Fokus-Ring', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// `notes` steht auf Schritt 4 (Kontaktdaten), nicht auf "Beobachtungen".
		await fillStep1(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		await fillStep2(formPage);
		await formPage.clickNext();
		await expectCurrentStep(page, /Beobachtungen/i);

		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		const field = page.locator('[data-testid="field-notes"]');
		await field.focus();
		await expect(field).toBeFocused();

		await expectPrimaryFocusRing(field);
	});
});

// ── Alert-Kontrast (Theme-Override in src/app.css) ─────────────────────────

/**
 * Schützt den Alert-Override `.alert-info/.alert-success/.alert-warning/
 * .alert-error` aus `src/app.css` gegen einen Rückfall auf die Statusfarbe als
 * Textfarbe.
 *
 * Warum im echten Browser und nicht über die CSS-Quelle: Die beteiligten Werte
 * sind `oklch()`-Tokens, die per `color-mix(in oklab, …)` zu Hintergrund und
 * Rahmen verrechnet werden. Ein Kontrastwert lässt sich daraus nur ableiten,
 * wenn die Browser-Engine die Farben tatsächlich auflöst — inklusive
 * Gamut-Mapping nach sRGB. Der Canvas-Umweg unten erzwingt genau diese
 * Auflösung: `fillStyle` akzeptiert den serialisierten Computed Value,
 * `getImageData` liefert die echten sRGB-Bytes zurück.
 *
 * Der Fehler, den dieser Test verhindert, hatte alle vier Varianten zwischen
 * 2,45:1 und 3,84:1 gehalten (WCAG 1.4.3 verlangt 4,5:1 für Fließtext) — die
 * Statusfarbe stand als Text auf einem 12-%-Tint ihrer selbst.
 */
const ALERT_VARIANTS = ['alert-info', 'alert-success', 'alert-warning', 'alert-error'] as const;

async function measureAlertContrast(page: import('@playwright/test').Page) {
	return page.evaluate(
		(variants: readonly string[]) => {
			const canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = 1;
			const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

			/** Serialisierte CSS-Farbe (oklab/color-mix/oklch) → sRGB-Bytes. */
			function toRgb(cssColor: string): [number, number, number] {
				ctx.clearRect(0, 0, 1, 1);
				ctx.fillStyle = '#000000';
				ctx.fillStyle = cssColor;
				ctx.fillRect(0, 0, 1, 1);
				const d = ctx.getImageData(0, 0, 1, 1).data;
				return [d[0], d[1], d[2]];
			}

			function luminance([r, g, b]: [number, number, number]): number {
				const lin = [r, g, b]
					.map((v) => v / 255)
					.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
				return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
			}

			return variants.map((variant) => {
				const probe = document.createElement('div');
				probe.className = `alert ${variant}`;
				probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;pointer-events:none';
				probe.innerHTML = '<span>Kontrastprobe</span>';
				document.body.appendChild(probe);

				const style = getComputedStyle(probe);
				const fg = toRgb(style.color);
				const bg = toRgb(style.backgroundColor);
				probe.remove();

				const l1 = luminance(fg);
				const l2 = luminance(bg);
				const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
				return { variant, ratio: Math.round(ratio * 100) / 100 };
			});
		},
		[...ALERT_VARIANTS] as string[]
	);
}

test.describe('Accessibility — Alert-Kontrast', () => {
	test('alle vier Alert-Varianten erreichen WCAG AA (4,5:1)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const measured = await measureAlertContrast(page);

		expect(measured).toHaveLength(ALERT_VARIANTS.length);
		for (const { variant, ratio } of measured) {
			expect(ratio, `${variant}: gemessen ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
		}
	});
});
