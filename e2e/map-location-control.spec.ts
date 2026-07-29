import { expect, test } from '@playwright/test';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { setupMapPage } from './fixtures/mapSetup';

/**
 * N2: GPS-Standort-Control auf der Sichtungskarte.
 * Beide Berechtigungspfade werden getestet: erteilte Freigabe (context
 * permissions + gemockte Position) und verweigerte Freigabe (Playwright
 * verweigert Geolocation ohne grant automatisch).
 */
test.describe('Map Location Control', () => {
	test.describe('mit erteilter Berechtigung', () => {
		test.use({
			permissions: ['geolocation'],
			// Kieler Förde — innerhalb der Ostsee-Bounding-Box
			geolocation: { latitude: 54.3233, longitude: 10.1228 }
		});

		test('Button startet und stoppt das Tracking (aria-pressed)', async ({ page }) => {
			await setupMapPage(page);

			const startButton = page.getByRole('button', { name: 'GPS-Position anzeigen' });
			await expect(startButton).toBeVisible();
			await expect(startButton).toHaveAttribute('aria-pressed', 'false');

			await startButton.click();

			const stopButton = page.getByRole('button', { name: 'GPS-Tracking stoppen' });
			await expect(stopButton).toHaveAttribute('aria-pressed', 'true');

			await stopButton.click();
			await expect(page.getByRole('button', { name: 'GPS-Position anzeigen' })).toHaveAttribute(
				'aria-pressed',
				'false'
			);
		});

		test('Tracking zeigt keine Fehlermeldung', async ({ page }) => {
			const mapPage = await setupMapPage(page);

			await page.getByRole('button', { name: 'GPS-Position anzeigen' }).click();
			await expect(page.getByRole('button', { name: 'GPS-Tracking stoppen' })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
			await expect(mapPage.getErrorAlert()).toBeHidden();
		});
	});

	test.describe('mit verweigerter Berechtigung', () => {
		test('zeigt Fehlermeldung und setzt den Button zurück', async ({ page }) => {
			const mapPage = await setupMapPage(page);

			const button = page.getByRole('button', { name: 'GPS-Position anzeigen' });
			await button.click();

			// Playwright verweigert Geolocation ohne grantPermissions → Fehlerpfad
			await expect(mapPage.getErrorAlert()).toBeVisible({
				timeout: MAP_TEST_TIMEOUTS.defaultUi
			});
			await expect(mapPage.getErrorAlert()).toContainText('Standortfreigabe');

			// Button-Zustand wird zurückgesetzt, kein hängendes „Tracking aktiv"
			await expect(page.getByRole('button', { name: 'GPS-Position anzeigen' })).toHaveAttribute(
				'aria-pressed',
				'false'
			);
		});

		test('Fehlermeldung lässt sich schließen', async ({ page }) => {
			const mapPage = await setupMapPage(page);

			await page.getByRole('button', { name: 'GPS-Position anzeigen' }).click();
			await expect(mapPage.getErrorAlert()).toBeVisible({
				timeout: MAP_TEST_TIMEOUTS.defaultUi
			});

			await mapPage.getDismissErrorButton().click();
			await expect(mapPage.getErrorAlert()).toBeHidden();
		});
	});
});
