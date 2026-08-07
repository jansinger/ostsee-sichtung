import { test, expect, type Page } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import {
	fillStep1,
	fillStep2,
	expectCurrentStep,
	waitForNextEnabled
} from './helpers/form-helpers';

// ── Phase 2B: StepNavigation Error-UX ──────────────────────────────────────

test.describe('StepNavigation — Error-UX', () => {
	test('Zurück-Button ist auf Step 1 disabled', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		const backBtn = page.getByRole('button', { name: /Vorheriger Schritt/i });
		await expect(backBtn).toBeDisabled();
	});

	test('Zurück-Button ist auf Step 2 enabled', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();

		const backBtn = page.getByRole('button', { name: /Vorheriger Schritt/i });
		await expect(backBtn).toBeEnabled();
	});

	test('Weiter-Button zeigt "Absenden" auf letztem Step', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 4
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await formPage.skipStep();

		// On last step, button should say "Absenden"
		await expect(page.getByRole('button', { name: /Formular absenden/i })).toBeVisible();
		// "Nächster Schritt" should not exist
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).not.toBeVisible();
	});

	test('Step 2 ohne Eingabe: kein Fehler-Alert beim Betreten, Weiter-Button bleibt klickbar', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Kein Fehler-Alert direkt beim Betreten des Schritts (keine premature errors)
		await expect(page.locator('[role="alert"]')).toHaveCount(0);

		// Weiter-Button bleibt klickbar, auch wenn der Schritt (noch) invalide ist
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled();
	});

	test('Validierungsfehler auf Step 2 zeigt Inline-Fehlermeldung erst nach Klick auf Weiter', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Step 2 Pflichtfelder leer → Klick auf "Weiter" löst Validierung aus
		await formPage.clickNext();

		// Inline-Fehlermeldung über dem Weiter-Button erscheint nach dem fehlgeschlagenen Versuch
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
	});

	test('Inline-Fehlermeldung verschwindet wieder, wenn zurück zu Step 1 navigiert wird', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Fehlgeschlagener Weiter-Versuch zeigt den Alert
		await formPage.clickNext();
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });

		// Zurück zu Step 1 navigieren → Anzeige-Zustand wird zurückgesetzt
		await formPage.clickPrevious();
		await expectCurrentStep(page, /Position/i);
		await expect(page.locator('[role="alert"]')).toHaveCount(0);
	});
});

// ── PR 4: Bootsantrieb als Motor-an/aus-Frage ───────────────────────────────

/**
 * `fillStep2` wählt bewusst „Land", damit die Antriebsfrage gar nicht erscheint —
 * dadurch lief bis PR 4 kein E2E-Fall durch den Boot-Pfad. Dieser Test schließt
 * die Lücke: Bei Motorboot ist `boatDrive` Pflicht, und seit dem 2026-08-04 wird
 * die Frage als Zwei-Optionen-Radiogruppe gestellt („Motor lief" = 1,
 * „Motor lief nicht" = 6) statt als Select mit fünf Antriebsarten.
 */
test.describe('SightingDetails — Motorfrage bei Motorboot', () => {
	test('Motorboot fragt nach dem Motor und lässt den Schritt danach abschließen', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await formPage.selectSpecies(0);
		await formPage.fillTotalCount(2);
		await formPage.selectDistance(1);

		// Solange „Land" gewählt ist, gibt es keine Antriebsfrage.
		await expect(page.locator('[data-field="boatDrive"]')).not.toBeVisible();

		await formPage.selectSightingFrom(2); // Motorboot
		await expect(page.locator('[data-field="boatDrive"]')).toBeVisible({ timeout: 3000 });

		// Genau zwei Antworten, keine Auswahlliste, kein Freitext für „Sonstiger Antrieb".
		await expect(page.locator('[data-field="boatDrive"] input[type="radio"]')).toHaveCount(2);
		await expect(page.locator('[data-testid="field-boatDrive"]')).toHaveCount(0);
		await expect(page.locator('[data-field="boatDriveText"]')).not.toBeVisible();

		await formPage.selectBoatDrive(6); // Motor lief nicht
		await expect(page.locator('[data-testid="field-boatDrive-6"]')).toBeChecked();

		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);
	});
});

