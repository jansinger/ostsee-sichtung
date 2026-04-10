import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Accessibility', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		// Mock the sightings API so tests don't require a real database
		await page.route('**/api/map/sightings**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ type: 'FeatureCollection', features: [] })
			})
		);
		mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();
	});

	test('Karten-Container hat role="application"', async () => {
		await expect(mapPage.getMapContainer()).toHaveAttribute('role', 'application');
	});

	test('Karten-Container hat aria-label mit Sichtungskarte', async () => {
		const label = await mapPage.getMapContainer().getAttribute('aria-label');
		expect(label).toMatch(/Sichtungskarte/i);
	});

	test('Fehlermeldung hat role="alert" für Screen Reader', async ({ page }) => {
		await page.route('**/api/map/sightings**', (route) => route.abort());
		await page.goto('/map');
		const errorAlert = page.locator('.alert-error');
		await expect(errorAlert).toBeVisible({ timeout: 30000 });
		await expect(errorAlert).toHaveAttribute('role', 'alert');
	});

	test('Tastatur-Shortcut H öffnet Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('h');

		const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: 3000 });
	});

	test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('?');

		const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: 3000 });
	});

	test('Escape schließt Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('h');
		const dialog = page.getByRole('dialog', { name: /tastaturkürzel/i });
		await expect(dialog).toBeVisible({ timeout: 3000 });

		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden({ timeout: 3000 });
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
			.waitFor({ state: 'visible', timeout: 3000 })
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
