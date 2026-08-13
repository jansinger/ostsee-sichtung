import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the 4-step sighting report form on the homepage.
 * Encapsulates all selectors and interactions for the report form.
 *
 * Note on selectors: `data-testid` is placed directly on the <input>/<select>/<textarea>
 * elements by FieldRenderer.svelte (not on a wrapper div). Use `[data-testid="field-X"]`
 * directly to target the field.
 *
 * Note on visible text: this page object is used by the `/en` specs
 * (`i18n-*.spec.ts`) as well as the German ones, so ANY selector matching
 * user-visible text needs both languages. A German-only pattern does not fail
 * when it is written — it fails later, on the day that string gets translated,
 * and it fails in the `/en` spec rather than where the pattern lives. That has
 * now happened twice: first for `Nächster Schritt`/`Formular absenden`, then
 * for `Schritt überspringen` when the pretranslation reached step 3. Prefer
 * `data-testid` or a role; where the text is the only handle, write
 * `/deutsch|english/i`.
 *
 * `MapPage.ts` still carries three German-only patterns (filter, legend and
 * error-message close buttons). They are not broken today because no `/en`
 * spec drives the map — deliberately left alone rather than changed without a
 * test that would catch a typo. Whoever writes the first English map spec
 * starts there.
 *
 * Note on the active step: since PR 3 the step state stands TWICE in the DOM —
 * the written out stepper (`FormSteps.svelte`, `md` and up) and the compact one
 * in the fixed bar (`StepProgressCompact.svelte`, below `md`). Both carry
 * `aria-current="step"`; CSS hides one of them, so assistive technology and the
 * user only ever meet one. A bare `[aria-current="step"]` therefore matches two
 * elements and trips Playwright's strict mode — every access goes through
 * ACTIVE_STEP, which adds `:visible` and thus means "the active step at THIS
 * viewport width".
 *
 * Note on navigation: Step indicator buttons allow direct navigation.
 * Backward: always allowed. Forward: only if all intermediate steps are valid.
 * Steps with unmet validation are disabled. Primary navigation via clickNext() / clickPrevious().
 */
const ACTIVE_STEP = '[aria-current="step"]:visible';

export class FormPage {
	constructor(private page: Page) {}

	/**
	 * Der Zweig-Parameter überspringt die Einstiegsseite („Was möchten Sie
	 * melden?"). Ohne ihn müsste jeder Spec sie erst durchklicken; die
	 * Auswahlseite selbst wird eigens in `e2e/report-kind-choice.spec.ts`
	 * abgedeckt. Default `lebend`, weil die meisten Specs, die über dieses
	 * Page-Object laufen, Formularmechanik prüfen, die mit dem Zweig nichts
	 * zu tun hat — Totfund-Verhalten fordert den Parameter explizit an.
	 */
	async goto(kind: 'lebend' | 'totfund' = 'lebend') {
		await this.page.goto(`/?meldung=${kind}`);
		// Wait for Svelte to fully hydrate before interacting with form elements
		await this.page.waitForLoadState('networkidle');
		// Ensure the step indicator (Svelte component) is rendered and interactive
		await this.page.locator(ACTIVE_STEP).waitFor({ state: 'visible' });
	}

	// ── Step Navigation ──────────────────────────────────────────────────────

	async clickNext() {
		await this.page.getByRole('button', { name: /Nächster Schritt|Next step/i }).click();
	}

	async clickSubmit() {
		await this.page.getByRole('button', { name: /Formular absenden|Submit form/i }).click();
	}

	async clickPrevious() {
		await this.page.getByRole('button', { name: /Vorheriger Schritt|Previous step/i }).click();
	}

	/**
	 * Der Knopf trägt ein `aria-label`, und das schlägt seinen sichtbaren Text
	 * als barrierefreien Namen. Deutsch fiel das nie auf: „Schritt
	 * überspringen" ist zufällig Teilkette von „Diesen optionalen Schritt
	 * überspringen". Englisch trennen sich die beiden („Skip this step" gegen
	 * „Skip this optional step"), und ein Muster nach dem sichtbaren Text
	 * findet nichts. Deshalb hier das `optional` als optionale Gruppe — das
	 * Muster trifft beide Fassungen, egal welche gerade den Namen stellt.
	 */
	async skipStep() {
		await this.page
			.getByRole('button', { name: /Schritt überspringen|Skip this( optional)? step/i })
			.click();
	}

	// ── Step 1: Position & Zeitpunkt ───────────────────────────────────────────────

	async fillDate(value: string) {
		// data-testid sits directly on the <input type="date"> element
		await this.page.locator('[data-testid="field-sightingDate"]').fill(value);
	}

	async fillTime(value: string) {
		await this.page.locator('[data-testid="field-sightingTime"]').fill(value);
	}

