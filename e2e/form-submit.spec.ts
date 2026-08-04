import { test, expect, type Page } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { FormPage } from './pages/FormPage';
import {
	fillStep1,
	fillStep2,
	fillStep4,
	expectCurrentStep,
	waitForNextEnabled
} from './helpers/form-helpers';

/* Playwright lädt .env nicht von sich aus — dieselbe Begründung wie in
   e2e/helpers/adminSession.ts. */
loadEnv();

/**
 * Entfernt eine vom Test angelegte Sichtung wieder.
 *
 * Der Submit-Test unten schreibt eine **echte** Meldung, und zwar in dieselbe
 * Datenbank, die lokal über alle Worktrees geteilt wird. Ohne dieses Aufräumen
 * sammeln sich dort „Max Mustermann"-Zeilen an, die in jeder Auswertung über
 * Melderzahlen mitzählen — am 2026-08-02 stand eine davon zwischen den echten
 * Meldungen und ist niemandem aufgefallen.
 *
 * Den Test stattdessen zu mocken wäre der falsche Weg: Er ist der einzige, der
 * den echten Schreibpfad bis in die Spalte prüft. Die übrigen Fälle in dieser
 * Datei fangen den Endpunkt bewusst ab.
 */
async function deleteSighting(id: number): Promise<void> {
	const databaseUrl = process.env.DATABASE_POSTGRES_URL;
	if (!databaseUrl) return;

	const sql = postgres(databaseUrl, { max: 1 });
	try {
		await sql`DELETE FROM sichtungen WHERE id = ${id}`;
	} finally {
		// Sonst hält der offene Pool den Playwright-Prozess am Leben.
		await sql.end({ timeout: 5 });
	}
}

// ── Navigation Tests ────────────────────────────────────────────────────────

test.describe('Sichtung melden — Formular Navigation', () => {
	test('Formular startet auf Step 1 (Position & Zeitpunkt)', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expectCurrentStep(page, /Position & Zeitpunkt/i);
	});

	test('Step 1: Datum eingeben und zu Step 2 navigieren', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();

		await expectCurrentStep(page, /Angaben zum Tier/i);
	});

	test('Zurück-Button kehrt zum vorherigen Step zurück', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		await formPage.clickPrevious();
		await expectCurrentStep(page, /Position & Zeitpunkt/i);
	});

	test('Step-Buttons zeigen aktuellen Schritt als aria-current="step"', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		await expectCurrentStep(page, /Position & Zeitpunkt/i);

		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);
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
		await expectCurrentStep(page, /Angaben zum Tier/i);

		const stepButtons = page.locator('.step-button');
		// Step 1 (rückwärts) = navigable, Step 2 (aktuell) = navigable
		await expect(stepButtons.nth(0)).toHaveAttribute('aria-disabled', 'false');
		await expect(stepButtons.nth(1)).toHaveAttribute('aria-disabled', 'false');
		// Step 3/4 (vorwärts, Step 2 nicht valid) = disabled
		await expect(stepButtons.nth(2)).toHaveAttribute('aria-disabled', 'true');
		await expect(stepButtons.nth(3)).toHaveAttribute('aria-disabled', 'true');
	});

	test('Step-Buttons rückwärts sind nach Navigation immer enabled', async ({ page }) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 ausfüllen, zu Step 2 navigieren
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Step 1 (index 0) sollte navigierbar sein (rückwärts erlaubt)
		const stepButtons = page.locator('.step-button');
		await expect(stepButtons.nth(0)).toHaveAttribute('aria-disabled', 'false');
	});

	test('Validierungsfehler auf Step 2 zeigt Inline-Fehlermeldung erst nach Klick auf Weiter', async ({
		page
	}) => {
		const formPage = new FormPage(page);
		await formPage.goto();

		// Step 1 mit gültigem Fahrwasser (fillStep1) → valid. Navigiere zu Step 2.
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Step 2 hat keine Defaults für Pflichtfelder, der Weiter-Button bleibt aber
		// klickbar — er wird nur noch beim Absenden ($isSubmitting) deaktiviert.
		await expect(page.getByRole('button', { name: /Nächster Schritt/i })).toBeEnabled();

		// Erst der Klick auf "Weiter" löst die Validierung aus und zeigt die
		// Inline-Fehlermeldung über dem Button.
		await formPage.clickNext();
		await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 3000 });
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
		await expectCurrentStep(page, /Weitere Informationen/i);

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

		// Step 1: Position & Zeitpunkt
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Angaben zum Tier/i);

		// Step 2: Angaben zum Tier
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await expectCurrentStep(page, /Weitere Informationen/i);

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

	const createdSightingIds: number[] = [];

	test.afterEach(async () => {
		while (createdSightingIds.length > 0) {
			await deleteSighting(createdSightingIds.pop()!);
		}
	});

	/* Braucht eine echte Datenbank — der Test schreibt eine Sichtung.
	   Läuft seit dem 2026-07-30 auch in CI: Der `e2e`-Job fährt einen
	   Postgres-Service und setzt DATABASE_POSTGRES_URL auf Job-Ebene (ci.yml).

	   Der Wächter liest bewusst `process.env` des **Testprozesses** und nicht den
	   Zustand des Servers. Das ist eine Annahme, keine Messung: Lokal kann der von
	   Playwright gestartete Dev-Server seine URL aus `.env` haben, während der
	   Testprozess sie nicht in `process.env` sieht — dann überspringt dieser Test,
	   obwohl eine Datenbank steht. Umgekehrt gilt dasselbe. Wer das genauer
	   braucht, sondiert wie `design-tokens.spec.ts` über einen HTTP-Endpunkt. */
	test('Submit sendet Formular und zeigt Erfolgsseite', async ({ page }) => {
		test.skip(
			!process.env.DATABASE_POSTGRES_URL,
			'Braucht eine Datenbank — DATABASE_POSTGRES_URL ist im Testprozess nicht gesetzt'
		);
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

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) => res.url().includes('/api/sightings') && res.request().method() === 'POST'
			),
			formPage.clickSubmit()
		]);

		// Die angelegte Zeile sofort merken — auch ein danach fehlschlagender Test
		// darf sie nicht in der Datenbank stehen lassen.
		const created = (await response.json().catch(() => null)) as { id?: number } | null;
		if (typeof created?.id === 'number') {
			createdSightingIds.push(created.id);
		}

		await expect(page.getByRole('heading', { name: /Vielen Dank/i })).toBeVisible({
			timeout: 10000
		});
	});
});

