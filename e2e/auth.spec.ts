import { test, expect } from '@playwright/test';
import { AdminPage } from './pages/AdminPage';

test.describe('Authentifizierung — Geschützte Routen', () => {
	test.beforeEach(async ({ page }) => {
		// Sicherstellen dass kein Auth-Cookie gesetzt ist
		await page.context().clearCookies();
	});

	test('Unauthentifizierter Zugriff auf /admin → Redirect weg von /admin', async ({ page }) => {
		const adminPage = new AdminPage(page);
		const response = await adminPage.goto();

		// Muss von /admin wegredirected worden sein (zu Login-Seite oder Auth0)
		expect(adminPage.getCurrentUrl()).not.toContain('/admin');
		// Kein Server-Error
		expect(response?.status()).toBeLessThan(500);
	});

	test('Unauthentifizierter Zugriff auf /admin → landet auf Login-Seite', async ({ page }) => {
		const adminPage = new AdminPage(page);
		await adminPage.goto();

		// Der User landet entweder auf /api/auth/login oder direkt auf Auth0
		// In beiden Fällen: nicht mehr auf /admin
		const url = adminPage.getCurrentUrl();
		const isOnLoginFlow =
			url.includes('/api/auth/login') ||
			url.includes('/auth/login') ||
			url.includes('auth0.com') ||
			url.includes('ostsee-tiere.de/u/login'); // Auth0 Custom Domain
		expect(isOnLoginFlow).toBe(true);
	});

	test('Unauthentifizierter Zugriff auf /admin/settings → Redirect weg von /admin', async ({
		page
	}) => {
		const adminPage = new AdminPage(page);
		await adminPage.gotoSettings();

		expect(adminPage.getCurrentUrl()).not.toContain('/admin');
	});

	test('Homepage ist ohne Authentifizierung zugänglich', async ({ page }) => {
		const response = await page.goto('/');
		expect(response?.status()).toBe(200);
		await expect(page.locator('form').first()).toBeVisible();
	});

	test('Kartenansicht ist ohne Authentifizierung zugänglich', async ({ page }) => {
		const response = await page.goto('/map');
		expect(response?.status()).toBe(200);
	});
});
