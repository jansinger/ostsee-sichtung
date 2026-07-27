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
		const probe = document.createElement('span');
		probe.style.color = 'var(--color-primary)';
		(el.parentElement ?? document.body).appendChild(probe);
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
