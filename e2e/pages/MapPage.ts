import type { Page, Locator } from '@playwright/test';

/**
 * Page Object for the sightings map view (/map).
 */
export class MapPage {
	constructor(private page: Page) {}

	async goto() {
		await this.page.goto('/map');
	}

	/** Wait until the loading overlay disappears */
	async waitForLoad() {
		await this.page.getByRole('dialog').waitFor({ state: 'hidden' });
	}

	async openFilter() {
		await this.page.getByRole('button', { name: /filter öffnen/i }).click();
	}

	getYearSelect(): Locator {
		return this.page.locator('#year-select');
	}

	getFilterInput(): Locator {
		return this.page.locator('#filter-input');
	}

	getLoadingOverlay(): Locator {
		return this.page.getByRole('dialog');
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
}
