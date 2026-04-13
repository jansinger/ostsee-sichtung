import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe('Map Filter Panel', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		mapPage = await setupMapPage(page);
	});

	test('Tastatur-Shortcut F öffnet Filter-Panel', async ({ page }) => {
		// Focus the page body to ensure keyboard events are received
		await page.locator('body').click();
		await page.keyboard.press('f');
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'false');
	});

	test('Jahr auswählen löst API-Call mit year-Parameter aus', async () => {
		await mapPage.openFilter();

		// Verfügbare Jahres-Optionen ermitteln
		const yearSelect = mapPage.getYearSelect();
		const options = yearSelect.locator('option');
		const count = await options.count();
		// Zweite Option wählen (neuestes Jahr)
		const targetOption = options.nth(count > 1 ? 1 : 0);
		const targetYear = await targetOption.getAttribute('value');

		if (targetYear && targetYear !== '') {
			const responsePromise = mapPage.waitForSightingsResponse();
			await mapPage.selectYear(targetYear);
			const response = await responsePromise;

			expect(response.url()).toContain(`year=${targetYear}`);
		} else {
			// Nur eine Option verfügbar — Test überspringen
			test.skip();
		}
	});

	test('Suchtext in Eingabefeld löst API-Call mit search-Parameter aus', async () => {
		await mapPage.openFilter();

		// Typing in the search field triggers a debounced API call (300ms)
		const responsePromise = mapPage.waitForSightingsResponse('search=Schweinswal');
		await mapPage.fillSearch('Schweinswal');
		const response = await responsePromise;

		expect(response.url()).toContain('search=Schweinswal');
	});
});
