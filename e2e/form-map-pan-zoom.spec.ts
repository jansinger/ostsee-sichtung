import { expect, test, type Page } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import {
	blockTileHosts,
	createMapCanvasProbe,
	FORM_TILE_HOSTS,
	waitForOlMapReady
} from './helpers/mapCanvas';

/**
 * Derselbe Defekt wie in `e2e/map-pan-zoom.spec.ts`, eine Karte weiter: Das
 * Ziel-Element von OpenLayers trägt in `OLMap.svelte` ein `tabindex="0"`
 * (Tastaturbedienung), und `ol/Map.js` baut seine Interactions deshalb mit
 * `defaultInteractions({ onFocusOnly: true })`. `DragPan` bekommt damit
 * `focusWithTabindex` vorgeschaltet und reagiert erst, wenn der Fokus im Target
 * liegt — die Karte war bis zum ersten Klick nicht zu schieben.
 *
 * Warum das hier schwerer wiegt als auf der Sichtungskarte: Der Klick, mit dem
 * man das Ziehen „freischaltet", ist auf dieser Karte kein neutraler Klick.
 * `OLMap.svelte` hängt an `singleclick` den Handler `handleMapClick` →
 * `applyPosition` — er **setzt die gemeldete Position**. Wer die Karte nur
 * zurechtschieben wollte, hatte damit unbemerkt seine Sichtung verlegt.
 *
 * ── Was hier bewusst NICHT geändert wurde ────────────────────────────────────
 * Das Mausrad behält den Fokus-Zwang. Die Karte ist hier ein 556×400 großes
 * Element mitten in einem langen, scrollbaren Formular; ein bedingungsloser
 * Rad-Zoom würde das Seiten-Scrollen auf halber Strecke abfangen. Die Tests
 * unten sichern deshalb **beide** Richtungen ab — Ziehen frei, Rad gebremst.
 *
 * ── Messverfahren ────────────────────────────────────────────────────────────
 * Canvas-Fingerprint, Werkzeug und Begründung in `e2e/helpers/mapCanvas.ts`.
 * Zwei Voraussetzungen erfüllt dieses Spec dort selbst:
 *
 * - **Sichtbarer Inhalt:** Auf dieser Karte gibt es keine Sichtungen — die Rolle
 *   übernimmt der **Marker**, den `oeffneKarteMitMarker()` über die
 *   Koordinatenfelder erzeugt (nicht über einen Klick in die Karte, der würde
 *   genau den Fokus setzen, um den es geht). Weil der Marker das einzige
 *   gezeichnete Objekt ist, wird dichter abgetastet als auf der Sichtungskarte.
 * - **Ruhiger Hintergrund:** Die OSM-Kacheln werden abgewiesen.
 */

/** Startpunkt der Karte in `LocationInput.svelte` — Marker landet in der Mitte. */
const DEFAULT_CENTER = { latitude: '54.5', longitude: '13.5' };

/** Nur der Marker wird gezeichnet — grobes Raster könnte ihn verfehlen. */
const karte = (page: Page) =>
	createMapCanvasProbe(page, { selector: '.ol-map-container', stride: 97 });

/** Verschiebung einer Zeige-Geste in CSS-Pixeln; `{0,0}` für Rad und Hover. */
type Geste = { dx: number; dy: number };

/**
 * Zwei Messungen gelten als dieselbe Position, wenn sie um weniger als das hier
 * auseinanderliegen.
 *
 * Ein exakter Vergleich taugt nicht: Die Bounding-Box der Karte trägt einen
 * Sub-Pixel-Rest aus dem Layout (gemessen `x.59375`, also 19/32), und schon eine
 * Neuberechnung derselben unveränderten Ansicht kann die letzte Nachkommastelle
 * kippen. Ein halber Pixel ist für eine Maus-Geste ohne Belang — die Schranke
 * trennt „steht" von „scrollt noch", nicht Pixel von Pixel.
 */
const RUHE_TOLERANZ_PX = 0.5;

