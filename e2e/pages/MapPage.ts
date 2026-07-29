import type { Locator, Page, Response } from '@playwright/test';
import { MAP_TEST_TIMEOUTS } from '../config/testTimeouts';

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
		const maxRetries = MAP_TEST_TIMEOUTS.mapReadyRetries;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				await this.waitForLoadOnce();
				return;
			} catch (error) {
				if (attempt === maxRetries) {
					throw error;
				}
				// Log the error so it appears in CI output even when retry succeeds
				console.warn(
					`[MapPage] waitForLoad attempt ${attempt + 1} failed, reloading page:`,
					(error as Error).message
				);
				// Recover from transient CI startup races by refreshing the page once.
				await this.page.reload({ waitUntil: 'domcontentloaded' });
			}
		}
	}

	private async waitForLoadOnce() {
		// Phase 1: Wait for the filter toggle button to appear — proves SightingsMapView is mounted
		const filterToggle = this.getFilterToggle();
		await filterToggle.waitFor({ state: 'visible', timeout: MAP_TEST_TIMEOUTS.componentMount });

		// Phase 2: Wait for SichtungsMapView's own loading overlay to clear (1.5s init timeout).
		// Use count() for an instant DOM check rather than a timed probe — if the overlay is
		// already gone (Svelte {#if} removed it), count() returns 0 immediately with no delay.
		const loadingOverlay = this.getLoadingOverlay();
		if ((await loadingOverlay.count()) > 0) {
			await loadingOverlay.waitFor({ state: 'hidden', timeout: MAP_TEST_TIMEOUTS.overlayHide });
		}
	}

	// ─── Filter Panel ──────────────────────────────────────────────────────────

	/** Toggle-Button des Filter-Panels (statisches Label, Zustand via aria-expanded) */
	getFilterToggle(): Locator {
		return this.page.getByRole('button', { name: /^filter$/i });
	}

	async openFilter() {
		await this.getFilterToggle().click();
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

	/** Toggle-Button des Legende-Panels (statisches Label, Zustand via aria-expanded) */
	getLegendToggle(): Locator {
		return this.page.getByRole('button', { name: /^legende$/i });
	}

	async openLegend() {
		await this.getLegendToggle().click();
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

	// ─── Time Slider ───────────────────────────────────────────────────────────

	getStartSlider(): Locator {
		return this.page.locator('#time-range-start');
	}

	getEndSlider(): Locator {
		return this.page.locator('#time-range-end');
	}

	getTimeStartDisplay(): Locator {
		return this.page.locator('#time-start');
	}

	getTimeEndDisplay(): Locator {
		return this.page.locator('#time-end');
	}

	/** M10: Datums-Eingabefelder — gleichwertige Alternative zum Dual-Slider */
	getStartDateInput(): Locator {
		return this.page.locator('#time-date-start');
	}

	getEndDateInput(): Locator {
		return this.page.locator('#time-date-end');
	}

	/**
	 * Sets a range slider value and fires the input event so event handlers run.
	 * Playwright's fill() does not reliably fire input events on range inputs.
	 */
	async setSliderValue(id: string, value: number) {
		await this.page.locator(`#${id}`).evaluate((el, val) => {
			(el as HTMLInputElement).value = val.toString();
			el.dispatchEvent(new Event('input', { bubbles: true }));
		}, value);
	}

	// ─── Loading & Errors ──────────────────────────────────────────────────────

	getLoadingOverlay(): Locator {
		// H5: LoadingOverlay ist eine role="status"-Live-Region; der sichtbare
		// Inhalt trägt eine Test-ID, weil der Wrapper dauerhaft im DOM bleibt.
		return this.page.getByTestId('map-loading-content');
	}

	getErrorAlert(): Locator {
		return this.page.locator('.alert-error');
	}

	getDismissErrorButton(): Locator {
		return this.page.getByRole('button', { name: /fehlermeldung schließen/i });
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
			{ timeout: MAP_TEST_TIMEOUTS.apiResponse }
		);
	}
}
