import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { setupMapPage } from './fixtures/mapSetup';

/**
 * Befund H6: Panels als Bottom-Sheet auf Mobile, 320-px-Panels mit
 * gegenseitigem Schließen auf Desktop.
 */
test.describe.serial('Map Panels (H6) — Desktop', () => {
	let mapPage: MapPage;
	let sharedPage: Page;

	test.beforeAll(async ({ browser }) => {
		sharedPage = await browser.newPage();
		mapPage = await setupMapPage(sharedPage);
	});

	test.afterAll(async () => {
		await sharedPage.close();
	});

	test('Öffnen der Legende schließt das Filter-Panel und umgekehrt (Exklusivität)', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);

		// Legende öffnen → Filter-Panel muss zugehen
		await mapPage.openLegend();
		await expect(mapPage.getLegendPanel()).toHaveJSProperty('inert', false);
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');

		// Filter öffnen → Legende muss zugehen
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);
		await expect(mapPage.getLegendPanel()).toHaveJSProperty('inert', true);
		await expect(mapPage.getLegendToggle()).toHaveAttribute('aria-expanded', 'false');

		// Aufräumen für den nächsten Test
		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);
	});

	test('Offenes Filter-Panel ist 320px breit und ragt nicht unten aus dem Viewport', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);

		// Geometrie erst nach der 300ms-Transition stabil → poll
		await expect
			.poll(async () => mapPage.getFilterPanel().evaluate((el) => el.getBoundingClientRect().width))
			.toBe(320);

		const fitsViewport = await mapPage
			.getFilterPanel()
			.evaluate((el) => el.getBoundingClientRect().bottom <= window.innerHeight);
		expect(fitsViewport).toBe(true);

		await sharedPage.keyboard.press('Escape');
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);
	});
});

test.describe.serial('Map Panels (H6) — Mobile Bottom-Sheet', () => {
	let mapPage: MapPage;
	let mobilePage: Page;

	test.beforeAll(async ({ browser }) => {
		mobilePage = await browser.newPage({ viewport: { width: 375, height: 667 } });
		mapPage = await setupMapPage(mobilePage);
	});

	test.afterAll(async () => {
		await mobilePage.close();
	});

	test('Filter-Panel öffnet als Bottom-Sheet im peek-Zustand', async () => {
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);
		await expect(mapPage.getFilterPanel()).toHaveAttribute('data-sheet-state', 'peek');

		// Bottom-Sheet-Geometrie: unten, volle Breite (poll wegen 300ms-Transition)
		await expect
			.poll(async () =>
				mapPage.getFilterPanel().evaluate((el) => {
					const rect = el.getBoundingClientRect();
					return {
						left: rect.left,
						fullWidth: rect.width === window.innerWidth,
						atBottom: Math.abs(rect.bottom - window.innerHeight) <= 2
					};
				})
			)
			.toEqual({ left: 0, fullWidth: true, atBottom: true });
	});

	test('Vergrößern-Button schaltet das Sheet auf expanded', async () => {
		await mobilePage.getByRole('button', { name: 'Filter vergrößern' }).click();
		await expect(mapPage.getFilterPanel()).toHaveAttribute('data-sheet-state', 'expanded');

		// expanded-Sheet nimmt mehr als 70% der Viewport-Höhe ein
		await expect
			.poll(async () =>
				mapPage
					.getFilterPanel()
					.evaluate((el) => el.getBoundingClientRect().height > window.innerHeight * 0.7)
			)
			.toBe(true);
	});

	test('Filter schließen macht das Panel inert', async () => {
		await mapPage.closeFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', true);
		await expect(mapPage.getFilterToggle()).toHaveAttribute('aria-expanded', 'false');
	});
});
