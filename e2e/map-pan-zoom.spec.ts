import { expect, test, type Frame, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { mockMapSightingsWithFeatures } from './fixtures/mockApi';
import { createMapCanvasProbe, type MapScope } from './helpers/mapCanvas';

/**
 * Reproduktion des Berichts „nach Öffnen der Sidebar geht Pan und Zoom in der
 * Karte nicht, erst nach einem Klick in die Karte“ (UX-Review 2026-07-30).
 *
 * Warum dieser Test in Playwright und nicht per Browser-Automation entstand:
 * Der Befund ließ sich zwar über CDP-injizierte Eingaben nachstellen — Pan wirkte
 * erst nach einem Klick —, aber die Messung lief in einem Chrome-Fenster **ohne
 * Betriebssystem-Fokus** (`document.hasFocus() === false`). OpenLayers' DragPan
 * verlangt `primaryAction` (`isPrimary && button === 0`), synthetische Eingaben in
 * einem unfokussierten Fenster sind damit ein möglicher Störfaktor. Playwright
 * fährt einen echten, fokussierten Browser und trennt beides.
 *
 * ── Messverfahren ─────────────────────────────────────────────────────────
 * Canvas-Fingerprint, Werkzeug und Begründung stehen in
 * `e2e/helpers/mapCanvas.ts`. Die beiden Voraussetzungen von dort erfüllt
 * `mockMapSightingsWithFeatures`: Es liefert feste Sichtungen (sonst wäre das
 * Canvas leer und der Test gehaltlos) und weist die Kachel-Hosts ab (sonst
 * veränderten nachladende Kacheln das Bild auch ohne Geste).
 *
 * ── Reihenfolge in den Kontrolltests ────────────────────────────────────
 * Der Klick passiert **vor** der Basismessung. Ein Klick kann die Ansicht selbst
 * verschieben (Cluster-Zoom, `autoPan` des Popups) — würde man vorher messen,
 * bestätigte der Test am Ende diesen Nebeneffekt statt des Pans.
 */

/** Messwerkzeug für die Sichtungskarte; `scope` nur für den iframe-Fall. */
const karte = (page: Page, scope?: MapScope) =>
	createMapCanvasProbe(page, { selector: '#map', scope });

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
		const probe = karte(page);
		const start = await mapPoint(page);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, -160, 110);

		await probe.expectToMove(
			before,
			'Karte reagierte auf das erste Ziehen nicht — genau der berichtete Befund'
		);
	});

	test('Ziehen verschiebt die Karte nach einem Klick in die Karte', async ({ page }) => {
		const probe = karte(page);
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
		const probe = karte(page);
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

	// ── Mausrad: freigeschaltet, solange die App nicht eingebettet ist ─────────
	//
	// Der Fokus-Zwang des Mausrads stammt aus derselben Quelle wie der beim Ziehen
	// (`focusWithTabindex`, ausgelöst durch das `tabindex="0"` am `#map`-Div) und
	// war für Nutzer derselbe Defekt: erst klicken, dann zoomen. Er hat nur **im
	// iframe** einen Sinn — dort würde ein ungebremstes Mausrad das Scrollen der
	// einbettenden Seite verschlucken. Auf der eigenen Seite gibt es nichts zu
	// schützen, dort zoomt das Rad sofort. Siehe `interactions:` in
	// `optimizedMapController.ts`.

	test('Mausrad zoomt ohne vorherigen Klick', async ({ page }) => {
		const probe = karte(page);
		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);

		await page.mouse.wheel(0, -400);

		await probe.expectToMove(
			before,
			'Mausrad-Zoom blieb ohne Klick wirkungslos — genau der berichtete Befund'
		);
	});

	test('Mausrad zoomt auch nach einem Klick in die Karte', async ({ page }) => {
		const probe = karte(page);
		// Kontrollfall: Der Klick setzt den Fokus auf das `#map`-Div und darf am
		// Ergebnis nichts ändern.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);

		await page.mouse.wheel(0, -400);

		await probe.expectToMove(before, 'Mausrad-Zoom blieb auch mit Fokus ohne Wirkung');
	});
});

/**
 * Der Gegenfall zum Mausrad-Test oben.
 *
 * Die App wird auf meeresmuseum.de in einem iframe eingebettet. Zoomte die Karte
 * dort ohne Fokus, könnte niemand mehr an ihr vorbeiscrollen — sie füllt den
 * Rahmen, und `MouseWheelZoom` ruft `preventDefault()`, sodass das Scrollen nicht
 * an die einbettende Seite durchgereicht wird. Deshalb bleibt im iframe der
 * Fokus-Zwang.
 *
 * Die Rahmenseite kommt aus einer gerouteten Antwort und nicht aus `setContent`, weil
 * letzteres das Dokument auf `about:blank` stehen lässt — ein `<iframe src="/map">`
 * hätte dort keine Basis-URL zum Auflösen. Für `isNotIFrame` spielt die Herkunft keine
 * Rolle: `window === window.top` funktioniert auch über Origin-Grenzen, und die
 * Produktions-Einbettung auf meeresmuseum.de ist ohnehin cross-origin.
 */
