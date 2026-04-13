import { test, expect } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { mockMapSightingsSuccess } from './fixtures/mockApi';

const isCI = process.env.CI === 'true';

test.describe('Map Page', () => {
	test('loads map page and shows content', async ({ page }) => {
		// Mock sightings API — CI has no real database
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await mapPage.goto();

		await expect(page).toHaveTitle(/Sichtungskarte.*Ostsee-Tiere/, {
			timeout: MAP_TEST_TIMEOUTS.errorDisplay
		});

		const loadingDialog = mapPage.getLoadingOverlay();
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.overlayHide });
		}

		await expect(mapPage.getMapHeading()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
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
			await expect(loadingDialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.overlayHide });
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
				await expect(loadingDialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.overlayHide });
			}

			await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
			await expect(mapPage.getErrorAlert()).toContainText(/konnte nicht geladen werden/i);
			await expect(mapPage.getRetryButton()).toBeVisible();
			await expect(mapPage.getRetryButton()).toBeEnabled();
		}
	);

	test('filter panel can be opened when map loads successfully', async ({ page }) => {
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await mapPage.goto();

		const loadingDialog = mapPage.getLoadingOverlay();
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: MAP_TEST_TIMEOUTS.overlayHide });
		}

		const filterButton = page.getByRole('button', { name: /filter/i }).first();
		await expect(filterButton).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
		await filterButton.click();

		await expect(mapPage.getYearSelect()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.shortUi });
		await expect(mapPage.getFilterInput()).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.shortUi });

		const yearOptions = mapPage.getYearSelect().locator('option');
		expect(await yearOptions.count()).toBeGreaterThan(1);
	});
});
