import { test, expect } from '@playwright/test';

/**
 * Das Formular muss Videos zur Auswahl anbieten. Der Wert stammt aus
 * /api/config/upload; weicht er ab, nimmt die Dropzone Dateien an, die der
 * Server ablehnt — oder umgekehrt.
 */
test.describe('Video-Upload im Meldeformular', () => {
	test('der Datei-Dialog bietet Videos an', async ({ page }) => {
		await page.goto('/?meldung=lebend');

		const response = await page.request.get('/api/config/upload');
		expect(response.ok()).toBe(true);

		const config = await response.json();
		expect(config.allowedTypes).toContain('video/mp4');
		expect(config.allowedTypes).toContain('video/quicktime');
		expect(config.accept).toContain('video/*');
		expect(config.maxVideoFileSizeBytes).toBeGreaterThan(config.maxFileSizeBytes);
	});
});
