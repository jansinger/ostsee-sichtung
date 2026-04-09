import type { Page, Response } from '@playwright/test';

/**
 * Page Object for the admin area (/admin).
 * Primarily used to test auth guards (redirects without login).
 */
export class AdminPage {
	constructor(private page: Page) {}

	async goto(): Promise<Response | null> {
		return this.page.goto('/admin');
	}

	async gotoSettings(): Promise<Response | null> {
		return this.page.goto('/admin/settings');
	}

	getCurrentUrl(): string {
		return this.page.url();
	}
}
