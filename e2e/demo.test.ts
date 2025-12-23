import { expect, test } from '@playwright/test';

test('home page loads successfully', async ({ page }) => {
	await page.goto('/');

	// Page should have correct title
	await expect(page).toHaveTitle(/Ostsee-Tiere/i);

	// Main form should be visible
	await expect(page.locator('form').first()).toBeVisible();

	// Should have interactive form elements
	const formElements = page
		.getByRole('button')
		.or(page.getByRole('textbox'))
		.or(page.getByRole('combobox'));
	await expect(formElements.first()).toBeVisible();
});