// ── Submit mit API-Mock (CI-tauglich) ──────────────────────────────────────

test.describe('Sichtung melden — Submit mit API-Mock', () => {
	/** Fill all steps and navigate to submit-ready state */
	async function fillAllSteps(formPage: FormPage, page: Page) {
		await fillStep1(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await fillStep2(formPage);
		await waitForNextEnabled(page);
		await formPage.clickNext();
		await formPage.skipStep();
		await fillStep4(formPage);
	}

	test('Happy Path: Erfolgreiche Submission zeigt Erfolgsseite', async ({ page }) => {
		// Mock API endpoint
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({ success: true, id: 42, referenceId: 'REF-42' })
			});
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		await expect(page.getByRole('heading', { name: /Vielen Dank/i })).toBeVisible({
			timeout: 10000
		});
		await expect(page.getByText(/erfolgreich übermittelt/i)).toBeVisible();
	});

	test('API-Fehler: Server gibt 500 zurück — Formular bleibt auf Step 4', async ({ page }) => {
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ success: false, message: 'Interner Serverfehler' })
			});
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		// Formular sollte auf Step 4 bleiben (kein Wechsel zur Erfolgsseite)
		await expectCurrentStep(page, /Kontaktdaten/i);

		// Der Fehlschlag steht als SubmitStatus über der Navigation — nicht mehr
		// als Toast. Die Server-Meldung eines 5xx wird bewusst NICHT gezeigt: sie
		// ist generisch („Ein unbekannter Fehler ist aufgetreten") und sagt dem
		// Nutzer weniger als die Zusage, dass seine Eingaben erhalten bleiben.
		const status = page.locator('[data-testid="submit-status-failed"]');
		await expect(status).toBeVisible({ timeout: 5000 });
		await expect(status).toContainText('Ihre Eingaben sind nicht verloren');
		await expect(status).toContainText('Versuch 1 von 3');
		await expect(status.getByRole('button', { name: /Erneut absenden/i })).toBeVisible();
	});

	test('Validation-Rejection: Server gibt 400 zurück — Fehlermeldung sichtbar', async ({
		page
	}) => {
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					message: 'Validierung fehlgeschlagen: E-Mail ungültig'
				})
			});
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		// Formular bleibt auf Step 4
		await expectCurrentStep(page, /Kontaktdaten/i);
		// Fehlermeldung sichtbar
		await expect(page.getByText('Validierung fehlgeschlagen: E-Mail ungültig')).toBeVisible({
			timeout: 5000
		});
	});

	/**
	 * Der Sprung zum abgelehnten Feld.
	 *
	 * `message` ist bei einem `VALIDATION_ERROR` immer derselbe Satz und nennt
	 * kein Feld — der Nutzer stand vorher auf Schritt 4 vor „Validierungsfehler
	 * bei der Eingabe" und hatte keinen Hinweis, dass das gemeinte Feld zwei
	 * Schritte zurück liegt. Die Feldkarte aus `errors` macht daraus ein Ziel.
	 */
	test('Feldfehler: Server nennt ein Feld aus Schritt 1 — Formular springt dorthin', async ({
		page
	}) => {
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					code: 'VALIDATION_ERROR',
					message: 'Validierungsfehler bei der Eingabe',
					errors: { waterway: 'Fahrwasser darf höchstens 100 Zeichen haben' }
				})
			});
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		// Zurück auf Schritt 1 — dort steht das abgelehnte Feld
		await expectCurrentStep(page, /Position & Zeitpunkt/i);

		// Das Feld trägt die Meldung des Servers selbst …
		const waterway = page.locator('[data-testid="field-waterway"]');
		await expect(page.getByText('Fahrwasser darf höchstens 100 Zeichen haben')).toBeVisible({
			timeout: 5000
		});
		await expect(waterway).toHaveAttribute('aria-invalid', 'true');

		// … und bekommt den Fokus (fieldNavigation fokussiert nach ~500 ms)
		await expect(waterway).toBeFocused({ timeout: 5000 });

		// Der Zustand über der Navigation bleibt bestehen — er trägt Referenz und
		// Wiederholen, das Feld trägt den Grund.
		await expect(page.locator('[data-testid="submit-status-failed"]')).toBeVisible();
	});

	test('Feldfehler auf dem aktuellen Schritt: kein Sprung, Feld zeigt den Grund', async ({
		page
	}) => {
		await page.route('**/api/sightings', (route) => {
			route.fulfill({
				status: 400,
				contentType: 'application/json',
				body: JSON.stringify({
					success: false,
					code: 'VALIDATION_ERROR',
					message: 'Validierungsfehler bei der Eingabe',
					errors: { email: 'Diese E-Mail-Adresse ist bereits gesperrt' }
				})
			});
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		await expectCurrentStep(page, /Kontaktdaten/i);
		await expect(page.getByText('Diese E-Mail-Adresse ist bereits gesperrt')).toBeVisible({
			timeout: 5000
		});
		await expect(page.locator('[data-testid="field-email"]')).toHaveAttribute(
			'aria-invalid',
			'true'
		);
	});

	test('Netzwerkfehler: Route abgebrochen — als Verbindungsproblem erkannt', async ({ page }) => {
		await page.route('**/api/sightings', (route) => {
			route.abort('connectionrefused');
		});

		const formPage = new FormPage(page);
		await formPage.goto();
		await fillAllSteps(formPage, page);
		await formPage.clickSubmit();

		// Formular bleibt auf Step 4
		await expectCurrentStep(page, /Kontaktdaten/i);

		// `fetch` wirft hier einen TypeError — das ist ein Verbindungsproblem, kein
		// Serverfehler, und wird als solches gezeigt. Genau der Fall „WLAN an Bord
		// ohne Uplink": `navigator.onLine` meldet weiter `true`.
		const status = page.locator('[data-testid="submit-status-offline"]');
		await expect(status).toBeVisible({ timeout: 5000 });
		await expect(status).toContainText('Eingaben bleiben vollständig gespeichert');

		// Aber NICHT gesperrt: Der Zustand ist hier nur aus einem gescheiterten
		// Request abgeleitet — `navigator.onLine` meldet weiter `true`, und ohne
		// `online`-Ereignis würde ihn nichts wieder aufheben. Eine harte Sperre
		// hielte den Nutzer bis zum Neuladen fest. Gesperrt wird nur beim sicheren
		// Nein des Browsers (siehe e2e/submit-offline.spec.ts).
		await expect(page.getByRole('button', { name: /Formular absenden/i })).not.toHaveAttribute(
			'aria-disabled',
			'true'
		);
		await expect(status.getByRole('button', { name: /Trotzdem versuchen/i })).toBeVisible();
	});
});
