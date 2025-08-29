import { expect, test } from '@playwright/test';

test('home page has expected h1', async ({ page }) => {
	await page.goto('/');
	
	// Warte darauf, dass die Seite vollständig geladen ist
	await page.waitForLoadState('networkidle');
	
	// Versuche verschiedene Selektoren für den Haupttitel
	// Der Titel könnte in verschiedenen Elementen sein, je nach iframe-Status
	const heading = page.locator('h1, h2, [role="heading"]').first();
	await expect(heading).toBeVisible({ timeout: 10000 });
	
	// Flexiblere Text-Prüfung für verschiedene mögliche Titel
	await expect(heading).toContainText(/Meerestier|Sichtung|melden/i);
});
