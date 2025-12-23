import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
	test('should load the homepage with main form', async ({ page }) => {
		await page.goto('/');

		// Wait for page to be fully loaded
		await expect(page).toHaveTitle(/Ostsee-Tiere/);

		// Main form should be visible
		const mainForm = page.locator('form').first();
		await expect(mainForm).toBeVisible();

		// Form should have interactive elements
		await expect(
			page.getByRole('button').or(page.getByRole('textbox')).or(page.getByRole('combobox')).first()
		).toBeVisible();
	});

	test('should have proper meta tags', async ({ page }) => {
		await page.goto('/');

		// Check title
		await expect(page).toHaveTitle(/Ostsee-Tiere/);

		// Check meta description exists and has relevant content
		const metaDescription = page.locator('meta[name="description"]').first();
		await expect(metaDescription).toHaveAttribute('content', /.+/);
	});

	test('should render page content properly', async ({ page }) => {
		await page.goto('/');

		// Body should be visible
		await expect(page.locator('body')).toBeVisible();

		// Should have interactive elements (form is functional)
		const interactiveElements = page.getByRole('button').or(page.getByRole('textbox'));
		await expect(interactiveElements.first()).toBeVisible();

		// Form container should be visible
		await expect(page.locator('form').first()).toBeVisible();
	});
});

test.describe('Form Navigation', () => {
	test('should show form step indicators', async ({ page }) => {
		await page.goto('/');

		// Step indicators should be visible (buttons with step-related aria-labels)
		const stepButtons = page.locator('.steps button, [aria-current="step"]');
		await expect(stepButtons.first()).toBeVisible();

		// Should have multiple step indicators
		const stepCount = await stepButtons.count();
		expect(stepCount).toBeGreaterThan(0);
	});

	test('should have working form elements', async ({ page }) => {
		await page.goto('/');

		// Wait for form to be visible
		await expect(page.locator('form').first()).toBeVisible();

		// Form should contain input fields (textbox, combobox, or other inputs)
		const formInputs = page
			.getByRole('textbox')
			.or(page.getByRole('combobox'))
			.or(page.getByRole('spinbutton'));
		await expect(formInputs.first()).toBeVisible();
	});

	test('should have clickable step buttons', async ({ page }) => {
		await page.goto('/');

		// Wait for form to be fully loaded
		await expect(page.locator('form').first()).toBeVisible();

		// Find step buttons
		const stepButtons = page.locator('.steps button');
		await expect(stepButtons.first()).toBeVisible();
		const stepCount = await stepButtons.count();

		// Should have multiple step buttons
		expect(stepCount).toBeGreaterThan(1);

		// Each step button should be clickable (enabled)
		for (let i = 0; i < stepCount; i++) {
			await expect(stepButtons.nth(i)).toBeEnabled();
		}

		// Step buttons should have proper accessibility attributes
		await expect(stepButtons.first()).toHaveAttribute('aria-label', /.+/);
	});
});
