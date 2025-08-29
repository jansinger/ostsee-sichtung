import { expect, test } from '@playwright/test';

test('home page has expected content', async ({ page }) => {
	await page.goto('/');
	
	// Warte darauf, dass die Seite vollständig geladen ist
	await page.waitForLoadState('networkidle');
	
	// Universeller Test: Prüfe dass die Seite korrekt funktioniert
	// indem wir nach den charakteristischen Inhalten suchen
	
	// Option 1: Das Haupt-h1 ist sichtbar (nicht-iframe Modus)
	const mainHeading = page.locator('h1').filter({ hasText: /Meerestier.*Sichtung.*melden/i });
	const mainHeadingCount = await mainHeading.count();
	
	// Option 2: Form-Inhalte sind sichtbar (iframe oder nicht-iframe Modus)
	const formContent = page.locator('h2').filter({ hasText: /Position.*Zeit/i });
	const formContentCount = await formContent.count();
	
	// Einer der beiden sollte sichtbar sein
	if (mainHeadingCount > 0) {
		await expect(mainHeading).toBeVisible({ timeout: 10000 });
	} else if (formContentCount > 0) {
		await expect(formContent).toBeVisible({ timeout: 10000 });
	} else {
		// Fallback: Mindestens ein funktionelles Element sollte da sein
		const functionalElement = page.locator('form, button, input, select').first();
		await expect(functionalElement).toBeVisible({ timeout: 10000 });
	}
	
	// Zusätzliche Prüfung: Page-Title sollte korrekt sein
	await expect(page).toHaveTitle(/Ostsee-Tiere/i);
});
