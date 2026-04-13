import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { setupMapPage } from './fixtures/mapSetup';

test.describe('Map Accessibility', () => {
	test.describe('interaktive Zustände', () => {
		let mapPage: MapPage;

		test.beforeEach(async ({ page }) => {
			mapPage = await setupMapPage(page);
		});

		test('Karten-Container hat role="application"', async () => {
			await expect(mapPage.getMapContainer()).toHaveAttribute('role', 'application');
		});

		test('Karten-Container hat aria-label mit Sichtungskarte', async () => {
			const label = await mapPage.getMapContainer().getAttribute('aria-label');
			expect(label).toMatch(/Sichtungskarte/i);
		});

		test('Tastatur-Shortcut H öffnet Hilfe-Modal', async ({ page }) => {
			await page.locator('body').click();
			await page.keyboard.press('h');

			const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
			await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		});

		test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async ({ page }) => {
			await page.locator('body').click();
			await page.keyboard.press('?');

			const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
			await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		});

		test('Escape schließt Hilfe-Modal', async ({ page }) => {
			await page.locator('body').click();
			await page.keyboard.press('h');
			const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
			await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });

			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		});

		test('ESC schließt offenes Filter-Panel', async ({ page }) => {
			await mapPage.openFilter();
			await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'false');

			await page.locator('body').click();
			await page.keyboard.press('Escape');
			await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'true');
		});

		test('ESC schließt offene Legende', async ({ page }) => {
			await mapPage.openLegend();
			await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');

			await page.locator('body').click();
			await page.keyboard.press('Escape');
			await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'true');
		});
	});
});
