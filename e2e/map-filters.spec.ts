import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Filter Panel', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();
	});

	test('Filter-Panel öffnet sich via Button', async () => {
		await mapPage.openFilter();

		const panel = mapPage.getFilterPanel();
		await expect(panel).toHaveAttribute('aria-hidden', 'false');
		await expect(mapPage.getYearSelect()).toBeVisible();
		await expect(mapPage.getFilterInput()).toBeVisible();
	});

	test('Filter-Panel schließt sich via Schließen-Button', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'false');

		await mapPage.closeFilter();
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'true');
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
		// Zweite Option wählen (erste ist oft "Alle Jahre")
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

	test('Suchtext bleibt nach Panel-Schließen erhalten', async () => {
		await mapPage.openFilter();
		await mapPage.fillSearch('Seehund');

		await mapPage.closeFilter();
		await mapPage.openFilter();

		// Input muss den gesuchten Term noch anzeigen — kein hidden state
		await expect(mapPage.getFilterInput()).toHaveValue('Seehund');
	});

	test('Filter-Panel zeigt Jahres-Optionen in Auswahl', async () => {
		await mapPage.openFilter();

		const options = mapPage.getYearSelect().locator('option');
		const count = await options.count();
		expect(count).toBeGreaterThan(0);
	});
});
