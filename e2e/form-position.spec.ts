import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

// ── Phase 4A: PositionAndTime Methoden-Switching ────────────────────────────

test.describe('PositionAndTime — Methoden-Switching', () => {
	test.beforeEach(async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();
	});

	test('Datum- und Uhrzeit-Felder sind immer sichtbar', async ({ page }) => {
		await expect(page.locator('[data-testid="field-sightingDate"]')).toBeVisible();
		await expect(page.locator('[data-testid="field-sightingTime"]')).toBeVisible();
	});

	test('Standard-Methode zeigt Foto-Upload (GPS-Foto)', async ({ page }) => {
		// Photo method should be the default — look for the upload area
		const photoOption = page.getByText(/Foto/i).first();
		await expect(photoOption).toBeVisible();
	});

	test('Manuelle Methode zeigt Fahrwasser/Seezeichen-Felder', async ({ page }) => {
		// Radio buttons are sr-only, click the label instead
		const manualLabel = page.locator('label[for="method-manual"]');
		await manualLabel.click();

		// Waterway/seaMark fields should become visible
		await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[data-testid="field-seaMark"]')).toBeVisible({ timeout: 3000 });
	});

	test('Methoden-Wechsel versteckt vorherige Eingabefelder', async ({ page }) => {
		// Switch to manual method
		await page.locator('label[for="method-manual"]').click();
		await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible({ timeout: 3000 });

		// Switch back to photo method
		await page.locator('label[for="method-photo"]').click();
		// Manual fields should be hidden
		await expect(page.locator('[data-testid="field-waterway"]')).not.toBeVisible({
			timeout: 3000
		});
	});
});
