import { test, expect, type Page } from '@playwright/test';
import { FormPage } from './pages/FormPage';

const today = new Date().toISOString().substring(0, 10);

/** Fill Step 1 with valid data */
async function fillStep1(formPage: FormPage) {
	await formPage.fillDate(today);
	await formPage.fillTime('14:30');
}

/** Fill Step 2 with valid data */
async function fillStep2(formPage: FormPage) {
	await formPage.selectSpecies(0); // Schweinswal
	await formPage.fillTotalCount(2);
	await formPage.selectDistance(1);
	await formPage.selectSightingFrom(3); // Land
	await formPage.selectBoatDrive(1); // Motor
}

/** Wait for the Next button to become enabled */
async function waitForNextEnabled(page: Page) {
	await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
		timeout: 3000
	});
}

/** Wait for the active step indicator to show a specific step name */
async function expectCurrentStep(page: Page, pattern: RegExp) {
	await expect(page.locator('[aria-current="step"]')).toHaveAttribute('aria-label', pattern, {
		timeout: 5000
	});
}

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

	test('Validierungsfehler auf Step 2 zeigt Toast mit Fehleranzahl', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Try to advance without filling required fields
		await formPage.clickNext();

		// Toast should appear with validation error message
		await expect(page.getByText(/Validierungsfehler/i)).toBeVisible({ timeout: 3000 });
		await expect(page.getByText(/beheben Sie/i)).toBeVisible({ timeout: 3000 });
	});

	test('Fehler-Felder zeigen rote Markierungen nach Validierung', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Trigger validation by trying to go next
		await formPage.clickNext();

		// Error messages should be visible (role="alert" elements)
		const alerts = page.locator('[role="alert"]');
		await expect(alerts.first()).toBeVisible({ timeout: 3000 });
	});
});

// ── Phase 2C: isDead Conditional Rendering ──────────────────────────────────

test.describe('AnimalInfo — isDead Conditional Rendering', () => {
	test.beforeEach(async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Navigate to Step 2
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);
	});

	test('DeadAnimal-Section ist initial nicht sichtbar', async ({ page }) => {
		// Dead animal fields should not be visible
		await expect(page.locator('[data-field="deadCondition"]')).not.toBeVisible();
		await expect(page.locator('[data-field="deadSex"]')).not.toBeVisible();
		await expect(page.locator('[data-field="deadSize"]')).not.toBeVisible();
	});

	test('isDead=true zeigt DeadAnimal-Felder', async ({ page }) => {
		// Toggle isDead
		const toggle = page.locator('[data-testid="field-isDead"]');
		await toggle.check();

		// Dead animal fields should appear
		await expect(page.locator('[data-field="deadCondition"]')).toBeVisible({ timeout: 3000 });
		await expect(page.locator('[data-field="deadSex"]')).toBeVisible();
		await expect(page.locator('[data-field="deadSize"]')).toBeVisible();
	});

	test('isDead zurück auf false versteckt DeadAnimal-Felder', async ({ page }) => {
		const toggle = page.locator('[data-testid="field-isDead"]');

		// Toggle on
		await toggle.check();
		await expect(page.locator('[data-field="deadCondition"]')).toBeVisible({ timeout: 3000 });

		// Toggle off
		await toggle.uncheck();
		await expect(page.locator('[data-field="deadCondition"]')).not.toBeVisible({ timeout: 3000 });
	});

	test('Species-Select rendert alle Haupttierarten', async ({ page }) => {
		const speciesSelect = page.locator('[data-testid="field-species"]');
		await expect(speciesSelect).toBeVisible();

		// Check main species are available as options
		const options = speciesSelect.locator('option');
		const count = await options.count();
		// At least Schweinswal, Kegelrobbe, Seehund + placeholder
		expect(count).toBeGreaterThanOrEqual(4);
	});

	test('totalCount und juvenileCount Felder sind vorhanden', async ({ page }) => {
		await expect(page.locator('[data-testid="field-totalCount"]')).toBeVisible();
		await expect(page.locator('[data-testid="field-juvenileCount"]')).toBeVisible();
	});
});
