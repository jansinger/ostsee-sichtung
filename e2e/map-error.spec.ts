import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Error State', () => {
	test('API-Fehler beim initialen Laden zeigt Fehlermeldung', async ({ page }) => {
		await page.route('**/api/map/sightings**', (route) => route.abort());

		await page.goto('/map');

		const mapPage = new MapPage(page);
		const errorAlert = mapPage.getErrorAlert();
		await expect(errorAlert).toBeVisible({ timeout: 15000 });
		await expect(errorAlert).toContainText('Fehler');
	});

	test('Fehlermeldung enthält hilfreichen Text', async ({ page }) => {
		await page.route('**/api/map/sightings**', (route) => route.abort());

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 15000 });
		await expect(mapPage.getErrorAlert()).toContainText('Kartendaten');
	});

	test('Fehlermeldung kann über Schließen-Button geschlossen werden', async ({ page }) => {
		await page.route('**/api/map/sightings**', (route) => route.abort());

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 15000 });

		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();
	});

	test('API-Fehler beim Jahreswechsel zeigt Fehlermeldung', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		// Set up failure only for future requests (initial load already succeeded)
		await page.route('**/api/map/sightings**', (route) => route.abort());

		await mapPage.openFilter();

		const yearSelect = mapPage.getYearSelect();
		const options = yearSelect.locator('option');
		const count = await options.count();

		if (count > 1) {
			const targetYear = await options.nth(1).getAttribute('value');
			if (targetYear) {
				await mapPage.selectYear(targetYear);
				await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 10000 });
			} else {
				test.skip();
			}
		} else {
			test.skip();
		}
	});

	test('Fehlermeldung erscheint erneut nach erneutem Fehler', async ({ page }) => {
		await page.route('**/api/map/sightings**', (route) => route.abort());

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 15000 });

		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();

		// Remove route interception and set up a new one to trigger a second error
		await page.unroute('**/api/map/sightings**');
		await page.route('**/api/map/sightings**', (route) => route.abort());

		// Trigger a new API call via keyboard shortcut Z (zoom-to-all)
		// or by simulating an unhandled rejection
		await page.evaluate(() => {
			const err = new Error('Zweiter Fehler');
			window.dispatchEvent(
				new PromiseRejectionEvent('unhandledrejection', {
					promise: Promise.reject(err),
					reason: err,
					cancelable: true,
					bubbles: false
				})
			);
		});

		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 3000 });
	});
});
