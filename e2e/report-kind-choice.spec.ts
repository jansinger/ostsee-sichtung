import { expect, test } from '@playwright/test';

test.describe('Einstiegsseite des Meldeformulars', () => {
	test('Erstbesucher sieht die Auswahl und kommt ohne sie nicht weiter', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
		await expect(page.getByTestId('report-kind-submit')).toHaveAttribute('aria-disabled', 'true');
	});

	test('nach der Auswahl erscheint Schritt 1', async ({ page }) => {
		await page.goto('/');
		// Wie FormPage.goto(): Playwrights Actionability-Check wartet nur auf
		// Sichtbarkeit, nicht auf Hydration. Das radio's native `checked`
		// springt sonst an, bevor Sveltes `onchange` überhaupt verdrahtet ist —
		// die Auswahl bliebe dann unbemerkt und „Weiter" gesperrt.
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /toten Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});

	test('der Direktlink überspringt die Auswahl', async ({ page }) => {
		await page.goto('/?meldung=totfund');
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});

	test('Browser-Zurück führt auf die Auswahl, nicht aus der App', async ({ page }) => {
		// Ohne History-Eintrag verließe „Zurück" die Anwendung — im iframe
		// navigiert das die Museumsseite weg.
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();

		await page.goBack();
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
	});

	test('Wiederkehrer mit gespeichertem Stand wird nicht erneut gefragt', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByRole('radio', { name: /lebenden Tieres/i }).check();
		await page.getByTestId('report-kind-submit').click();
		await page.reload();
		await expect(page.getByTestId('report-kind-choice')).toBeHidden();
	});
});
