import type { Page, Route } from '@playwright/test';

function emptyFeatureCollection(): string {
	return JSON.stringify({ type: 'FeatureCollection', features: [] });
}

async function replaceMapSightingsRoute(page: Page, handler: (route: Route) => Promise<void> | void) {
	await page.unroute('**/api/map/sightings**');
	await page.route('**/api/map/sightings**', handler);
}

export async function mockMapSightingsSuccess(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: emptyFeatureCollection()
		})
	);
}

export async function mockMapSightingsAbort(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) => route.abort());
}

export async function mockMapSightingsHttp500(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) =>
		route.fulfill({
			status: 500,
			contentType: 'application/json',
			body: '{"error":"Server error"}'
		})
	);
}
