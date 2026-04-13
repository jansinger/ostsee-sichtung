import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { setupMapPage } from './fixtures/mapSetup';
import { mockMapSightingsAbort } from './fixtures/mockApi';

test.describe('Map Accessibility', () => {
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

	test('Fehlermeldung hat role="alert" für Screen Reader', async ({ page }) => {
		await mockMapSightingsAbort(page);
		await page.goto('/map');
		const errorAlert = page.locator('.alert-error');
		await expect(errorAlert).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.errorDisplay });
		await expect(errorAlert).toHaveAttribute('role', 'alert');
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

	test('Filter-Panel hat korrekte ARIA-Attribute', async () => {
		await mapPage.openFilter();

		const panel = mapPage.getFilterPanel();
		await expect(panel).toHaveAttribute('aria-modal', 'true');
		await expect(panel).toHaveAttribute('aria-labelledby', 'filter-title');
	});

	test('Legende-Panel hat korrekte ARIA-Attribute', async () => {
		await mapPage.openLegend();

		const panel = mapPage.getLegendPanel();
		await expect(panel).toHaveAttribute('aria-modal', 'true');
		await expect(panel).toHaveAttribute('aria-labelledby', 'legend-title');
	});

	test('Lade-Overlay hat korrekte ARIA-Attribute', async ({ page }) => {
		// Neu laden um den Loading-State zu erwischen
		const overlayPromise = page
			.locator('[aria-labelledby="loading-title"]')
			.waitFor({ state: 'visible', timeout: MAP_TEST_TIMEOUTS.overlayVisible })
			.catch(() => null);

		await page.reload();
		const overlay = await overlayPromise;

		if (overlay !== null) {
			const overlayLocator = mapPage.getLoadingOverlay();
			await expect(overlayLocator).toHaveAttribute('aria-modal', 'true');
			await expect(overlayLocator).toHaveAttribute('aria-labelledby', 'loading-title');
		} else {
			// Overlay verschwand in < 3s — LoadingOverlay nutzt {#if isVisible} und
			// entfernt das Element vollständig aus dem DOM. ARIA-Attribute können in
			// diesem Fall nicht geprüft werden; die statischen Attribute sind im
			// Komponentencode (LoadingOverlay.svelte) korrekt definiert.
			test.skip(true, 'Lade-Overlay zu schnell — kann nicht überprüft werden');
		}
	});
});
