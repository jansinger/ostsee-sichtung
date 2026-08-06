import { expect, test } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import {
	fillStep1,
	fillStep2,
	expectCurrentStep,
	waitForNextEnabled
} from './helpers/form-helpers';

/**
 * Task 15: Keine Einwilligung ohne Gegenstand. `mediaConsent` fragt nach der
 * Freigabe von Aufnahmen — ohne mindestens eine ist das eine Frage ohne
 * Bezugsgegenstand, dieselbe Fehlerklasse wie `shipNameConsent` bei einer
 * Land-Meldung (`form-from-land.spec.ts`). `getFormSteps` (Validierung) und
 * `Step4Contact.svelte` (Rendering) sind bereits über Komponententests
 * abgedeckt; diese Datei fährt den Durchstich: das Formular im laufenden
 * Browser, ohne dass je eine Aufnahme hochgeladen wurde.
 *
 * `fillStep2` wählt bewusst „Land" (`sightingFrom: 3`) — die einfachste
 * gültige Belegung von Schritt 2, unabhängig von den Medien-Dateifeldern.
 */
test.describe('Meldeformular — Medien-Einwilligung ohne Aufnahme', () => {
	test('ohne Aufnahme fragt Schritt 4 nicht nach der Freigabe von Aufnahmen', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);

		// Schritt 3 ist optional — hier ohne weitere Eingaben übersprungen.
		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		await expect(page.getByTestId('field-nameConsent')).toBeVisible();
		await expect(page.getByTestId('field-privacyConsent')).toBeVisible();
		await expect(page.getByTestId('field-mediaConsent')).toBeHidden();
	});

	/**
	 * Der wertvollste Test für Punkt (c) des Tasks: Der Riegel sitzt am
	 * Absende-Rand (`ModernReportForm.svelte`s `onSubmit`, `omitFields` auf
	 * `mediaConsent`, analog zu `OWN_VESSEL_FIELDS`). Beweisbar ist er nur an
	 * der tatsächlich abgesendeten Anfrage — `page.route` fängt sie ab, wie in
	 * `form-from-land.spec.ts` „Land-Meldung entfernt die eigenen
	 * Bootsangaben aus der Absende-Anfrage".
	 */
	test('sendet mediaConsent nicht, wenn keine Aufnahme vorliegt', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();

		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);

		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		await formPage.fillFirstName('Max');
		await formPage.fillLastName('Mustermann');
		await formPage.fillEmail('max@example.com');
		await formPage.checkPrivacyConsent();

		let capturedBody: Record<string, unknown> | undefined;
		await page.route('**/api/sightings', (route) => {
			capturedBody = route.request().postDataJSON() as Record<string, unknown>;
			route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, id: 4244, referenceId: 'REF-4244' })
			});
		});

		await formPage.clickSubmit();
		await expect(page.getByRole('heading', { name: /Vielen Dank/i })).toBeVisible({
			timeout: 10000
		});

		expect(capturedBody).toBeDefined();
		expect(capturedBody?.mediaConsent).toBeUndefined();
	});
});
