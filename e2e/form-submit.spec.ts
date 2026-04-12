import { test, expect } from '@playwright/test';
import { FormPage } from './pages/FormPage';

const today = new Date().toISOString().substring(0, 10);

/** Wait for the active step indicator to show a specific step name */
async function expectCurrentStep(page: ReturnType<typeof test.extend>, pattern: RegExp) {
	await expect(page.locator('button[aria-current="step"]')).toHaveAttribute('aria-label', pattern, {
		timeout: 5000
	});
}

/** Wait for the Next button to become enabled */
async function waitForNextEnabled(page: ReturnType<typeof test.extend>) {
	await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled({
		timeout: 3000
	});
}

/** Fill Step 1 with valid data */
async function fillStep1(formPage: FormPage) {
	await formPage.fillDate(today);
	await formPage.fillTime('14:30');
}

/** Fill Step 2 with valid data */
async function fillStep2(formPage: FormPage) {
	await formPage.selectSpecies(0); // Schweinswal
	await formPage.fillTotalCount(2);
	await formPage.selectDistance(1); // weniger als 10m
	await formPage.selectSightingFrom(3); // Land
	await formPage.selectBoatDrive(1); // Motor
}

/** Fill Step 4 with valid contact data */
async function fillStep4(formPage: FormPage) {
	await formPage.fillFirstName('Max');
	await formPage.fillLastName('Mustermann');
	await formPage.fillEmail('max@example.com');
	await formPage.checkPrivacyConsent();
}

// ── Navigation Tests ────────────────────────────────────────────────────────

test.describe('Sichtung melden — Formular Navigation', () => {
	test('Formular startet auf Step 1 (Position & Zeit)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expectCurrentStep(page, /Position & Zeit/i);
	});

	test('Step 1: Datum eingeben und zu Step 2 navigieren', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();

		await expectCurrentStep(page, /Sichtungsdetails/i);
	});

	test('Zurück-Button kehrt zum vorherigen Step zurück', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		await formPage.clickPrevious();
		await expectCurrentStep(page, /Position & Zeit/i);
	});

	test('Step-Buttons zeigen aktuellen Schritt als aria-current="step"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expectCurrentStep(page, /Position & Zeit/i);

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);
	});
});

// ── Step Validation Tests ───────────────────────────────────────────────────

test.describe('Sichtung melden — Step-Validierung', () => {
	test('Step-Buttons vorwärts sind disabled wenn Zwischen-Steps nicht valid', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 hat Schema-Defaults (sightingDate=today) und ist daher valid.
		// Step 2 hat required fields (species, distance, sightingFrom, boatDrive) ohne Defaults.
		// Also: Step 1→2 erlaubt, aber Step 2→3 und Step 2→4 blockiert.
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		const stepButtons = page.locator('.step-button');
		// Step 1 (rückwärts) = enabled, Step 2 (aktuell) = enabled
		await expect(stepButtons.nth(0)).toBeEnabled();
		await expect(stepButtons.nth(1)).toBeEnabled();
		// Step 3/4 (vorwärts, Step 2 nicht valid) = disabled
		await expect(stepButtons.nth(2)).toBeDisabled();
		await expect(stepButtons.nth(3)).toBeDisabled();
	});

	test('Step-Buttons rückwärts sind nach Navigation immer enabled', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ausfüllen, zu Step 2 navigieren
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Step 1 Button (index 0) sollte enabled sein (rückwärts erlaubt)
		const stepButtons = page.locator('.step-button');
		await expect(stepButtons.nth(0)).toBeEnabled();
	});

	test('Validierungsfehler zeigt Toast-Notification', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 hat Schema-Defaults → ist valid. Navigiere zu Step 2.
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Versuche ohne ausgefüllte Step-2-Felder weiter zu navigieren
		await formPage.clickNext();

		// Toast-Notification mit Validierungsfehler sollte erscheinen
		await expect(page.getByText(/Validierungsfehler/i)).toBeVisible({ timeout: 3000 });
	});
});

// ── Skip Step Test ──────────────────────────────────────────────────────────

test.describe('Sichtung melden — Step 3 überspringen', () => {
	test('Skip-Button in Step 3 springt zu Step 4', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ausfüllen und weiter
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();

		// Step 2 ausfüllen und weiter
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Beobachtungen/i);

		// Step 3 überspringen
		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);
	});
});

// ── Submit Flow Test ────────────────────────────────────────────────────────

test.describe('Sichtung melden — Formular absenden', () => {
	test('Kompletter Navigations-Flow: Steps 1-4 ausfüllen bis zum Submit-Button', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1: Position & Zeit
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Sichtungsdetails/i);

		// Step 2: Sichtungsdetails
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Beobachtungen/i);

		// Step 3: Skip (optional)
		await formPage.skipStep();
		await expectCurrentStep(page, /Kontaktdaten/i);

		// Step 4: Kontaktdaten
		await fillStep4(formPage);

		// Submit button sollte "Absenden" heißen und enabled sein (letzter Step)
		const submitButton = page.getByRole('button', { name: /Formular absenden/i });
		await expect(submitButton).toBeVisible();
		await expect(submitButton).toBeEnabled({ timeout: 3000 });
	});

	// This test requires a running database — skip in CI (no DB service configured)
	test('Submit sendet Formular und zeigt Erfolgsseite', async ({ page }) => {
		test.skip(!process.env.DATABASE_POSTGRES_URL, 'Requires database connection (skipped in CI)');
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await formPage.skipStep();
		await fillStep4(formPage);

		await formPage.clickSubmit();

		await expect(page.getByRole('heading', { name: /Vielen Dank/i })).toBeVisible({
			timeout: 10000
		});
	});
});
