import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

test.describe.serial('Map Time Slider', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		sharedPage = await browser.newPage();
		mapPage = await setupMapPage(sharedPage);
		await mapPage.openFilter();
	});

	test.afterAll(async () => {
		await sharedPage.close();
	});

	test('Zeitraum-Slider haben korrekte Standard-Attribute', async () => {
		const startSlider = mapPage.getStartSlider();
		const endSlider = mapPage.getEndSlider();

		await expect(startSlider).toHaveAttribute('min', '0');
		// M10: value ist eine DOM-Property der Svelte-Komponente, kein HTML-Attribut
		await expect(startSlider).toHaveValue('0');

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

	test('Start-Slider wird auf Ende geclampt wenn er Ende überschreitet', async () => {
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

		// Constraint (QW4): start (200) > end (100) → start wird auf end geklemmt;
		// start == end ist erlaubt (Auswahl eines einzelnen Tages)
		expect(result.startValue).toBe('100');
	});

	test('Ende-Slider wird auf Start geclampt wenn er Start unterschreitet', async () => {
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

		// Constraint (QW4): end (50) < start (200) → end wird auf start geklemmt;
		// start == end ist erlaubt (Auswahl eines einzelnen Tages)
		expect(result.endValue).toBe('200');
	});

	test('Zeitraum-Anzeige-Elemente sind im DOM vorhanden', async () => {
		await expect(mapPage.getTimeStartDisplay()).toBeAttached();
		await expect(mapPage.getTimeEndDisplay()).toBeAttached();
	});

	// ─── M10: Dual-Range-Slider — ein Track, aria-valuetext, Datums-Felder ─────

	test('Griffe tragen lesbares Datum als aria-valuetext (M10)', async () => {
		// Stand nach den vorherigen Serial-Tests: Jahr 2024, Start 0, Ende 200
		// (Clamp-Test) — für einen deterministischen Stand explizit neu setzen.
		await mapPage.setSliderValue('time-range-start', 0);
		await mapPage.setSliderValue('time-range-end', 270);
		await mapPage.setSliderValue('time-range-start', 90);

		// 2024 (Schaltjahr): Index 90 = 31. März, Index 270 = 27. September
		await expect(mapPage.getStartSlider()).toHaveAttribute('aria-valuetext', '31. März');
		await expect(mapPage.getEndSlider()).toHaveAttribute('aria-valuetext', '27. September');
	});

	test('Track zeigt einen gefüllten Bereich zwischen den Griffen (M10)', async () => {
		const container = sharedPage.locator('[data-testid="dual-range"]');
		await expect(container).toBeAttached();

		const vars = await container.evaluate((el) => ({
			start: el.style.getPropertyValue('--range-start'),
			end: el.style.getPropertyValue('--range-end')
		}));
		// Stand aus dem vorherigen Test: 90/365 ≈ 24,7 %, 270/365 ≈ 74 %
		expect(parseFloat(vars.start)).toBeCloseTo((90 / 365) * 100, 1);
		expect(parseFloat(vars.end)).toBeCloseTo((270 / 365) * 100, 1);

		await expect(sharedPage.locator('.dual-range-fill')).toBeVisible();
	});

	test('Datums-Eingabefelder sind synchron zum Slider und aufs Jahr geklemmt (M10)', async () => {
		const startDate = mapPage.getStartDateInput();
		const endDate = mapPage.getEndDateInput();

		await expect(startDate).toHaveAttribute('min', '2024-01-01');
		await expect(startDate).toHaveAttribute('max', '2024-12-31');
		await expect(endDate).toHaveAttribute('min', '2024-01-01');
		await expect(endDate).toHaveAttribute('max', '2024-12-31');

		// Stand aus den vorherigen Tests: Start-Index 90 = 2024-03-31
		await expect(startDate).toHaveValue('2024-03-31');
	});

	test('Datums-Eingabe setzt den Slider-Wert (M10)', async () => {
		// 2024-07-04 = Index 185 im Schaltjahr (31+29+31+30+31+30+3 = Tag 186, 0-basiert 185)
		await mapPage.getStartDateInput().fill('2024-07-04');

		await expect(mapPage.getStartSlider()).toHaveValue('185');
		await expect(mapPage.getStartSlider()).toHaveAttribute('aria-valuetext', '4. Juli');
		// URL-Sync (M4) übernimmt das Datum aus dem Kartenfilter
		await expect(sharedPage).toHaveURL(/from=2024-07-04/);
	});
});
