import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
	test('displays version number from package.json', async ({ page }) => {
		// Navigate to about page and wait for network idle
		await page.goto('/about', { waitUntil: 'networkidle' });

		// Wait for the main heading to confirm we're on the about page
		await expect(page.getByRole('heading', { name: 'Über Ostsee-Tiere' })).toBeVisible({
			timeout: 15000
		});

		// Version badge should be visible in the Technology section
		// Format: "Version X.Y.Z" in a badge with class badge-neutral
		const versionBadge = page
			.locator('.badge.badge-neutral')
			.filter({ hasText: /Version \d+\.\d+\.\d+/ });
		await expect(versionBadge).toBeVisible({ timeout: 10000 });

		// Version should match semantic versioning pattern
		const versionText = await versionBadge.textContent();
		expect(versionText).toMatch(/Version \d+\.\d+\.\d+/);
	});

	test('Technology section is visible', async ({ page }) => {
		// Navigate to about page and wait for network idle
		await page.goto('/about', { waitUntil: 'networkidle' });

		// Wait for main heading to ensure page is loaded
		await expect(page.getByRole('heading', { name: 'Über Ostsee-Tiere' })).toBeVisible({
			timeout: 15000
		});

		// Technology section heading should be visible (use exact: true to avoid multiple matches)
		const techHeading = page.getByRole('heading', { name: 'Technologie', exact: true });
		await expect(techHeading).toBeVisible({ timeout: 10000 });

		// Technology badges should be present (SvelteKit in the technology grid)
		await expect(
			page.locator('.badge.badge-primary').filter({ hasText: 'SvelteKit' })
		).toBeVisible();
		await expect(
			page.locator('.badge.badge-secondary').filter({ hasText: 'PostGIS' })
		).toBeVisible();
	});
});
