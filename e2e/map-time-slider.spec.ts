import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe.serial('Map Time Slider', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		const context = await browser.newContext();
		sharedPage = await context.newPage();
		mapPage = await setupMapPage(sharedPage);
		await mapPage.openFilter();
	});

	test.afterAll(async () => {
		await sharedPage.context().close();
	});

	test('Zeitraum-Slider haben korrekte Standard-Attribute', async () => {
		const startSlider = mapPage.getStartSlider();
		const endSlider = mapPage.getEndSlider();

		await expect(startSlider).toHaveAttribute('min', '0');
		await expect(startSlider).toHaveAttribute('value', '0');

		await expect(endSlider).toHaveAttribute('min', '0');

		// max ist 364 oder 365 (Schaltjahr) — 0-basierte Day-Offsets: 0..daysInYear-1
		const maxAttr = await endSlider.getAttribute('max');
		expect(['364', '365']).toContain(maxAttr);

		// End-Slider startet bei max (ganzes Jahr ausgewählt) — via DOM property, nicht HTML-Attribut
		await expect(endSlider).toHaveValue(maxAttr!);

		// Start- und End-Slider haben den gleichen max-Wert
		await expect(startSlider).toHaveAttribute('max', maxAttr!);

		// Schaltjahr-Test: 2024 hat 366 Tage → max-Index = 365
		await sharedPage.locator('#year-select').selectOption('2024');
		await expect(endSlider).toHaveAttribute('max', '365');
		await expect(startSlider).toHaveAttribute('max', '365');
	});

	test('Start-Slider lässt sich verschieben', async () => {
		await mapPage.setSliderValue('time-range-start', 90);
		await expect(mapPage.getStartSlider()).toHaveValue('90');
	});

	test('Ende-Slider lässt sich verschieben', async () => {
		await mapPage.setSliderValue('time-range-end', 270);
		await expect(mapPage.getEndSlider()).toHaveValue('270');
	});

	test('Start-Slider wird auf Ende-1 geclampt wenn er Ende überschreitet', async () => {
		const result = await sharedPage.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			// Reset to neutral state first
			start.value = '0';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			end.value = '100';
			end.dispatchEvent(new Event('input', { bubbles: true }));

			start.value = '200';
			start.dispatchEvent(new Event('input', { bubbles: true }));

			return { startValue: start.value, endValue: end.value };
		});

		// Constraint: start (200) >= end (100) → start is clamped to end - 1 = 99
		expect(result.startValue).toBe('99');
	});

	test('Ende-Slider wird auf Start+1 geclampt wenn er Start unterschreitet', async () => {
		const result = await sharedPage.evaluate(() => {
			const start = document.getElementById('time-range-start') as HTMLInputElement;
			const end = document.getElementById('time-range-end') as HTMLInputElement;

			// Reset to neutral state first
			end.value = String(parseInt(end.max));
			end.dispatchEvent(new Event('input', { bubbles: true }));

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
