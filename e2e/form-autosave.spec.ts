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

		// Eine ECHTE Eingabe, nicht nur das Datum: `sightingDate` steht per
		// Schema-Default ohnehin auf heute — ein mit dem heutigen Datum
		// „gefülltes" Formular unterscheidet sich nicht vom Initialzustand, und
		// seit dem Gate `hasMeaningfulSavedData` (UX-Review 2026-08-07) meldet
		// der Toast nur noch tatsächlich abweichende Daten.
		await formPage.fillDate(today);
		await formPage.fillWaterway('Kieler Bucht');
		// Der Wert erreicht den Form-State erst mit dem `change`-Event — `fill()`
		// blurt nicht. In den übrigen Specs übernimmt das der nächste Klick auf
		// „Weiter"; hier gibt es keinen, also explizit.
		await page.locator('[data-testid="field-waterway"]').blur();

		// Wait for auto-save to persist to sessionStorage
		await page.waitForFunction(() => {
			const raw = sessionStorage.getItem('sichtungen_form_data');
			return !!raw && raw.includes('Kieler Bucht');
		});

		// Reload — should show restore toast
		await page.reload();
		await page.waitForLoadState('networkidle');

		await expect(page.getByText(/vorherigen Eingaben.*wiederhergestellt/i)).toBeVisible({
			timeout: 5000
		});
	});

	/**
	 * Gegenprobe zum Gate `hasMeaningfulSavedData` (UX-Review 2026-08-07,
	 * Befund 6): Das bloße Öffnen des Formulars schreibt `FORM_DATA` bereits in
	 * den Storage — vor dem Gate meldete deshalb JEDES Reload „wiederhergestellt",
	 * auch wenn nie etwas eingegeben wurde.
	 */
	test('Ohne echte Eingaben kein Restore-Toast', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Der Mount-Effekt hat den (unveränderten) Zustand persistiert
		await page.waitForFunction(() => !!sessionStorage.getItem('sichtungen_form_data'));

		await page.reload();
		await page.waitForLoadState('networkidle');

		// Erst sicherstellen, dass das Formular wieder steht, DANN die Abwesenheit
		// prüfen — sonst wäre ein zu früh ausgewerteter Nicht-Befund wertlos.
		await expect(page.getByTestId('form-actions')).toBeVisible();
		await expect(page.getByText(/vorherigen Eingaben.*wiederhergestellt/i)).not.toBeVisible();
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
		const resetBtn = page.getByRole('button', { name: 'Formular zurücksetzen', exact: true });
		await expect(resetBtn).toBeVisible();
		await formPage.resetForm();

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
