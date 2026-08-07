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
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Reload page
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.locator('[aria-current="step"]:visible').waitFor({ state: 'visible' });

		// Step 2 should be restored
		await expectCurrentStep(page, /Angaben zum Tier/i);
	});

	test('Formulardaten bleiben nach Reload erhalten', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill date and time
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');

		// Wait for auto-save to persist to sessionStorage
		await page.waitForFunction(() => !!sessionStorage.getItem('sichtungen_form_data'));

		// Reload
		await page.reload();
		await page.waitForLoadState('networkidle');
		await page.locator('[aria-current="step"]:visible').waitFor({ state: 'visible' });

		// Date should still be filled
		const dateInput = page.locator('[data-testid="field-sightingDate"]');
		await expect(dateInput).toHaveValue(today);
	});

	test('Restore zeigt Info-Toast', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill some data
		await formPage.fillDate(today);

		// Wait for auto-save to persist to sessionStorage
		await page.waitForFunction(() => !!sessionStorage.getItem('sichtungen_form_data'));

		// Reload — should show restore toast
		await page.reload();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/vorherigen Eingaben.*wiederhergestellt/i)).toBeVisible({
			timeout: 5000
		});
	});

	/**
	 * Abschlussreview B1/B3 (2026-08-06): „Formular zurücksetzen" räumt seither
	 * nicht nur die Formulardaten weg, sondern auch den Zweig (`reportKind`) —
	 * danach erscheint die Einstiegsseite ("Was möchten Sie melden?"), nicht
	 * mehr Schritt 1 direkt (Spec §6.2). Die Zusage „löscht alle gespeicherten
	 * Daten" gilt weiterhin für den Speicher selbst; sie wird hier getrennt von
	 * der Anzeige geprüft, damit ein zukünftiger Regressions-Fund an der
	 * richtigen Stelle rot wird — Speicher oder Darstellung.
	 */
	test('Formular zurücksetzen löscht alle gespeicherten Daten', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Fill data (waterway required, da hasPosition standardmäßig false ist)
		await formPage.fillDate(today);
		await formPage.fillTime('14:30');
		await formPage.fillWaterway('Kieler Bucht');

		// Navigate to Step 2 so we're not on Step 1
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
			timeout: 3000
		});
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Click reset button — a confirm() dialog now guards the reset, accept it
		const resetBtn = page.getByRole('button', { name: /zurücksetzen/i });
		await expect(resetBtn).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await resetBtn.click();

		// B1: nach dem Reset erscheint die Einstiegsseite, nicht mehr Schritt 1 —
		// der Zweig ist Teil dessen, was "zurückgesetzt" bedeutet.
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();

		// Der eigentliche Speicher-Beleg für "alle gespeicherten Daten": Der Zweig ist
		// aus dem sessionStorage verschwunden. `sichtungen_form_data` selbst bleibt
		// gesetzt — der `$effect`, der `$form` nach `FORM_DATA` spiegelt (siehe
		// `ModernReportForm.svelte`), schreibt direkt nach `updateInitialValues(...)`
		// die frischen Default-Werte zurück; das ist gewollt (Auto-Save) und keine
		// Lücke im Reset. Entscheidend ist, dass der eingegebene Wert nicht mehr
		// darin steht.
		const formData = await page.evaluate(() => sessionStorage.getItem('sichtungen_form_data'));
		const reportKind = await page.evaluate(() => sessionStorage.getItem('sichtungen_report_kind'));
		expect(formData ?? '').not.toContain('Kieler Bucht');
		expect(reportKind).toBeNull();

		// Reload zur Gegenprobe gegen den Migrationspfad (`resolveReportKind`s dritte
		// Quelle): Auch nach einem Reload bleibt die Einstiegsseite stehen, kein
		// Restore-Toast erscheint, und kein Formular-Schritt springt aus dem Storage
		// zurück.
		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('report-kind-choice')).toBeVisible();
		await expect(page.getByText(/vorherigen Eingaben.*wiederhergestellt/i)).not.toBeVisible();

		// Erneute Wahl darf nicht die vor dem Reset eingegebenen Werte zurückholen —
		// sonst wäre "alle gespeicherten Daten" nur für den Zweig eingelöst.
		await page.getByTestId('report-kind-option-lebend').click();
		await expectCurrentStep(page, /Position & Zeitpunkt/i);
		await expect(page.locator('[data-testid="field-waterway"]')).toHaveValue('');
	});
});
