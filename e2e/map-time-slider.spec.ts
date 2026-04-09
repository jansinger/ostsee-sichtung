import { expect, test } from '@playwright/test';
import { MapPage } from './pages/MapPage';

test.describe('Map Time Slider', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();
		await mapPage.openFilter();
	});

	test('Zeitraum-Slider haben korrekte Standard-Attribute', async () => {
		const startSlider = mapPage.getStartSlider();
		const endSlider = mapPage.getEndSlider();

		await expect(startSlider).toHaveAttribute('min', '0');
		await expect(startSlider).toHaveAttribute('max', '365');
		await expect(startSlider).toHaveAttribute('value', '0');

		await expect(endSlider).toHaveAttribute('min', '0');
		await expect(endSlider).toHaveAttribute('max', '365');
		await expect(endSlider).toHaveAttribute('value', '365');
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
		// Focus the start slider so the map controller treats it as the dragged element
		// (optimizedMapController uses document.activeElement to decide which end to clamp)
		const result = await page.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			end.value = '100';
			end.dispatchEvent(new Event('input', { bubbles: true }));

			start.focus(); // mark start as active before dispatching
			start.value = '200';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			return { startValue: start.value, endValue: end.value };
		});

		// Constraint: start (200) >= end (100) → start is clamped to end - 1 = 99
		expect(result.startValue).toBe('99');
	});

	test('Ende-Slider wird auf Start+1 geclampt wenn er Start unterschreitet', async ({ page }) => {
		// Focus the end slider so the controller treats it as the dragged element
		const result = await page.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			start.value = '200';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			end.focus(); // mark end as active before dispatching
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