test.describe('Sichtungskarte im iframe — Mausrad', () => {
	const HOST_ROUTE = '/e2e/iframe-host';

	type Box = { x: number; y: number; width: number; height: number };

	/** Baut die Rahmenseite, wartet auf die Karte im Frame und gibt beides zurück. */
	async function embedMap(page: Page): Promise<{ mapFrame: Frame; box: Box }> {
		await mockMapSightingsWithFeatures(page);

		await page.route(`**${HOST_ROUTE}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/html',
				// Die Rahmenseite ist bewusst **scrollbar**: Der Rahmen füllt den Viewport,
				// darunter steht Platz. Nur so lässt sich überhaupt messen, ob ein Rad über
				// der Karte an die einbettende Seite durchgereicht wird — mit `overflow:hidden`
				// bliebe der Scroll-Wert zwangsläufig bei 0 und die Aussage wäre leer.
				body: `<!doctype html><html><head><meta charset="utf-8"><style>
					html,body{margin:0}
					iframe{border:0;width:100%;height:100vh;display:block}
					.nach-der-karte{height:600px}
				</style></head><body><iframe src="/map" title="Sichtungskarte"></iframe>
				<div class="nach-der-karte">Inhalt der einbettenden Seite</div></body></html>`
			})
		);

		await page.goto(HOST_ROUTE);

		// Der Filter-Reiter beweist, dass `SightingsMapView` im Frame steht.
		await expect(
			page.frameLocator('iframe').getByRole('button', { name: /^filter$/i })
		).toBeVisible({ timeout: 20000 });

		const mapFrame = page.frames().find((f) => f.url().includes('/map'));
		if (!mapFrame) throw new Error('iframe mit /map nicht gefunden');

		// Gegenprobe zur Voraussetzung: Ohne echte Einbettung wäre der Test gehaltlos.
		expect(
			await mapFrame.evaluate(() => window === window.top),
			'Frame hält sich nicht für eingebettet'
		).toBe(false);

		const box = await page.locator('iframe').boundingBox();
		if (!box) throw new Error('iframe hat keine Bounding-Box');

		return { mapFrame, box };
	}

	/** Punkt innerhalb des eingebetteten Kartenbilds, in Viewport-Koordinaten. */
	function pointInFrame(box: Box, relX = 0.45, relY = 0.5) {
		return { x: box.x + box.width * relX, y: box.y + box.height * relY };
	}

	test('Mausrad ohne Fokus scrollt die einbettende Seite, statt zu zoomen', async ({ page }) => {
		const { mapFrame, box } = await embedMap(page);
		// Gemessen wird im Frame, geklickt und gescrollt auf der Rahmenseite.
		const probe = karte(page, mapFrame);

		const before = await probe.hoverAndSettle(pointInFrame(box));
		expect(await page.evaluate(() => window.scrollY), 'Rahmenseite startet nicht oben').toBe(0);

		// Nach unten, denn oben am Dokumentanfang gäbe es nichts zu scrollen.
		await page.mouse.wheel(0, 400);

		// Der eigentliche Punkt: Das Rad landet bei der einbettenden Seite.
		await expect
			.poll(async () => page.evaluate(() => window.scrollY), {
				timeout: 4000,
				message: 'Rahmenseite hat nicht gescrollt — die Karte hat das Rad verschluckt'
			})
			.toBeGreaterThan(0);

		await probe.expectToStayPut(
			before,
			'Karte hat im iframe ohne Fokus gezoomt — der Scroll-Hijacking-Schutz ist weg'
		);
	});

	/**
	 * Positiv-Kontrolle zum Test darüber — und dessen Spiegelbild.
	 *
	 * `expectToStayPut` ist mit **jedem** Grund zufrieden, aus dem sich das
	 * Kartenbild nicht ändert — auch damit, dass das Mausrad den Frame nie erreicht
	 * oder die Karte dort gar nicht zoomen kann. Erst dieser Test zeigt, dass beides
	 * funktioniert und oben wirklich die Condition gebremst hat. Gleiche Geste,
	 * gleiche Rahmenseite, vertauschtes Ergebnis: hier zoomt die Karte und die
	 * einbettende Seite bleibt stehen, weil `MouseWheelZoom` `preventDefault()` ruft.
	 */
	test('Mausrad nach einem Klick in die Karte zoomt und lässt die Rahmenseite stehen', async ({
		page
	}) => {
		const { mapFrame, box } = await embedMap(page);
		const probe = karte(page, mapFrame);

		// Abseits der Sichtungen klicken, damit kein Popup mit `autoPan` die Ansicht bewegt.
		const klickPunkt = pointInFrame(box, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const before = await probe.hoverAndSettle(pointInFrame(box));

		await page.mouse.wheel(0, 400);

		await probe.expectToMove(
			before,
			'Mausrad-Zoom blieb im iframe auch mit Fokus ohne Wirkung — der Test darüber wäre damit gehaltlos'
		);

		expect(
			await page.evaluate(() => window.scrollY),
			'Rahmenseite ist trotz Karten-Zoom mitgescrollt'
		).toBe(0);
	});
});