// ── Phase 2C: isDead Conditional Rendering ──────────────────────────────────

/**
 * Der Totfund-Schalter auf Schritt 2 ist seit Commit d7767383 entfallen: Die
 * Frage „lebendes Tier oder Totfund?" beantwortet seither die Einstiegsseite
 * (`/?meldung=lebend|totfund`, s. `AnimalInfo.svelte`), bevor das Formular
 * überhaupt erscheint. Die Rückmeldung „Sie melden: … · [Ändern]", die an
 * seine Stelle getreten war, steht seit dem Umzug in der Aktionszeile unter
 * dem Formular (`form/FormActions.svelte`) und gilt dort für alle vier
 * Schritte. `isDead` kommt dadurch bereits über den
 * Einstiegs-Zweig fest ins Formular, es gibt keinen Weg mehr, es innerhalb des
 * Bürgerformulars umzuschalten — jeder Test wählt den Zweig deshalb über
 * `FormPage.goto()`, nicht mehr über `[data-testid="field-isDead"]` (das
 * existiert nur noch in der Admin-Maske, `adminMode=true`).
 */
test.describe('AnimalInfo — isDead Conditional Rendering', () => {
	async function gotoStep2(page: Page, kind: 'lebend' | 'totfund') {
		const formPage = new FormPage(page);
		await formPage.goto(kind);
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);
	}

	test('DeadAnimal-Section ist im Lebend-Zweig nicht sichtbar', async ({ page }) => {
		await gotoStep2(page, 'lebend');

		// Dead animal fields should not be visible
		await expect(page.locator('[data-field="deadCondition"]')).not.toBeVisible();
		await expect(page.locator('[data-field="deadSex"]')).not.toBeVisible();
		await expect(page.locator('[data-field="deadSize"]')).not.toBeVisible();
	});

	test('Totfund-Zweig zeigt DeadAnimal-Felder, aber nicht deadSex (Museum hat das Feld am 2026-08-04 abbestellt — C4)', async ({
		page
	}) => {
		await gotoStep2(page, 'totfund');

		// Dead animal fields should appear
		await expect(page.locator('[data-field="deadCondition"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[data-field="deadSize"]')).toBeVisible();

		// deadSex bleibt Schema-Feld für die Admin-Maske, ist im Meldeformular
		// aber auch im Totfund-Zweig nicht mehr erreichbar — anders als
		// deadCondition/deadSize, die weiterhin sichtbar werden.
		await expect(page.locator('[data-field="deadSex"]')).not.toBeVisible();
	});

	test('Lebend-Zweig zeigt DeadAnimal-Felder gar nicht erst (kein Zurückschalten mehr im Bürgerformular)', async ({
		page
	}) => {
		// Vormals: isDead per Toggle an- und wieder ausschalten. Diesen Weg gibt es
		// im Bürgerformular nicht mehr — der Zweig steht seit der Einstiegsseite
		// fest, ein „Zurückschalten" existiert nur noch über „Ändern" zurück zur
		// Auswahlseite (abgedeckt in `report-kind-choice.spec.ts`). Die verbleibende
		// Aussage: im Lebend-Zweig sind die Felder von Anfang an nie im DOM.
		await gotoStep2(page, 'lebend');
		await expect(page.locator('[data-field="deadCondition"]')).not.toBeVisible({ timeout: 3000 });
	});

	test('Species-Select rendert alle Haupttierarten', async ({ page }) => {
		await gotoStep2(page, 'lebend');

		const speciesSelect = page.locator('[data-testid="field-species"]');
		await expect(speciesSelect).toBeVisible();

		// Check main species are available as options
		const options = speciesSelect.locator('option');
		const count = await options.count();
		// At least Schweinswal, Kegelrobbe, Seehund + placeholder
		expect(count).toBeGreaterThanOrEqual(4);
	});

	test('totalCount und juvenileCount Felder sind vorhanden', async ({ page }) => {
		await gotoStep2(page, 'lebend');

		await expect(page.locator('[data-testid="field-totalCount"]')).toBeVisible();
		await expect(page.locator('[data-testid="field-juvenileCount"]')).toBeVisible();
	});
});
