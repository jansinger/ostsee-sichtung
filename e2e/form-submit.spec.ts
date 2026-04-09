import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

const today = new Date().toISOString().substring(0, 10);

/** Wait for the active step indicator to show a specific step name */
async function expectCurrentStep(page: ReturnType<typeof test.extend>, pattern: RegExp) {
	// Use Playwright's built-in retry logic (toHaveAttribute retries automatically)
	await expect(page.locator('button[aria-current="step"]')).toHaveAttribute('aria-label', pattern, {
		timeout: 5000
	});
}

test.describe('Sichtung melden — Formular Navigation', () => {
	test('Formular startet auf Step 1 (Position & Zeit)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expectCurrentStep(page, /Position & Zeit/i);
	});

	test('Step 1: Datum eingeben und zu Step 2 navigieren', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await formPage.fillDate(today);
		await formPage.fillTime('14:30');

		// Wait for Next button to be enabled (Svelte reactive validation runs after fill)
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();

		// Use Playwright's retrying assertion for reactive DOM updates
		await expectCurrentStep(page, /Sichtungsdetails/i);
	});

	test('Zurück-Button kehrt zum vorherigen Step zurück', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ausfüllen und weiter
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Zurück zu Step 1
		await formPage.clickPrevious();
		await expectCurrentStep(page, /Position & Zeit/i);
	});

	test('Step-Buttons zeigen aktuellen Schritt als aria-current="step"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Auf Step 1: "Position & Zeit" ist aktiv
		await expectCurrentStep(page, /Position & Zeit/i);

		// Nach Weiter: "Sichtungsdetails" ist aktiv
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);
	});
});
