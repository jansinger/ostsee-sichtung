import { test, expect } from '@playwright/test';
import { MapPage } from './pages/MapPage';

const isCI = process.env.CI === 'true';

test.describe('Map Page', () => {
	test('loads map page and shows content', async ({ page }) => {
		// Mock sightings API — CI has no real database
		await page.route('**/api/map/sightings**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ type: 'FeatureCollection', features: [] })
			})
		);
		const mapPage = new MapPage(page);
		await mapPage.goto();

		await expect(page).toHaveTitle(/Sichtungskarte.*Ostsee-Tiere/, { timeout: 30000 });

		const loadingDialog = mapPage.getLoadingOverlay();
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		await expect(mapPage.getMapHeading()).toBeVisible({ timeout: 10000 });
	});

	// Skip in CI: Route interception for lazy-loaded chunks doesn't work reliably
	// in production builds where chunk names are hashed differently
	(isCI ? test.skip : test)('shows loading state with accessible dialog', async ({ page }) => {
		await page.route('**/SightingsMapView*.js', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await route.continue();
		});

		const mapPage = new MapPage(page);
		await mapPage.goto();

		const loadingDialog = mapPage.getLoadingOverlay();
		const isDialogVisible = await loadingDialog.isVisible().catch(() => false);

		if (isDialogVisible) {
			await expect(loadingDialog).toHaveAttribute('aria-modal', 'true');
			await expect(loadingDialog).toHaveAttribute('aria-labelledby', 'loading-title');
			await expect(page.locator('#loading-title')).toContainText(/wird/i);
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		await expect(page.locator('body')).toBeVisible();
	});

	// Skip in CI: Route interception for lazy-loaded chunks doesn't work reliably
	// in production builds where chunk names are hashed differently
	(isCI ? test.skip : test)(
		'shows error state with retry button on load failure',
		async ({ page }) => {
			await page.route('**/SightingsMapView*', (route) => route.abort('failed'));

			const mapPage = new MapPage(page);
			await mapPage.goto();

			const loadingDialog = mapPage.getLoadingOverlay();
			if (await loadingDialog.isVisible().catch(() => false)) {
				await expect(loadingDialog).toBeHidden({ timeout: 15000 });
			}

			await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 10000 });
			await expect(mapPage.getErrorAlert()).toContainText(/konnte nicht geladen werden/i);
			await expect(mapPage.getRetryButton()).toBeVisible();
			await expect(mapPage.getRetryButton()).toBeEnabled();
		}
	);

	test('filter panel can be opened when map loads successfully', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();

		const loadingDialog = mapPage.getLoadingOverlay();
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		const isError = await mapPage
			.getErrorAlert()
			.isVisible()
			.catch(() => false);
		if (!isError) {
			const filterButton = page.getByRole('button', { name: /filter/i }).first();
			await expect(filterButton).toBeVisible({ timeout: 10000 });
			await filterButton.click();

			await expect(mapPage.getYearSelect()).toBeVisible({ timeout: 5000 });
			await expect(mapPage.getFilterInput()).toBeVisible({ timeout: 5000 });

			const yearOptions = mapPage.getYearSelect().locator('option');
			expect(await yearOptions.count()).toBeGreaterThan(1);
		}
	});
});