/**
 * Prüft per Treffer-Test, ob ein Viewport-Punkt tatsächlich auf der Karte landet.
 *
 * Bewusst `elementFromPoint` und kein Koordinaten-Vergleich: Der Test will
 * wissen, ob die Geste die Karte trifft, und das ist genau diese Frage. Ein
 * Punkt außerhalb des Fensters liefert `null`, ein von der Sticky-Leiste
 * verdeckter Punkt liefert die Leiste — beides fällt hier auf, ohne dass
 * irgendwo eine Fließkommazahl verglichen werden müsste.
 */
async function trifftKarte(page: Page, punkt: { x: number; y: number }): Promise<boolean> {
	return page.evaluate(
		({ x, y }) => document.elementFromPoint(x, y)?.closest('.ol-map-container') != null,
		punkt
	);
}

/**
 * Punkt in der Karte — abseits der Zoom-Controls (oben links), der Attribution
 * (unten rechts) und vor allem abseits des Markers in der Mitte: Ein Zug, der
 * auf dem Marker beginnt, landet in der `Translate`-Interaktion und verschiebt
 * ihn, statt die Karte zu schieben.
 *
 * **Die Karte wird vorher ins Bild geholt und der Scroll abgewartet.** Das
 * Formular scrollt an mehreren Stellen von selbst — `PositionPanel` ruft
 * `scrollIntoView`, `scrollToElement` scrollt sogar animiert (`behavior:
 * 'smooth'`), und jedes fokussierte Feld zieht die Ansicht nach. Wer die
 * Bounding-Box mitten in diese Bewegung liest, bekommt eine Position, die beim
 * Ziehen schon nicht mehr stimmt: Beim Entwickeln dieses Tests lag der
 * Startpunkt einmal bei `y = -36`, also außerhalb des Fensters — die Geste ging
 * ins Leere und sah aus wie der Defekt, den der Test sucht.
 *
 * `gesture` ist die Verschiebung, die der Aufrufer anschließend zieht. Geprüft
 * werden **Anfang und Ende** des Zugs: Nur wenn beide auf der Karte liegen,
 * beweist ein „hat sich bewegt" etwas über die Karte.
 *
 * ── Warum hier nicht mehr `box.y >= 0` steht ────────────────────────────────
 * Diese Datei stand als „von sich aus flaky" in keinem CI-Shard. Der Grund war
 * genau jene Schranke: `scrollIntoViewIfNeeded` **zentriert** die Karte, und der
 * dabei entstehende Sub-Pixel-Rest macht `box.y` minimal negativ, sobald die
 * 400px hohe Karte die Fensterhöhe ausfüllt (gemessen bei 1280×400:
 * `box.y = -0.40625`, die Schranke schlug an). Der Startpunkt lag dabei bei
 * `y = 311.6`, mitten im Bild, und der Zug bewegte die Karte einwandfrei — die
 * Schranke maß also die Oberkante des Containers, während es ihr um die Geste
 * ging. Der dokumentierte Fehlschlag `-1.125` ist derselbe Rest ein Layout
 * weiter. Der Treffer-Test oben stellt dieselbe Frage ohne Fließkomma-Rand.
 */
