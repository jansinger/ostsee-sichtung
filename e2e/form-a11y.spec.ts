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

		// Fill Step 2
		await formPage.selectSpecies(0);
		await formPage.fillTotalCount(2);
		await formPage.selectDistance(1);
		await formPage.selectSightingFrom(3);
		await formPage.selectBoatDrive(1);
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

		// Navigate to Step 2 and trigger validation
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await formPage.clickNext(); // Trigger validation errors

		// Wait for validation errors
		await page.waitForTimeout(500);

		// Check role="alert" elements exist
		const alerts = page.locator('[role="alert"]');
		const count = await alerts.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});

	test('Formular hat korrekte aria-labels auf Navigation', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigation should have aria-label
		const nav = page.locator('nav[aria-label="Formular Navigation"]');
		await expect(nav).toBeVisible();

		// Buttons should have aria-labels
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /Vorheriger Schritt/i })).toBeVisible();
	});
});
