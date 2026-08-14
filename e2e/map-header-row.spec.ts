import { test, expect, type Locator } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { MAP_TEST_TIMEOUTS } from './config/testTimeouts';
import { mockMapSightingsSuccess } from './fixtures/mockApi';

/**
 * Die Kopfzeile der Karte — Titel-Badge und Band der aktiven Filter — darf sich
 * weder selbst überlappen noch unter den Panel-Reiter am rechten Rand laufen.
 *
 * Warum es diesen Test gibt: Beide standen bis 2026-08-14 einzeln absolut
 * positioniert da, der Titel linksbündig auf `top-4`, das Chip-Band zentriert
 * auf `top-16`. Die 64px waren fast vollständig reservierte Titelzeile, obwohl
 * das Badge nur ~200px breit ist. Seither stehen sie ab `md` in einer Zeile.
 *
 * Das verschiebt die Fehlerklasse, statt sie abzuschaffen: Wächst der Titel —
 * eine längere Übersetzung genügt —, schiebt er als `shrink-0`-Element das Band
 * nach rechts unter den Reiter; unterhalb `md` wächst er stattdessen in die
 * Chip-Zeile. Beides ist breitenabhängig und in einem Screenshot nur bei genau
 * der fotografierten Breite zu sehen. Derselbe Grund, aus dem es
 * `map-logo-placement.spec.ts` gibt, und dieselbe Bauart: gemessen wird die
 * Geometrie, nicht das Aussehen.
 *
 * Die Zeile ist zusätzlich `pointer-events-none` — sie liegt als unsichtbares
 * Band über der Karte und schluckte dort sonst das Ziehen. Auch das wird hier
 * gemessen und nicht der Klassenliste geglaubt.
 */

/** Rechteck-Überschneidung; Berührung an der Kante zählt nicht. */
type Box = { x: number; y: number; width: number; height: number };
function ueberlappt(a: Box, b: Box): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function box(locator: Locator, name: string): Promise<Box> {
	const rect = await locator.boundingBox();
	expect(rect, `${name} hat keine Box`).not.toBeNull();
	return rect as Box;
}

test.describe('Karte — Kopfzeile aus Titel und aktiven Filtern', () => {
	// 320 ist die schmalste real vorkommende Breite, 767/768 klammern den
	// md-Breakpoint, ab dem Titel und Band eine Zeile teilen.
	const BREITEN = [320, 360, 390, 430, 767, 768, 1024, 1280];

	/**
	 * Ein Jahr abseits des Standards erzeugt zwei Chips (Jahr-Chip und „Alle
	 * Filter zurücksetzen") — die Kopfzeile ist damit in ihrem belegten Zustand.
	 */
	async function oeffneMitFilter(page: import('@playwright/test').Page, breite: number) {
		await page.setViewportSize({ width: breite, height: 780 });
		await mockMapSightingsSuccess(page);
		const mapPage = new MapPage(page);
		await page.goto('/map?year=2024');
		await mapPage.waitForLoad();
		return mapPage;
	}

	for (const breite of BREITEN) {
		test(`Titel, Filterband und Panel-Reiter überlappen sich nicht bei ${breite}px`, async ({
			page
		}) => {
			await oeffneMitFilter(page, breite);

			const titel = page.getByRole('heading', { level: 1 });
			const band = page.getByRole('group', { name: 'Aktive Filter' });
			const reiter = page.getByRole('button', { name: 'Filter', exact: true });

			await expect(titel).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });
			await expect(band).toBeVisible({ timeout: MAP_TEST_TIMEOUTS.defaultUi });

			const t = await box(titel, 'Titel');
			const b = await box(band, 'Filterband');
			const r = await box(reiter, 'Panel-Reiter');

			expect(
				ueberlappt(t, b),
				`Titel (x ${Math.round(t.x)}–${Math.round(t.x + t.width)}, y ${Math.round(t.y)}–${Math.round(t.y + t.height)}) ` +
					`überschneidet das Filterband (x ${Math.round(b.x)}–${Math.round(b.x + b.width)}, y ${Math.round(b.y)}–${Math.round(b.y + b.height)})`
			).toBe(false);

			expect(
				ueberlappt(b, r),
				`Filterband (x ${Math.round(b.x)}–${Math.round(b.x + b.width)}) läuft unter den ` +
					`Panel-Reiter (x ${Math.round(r.x)}–${Math.round(r.x + r.width)})`
			).toBe(false);

			// Und die Zeile darf die Karte nicht seitlich aufziehen.
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
				breite
			);
		});
	}

	test('ab md teilen sich Titel und Filterband eine Zeile, darunter stehen sie übereinander', async ({
		page
	}) => {
		// Der eigentliche Zweck der Änderung. Ohne diese Zusicherung bliebe ein
		// Rückfall auf zwei Zeilen unbemerkt: Die Überlappungsprüfungen oben wären
		// dann erst recht grün.
		await oeffneMitFilter(page, 1280);
		let t = await box(page.getByRole('heading', { level: 1 }), 'Titel');
		let b = await box(page.getByRole('group', { name: 'Aktive Filter' }), 'Filterband');
		expect(
			Math.abs(t.y + t.height / 2 - (b.y + b.height / 2)),
			'Ab md gehören Titel und Filterband in dieselbe Zeile'
		).toBeLessThanOrEqual(8);

		await oeffneMitFilter(page, 390);
		t = await box(page.getByRole('heading', { level: 1 }), 'Titel');
		b = await box(page.getByRole('group', { name: 'Aktive Filter' }), 'Filterband');
		expect(b.y, 'Unterhalb md steht das Filterband unter dem Titel').toBeGreaterThanOrEqual(
			t.y + t.height
		);
	});

	test('die Kopfzeile lässt die Karte darunter bedienbar', async ({ page }) => {
		// pointer-events-none am Container: Der leere Teil der Zeile darf das
		// Ziehen der Karte nicht schlucken. Gemessen wird, was der Zeiger an
		// dieser Stelle trifft — die Klassenliste sagt darüber nichts.
		await oeffneMitFilter(page, 1280);

		const band = await box(page.getByRole('group', { name: 'Aktive Filter' }), 'Filterband');
		const getroffen = await page.evaluate(
			({ x, y }) => {
				const el = document.elementFromPoint(x, y);
				return el ? el.tagName : null;
			},
			// Rechts neben dem letzten Chip, auf gleicher Höhe: dort liegt der
			// Container, aber kein Bedienelement.
			{ x: Math.round(band.x + band.width + 80), y: Math.round(band.y + band.height / 2) }
		);

		expect(getroffen, 'Über der Karte darf die Kopfzeile keine Klicks abfangen').toBe('CANVAS');
	});
});
