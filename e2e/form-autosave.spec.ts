import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { fillStep1, expectCurrentStep, today } from './helpers/form-helpers';

// ── Phase 3A: Auto-Save & Restore ──────────────────────────────────────────

test.describe('Formular — Auto-Save & Restore', () => {
	test('Step wird nach Reload wiederhergestellt', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill Step 1 and navigate to Step 2
		await fillStep1(formPage);
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Reload page
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.locator('[aria-current="step"]').waitFor({ state: 'visible' });

		// Step 2 should be restored
		await expectCurrentStep(page, /Sichtungsdetails/i);
	});

	test('Formulardaten bleiben nach Reload erhalten', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill date and time
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');

		// Give auto-save time to persist
		await page.waitForTimeout(500);

		// Reload
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.locator('[aria-current="step"]').waitFor({ state: 'visible' });

		// Date should still be filled
		const dateInput = page.locator('[data-testid="field-sightingDate"]');
		await expect(dateInput).toHaveValue(today);
	});

	test('Restore zeigt Info-Toast', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill some data
		await formPage.fillDate(today);

		// Give auto-save time
		await page.waitForTimeout(500);

		// Reload — should show restore toast
		await page.reload();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/vorherigen Eingaben.*wiederhergestellt/i)).toBeVisible({
			timeout: 5000
		});
	});

	test('Formular zurücksetzen löscht alle gespeicherten Daten', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill data
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');

		// Navigate to Step 2 so we're not on Step 1
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Click reset button
		const resetBtn = page.getByRole('button', { name: /zurücksetzen/i });
		await expect(resetBtn).toBeVisible();
		await resetBtn.click();

		// After reset, should be back on Step 1
		await expectCurrentStep(page, /Position & Zeit/i);

		// Date should be reset (either empty or today's default)
		// Reload to verify storage was cleared
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.locator('[aria-current="step"]').waitFor({ state: 'visible' });

		// Should start fresh on Step 1 (no restore toast)
		await expectCurrentStep(page, /Position & Zeit/i);
	});
});
