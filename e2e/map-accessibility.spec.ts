import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { setupMapPage } from './fixtures/mapSetup';

test.describe.serial('Map Accessibility', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		sharedPage = await browser.newPage();
		mapPage = await setupMapPage(sharedPage);
	});

	test.afterAll(async () => {
		await sharedPage.close();
	});

	test('Karten-Container hat role="application"', async () => {
		await expect(mapPage.getMapContainer()).toHaveAttribute('role', 'application');
	});

	test('Karten-Container hat aria-label mit Sichtungskarte', async () => {
		const label = await mapPage.getMapContainer().getAttribute('aria-label');
		expect(label).toMatch(/Sichtungskarte/i);
	});

	test('Tastatur-Shortcut H öffnet Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('h');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('?');

		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('Escape schließt Hilfe-Modal', async () => {
		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('h');
		const dialog = sharedPage.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });

		await sharedPage.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.keyboardModal });
	});

	test('ESC schließt offenes Filter-Panel', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'false');

		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterPanel()).toHaveAttribute('aria-hidden', 'true');
	});

	test('ESC schließt offene Legende', async () => {
		await mapPage.openLegend();
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');

		await sharedPage.locator('body').click();
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'true');
	});
});
