import type { Locator, Page, Response } from '@playwright/test';

/**
 * Page Object for the sightings map view (/map).
 */
export class MapPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/map');
	}

	/** Wait until map is fully initialized (both loading phases complete) */
	async waitForLoad() {
		// Phase 1: Wait for the filter toggle button to appear — proves SightingsMapView is mounted
		await this.page.getByRole('button', { name: /filter öffnen/i }).waitFor({ state: 'visible' });
		// Phase 2: Wait for SightingsMapView's own loading overlay to clear (1.5s init timeout)
		await this.page.locator('[aria-labelledby="loading-title"]').waitFor({ state: 'hidden' });
	}

	// ─── Filter Panel ──────────────────────────────────────────────────────────

	async openFilter() {
		await this.page.getByRole('button', { name: /filter öffnen/i }).click();
	}

	async closeFilter() {
		// Use the close button inside the panel (not the toggle button outside)
		await this.page
			.locator('[aria-labelledby="filter-title"]')
			.getByRole('button', { name: /filter schließen/i })
			.click();
	}

	getFilterPanel(): Locator {
		return this.page.locator('[aria-labelledby="filter-title"]');
	}

	getYearSelect(): Locator {
		return this.page.locator('#year-select');
	}

	getFilterInput(): Locator {
		return this.page.locator('#filter-input');
	}

	async selectYear(year: string) {
		await this.page.locator('#year-select').selectOption(year);
	}

	async fillSearch(text: string) {
		await this.page.locator('#filter-input').fill(text);
	}

	async submitSearch() {
		await this.page.locator('#filter-input').press('Enter');
	}

	// ─── Legend Panel ──────────────────────────────────────────────────────────

	async openLegend() {
		await this.page.getByRole('button', { name: /legende öffnen/i }).click();
	}

	async closeLegend() {
		// Use the close button inside the panel (not the toggle button outside)
		await this.page
			.locator('[aria-labelledby="legend-title"]')
			.getByRole('button', { name: /legende schließen/i })
			.click();
	}

	getLegendPanel(): Locator {
		return this.page.locator('[aria-labelledby="legend-title"]');
	}

	getSpeciesCheckboxes(): Locator {
		return this.page.locator('.species-checkbox');
	}

	getColorCheckboxes(): Locator {
		return this.page.locator('.color-checkbox');
	}

	// ─── Map Container ─────────────────────────────────────────────────────────

	getMapContainer(): Locator {
		return this.page.locator('#map');
	}

	// ─── Loading & Errors ──────────────────────────────────────────────────────

	getLoadingOverlay(): Locator {
		return this.page.locator('[aria-labelledby="loading-title"]');
	}

	getErrorAlert(): Locator {
		return this.page.getByRole('alert');
	}

	getRetryButton(): Locator {
		return this.page.getByRole('button', { name: /neu laden/i });
	}

	getMapHeading(): Locator {
		return this.page.getByRole('heading', { name: /Sichtungskarte/i });
	}

	// ─── API Helper ────────────────────────────────────────────────────────────

	/**
	 * Waits for a successful response from /api/map/sightings.
	 * Use after triggering a filter change (year select, search).
	 * Timeout 8000ms accounts for the 1.5s debounce in FilterPanel.
	 *
	 * @param urlMatcher Optional string to match against the response URL (e.g. 'search=Schweinswal')
	 */
	waitForSightingsResponse(urlMatcher?: string): Promise<Response> {
		return this.page.waitForResponse(
			(r) =>
				r.url().includes('/api/map/sightings') &&
				r.status() === 200 &&
				(urlMatcher === undefined || r.url().includes(urlMatcher)),
			{ timeout: 8000 }
		);
	}
}
