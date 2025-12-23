import { test, expect } from '@playwright/test';

test.describe('Map Page', () => {
	test('loads map page and shows content', async ({ page }) => {
		await page.goto('/map');

		// Page should have correct title
		await expect(page).toHaveTitle(/Sichtungskarte.*Ostsee-Tiere/);

		// Wait for loading overlay to disappear (if it appears)
		const loadingDialog = page.getByRole('dialog');
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		// After loading, either map title or error alert should be visible
		const mapTitle = page.getByRole('heading', { name: /Sichtungskarte/i });
		const errorAlert = page.getByRole('alert');

		// Use Promise.race to wait for either condition
		await expect(mapTitle.or(errorAlert).first()).toBeVisible({ timeout: 10000 });
	});

	test('shows loading state with accessible dialog', async ({ page }) => {
		// Slow down network to ensure loading dialog is visible long enough to test
		await page.route('**/*', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 500));
			await route.continue();
		});

		await page.goto('/map');

		// Loading dialog should appear and have proper accessibility attributes
		const loadingDialog = page.getByRole('dialog');
		await expect(loadingDialog).toBeVisible({ timeout: 5000 });

		// Dialog should have proper accessibility attributes
		await expect(loadingDialog).toHaveAttribute('aria-modal', 'true');
		await expect(loadingDialog).toHaveAttribute('aria-labelledby', 'loading-title');

		// Loading message should be visible
		await expect(page.locator('#loading-title')).toContainText(/wird/i);

		// Wait for loading to complete
		await expect(loadingDialog).toBeHidden({ timeout: 15000 });

		// Page should have content after loading
		await expect(page.locator('body')).toBeVisible();
	});

	test('shows error state with retry button on load failure', async ({ page }) => {
		// Intercept the map component import and make it fail
		await page.route('**/SightingsMapView.svelte*', (route) => route.abort('failed'));

		await page.goto('/map');

		// Wait for loading to complete
		const loadingDialog = page.getByRole('dialog');
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		// Error state should be shown
		const errorAlert = page.getByRole('alert');
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText(/konnte nicht geladen werden/i);

		// Error should have retry button
		const retryButton = page.getByRole('button', { name: /neu laden/i });
		await expect(retryButton).toBeVisible();
		await expect(retryButton).toBeEnabled();
	});

	test('filter panel can be opened when map loads successfully', async ({ page }) => {
		await page.goto('/map');

		// Wait for loading to complete
		const loadingDialog = page.getByRole('dialog');
		if (await loadingDialog.isVisible().catch(() => false)) {
			await expect(loadingDialog).toBeHidden({ timeout: 15000 });
		}

		// Check if map loaded successfully (not error state)
		const errorAlert = page.getByRole('alert');
		const isError = await errorAlert.isVisible().catch(() => false);

		if (!isError) {
			// Find and click filter button - must exist when map loads successfully
			const filterButton = page.getByRole('button', { name: /filter/i }).first();
			await expect(filterButton).toBeVisible({ timeout: 10000 });
			await filterButton.click();

			// Filter panel elements should be visible
			await expect(page.locator('#year-select')).toBeVisible({ timeout: 5000 });
			await expect(page.locator('#filter-input')).toBeVisible({ timeout: 5000 });

			// Year dropdown should have options
			const yearOptions = page.locator('#year-select option');
			expect(await yearOptions.count()).toBeGreaterThan(1);
		}
	});
});
