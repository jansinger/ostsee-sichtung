import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe('Map Legend Panel', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		mapPage = await setupMapPage(page);
	});

	test('Tastatur-Shortcut L öffnet Legende-Panel', async ({ page }) => {
		// H7: Zeichen-Shortcuts wirken nur bei Fokus in der Karten-Region
		await mapPage.getMapContainer().focus();
		await page.keyboard.press('l');
		await expect(mapPage.getLegendPanel()).toHaveJSProperty('inert', false);
		await expect(mapPage.getColorCheckboxes().first()).toBeVisible();
	});
});
