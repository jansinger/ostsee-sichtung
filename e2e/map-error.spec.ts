import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { mockMapSightingsAbort, mockMapSightingsHttp500, mockMapSightingsSuccess } from './fixtures/mockApi';

// Error tests need generous timeouts because the map component must lazy-load
// OpenLayers before the API error can be displayed. In CI this can take 20s+.
const ERROR_TIMEOUT = MAP_TEST_TIMEOUTS.errorDisplay;

test.describe('Map Error State', () => {
	test('API-Fehler beim initialen Laden zeigt Fehlermeldung', async ({ page }) => {
		await mockMapSightingsAbort(page);

		await page.goto('/map');

		const mapPage = new MapPage(page);
		const errorAlert = mapPage.getErrorAlert();
		await expect(errorAlert).toBeVisible({ timeout: ERROR_TIMEOUT });
		await expect(errorAlert).toContainText('Fehler');
	});

	test('Fehlermeldung enthält hilfreichen Text', async ({ page }) => {
		await mockMapSightingsAbort(page);

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: ERROR_TIMEOUT });
		await expect(mapPage.getErrorAlert()).toContainText('Kartendaten');
	});

	test('Fehlermeldung kann über Schließen-Button geschlossen werden', async ({ page }) => {
		await mockMapSightingsAbort(page);

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: ERROR_TIMEOUT });

		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();
	});

	test('HTTP 500 Antwort zeigt Fehlermeldung', async ({ page }) => {
		await mockMapSightingsHttp500(page);

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: ERROR_TIMEOUT });
		await expect(mapPage.getErrorAlert()).toContainText('Fehler');
	});

	test('API-Fehler beim Jahreswechsel zeigt Fehlermeldung', async ({ page }) => {
		// Mock initial load so map loads cleanly without a real database
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		// Override to abort for future requests (year-change triggers the error)
		await page.unroute('**/api/map/sightings**');
		await mockMapSightingsAbort(page);

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
		await mockMapSightingsAbort(page);

		await page.goto('/map');

		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: ERROR_TIMEOUT });

		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();

		// Remove route interception and set up a new one to trigger a second error
		await page.unroute('**/api/map/sightings**');
		await mockMapSightingsAbort(page);

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
