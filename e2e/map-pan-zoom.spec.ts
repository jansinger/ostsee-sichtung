import { expect, test, type Frame, type Page } from '@playwright/test';
import { MapPage } from './pages/MapPage';
import { mockMapSightingsWithFeatures } from './fixtures/mockApi';

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
 * Gemessen wird das gezeichnete Kartenbild (Canvas-Fingerprint), nicht der
 * View-Zustand: An die OpenLayers-Instanz kommt man von außen nicht heran, und
 * eine Test-Hintertür im Produktionscode wäre der falsche Preis dafür.
 *
 * Damit der Fingerprint aussagekräftig ist, blockiert
 * `mockMapSightingsWithFeatures` die externen Kacheln und liefert feste
 * Sichtungen. Sonst gäbe es zwei Fehlerquellen: ein leeres Canvas könnte sich
 * durch einen Pan gar nicht verändern (Test wäre gehaltlos), und nachladende
 * Kacheln würden es auch ohne Pan verändern (Test wäre fälschlich grün).
 *
 * ── Reihenfolge in den Kontrolltests ─────────────────────────────────────────
 * Der Klick passiert **vor** der Basismessung. Ein Klick kann die Ansicht selbst
 * verschieben (Cluster-Zoom, `autoPan` des Popups) — würde man vorher messen,
 * bestätigte der Test am Ende diesen Nebeneffekt statt des Pans.
 */

/**
 * Wo die Karte lebt: im Hauptdokument (`Page`) oder — für den iframe-Fall — im
 * eingebetteten Frame. Nur das Messen ist frame-abhängig; Maus-Eingaben laufen
 * immer über die `Page`, weil Playwright Koordinaten am Viewport misst.
 */
type MapScope = Page | Frame;

/** Ein Wert, der sich ändert, sobald sich das Kartenbild ändert. */
async function canvasState(scope: MapScope): Promise<{ hash: number; distinct: number } | null> {
	return scope.evaluate(() => {
		const canvases = [...document.querySelectorAll<HTMLCanvasElement>('#map canvas')];
		if (canvases.length === 0) return null;

		let hash = 0;
		const seen = new Set<number>();

		for (const canvas of canvases) {
			const ctx = canvas.getContext('2d');
			if (!ctx) continue;
			// Ausschnitt statt Vollbild: bei 2752x1496 wären es 66 MB pro Messung.
			const width = Math.min(canvas.width, 1200);
			const height = Math.min(canvas.height, 800);
			if (width === 0 || height === 0) continue;

			const { data } = ctx.getImageData(0, 0, width, height);
			for (let i = 0; i < data.length; i += 401) {
				hash = (hash * 31 + data[i]) | 0;
				if (seen.size < 64) seen.add(data[i]);
			}
		}

		return { hash, distinct: seen.size };
	});
}

/**
 * Wartet, bis das Kartenbild zur Ruhe gekommen ist, und gibt seinen Fingerprint
 * zurück. „Zur Ruhe gekommen" heißt: zwei aufeinanderfolgende Messungen sind
 * gleich — sonst würde eine noch laufende Erstdarstellung als Pan-Wirkung
 * durchgehen.
 */
async function settledCanvasHash(scope: MapScope): Promise<number> {
	let previous: number | null = null;
	let current: number | null = null;

	await expect
		.poll(
			async () => {
				const state = await canvasState(scope);
				previous = current;
				current = state?.hash ?? null;
				return current !== null && current === previous;
			},
			{
				timeout: 15000,
				intervals: [200, 200, 200, 400],
				message: 'Kartenbild kam nicht zur Ruhe'
			}
		)
		.toBe(true);

	// Gegenprobe: Ein einfarbiges Canvas könnte sich durch einen Pan nicht
	// verändern — der Test wäre dann gehaltlos statt aussagekräftig.
	const state = await canvasState(scope);
	expect(
		state?.distinct ?? 0,
		'Karte zeichnet nichts — Fingerprint wäre gehaltlos'
	).toBeGreaterThan(1);

	return current as number;
}

/** Erwartet, dass sich das Kartenbild binnen weniger Sekunden verändert. */
async function expectMapToMove(scope: MapScope, before: number, hinweis: string): Promise<void> {
	await expect
		.poll(async () => (await canvasState(scope))?.hash ?? null, {
			timeout: 4000,
			intervals: [150, 250, 400, 600],
			message: hinweis
		})
		.not.toBe(before);
}

/**
 * Erwartet, dass das Kartenbild **unverändert** bleibt.
 *
 * Hier ist `expect.poll` das falsche Werkzeug: Es prüft, bis eine Bedingung
 * erfüllt ist — bei „hat sich nichts geändert" wäre sie sofort erfüllt und der
 * Test damit gehaltlos. Stattdessen wird über ein Zeitfenster mehrfach gemessen
 * und jede Messung geprüft. Das Fenster ist bewusst länger als die
 * `expectMapToMove`-Toleranz, damit ein verzögerter Zoom nicht durchrutscht:
 * `MouseWheelZoom` arbeitet intern mit einem Timeout und einer Animation.
 */
async function expectMapToStayPut(scope: MapScope, before: number, hinweis: string): Promise<void> {
	for (let versuch = 0; versuch < 8; versuch++) {
		await scope.waitForTimeout(200);
		const jetzt = (await canvasState(scope))?.hash ?? null;
		expect(jetzt, `${hinweis} (Messung ${versuch + 1} von 8)`).toBe(before);
	}
}

