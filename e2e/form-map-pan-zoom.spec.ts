import { expect, test, type Page } from '@playwright/test';
import { FormPage } from './pages/FormPage';
import { blockTileHosts, createMapCanvasProbe, FORM_TILE_HOSTS } from './helpers/mapCanvas';

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

/**
 * Punkt in der Karte — abseits der Zoom-Controls (oben links), der Attribution
 * (unten rechts) und vor allem abseits des Markers in der Mitte: Ein Zug, der
 * auf dem Marker beginnt, landet in der `Translate`-Interaktion und verschiebt
 * ihn, statt die Karte zu schieben.
 *
 * **Die Karte wird vorher ins Bild geholt und der Scroll abgewartet.** Das
 * Formular scrollt an mehreren Stellen von selbst — `PositionPanel.openMap()`
 * ruft `scrollIntoView`, und jedes fokussierte Feld zieht die Ansicht nach. Wer
 * die Bounding-Box mitten in diese Bewegung liest, bekommt eine Position, die
 * beim Ziehen schon nicht mehr stimmt: Beim Entwickeln dieses Tests lag der
 * Startpunkt einmal bei `y = -36`, also außerhalb des Fensters — die Geste ging
 * ins Leere und sah aus wie der Defekt, den der Test sucht.
 */
async function mapPoint(page: Page, relX = 0.25, relY = 0.78) {
	const map = page.locator('.ol-map-container');
	await map.scrollIntoViewIfNeeded();

	let previous: string | null = null;
	let current: string | null = null;
	await expect
		.poll(
			async () => {
				const box = await map.boundingBox();
				previous = current;
				current = box ? `${Math.round(box.x)}/${Math.round(box.y)}` : null;
				return current !== null && current === previous;
			},
			{ timeout: 10000, intervals: [100, 100, 200, 300], message: 'Karte scrollt noch' }
		)
		.toBe(true);

	const box = await map.boundingBox();
	if (!box) throw new Error('.ol-map-container hat keine Bounding-Box');
	// Gegenprobe zum Fall oben: Eine Geste außerhalb des Fensters beweist nichts.
	expect(box.y, 'Karte liegt oberhalb des sichtbaren Bereichs').toBeGreaterThanOrEqual(0);
	return { x: box.x + box.width * relX, y: box.y + box.height * relY };
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
	await expect(page.locator('.ol-map-container')).toBeVisible();

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
	await expect(page.locator('.ol-map-container')).toHaveAttribute('data-position', 'set');
}

/** Liest die gemeldete Position aus den Koordinatenfeldern. */
async function position(page: Page): Promise<{ lat: string; lon: string }> {
	return {
		lat: await page.locator('#latitude').inputValue(),
		lon: await page.locator('#longitude').inputValue()
	};
}

test.describe('Positions-Karte im Formular — Pan und Zoom', () => {
	test.beforeEach(async ({ page }) => {
		await blockTileHosts(page, FORM_TILE_HOSTS);
		const formPage = new FormPage(page);
		await formPage.goto();
		await oeffneKarteMitMarker(page);
	});

	test('Ziehen verschiebt die Karte ohne vorherigen Klick', async ({ page }) => {
		const probe = karte(page);
		const start = await mapPoint(page);
		const before = await probe.hoverAndSettle(start);

		await probe.drag(start, 120, -90);

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

		const start = await mapPoint(page);
		await probe.hoverAndSettle(start);
		await probe.drag(start, 120, -90);

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
