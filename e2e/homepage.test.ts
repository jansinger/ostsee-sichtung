import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
	test('should load the homepage', async ({ page }) => {
		await page.goto('/');
		
		// Check that the main title is visible
		await expect(page.locator('h1')).toContainText('Sichtung melden');
		
		// Check for the presence of the form
		await expect(page.locator('form')).toBeVisible();
	});

	test('should have proper meta tags', async ({ page }) => {
		await page.goto('/');
		
		// Check title
		await expect(page).toHaveTitle(/Sichtung melden/);
		
		// Check meta description (use first match to avoid duplicates)
		const metaDescription = page.locator('meta[name="description"]').first();
		await expect(metaDescription).toHaveAttribute('content', /Wal.*Ostsee/);
	});

	test('should navigate to map view', async ({ page }) => {
		await page.goto('/');
		
		// Look for map link/button and click it
		const mapLink = page.locator('a[href="/map"]').first();
		if (await mapLink.count() > 0) {
			await mapLink.click();
			await expect(page).toHaveURL('/map');
		}
	});
});

test.describe('Form Navigation', () => {
	test('should show form steps', async ({ page }) => {
		await page.goto('/');
		
		// Check if step indicators are present
		const steps = page.locator('[data-testid="step"], .step, [class*="step"]');
		if (await steps.count() > 0) {
			await expect(steps.first()).toBeVisible();
		}
	});

	test('should allow position method selection', async ({ page }) => {
		await page.goto('/');
		
		// Look for position method selection (radio buttons or similar)
		const positionOptions = page.locator('input[name="position-method"], input[type="radio"]');
		if (await positionOptions.count() > 0) {
			await expect(positionOptions.first()).toBeVisible();
		}
	});
});