async function mapPoint(
	page: Page,
	gesture: Geste = { dx: 0, dy: 0 },
	relX = 0.25,
	relY = 0.78
): Promise<{ x: number; y: number }> {
	const map = page.locator('.ol-map-container');
	await map.scrollIntoViewIfNeeded();

	// Holder-Objekt statt `let`: Eine Zuweisung in der Poll-Closure sieht
	// TypeScript nicht, eine lokale Variable gälte hinter dem `await` weiterhin
	// als `null` und bräuchte einen Cast, der die Prüfung nur stillstellt.
	const ruhig: { box: { x: number; y: number; width: number; height: number } | null } = {
		box: null
	};
	let vorherige: { x: number; y: number } | null = null;

	await expect
		.poll(
			async () => {
				const box = await map.boundingBox();
				// `height > 0` gehört dazu: Vor dem Layout der Karte ist die Box da,
				// aber leer — ein Punkt darin träfe nichts.
				const steht =
					box !== null &&
					box.height > 0 &&
					vorherige !== null &&
					Math.abs(box.x - vorherige.x) < RUHE_TOLERANZ_PX &&
					Math.abs(box.y - vorherige.y) < RUHE_TOLERANZ_PX;
				vorherige = box;
				if (steht) ruhig.box = box;
				return steht;
			},
			{ timeout: 10000, intervals: [100, 100, 200, 300], message: 'Karte scrollt noch' }
		)
		.toBe(true);

	// Die als ruhig gemessene Box und keine vierte Messung: Ein erneutes
	// `boundingBox()` läge wieder außerhalb dessen, was der Poll geprüft hat.
	const box = ruhig.box;
	if (!box) throw new Error('.ol-map-container hat keine ruhige Bounding-Box');

	const start = { x: box.x + box.width * relX, y: box.y + box.height * relY };
	const ende = { x: start.x + gesture.dx, y: start.y + gesture.dy };

	expect(await trifftKarte(page, start), 'Geste beginnt nicht auf der Karte').toBe(true);
	expect(await trifftKarte(page, ende), 'Geste endet nicht auf der Karte').toBe(true);

	return start;
}

/**
 * Setzt eine Position **über die Koordinatenfelder**.
 *
 * Bewusst nicht per Klick in die Karte: Der würde den Fokus ins Ziel-Element
 * legen und damit genau die Bedingung herstellen, die diese Tests als fehlend
 * nachweisen wollen. Der Wert ist der Kartenmittelpunkt, damit `setMapCenter`
 * die Ansicht nicht zusätzlich verschiebt.
 *
 * Aufzuklappen gibt es seit PR 3 nichts mehr — Karte und Koordinatenfelder
 * stehen auf Schritt 1 dauerhaft offen.
 */
async function oeffneKarteMitMarker(page: Page): Promise<void> {
	// Zuerst auf die fertige Karte warten, nicht nur auf den Container: Seit
	// OpenLayers nachgeladen wird, steht das `div` schon da, während der Chunk
	// noch unterwegs ist. Begründung in `waitForOlMapReady`.
	await waitForOlMapReady(page);

	// `press('Tab')` gehört dazu: `LocationInput.svelte` übernimmt die Zahl im
	// `onchange`-Handler, und der feuert an einem `type="number"`-Feld erst beim
	// Verlassen. Ein reines `fill()` setzt den Wert sichtbar, aber nicht im
	// Formular — die Karte bliebe auf `data-position="unset"`.
	await page.locator('#latitude').fill(DEFAULT_CENTER.latitude);
	await page.locator('#latitude').press('Tab');
	await page.locator('#longitude').fill(DEFAULT_CENTER.longitude);
	await page.locator('#longitude').press('Tab');

	// Der Marker hängt an `hasPosition` — erst wenn beide Werte stehen. Der Fokus
	// liegt jetzt auf dem Feld hinter der Länge, also außerhalb der Karte: genau
	// der Ausgangszustand, den die Tests unten brauchen.
	//
	// Dieses Attribut belegt NICHT, dass die Karte gezeichnet ist — es kommt aus
	// den Koordinatenfeldern. Dafür steht `waitForOlMapReady` oben.
	await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'set');
}

/** Liest die gemeldete Position aus den Koordinatenfeldern. */
async function position(page: Page): Promise<{ lat: string; lon: string }> {
	return {
		lat: await page.locator('#latitude').inputValue(),
		lon: await page.locator('#longitude').inputValue()
	};
}

/** Der Zug, den beide Ziehen-Tests fahren — Vorprüfung und Geste aus einer Quelle. */
const ZUG: Geste = { dx: 120, dy: -90 };

