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
		await page.goto('/');

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

		await expect(page.getByRole('tab', { name: /Position & Zeit/i })).toBeVisible();
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
			'Position & Zeit',
			'Sichtungsdetails',
			'Beobachtungen',
			'Kontaktdaten'
		] as const;
		for (const name of stepNames) {
			await expect(page.getByRole('tab', { name })).toBeVisible();
		}

		// On Step 1: current step should be navigable
		await expect(page.getByRole('tab', { name: 'Position & Zeit' })).toHaveAttribute(
			'aria-disabled',
			'false'
		);

		await expect(page.getByRole('tab', { name: /Position & Zeit/i })).toHaveAttribute(
			'aria-label',
			/Position & Zeit/i
		);
	});

	test('active step starts on Position & Zeit', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const currentStep = await formPage.getCurrentStep();
		expect(currentStep).toMatch(/Position & Zeit/i);
	});
});
