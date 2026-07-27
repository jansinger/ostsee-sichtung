import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1, expectCurrentStep } from './helpers/form-helpers';

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