test.describe('Positions-Karte im Formular — Pan und Zoom', () => {
	test.beforeEach(async ({ page }) => {
		await blockTileHosts(page, FORM_TILE_HOSTS);
		const formPage = new FormPage(page);
		await formPage.goto();
		await oeffneKarteMitMarker(page);
	});

	test('Ziehen verschiebt die Karte ohne vorherigen Klick', async ({ page }) => {
		const probe = karte(page);
		const start = await mapPoint(page, ZUG);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, ZUG.dx, ZUG.dy);

		await probe.expectToMove(
			before,
			'Karte reagierte auf das erste Ziehen nicht — genau der berichtete Befund'
		);
	});

	// Der eigentliche Grund, warum der Fokus-Zwang auf dieser Karte teurer ist als
	// auf der Sichtungskarte: Der „Freischalt-Klick" hätte die Meldung verlegt.
	test('Ziehen verändert die gemeldete Position nicht', async ({ page }) => {
		const probe = karte(page);
		const vorher = await position(page);

		const start = await mapPoint(page, ZUG);
		await probe.hoverAndSettle(start);
		await probe.drag(start, ZUG.dx, ZUG.dy);

		// `singleclick` feuert nach einem Zug nicht — die Position muss stehen
		// bleiben, sonst hätte das Schieben die Sichtung verschoben.
		await expect(page.locator('#latitude')).toHaveValue(vorher.lat);
		await expect(page.locator('#longitude')).toHaveValue(vorher.lon);
	});

	// ── Mausrad: Fokus-Schutz bleibt absichtlich erhalten ──────────────────────
	//
	// Anders als beim Ziehen ist das hier **gewolltes** Verhalten: Die Karte sitzt
	// als 556×400-Element mitten in einem langen Formular. Ein bedingungsloser
	// Rad-Zoom würde das Seiten-Scrollen genau dort abfangen — siehe die
	// Begründung an `interactions:` in `src/lib/utils/map/openLayersHelpers.ts`.

	test('Mausrad zoomt nicht, solange die Karte keinen Fokus hat — die Seite scrollt', async ({
		page
	}) => {
		const probe = karte(page);
		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);

		// Vorbedingung, nicht Beiwerk: Steht die Seite schon am Ende, hätte das Rad
		// nichts mehr zu scrollen und die Assertion unten würde aus einem Grund
		// fehlschlagen, der mit der Karte nichts zu tun hat.
		const { scrollVorher, reserve } = await page.evaluate(() => ({
			scrollVorher: window.scrollY,
			reserve: document.documentElement.scrollHeight - window.innerHeight - window.scrollY
		}));
		expect(reserve, 'Kein Scroll-Vorrat unterhalb der Karte — Testaufbau prüfen').toBeGreaterThan(
			400
		);

		await page.mouse.wheel(0, 400);

		await probe.expectToStayPut(
			before,
			'Mausrad hat ohne Fokus gezoomt — das Formular lässt sich über der Karte nicht mehr scrollen'
		);
		expect(
			await page.evaluate(() => window.scrollY),
			'Seite ist nicht gescrollt — das Rad wurde über der Karte verschluckt'
		).toBeGreaterThan(scrollVorher);
	});

	test('Mausrad zoomt, sobald die Karte den Fokus hat', async ({ page }) => {
		const probe = karte(page);
		// Fokus per Tastatur-Weg statt per Klick: Ein Klick in die Karte würde
		// die gemeldete Position setzen (`handleMapClick`). Genau deshalb ist er
		// als „Freischalter" ungeeignet.
		await page.locator('.ol-map-container').focus();

		const point = await mapPoint(page);
		const before = await probe.hoverAndSettle(point);
		const vorher = await position(page);

		await page.mouse.wheel(0, -400);

		await probe.expectToMove(before, 'Mausrad-Zoom blieb auch mit Fokus ohne Wirkung');
		// Zoomen ist keine Positionsangabe.
		await expect(page.locator('#latitude')).toHaveValue(vorher.lat);
		await expect(page.locator('#longitude')).toHaveValue(vorher.lon);
	});
});
