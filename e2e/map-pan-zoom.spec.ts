import { expect, test, type Page } from '@playwright/test';
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

/** Ein Wert, der sich ändert, sobald sich das Kartenbild ändert. */
async function canvasState(page: Page): Promise<{ hash: number; distinct: number } | null> {
	return page.evaluate(() => {
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
async function settledCanvasHash(page: Page): Promise<number> {
	let previous: number | null = null;
	let current: number | null = null;

	await expect
		.poll(
			async () => {
				const state = await canvasState(page);
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
	const state = await canvasState(page);
	expect(
		state?.distinct ?? 0,
		'Karte zeichnet nichts — Fingerprint wäre gehaltlos'
	).toBeGreaterThan(1);

	return current as number;
}

/** Erwartet, dass sich das Kartenbild binnen weniger Sekunden verändert. */
async function expectMapToMove(page: Page, before: number, hinweis: string): Promise<void> {
	await expect
		.poll(async () => (await canvasState(page))?.hash ?? null, {
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
async function expectMapToStayPut(page: Page, before: number, hinweis: string): Promise<void> {
	for (let versuch = 0; versuch < 8; versuch++) {
		await page.waitForTimeout(200);
		const jetzt = (await canvasState(page))?.hash ?? null;
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
async function hoverAndSettle(page: Page, point: { x: number; y: number }): Promise<number> {
	await page.mouse.move(point.x, point.y);
	return settledCanvasHash(page);
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

	// ── Mausrad: Fokus-Schutz bleibt absichtlich erhalten ──────────────────────
	//
	// Anders als beim Ziehen ist das beim Mausrad **gewolltes** Verhalten und keine
	// Einschränkung: Die App wird auf meeresmuseum.de in einem iframe eingebettet.
	// Wer dort die Seite scrollen will, würde ohne diesen Schutz stattdessen die
	// Karte zoomen. `MouseWheelZoom` behält deshalb die OpenLayers-Default-Condition
	// `focusWithTabindex` — siehe die Begründung an `interactions:` in
	// `optimizedMapController.ts`.

	test('Mausrad zoomt nicht, solange die Karte keinen Fokus hat', async ({ page }) => {
		const point = await mapPoint(page);
		const before = await hoverAndSettle(page, point);

		await page.mouse.wheel(0, -400);

		await expectMapToStayPut(
			page,
			before,
			'Mausrad hat ohne Fokus gezoomt — der Scroll-Hijacking-Schutz ist weg'
		);
	});

	test('Mausrad zoomt nach einem Klick in die Karte', async ({ page }) => {
		// Der Klick setzt den Fokus auf das `#map`-Div (`tabindex="0"`) und schaltet
		// damit `focusWithTabindex` frei.
		const klickPunkt = await mapPoint(page, 0.2, 0.85);
		await page.mouse.click(klickPunkt.x, klickPunkt.y);

		const point = await mapPoint(page);
		const before = await hoverAndSettle(page, point);

		await page.mouse.wheel(0, -400);

		await expectMapToMove(page, before, 'Mausrad-Zoom blieb auch mit Fokus ohne Wirkung');
	});
});
