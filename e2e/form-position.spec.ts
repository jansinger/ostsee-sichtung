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

	// Fahrwasser ist Pflicht solange keine GPS-Position vorliegt und wird deshalb
	// inzwischen in ALLEN drei Positionsmethoden angezeigt (Foto/Karte: Fallback-
	// Bereich "Kein GPS? Beschreiben Sie das Seegebiet"; Beschreibung: direkt).
	// Was sich beim Methoden-Wechsel tatsächlich ändert, ist der Foto-Upload-Bereich.
	test('Methoden-Wechsel: Foto-Upload erscheint/verschwindet, Fahrwasser bleibt erreichbar', async ({
		page
	}) => {
		// Switch to manual method — Fahrwasser sichtbar, kein Foto-Upload
		await page.locator('label[for="method-manual"]').click();
		await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible({ timeout: 3000 });
		await expect(page.getByText(/Foto per Drag & Drop oder Klick hochladen/i)).not.toBeVisible();

		// Switch back to photo method — Foto-Upload erscheint wieder, Fahrwasser bleibt sichtbar
		await page.locator('label[for="method-photo"]').click();
		await expect(page.getByText(/Foto per Drag & Drop oder Klick hochladen/i)).toBeVisible({
			timeout: 3000
		});
		await expect(page.locator('[data-testid="field-waterway"]')).toBeVisible();
	});
});
