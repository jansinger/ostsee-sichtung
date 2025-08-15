import { test, expect } from '@playwright/test';

test.describe('Basic Tests', () => {
	test('server is running', async ({ page }) => {
		// Use baseURL from config
		const response = await page.goto('/');
		expect(response?.status()).toBe(200);
	});

	test('page has title', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/Ostsee/);
	});

	test('page loads basic elements', async ({ page }) => {
		await page.goto('/');
		
		// Wait for page to be interactive
		await page.waitForLoadState('networkidle');
		
		// Check if page has some content
		const body = page.locator('body');
		await expect(body).toBeVisible();
		
		// Check for main content container
		const main = page.locator('main, [role="main"], .container, #app, .app').first();
		if (await main.count() > 0) {
			await expect(main).toBeVisible();
		}
	});
});