	/**
	 * Ortsbeschreibung („Wo ungefähr?", Feldname weiterhin `waterway`) —
	 * Pflichtfeld solange keine GPS-Position vorliegt (`hasPosition !== true`).
	 * Es gibt keine Methodenwahl mehr und seit A2.4 auch kein zweites Feld für
	 * das Seezeichen: Das eine Feld steht immer im Block „Ortsbeschreibung"
	 * (`LocationDescription.svelte`) und ist ohne Koordinaten von Anfang an
	 * aufgeklappt. Mit Koordinaten und leerem Feld startet der Block zugeklappt —
	 * dann vorher die `<summary>` klicken, sonst greift `fill()` ins Leere.
	 */
	async fillWaterway(value: string) {
		await this.page.locator('[data-testid="field-waterway"]').fill(value);
	}

	// ── Step 2: Angaben zum Tier ─────────────────────────────────────────────

	async selectSpecies(index: number) {
		await this.page.locator('[data-testid="field-species"]').selectOption(String(index));
	}

	async fillTotalCount(value: number) {
		await this.page.locator('[data-testid="field-totalCount"]').fill(String(value));
	}

	async fillJuvenileCount(value: number) {
		await this.page.locator('[data-testid="field-juvenileCount"]').fill(String(value));
	}

	async selectDistance(index: number) {
		await this.page.locator('[data-testid="field-distance"]').selectOption(String(index));
	}

	async selectSightingFrom(index: number) {
		await this.page.locator('[data-testid="field-sightingFrom"]').selectOption(String(index));
	}

	/**
	 * Nur sichtbar UND Pflicht, solange `sightingFrom` = 0 (Sonstiges) —
	 * `SightingDetails.svelte` rendert es hinter `{#if sightingFrom === OTHER}`,
	 * das Schema macht es über `.when('sightingFrom', …)` genau dort required.
	 */
	async fillSightingFromText(value: string) {
		await this.page.locator('[data-testid="field-sightingFromText"]').fill(value);
	}

	/**
	 * Answers the motor question that appears for Segelschiff/Motorboot.
	 *
	 * Since PR 4 (2026-08-04) this is a two-option radio group, not a select —
	 * BaseRadio.svelte suffixes the testid per option (`field-boatDrive-<value>`).
	 * The argument is therefore the stored `BoatDriveEnum` value: `1` = Motor
	 * lief, `6` = Motor lief nicht. The full drive list stays in the admin form.
	 */
	async selectBoatDrive(value: number) {
		await this.page.locator(`[data-testid="field-boatDrive-${value}"]`).check();
	}

	/**
	 * Zustand des toten Tieres (`AnimalConditionEnum`) — Pflichtfeld auf Schritt 2,
	 * sobald `isDead` gesetzt ist (siehe `sightingSchema.ts`, `deadCondition.when('isDead', …)`).
	 * Ohne diese Angabe bleibt „Weiter" bei einer Totfund-Meldung gesperrt.
	 */
	async selectDeadCondition(value: number) {
		await this.page.locator('[data-testid="field-deadCondition"]').selectOption(String(value));
	}

	// ── Step 3: Weitere Informationen (Boot/Verhalten) ───────────────────────

	async fillShipName(value: string) {
		await this.page.locator('[data-testid="field-shipName"]').fill(value);
	}

	async fillHomePort(value: string) {
		await this.page.locator('[data-testid="field-homePort"]').fill(value);
	}

	async fillReaction(value: string) {
		await this.page.locator('[data-testid="field-reaction"]').fill(value);
	}

	// ── Step 4: Kontaktdaten ─────────────────────────────────────────────────

	async checkShipNameConsent() {
		await this.page.locator('[data-testid="field-shipNameConsent"]').check();
	}

	async fillFirstName(value: string) {
		await this.page.locator('[data-testid="field-firstName"]').fill(value);
	}

	async fillLastName(value: string) {
		await this.page.locator('[data-testid="field-lastName"]').fill(value);
	}

	async fillEmail(value: string) {
		await this.page.locator('[data-testid="field-email"]').fill(value);
	}

	async fillPhone(value: string) {
		await this.page.locator('[data-testid="field-phone"]').fill(value);
	}

	async checkPrivacyConsent() {
		// Checkbox: data-testid is on the <input type="checkbox"> itself
		await this.page.locator('[data-testid="field-privacyConsent"]').check();
	}

	// ── Status Queries ────────────────────────────────────────────────────────

	async getCurrentStep(): Promise<string> {
		return (await this.page.locator(ACTIVE_STEP).getAttribute('aria-label')) ?? '';
	}

	async isNextDisabled(): Promise<boolean> {
		const btn = this.page.getByRole('button', { name: /Nächster Schritt|Next step/i });
		return btn.isDisabled();
	}

	getSuccessAlert(): Locator {
		return this.page
			.getByRole('alert')
			.filter({ hasText: /erfolgreich|bestätigung|successfully|confirmation/i });
	}

	getErrorAlert(): Locator {
		return this.page.getByRole('alert').filter({ hasText: /fehler|error/i });
	}

	getForm(): Locator {
		return this.page.locator('form').first();
	}

	getActiveStepButton(): Locator {
		return this.page.locator(ACTIVE_STEP);
	}
}
