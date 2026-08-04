import { test, expect } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { mockMapSightingsSuccess } from './fixtures/mockApi';

/**
 * Die Logo-Platte unten rechts darf die Karte/Liste-Umschaltung nicht überdecken.
 *
 * Warum es diesen Test gibt: Das Museumslogo wurde auf die aktuelle Fassung
 * umgestellt (`/logo_dmm_positiv.svg`). Die ist zweizeilig ohne „Stralsund" und
 * damit 2,09:1 breit statt 1,33:1 wie das abgelöste `dmm-logo.png` — bei `h-12`
 * sind das 100px Bildbreite (110px Platte) statt 64px (74px). Mit dem alten
 * `bottom-6` lag die Platte ab 360px Breite über dem „Liste"-Button (-2px bei
 * 360, -22px bei 320). Ein reiner Sichtprüfungs-Screenshot hätte das nur bei
 * genau der getesteten Breite gezeigt.
 *
 * Der Test misst deshalb die Geometrie und nicht das Aussehen: Er schlägt
 * genauso an, wenn jemand später das Logo tauscht, `h-12` erhöht oder die
 * Umschaltung verbreitert.
 */
test.describe('Karte — Platzierung des Museumslogos', () => {
	// 320 ist die schmalste real vorkommende Breite, 768 der md-Breakpoint
	// (ab dort sitzt die Platte wieder auf bottom-6 neben der Umschaltung).
	const BREITEN = [320, 360, 375, 390, 414, 430, 767, 768, 1280];

	for (const breite of BREITEN) {
		test(`überdeckt die Karte/Liste-Umschaltung nicht bei ${breite}px`, async ({ page }) => {
			await page.setViewportSize({ width: breite, height: 780 });
			await mockMapSightingsSuccess(page);

			const mapPage = new MapPage(page);
			await mapPage.goto();

			const logo = page.locator('#dmm');
			await expect(logo).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });

			// Die Platte ist der sichtbare Kasten: img → flex-Wrapper → Platte.
			const platte = logo.locator('xpath=../..');
			const umschaltung = page.getByRole('button', { name: 'Liste', exact: true });
			await expect(umschaltung).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });

			const p = await platte.boundingBox();
			const u = await umschaltung.boundingBox();
			expect(p, 'Logo-Platte hat keine Box').not.toBeNull();
			expect(u, 'Umschaltung hat keine Box').not.toBeNull();
			if (!p || !u) return;

			const ueberlappt =
				p.x < u.x + u.width && p.x + p.width > u.x && p.y < u.y + u.height && p.y + p.height > u.y;
			expect(
				ueberlappt,
				`Logo-Platte (x ${Math.round(p.x)}–${Math.round(p.x + p.width)}, ` +
					`y ${Math.round(p.y)}–${Math.round(p.y + p.height)}) überschneidet die ` +
					`Umschaltung (x ${Math.round(u.x)}–${Math.round(u.x + u.width)}, ` +
					`y ${Math.round(u.y)}–${Math.round(u.y + u.height)})`
			).toBe(false);

			// Und sie darf nicht seitlich aus der Karte herauslaufen.
			const viewport = page.viewportSize();
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(Math.round(p.x + p.width)).toBeLessThanOrEqual(viewport?.width ?? breite);
		});
	}

	test('lädt das aktuelle Logo und behält sein Seitenverhältnis', async ({ page }) => {
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await mapPage.goto();

		const logo = page.locator('#dmm');
		await expect(logo).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
		await expect(logo).toHaveAttribute('src', '/logo_dmm_positiv.svg');

		const mass = await logo.evaluate((el: HTMLImageElement) => ({
			geladen: el.complete && el.naturalWidth > 0,
			breite: el.getBoundingClientRect().width,
			hoehe: el.getBoundingClientRect().height
		}));

		// Ohne feste width/height in der SVG-Datei leitet `w-auto` keine Breite ab
		// und das Logo bricht auf 0 bzw. auf die Höhe zusammen.
		expect(mass.geladen, 'Logo-Datei wurde nicht geladen').toBe(true);
		expect(mass.hoehe).toBeCloseTo(48, 0);
		expect(mass.breite / mass.hoehe).toBeCloseTo(267 / 128, 1);
	});
});
