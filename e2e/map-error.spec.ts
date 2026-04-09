import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

/**
 * The map controller (optimizedMapController.ts) catches API errors internally
 * and logs them — they do NOT propagate as unhandled rejections.
 * The error UI in SightingsMapView is triggered by window.unhandledrejection,
 * so we dispatch that event manually to test the UI behaviour.
 */
async function triggerErrorUI(page: import('@playwright/test').Page) {
	await page.evaluate(() => {
		const err = new Error('Simulierter Kartenfehler für E2E-Test');
		window.dispatchEvent(
			new PromiseRejectionEvent('unhandledrejection', {
				promise: Promise.reject(err),
				reason: err,
				cancelable: true,
				bubbles: false
			})
		);
	});
}

test.describe('Map Error State', () => {
	test('Fehlermeldung erscheint nach unbehandeltem Fehler', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		await triggerErrorUI(page);

		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 3000 });
	});

	test('Fehlermeldung enthält hilfreichen Text', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		await triggerErrorUI(page);

		const alert = mapPage.getErrorAlert();
		await expect(alert).toBeVisible({ timeout: 3000 });
		await expect(alert).toContainText('Fehler');
		await expect(alert).toContainText('Kartendaten');
	});

	test('Fehlermeldung kann über Schließen-Button geschlossen werden', async ({ page }) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		await triggerErrorUI(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 3000 });

		await mapPage.getDismissErrorButton().click();
		await expect(mapPage.getErrorAlert()).toBeHidden();
	});

	test('Zweiter Fehler überschreibt erste Fehlermeldung nicht (Dismiss zuerst)', async ({
		page
	}) => {
		const mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();

		await triggerErrorUI(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 3000 });

		// Dismiss and trigger again — error should reappear
		await mapPage.getDismissErrorButton().evaluate((btn) => (btn as HTMLButtonElement).click());
		await expect(mapPage.getErrorAlert()).toBeHidden();

		await triggerErrorUI(page);
		await expect(mapPage.getErrorAlert()).toBeVisible({ timeout: 3000 });
	});
});
