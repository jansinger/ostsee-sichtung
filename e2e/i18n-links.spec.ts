import { expect, test } from '@playwright/test';

/**
 * Task 8: Interne Verweise müssen die Sprache mitnehmen.
 *
 * Ohne lokalisierte `href`s zeigt auf `/en` jeder interne Link weiter auf die
 * deutschen Pfade — der Nutzer fällt beim ersten Klick zurück auf Deutsch. Im
 * iframe auf meeresmuseum.de gibt es keine Navigation, über die er zurückfände
 * (Navbar/Footer sind dort ausgeblendet), also ist das kein kosmetischer
 * Befund, sondern macht `/en` unbenutzbar.
 */
test.describe('Sprache bleibt bei interner Navigation erhalten', () => {
	test('bleibt beim Navigieren in der englischen Fassung', async ({ page }) => {
		await page.goto('/en');
		await page
			.getByRole('link', { name: /map|karte/i })
			.first()
			.click();
		await expect(page).toHaveURL(/\/en\//);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});
});
