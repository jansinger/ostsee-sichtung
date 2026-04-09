import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Accessibility', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
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

	test('Tastatur-Shortcut H öffnet Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('h');

		// Help modal shows a heading "Tastaturkürzel"
		const helpHeading = page.getByRole('heading', { name: /tastaturkürzel/i });
		await expect(helpHeading).toBeVisible({ timeout: 3000 });
	});

	test('Tastatur-Shortcut ? öffnet Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('?');

		const helpHeading = page.getByRole('heading', { name: /tastaturkürzel/i });
		await expect(helpHeading).toBeVisible({ timeout: 3000 });
	});

	test('Escape schließt Hilfe-Modal', async ({ page }) => {
		await page.locator('body').click();
		await page.keyboard.press('h');
		const helpHeading = page.getByRole('heading', { name: /tastaturkürzel/i });
		await expect(helpHeading).toBeVisible({ timeout: 3000 });

		await page.keyboard.press('Escape');
		await expect(helpHeading).toBeHidden({ timeout: 3000 });
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
			// Overlay zu schnell verschwunden — ARIA-Attribute direkt prüfen ohne Sichtbarkeit
			const overlayLocator = page.locator('[aria-labelledby="loading-title"]');
			await expect(overlayLocator).toHaveAttribute('aria-modal', 'true');
		}
	});
});
