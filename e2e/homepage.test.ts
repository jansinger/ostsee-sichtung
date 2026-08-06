import { expect, test } from '@playwright/test';
import { FormPage } from './pages/FormPage';

test.describe('Homepage', () => {
	test('should load the homepage with main form', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expect(page).toHaveTitle(/Ostsee-Tiere/);
		await expect(formPage.getForm()).toBeVisible();
		await expect(
			page.getByRole('button').or(page.getByRole('textbox')).or(page.getByRole('combobox')).first()
		).toBeVisible();
	});

	test('should have proper meta tags', async ({ page }) => {
		await page.goto('/?meldung=lebend');

		await expect(page).toHaveTitle(/Ostsee-Tiere/);
		const metaDescription = page.locator('meta[name="description"]').first();
		await expect(metaDescription).toHaveAttribute(
			'content',
			/Ostsee.*(Wal|Robben|Meerestier|Sichtung)/i
		);
	});

	test('should render page content properly', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expect(page.locator('body')).toBeVisible();
		await expect(formPage.getForm()).toBeVisible();
		const interactiveElements = page.getByRole('button').or(page.getByRole('textbox'));
		await expect(interactiveElements.first()).toBeVisible();
	});
});

test.describe('Form Navigation', () => {
	test('should show form step indicators', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expect(page.locator('.step-button', { hasText: 'Position & Zeitpunkt' })).toBeVisible();
		await expect(formPage.getActiveStepButton()).toBeVisible();
	});

	test('should have working form elements', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expect(formPage.getForm()).toBeVisible();
		const formInputs = page
			.getByRole('textbox')
			.or(page.getByRole('combobox'))
			.or(page.getByRole('spinbutton'));
		await expect(formInputs.first()).toBeVisible();
	});

	test('should have visible step buttons with correct disabled state', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expect(formPage.getForm()).toBeVisible();

		// All step buttons should be visible
		const stepNames = [
			'Position & Zeitpunkt',
			'Angaben zum Tier',
			'Weitere Informationen',
			'Kontaktdaten'
		] as const;
		// Anker ist der sichtbare Titel, nicht der `aria-label`: Der Label-Text
		// benennt seit der Stepper-Affordanz die Aktion („Zurück zu Schritt 1: …")
		// und hat mit `stepLabels.test.ts` plus `form-stepper-affordance.spec.ts`
		// eigene Tests. Ein exakter Attribut-Selektor hier koppelte diese Tests an
		// eine Formulierung, die sie gar nicht prüfen wollen.
		for (const name of stepNames) {
			await expect(page.locator('.step-button', { hasText: name })).toBeVisible();
		}

		// On Step 1: current step should be navigable
		const ersterSchritt = page.locator('.step-button', { hasText: 'Position & Zeitpunkt' });
		await expect(ersterSchritt).toHaveAttribute('aria-disabled', 'false');
		await expect(ersterSchritt).toHaveAttribute('aria-label', /Position & Zeitpunkt/i);
	});

	test('active step starts on Position & Zeitpunkt', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const currentStep = await formPage.getCurrentStep();
		expect(currentStep).toMatch(/Position & Zeitpunkt/i);
	});
});
