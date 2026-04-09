import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Time Slider', () => {
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
		await mapPage.openFilter();
	});

	test('Zeitraum-Slider haben korrekte Standard-Attribute', async ({ page }) => {
		const startSlider = mapPage.getStartSlider();
		const endSlider = mapPage.getEndSlider();

		await expect(startSlider).toHaveAttribute('min', '0');
		await expect(startSlider).toHaveAttribute('value', '0');

		await expect(endSlider).toHaveAttribute('min', '0');

		// max ist 365 oder 366 (Schaltjahr) — dynamisch basierend auf gewähltem Jahr
		const maxAttr = await endSlider.getAttribute('max');
		expect(['365', '366']).toContain(maxAttr);

		// End-Slider startet bei max (ganzes Jahr ausgewählt) — via DOM property, nicht HTML-Attribut
		await expect(endSlider).toHaveValue(maxAttr!);

		// Start- und End-Slider haben den gleichen max-Wert
		await expect(startSlider).toHaveAttribute('max', maxAttr!);

		// Schaltjahr-Test: 2024 muss 366 liefern
		await page.locator('#year-select').selectOption('2024');
		await expect(endSlider).toHaveAttribute('max', '366');
		await expect(startSlider).toHaveAttribute('max', '366');
	});

	test('Start-Slider lässt sich verschieben', async () => {
		await mapPage.setSliderValue('time-range-start', 90);
		await expect(mapPage.getStartSlider()).toHaveValue('90');
	});

	test('Ende-Slider lässt sich verschieben', async () => {
		await mapPage.setSliderValue('time-range-end', 270);
		await expect(mapPage.getEndSlider()).toHaveValue('270');
	});

	test('Start-Slider wird auf Ende-1 geclampt wenn er Ende überschreitet', async ({ page }) => {
		const result = await page.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			end.value = '100';
			end.dispatchEvent(new Event('input', { bubbles: true }));

			start.value = '200';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			return { startValue: start.value, endValue: end.value };
		});

		// Constraint: start (200) >= end (100) → start is clamped to end - 1 = 99
		expect(result.startValue).toBe('99');
	});

	test('Ende-Slider wird auf Start+1 geclampt wenn er Start unterschreitet', async ({ page }) => {
		const result = await page.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			start.value = '200';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			end.value = '50';
			end.dispatchEvent(new Event('input', { bubbles: true }));

			return { startValue: start.value, endValue: end.value };
		});

		// Constraint: end (50) <= start (200) → end is clamped to start + 1 = 201
		expect(result.endValue).toBe('201');
	});

	test('Zeitraum-Anzeige-Elemente sind im DOM vorhanden', async () => {
		await expect(mapPage.getTimeStartDisplay()).toBeAttached();
		await expect(mapPage.getTimeEndDisplay()).toBeAttached();
	});
});
