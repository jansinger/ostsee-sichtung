import { test, expect } from '@playwright/test';

test.describe('Basic Application Tests', () => {
	test('server responds with 200', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.status()).toBe(200);
	});

	test('page has correct title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Ostsee/);
	});

	test('page has visible content', async ({ page }) => {
		await page.goto('/');

		// Body should be visible
		await expect(page.locator('body')).toBeVisible();

		// Should have at least one interactive element
		const buttons = page.getByRole('button');
		await expect(buttons.first()).toBeVisible();
	});

	test('form is accessible', async ({ page }) => {
		await page.goto('/');

		// Main form should be present
		const form = page.locator('form').first();
		await expect(form).toBeVisible();

		// Form should have labeled inputs
		const inputs = page.getByRole('textbox').or(page.getByRole('combobox'));
		const inputCount = await inputs.count();
		expect(inputCount).toBeGreaterThan(0);
	});
});
