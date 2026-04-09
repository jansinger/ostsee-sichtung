import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Legend Panel', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		// Mock the sightings API so tests don't require a real database
		await page.route('**/api/map/sightings**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ type: 'FeatureCollection', features: [] })
			})
		);
		mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();
	});

	test('Legende-Panel öffnet sich via Button', async () => {
		await mapPage.openLegend();

		const panel = mapPage.getLegendPanel();
		await expect(panel).toHaveAttribute('aria-hidden', 'false');
		await expect(mapPage.getColorCheckboxes().first()).toBeVisible();
	});

	test('Legende-Panel schließt sich via Schließen-Button', async () => {
		await mapPage.openLegend();
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');

		await mapPage.closeLegend();
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'true');
	});

	test('Tastatur-Shortcut L öffnet Legende-Panel', async ({ page }) => {
		// Focus the page body to ensure keyboard events are received
		await page.locator('body').click();
		await page.keyboard.press('l');
		await expect(mapPage.getLegendPanel()).toHaveAttribute('aria-hidden', 'false');
	});

	test('Legende enthält alle 6 Farbgruppen', async () => {
		await mapPage.openLegend();

		const colorCheckboxes = mapPage.getColorCheckboxes();
		await expect(colorCheckboxes.first()).toBeVisible();
		const count = await colorCheckboxes.count();
		// ct0, ct1, ct2, ct6, ct11, ct15
		expect(count).toBe(6);
	});

	test('Legende enthält Arten-Checkboxen', async () => {
		await mapPage.openLegend();

		const speciesCheckboxes = mapPage.getSpeciesCheckboxes();
		await expect(speciesCheckboxes.first()).toBeVisible();
		const count = await speciesCheckboxes.count();
		expect(count).toBeGreaterThan(0);
	});

	test('Arten-Checkbox lässt sich an- und abwählen', async () => {
		await mapPage.openLegend();

		const firstCheckbox = mapPage.getSpeciesCheckboxes().first();
		await expect(firstCheckbox).toBeVisible();

		const initialState = await firstCheckbox.isChecked();
		await firstCheckbox.click();
		expect(await firstCheckbox.isChecked()).toBe(!initialState);

		// Zurücksetzen
		await firstCheckbox.click();
		expect(await firstCheckbox.isChecked()).toBe(initialState);
	});

	test('Farb-Checkbox lässt sich an- und abwählen', async () => {
		await mapPage.openLegend();

		const firstCheckbox = mapPage.getColorCheckboxes().first();
		await expect(firstCheckbox).toBeVisible();

		const initialState = await firstCheckbox.isChecked();
		await firstCheckbox.click();
		expect(await firstCheckbox.isChecked()).toBe(!initialState);

		// Zurücksetzen
		await firstCheckbox.click();
		expect(await firstCheckbox.isChecked()).toBe(initialState);
	});
});
