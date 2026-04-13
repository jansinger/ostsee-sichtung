import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import {
	mockMapSightingsAbort,
	mockMapSightingsHttp500,
	mockMapSightingsSuccess
} from './fixtures/mockApi';

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

		// Override to abort for future requests (year-change triggers the error).
		// mockMapSightingsAbort already calls unroute internally via replaceMapSightingsRoute.
		await mockMapSightingsAbort(page);

		await mapPage.openFilter();

		const yearSelect = mapPage.getYearSelect();
		const options = yearSelect.locator('option');
		const count = await options.count();

		if (count > 1) {
			const targetYear = await options.nth(1).getAttribute('value');
			if (targetYear) {
				await mapPage.selectYear(targetYear);
				await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
			} else {
				test.skip();
			}
		} else {
			test.skip();
		}
	});

	test('Fehlermeldung hat role="alert" für Screen Reader', async ({ page }) => {
		await mockMapSightingsAbort(page);
		await page.goto('/map');

		const errorAlert = page.locator('.alert-error');
		await expect(errorAlert).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.errorDisplay });
		await expect(errorAlert).toHaveAttribute('role', 'alert');
	});

	test('Fehlermeldung erscheint erneut nach erneutem Fehler', async ({ page }) => {
		// Initial load with abort → first error appears
		await mockMapSightingsAbort(page);
		await page.goto('/map');
		const mapPage = new MapPage(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: ERROR_TIMEOUT });

		// Dismiss first error
		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();

		// Switch to success for map to load cleanly, then abort for second error
		await mockMapSightingsSuccess(page);
		await mapPage.waitForLoad();

		await mockMapSightingsAbort(page);
		await mapPage.openFilter();

		const options = mapPage.getYearSelect().locator('option');
		const count = await options.count();
		if (count > 1) {
			const targetYear = await options.nth(1).getAttribute('value');
			if (targetYear) {
				await mapPage.selectYear(targetYear);
				await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
			} else {
				test.skip();
			}
		} else {
			test.skip();
		}
	});
});
