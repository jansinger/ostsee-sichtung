import type { Page, Route } from '@playwright/test';

function emptyFeatureCollection(): string {
	return JSON.stringify({ type: 'FeatureCollection', features: [] });
}

export async function mockMapSightingsSuccess(page: Page): Promise<void> {
	await page.route('**/api/map/sightings**', (route: Route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: emptyFeatureCollection()
		})
	);
}

export async function mockMapSightingsAbort(page: Page): Promise<void> {
	await page.route('**/api/map/sightings**', (route: Route) => route.abort());
}

export async function mockMapSightingsHttp500(page: Page): Promise<void> {
	await page.route('**/api/map/sightings**', (route: Route) =>
		route.fulfill({
			status: 500,
			contentType: 'application/json',
			body: '{"error":"Server error"}'
		})
	);
}
