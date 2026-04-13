import type { Page } from '@playwright/test';
import { MapPage } from '../pages/MapPage';
import { mockMapSightingsSuccess } from './mockApi';

export async function setupMapPage(page: Page): Promise<MapPage> {
	await mockMapSightingsSuccess(page);
	const mapPage = new MapPage(page);
	await mapPage.goto();
	await mapPage.waitForLoad();
	return mapPage;
}
