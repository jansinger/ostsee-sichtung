import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the 4-step sighting report form on the homepage.
 * Encapsulates all selectors and interactions for the report form.
 *
 * Note on selectors: `data-testid` is placed directly on the <input>/<select>/<textarea>
 * elements by FieldRenderer.svelte (not on a wrapper div). Use `[data-testid="field-X"]`
 * directly to target the field.
 *
 * Note on navigation: Step indicator buttons do NOT navigate directly. Navigation
 * only works via clickNext() / clickPrevious(). Forward navigation requires the
 * current step to be valid.
 */
export class FormPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/');
		// Wait for Svelte to fully hydrate before interacting with form elements
		await this.page.waitForLoadState('networkidle');
		// Ensure the step indicator (Svelte component) is rendered and interactive
		await this.page.locator('button[aria-current="step"]').waitFor({ state: 'visible' });
	}

	// ── Step Navigation ──────────────────────────────────────────────────────

	async clickNext() {
		await this.page.getByRole('button', { name: /Nächster Schritt/i }).click();
	}

	async clickSubmit() {
		await this.page.getByRole('button', { name: /Formular absenden/i }).click();
	}

	async clickPrevious() {
		await this.page.getByRole('button', { name: /Vorheriger Schritt/i }).click();
	}

	async skipStep() {
		await this.page.getByRole('button', { name: /Schritt überspringen/i }).click();
	}

	// ── Step 1: Position & Zeit ───────────────────────────────────────────────

	async fillDate(value: string) {
		// data-testid sits directly on the <input type="date"> element
		await this.page.locator('[data-testid="field-sightingDate"]').fill(value);
	}

	async fillTime(value: string) {
		await this.page.locator('[data-testid="field-sightingTime"]').fill(value);
	}

	// ── Step 2: Sichtungsdetails ─────────────────────────────────────────────

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

	async selectBoatDrive(index: number) {
		await this.page.locator('[data-testid="field-boatDrive"]').selectOption(String(index));
	}

	// ── Step 4: Kontaktdaten ─────────────────────────────────────────────────

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
		return (
			(await this.page.locator('button[aria-current="step"]').getAttribute('aria-label')) ?? ''
		);
	}

	async isNextDisabled(): Promise<boolean> {
		const btn = this.page.getByRole('button', { name: /Nächster Schritt/i });
		return btn.isDisabled();
	}

	getSuccessAlert(): Locator {
		return this.page.getByRole('alert').filter({ hasText: /erfolgreich|bestätigung/i });
	}

	getErrorAlert(): Locator {
		return this.page.getByRole('alert').filter({ hasText: /fehler/i });
	}

	getForm(): Locator {
		return this.page.locator('form').first();
	}

	getActiveStepButton(): Locator {
		return this.page.locator('button[aria-current="step"]');
	}
}
