import { expect, test, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { mockMapSightingsWithFeatures } from './fixtures/mockApi';
import { createMapCanvasProbe } from './helpers/mapCanvas';

/**
 * Reproduktion des Berichts „nach Öffnen der Sidebar geht Pan und Zoom in der
 * Karte nicht, erst nach einem Klick in die Karte" (UX-Review 2026-07-30).
 *
 * Warum dieser Test in Playwright und nicht per Browser-Automation entstand:
 * Der Befund ließ sich zwar über CDP-injizierte Eingaben nachstellen — Pan wirkte
 * erst nach einem Klick —, aber die Messung lief in einem Chrome-Fenster **ohne
 * Betriebssystem-Fokus** (`document.hasFocus() === false`). OpenLayers' DragPan
 * verlangt `primaryAction` (`isPrimary && button === 0`), synthetische Eingaben in
 * einem unfokussierten Fenster sind damit ein möglicher Störfaktor. Playwright
 * fährt einen echten, fokussierten Browser und trennt beides.
 *
 * ── Messverfahren ────────────────────────────────────────────────────────────
 * Canvas-Fingerprint, Werkzeug und Begründung stehen in
 * `e2e/helpers/mapCanvas.ts`. Die beiden Voraussetzungen von dort erfüllt
 * `mockMapSightingsWithFeatures`: Es liefert feste Sichtungen (sonst wäre das
 * Canvas leer und der Test gehaltlos) und weist die Kachel-Hosts ab (sonst
 * veränderten nachladende Kacheln das Bild auch ohne Geste).
 *
 * ── Reihenfolge in den Kontrolltests ─────────────────────────────────────────
 * Der Klick passiert **vor** der Basismessung. Ein Klick kann die Ansicht selbst
 * verschieben (Cluster-Zoom, `autoPan` des Popups) — würde man vorher messen,
 * bestätigte der Test am Ende diesen Nebeneffekt statt des Pans.
 */

/** Punkt in der Karte, abseits der Controls links und der Panel-Reiter rechts. */
async function mapPoint(page: Page, relX = 0.45, relY = 0.5) {
	const box = await page.locator('#map').boundingBox();
	if (!box) throw new Error('#map hat keine Bounding-Box');
	return { x: box.x + box.width * relX, y: box.y + box.height * relY };
}

test.describe('Sichtungskarte — Pan und Zoom', () => {
	let mapPage: MapPage;

	test.beforeEach(async ({ page }) => {
		await mockMapSightingsWithFeatures(page);
		mapPage = new MapPage(page);
		await mapPage.goto();
		await mapPage.waitForLoad();
	});

	test('Ziehen verschiebt die Karte ohne vorherigen Klick', async ({ page }) => {
		const probe = createMapCanvasProbe(page, { selector: '#map' });
		const start = await mapPoint(page);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, -160, 110);

		await probe.expectToMove(
			before,
			'Karte reagierte auf das erste Ziehen nicht — genau der berichtete Befund'
		);
	});

	test('Ziehen verschiebt die Karte nach einem Klick in die Karte', async ({ page }) => {
		const probe = createMapCanvasProbe(page, { selector: '#map' });
		// Kontrollfall. Der Klick landet bewusst nicht auf einer Sichtung, damit
		// kein Popup mit `autoPan` die Ansicht bewegt.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const start = await mapPoint(page);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, -160, 110);

		await probe.expectToMove(before, 'Karte reagierte auch nach einem Klick nicht auf Ziehen');
	});

	test('Ziehen verschiebt die Karte nach dem Öffnen des Filter-Panels', async ({ page }) => {
		const probe = createMapCanvasProbe(page, { selector: '#map' });
		// Die Formulierung des Berichts: erst Sidebar öffnen, dann pannen.
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);

		// Links vom 320-px-Panel ziehen, damit die Geste auf der Karte landet.
		const start = await mapPoint(page, 0.3, 0.5);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, -140, 100);

		await probe.expectToMove(
			before,
			'Karte reagierte nach dem Öffnen des Filter-Panels nicht auf Ziehen'
		);
	});

	// ── Mausrad: Fokus-Schutz bleibt absichtlich erhalten ──────────────────────
	//
	// Anders als beim Ziehen ist das beim Mausrad **gewolltes** Verhalten und keine
	// Einschränkung: Die App wird auf meeresmuseum.de in einem iframe eingebettet.
	// Wer dort die Seite scrollen will, würde ohne diesen Schutz stattdessen die
	// Karte zoomen. `MouseWheelZoom` behält deshalb die OpenLayers-Default-Condition
	// `focusWithTabindex` — siehe die Begründung an `interactions:` in
	// `optimizedMapController.ts`.

	test('Mausrad zoomt nicht, solange die Karte keinen Fokus hat', async ({ page }) => {
		const probe = createMapCanvasProbe(page, { selector: '#map' });
		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);

		await page.mouse.wheel(0, -400);

		await probe.expectToStayPut(
			before,
			'Mausrad hat ohne Fokus gezoomt — der Scroll-Hijacking-Schutz ist weg'
		);
	});

	test('Mausrad zoomt nach einem Klick in die Karte', async ({ page }) => {
		const probe = createMapCanvasProbe(page, { selector: '#map' });
		// Der Klick setzt den Fokus auf das `#map`-Div (`tabindex="0"`) und schaltet
		// damit `focusWithTabindex` frei.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);

		await page.mouse.wheel(0, -400);

		await probe.expectToMove(before, 'Mausrad-Zoom blieb auch mit Fokus ohne Wirkung');
	});
});