/** Zieht mit echten Maus-Events über die Karte. */
async function dragMap(page: Page, from: { x: number; y: number }, dx: number, dy: number) {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	// Mehrere Zwischenschritte: OpenLayers braucht `pointermove` mit gedrückter
	// Taste, ein einzelner Sprung erzeugt keine belastbare Drag-Sequenz.
	await page.mouse.move(from.x + dx * 0.3, from.y + dy * 0.3, { steps: 5 });
	await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
	await page.mouse.up();
}

/** Punkt in der Karte, abseits der Controls links und der Panel-Reiter rechts. */
async function mapPoint(page: Page, relX = 0.45, relY = 0.5) {
	const box = await page.locator('#map').boundingBox();
	if (!box) throw new Error('#map hat keine Bounding-Box');
	return { x: box.x + box.width * relX, y: box.y + box.height * relY };
}

/**
 * Fährt die Maus an die Gestenposition und misst **erst danach** die Basis.
 *
 * Die Reihenfolge ist wesentlich: Der Controller hat einen `pointermove`-Handler,
 * der Features unter dem Zeiger sucht und den Hover-Zustand setzt. Schon das
 * Bewegen der Maus verändert damit das Kartenbild. Wer die Basis vorher nimmt,
 * misst hinterher diesen Hover-Effekt mit — ein Test auf „hat sich bewegt" würde
 * dann auch ohne Pan grün, und ein Test auf „hat sich nicht bewegt" fälschlich rot
 * (genau so ist der Mausrad-Test beim ersten Lauf gescheitert).
 */
async function hoverAndSettle(
	page: Page,
	point: { x: number; y: number },
	scope: MapScope = page
): Promise<number> {
	await page.mouse.move(point.x, point.y);
	return settledCanvasHash(scope);
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
		const start = await mapPoint(page);
		const before = await hoverAndSettle(page, start);

		await dragMap(page, start, -160, 110);

		await expectMapToMove(
			page,
			before,
			'Karte reagierte auf das erste Ziehen nicht — genau der berichtete Befund'
		);
	});

	test('Ziehen verschiebt die Karte nach einem Klick in die Karte', async ({ page }) => {
		// Kontrollfall. Der Klick landet bewusst nicht auf einer Sichtung, damit
		// kein Popup mit `autoPan` die Ansicht bewegt.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const start = await mapPoint(page);
		const before = await hoverAndSettle(page, start);

		await dragMap(page, start, -160, 110);

		await expectMapToMove(page, before, 'Karte reagierte auch nach einem Klick nicht auf Ziehen');
	});

	test('Ziehen verschiebt die Karte nach dem Öffnen des Filter-Panels', async ({ page }) => {
		// Die Formulierung des Berichts: erst Sidebar öffnen, dann pannen.
		await mapPage.openFilter();
		await expect(mapPage.getFilterPanel()).toHaveJSProperty('inert', false);

		// Links vom 320-px-Panel ziehen, damit die Geste auf der Karte landet.
		const start = await mapPoint(page, 0.3, 0.5);
		const before = await hoverAndSettle(page, start);

		await dragMap(page, start, -140, 100);

		await expectMapToMove(
			page,
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
		const point = await mapPoint(page);
		const before = await hoverAndSettle(page, point);

		await page.mouse.wheel(0, -400);

		await expectMapToMove(
			page,
			before,
			'Mausrad-Zoom blieb ohne Klick wirkungslos — genau der berichtete Befund'
		);
	});

	test('Mausrad zoomt auch nach einem Klick in die Karte', async ({ page }) => {
		// Kontrollfall: Der Klick setzt den Fokus auf das `#map`-Div und darf am
		// Ergebnis nichts ändern.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const point = await mapPoint(page);
		const before = await hoverAndSettle(page, point);

		await page.mouse.wheel(0, -400);

		await expectMapToMove(page, before, 'Mausrad-Zoom blieb auch mit Fokus ohne Wirkung');
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
				body: `<!doctype html><html><head><meta charset="utf-8"><style>
					html,body{margin:0;height:100%;overflow:hidden}
					iframe{border:0;width:100%;height:100%;display:block}
				</style></head><body><iframe src="/map" title="Sichtungskarte"></iframe></body></html>`
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

	test('Mausrad zoomt nicht ohne Fokus, damit die einbettende Seite scrollen kann', async ({
		page
	}) => {
		const { mapFrame, box } = await embedMap(page);

		const before = await hoverAndSettle(page, pointInFrame(box), mapFrame);

		await page.mouse.wheel(0, -400);

		await expectMapToStayPut(
			mapFrame,
			before,
			'Karte hat im iframe ohne Fokus gezoomt — der Scroll-Hijacking-Schutz ist weg'
		);
	});

	/**
	 * Positiv-Kontrolle zum Test darüber.
	 *
	 * `expectMapToStayPut` ist mit **jedem** Grund zufrieden, aus dem sich das
	 * Kartenbild nicht ändert — auch damit, dass das Mausrad den Frame nie erreicht
	 * oder die Karte dort gar nicht zoomen kann. Erst dieser Test zeigt, dass beides
	 * funktioniert und oben wirklich die Condition gebremst hat.
	 */
	test('Mausrad zoomt im iframe nach einem Klick in die Karte', async ({ page }) => {
		const { mapFrame, box } = await embedMap(page);

		// Abseits der Sichtungen klicken, damit kein Popup mit `autoPan` die Ansicht bewegt.
		const klickPunkt = pointInFrame(box, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const before = await hoverAndSettle(page, pointInFrame(box), mapFrame);

		await page.mouse.wheel(0, -400);

		await expectMapToMove(
			mapFrame,
			before,
			'Mausrad-Zoom blieb im iframe auch mit Fokus ohne Wirkung — der Test darüber wäre damit gehaltlos'
		);
	});
});
