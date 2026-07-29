import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe.serial('Map Filter Panel', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		sharedPage = await browser.newPage();
		mapPage = await setupMapPage(sharedPage);
	});

	test.afterAll(async () => {
		await sharedPage.close();
	});

	test('Tastatur-Shortcut F öffnet Filter-Panel', async () => {
		// H7: Zeichen-Shortcuts wirken nur bei Fokus in der Karten-Region
		await mapPage.getMapContainer().focus();
		await sharedPage.keyboard.press('f');
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);
		await mapPage.closeFilter();
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
			await mapPage.closeFilter();
		} else {
			// Nur eine Option verfügbar — Test überspringen
			test.skip();
		}
	});

	test('Jahreswechsel zeigt keinen Vollbild-Loading-Overlay mehr (M7)', async () => {
		// M7: Das modale Vollbild-Overlay ist dem Initial-Load vorbehalten —
		// Filter-/Jahreswechsel zeigen nur den Inline-Spinner im Filter-Panel.
		// API künstlich verzögern, damit der Ladezustand beobachtbar ist.
		await sharedPage.route('**/api/map/sightings?*', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 700));
			await route.continue();
		});

		await mapPage.openFilter();
		const yearSelect = mapPage.getYearSelect();
		const options = yearSelect.locator('option');
		const count = await options.count();
		const targetYear = await options.nth(count > 1 ? count - 1 : 0).getAttribute('value');

		if (targetYear) {
			const responsePromise = mapPage.waitForSightingsResponse();
			await mapPage.selectYear(targetYear);

			// Während des laufenden Requests: kein Vollbild-Overlay
			await expect(mapPage.getLoadingOverlay()).toBeHidden();

			await responsePromise;
		}

		await sharedPage.unroute('**/api/map/sightings?*');
		await mapPage.closeFilter();
	});

	test('Suchtext in Eingabefeld löst API-Call mit search-Parameter aus', async () => {
		await mapPage.openFilter();

		// Typing in the search field triggers a debounced API call (300ms)
		const responsePromise = mapPage.waitForSightingsResponse('search=Schweinswal');
		await mapPage.fillSearch('Schweinswal');
		const response = await responsePromise;

		expect(response.url()).toContain('search=Schweinswal');
		await mapPage.closeFilter();
	});
});
