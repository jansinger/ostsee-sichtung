import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	// Warte auf den Haupttitel
	const heading = page.locator('h1').first();
	await expect(heading).toBeVisible();
	await expect(heading).toContainText('Meerestier-Sichtung melden');
});
