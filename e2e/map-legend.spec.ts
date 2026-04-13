import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe('Map Legend Panel', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		mapPage = await setupMapPage(page);
	});

	test('Tastatur-Shortcut L öffnet Legende-Panel', async ({ page }) => {
		// Focus the page body to ensure keyboard events are received
		await page.locator('body').click();
		await page.keyboard.press('l');
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');
		await expect(mapPage.getColorCheckboxes().first()).toBeVisible();
	});
});
