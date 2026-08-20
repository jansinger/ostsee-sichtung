import { expect, type Frame, type Page } from '@playwright/test';

/**
 * Wo die Karte lebt: im Hauptdokument (`Page`) oder — für den iframe-Fall — im
 * eingebetteten Frame. Nur das **Messen** ist frame-abhängig; Maus-Eingaben
 * laufen immer über die `Page`, weil Playwright Koordinaten am Viewport misst.
 */
export type MapScope = Page | Frame;

/**
 * Messwerkzeug für „hat sich die Karte bewegt?"-Tests.
 *
 * Gemessen wird das **gezeichnete Kartenbild** (Canvas-Fingerprint) und nicht
 * der View-Zustand: An die OpenLayers-Instanz kommt man von außen nicht heran,
 * und eine Test-Hintertür im Produktionscode wäre der falsche Preis dafür.
 *
 * Damit der Fingerprint aussagekräftig ist, muss der Aufrufer zwei Dinge
 * sicherstellen — beides ist Sache des jeweiligen Specs, weil es von der Karte
 * abhängt:
 *
 * 1. Es muss überhaupt etwas gezeichnet werden. Ein leeres Canvas kann sich
 *    durch einen Pan nicht verändern; der Test wäre gehaltlos statt
 *    aussagekräftig. `settledHash()` prüft das und schlägt sonst fehl.
 * 2. Der Hintergrund darf sich **nicht von selbst** ändern. Nachladende
 *    OSM-Kacheln würden das Bild auch ohne Geste verändern und einen Test auf
 *    „hat sich bewegt" fälschlich grün machen — die Kachel-Hosts gehören
 *    deshalb abgewiesen.
 *
 * Diese Datei ist die gemeinsame Quelle für `e2e/map-pan-zoom.spec.ts`
 * (Sichtungskarte) und `e2e/form-map-pan-zoom.spec.ts` (Positions-Karte im
 * Meldeformular). Sie entstand, weil beide Specs dieselben rund 130 Zeilen
 * trugen und bereits auseinanderzudriften begannen.
 */

/**
 * Wartet, bis eine `OLMap`-Karte tatsächlich gezeichnet ist.
 *
 * Seit `OLMap.svelte` OpenLayers per `await import(...)` nachlädt, ist der
 * Container **sofort** da, die Karte aber noch nicht: Das `div.ol-map-container`
 * wird serverseitig gerendert und trägt bis zum Eintreffen des Chunks nur den
 * Ladehinweis.
 *
 * Damit taugt keines der beiden bisher üblichen Signale mehr als Beleg dafür,
 * dass gemessen werden kann:
 *
 * - `.ol-map-container` ist sichtbar, sobald HTML da ist — auch ganz ohne
 *   JavaScript.
 * - `data-position="set"` hängt an `hasPosition`, also an den
 *   Koordinatenfeldern. Es kippt, sobald der Melder Zahlen einträgt, und sagt
 *   über die Karte nichts.
 *
 * Wer darauf misst, fingerprintet ein Canvas, das es noch nicht gibt, oder ein
 * leeres — der Test scheitert dann mit „Karte zeichnet nichts", und die Ursache
 * steht nicht im Fehlerbild.
 *
 * Gewartet wird auf das Verschwinden des Ladehinweises UND auf das von
 * OpenLayers erzeugte `.ol-viewport`. Beides zusammen, weil jedes für sich zu
 * früh grün wäre: Der Hinweis fehlt auch, bevor die Komponente hydriert hat.
 */
export async function waitForOlMapReady(scope: MapScope): Promise<void> {
	await expect(scope.locator('.ol-map-container')).toBeVisible();
	await expect(scope.locator('[data-testid="map-loading"]')).toHaveCount(0);
	await expect(scope.locator('.ol-viewport').first()).toBeVisible();
}

export type CanvasState = { hash: number; distinct: number };

export type MapCanvasProbeOptions = {
	/** CSS-Selektor des Karten-Containers; alle `canvas` darunter werden gelesen. */
	selector: string;
	/**
	 * Abtastschritt in Byte über die Bilddaten. Groß halten, wo viel gezeichnet
	 * wird (Sichtungskarte); klein, wo das einzige Objekt ein handtellergroßer
	 * Marker ist und ein grobes Raster ihn zwischen zwei Messungen verfehlen
	 * könnte.
	 */
	stride?: number;
	/**
	 * Obergrenze für den gelesenen Ausschnitt. `getImageData` über ein
	 * Vollbild-Canvas kostet bei 2752×1496 rund 66 MB **pro Messung** — bei einer
	 * Karte, die pollend gemessen wird, ist das der Unterschied zwischen einem
	 * flotten und einem unbrauchbaren Testlauf.
	 */
	maxWidth?: number;
	maxHeight?: number;
	/**
	 * Dokument, in dem gemessen wird. Default ist die `Page` selbst; für die
	 * iframe-Tests der Sichtungskarte der eingebettete `Frame`. Die Maus bleibt
	 * davon unberührt — sie gehört immer zur `Page`.
	 */
	scope?: MapScope;
};

export type MapCanvasProbe = {
	/** Rohmessung: Fingerprint plus Anzahl unterschiedlicher Abtastwerte. */
	state(): Promise<CanvasState | null>;
	/** Wartet, bis das Bild ruht, und gibt seinen Fingerprint zurück. */
	settledHash(): Promise<number>;
	/** Erwartet, dass sich das Kartenbild binnen weniger Sekunden verändert. */
	expectToMove(before: number, hinweis: string): Promise<void>;
	/** Erwartet, dass das Kartenbild über ein Zeitfenster unverändert bleibt. */
	expectToStayPut(before: number, hinweis: string): Promise<void>;
	/** Zieht mit echten Maus-Events über die Karte. */
	drag(from: { x: number; y: number }, dx: number, dy: number): Promise<void>;
	/** Fährt die Maus an die Gestenposition und misst erst danach die Basis. */
	hoverAndSettle(point: { x: number; y: number }): Promise<number>;
};

export function createMapCanvasProbe(page: Page, options: MapCanvasProbeOptions): MapCanvasProbe {
	const { selector, stride = 401, maxWidth = 1200, maxHeight = 800, scope = page } = options;

	async function state(): Promise<CanvasState | null> {
		return scope.evaluate(
			({ selector, stride, maxWidth, maxHeight }) => {
				const canvases = Array.from(
					document.querySelectorAll<HTMLCanvasElement>(`${selector} canvas`)
				);
				if (canvases.length === 0) return null;

				let hash = 0;
				const seen = new Set<number>();

				for (const canvas of canvases) {
					const ctx = canvas.getContext('2d');
					if (!ctx) continue;
					const width = Math.min(canvas.width, maxWidth);
					const height = Math.min(canvas.height, maxHeight);
					if (width === 0 || height === 0) continue;

					const { data } = ctx.getImageData(0, 0, width, height);
					for (let i = 0; i < data.length; i += stride) {
						hash = (hash * 31 + data[i]) | 0;
						if (seen.size < 64) seen.add(data[i]);
					}
				}

				return { hash, distinct: seen.size };
			},
			{ selector, stride, maxWidth, maxHeight }
		);
	}

	/**
	 * „Zur Ruhe gekommen" heißt: zwei aufeinanderfolgende Messungen sind gleich —
	 * sonst würde eine noch laufende Erstdarstellung als Wirkung der Geste
	 * durchgehen.
	 */
	async function settledHash(): Promise<number> {
		let previous: number | null = null;
		let current: number | null = null;

		await expect
			.poll(
				async () => {
					const gemessen = await state();
					previous = current;
					current = gemessen?.hash ?? null;
					return current !== null && current === previous;
				},
				{
					timeout: 15000,
					intervals: [200, 200, 200, 400],
					message: 'Kartenbild kam nicht zur Ruhe'
				}
			)
			.toBe(true);

		// Gegenprobe (Punkt 1 im Kopfkommentar): Ein einfarbiges Canvas könnte sich
		// durch einen Pan nicht verändern — der Test wäre dann gehaltlos.
		//
		// Der Rückgabewert stammt aus **dieser** Messung und nicht aus der
		// Schleifenvariablen: Die liegt in einer Closure, die TypeScript nicht
		// verfolgt (`current` gilt dort weiterhin als `null`), und bräuchte einen
		// Cast, der die Prüfung nur stillstellt. Das Bild ruht an dieser Stelle
		// ohnehin — beide Werte sind gleich.
		const gemessen = await state();
		expect(
			gemessen?.distinct ?? 0,
			'Karte zeichnet nichts — der Fingerprint wäre gehaltlos'
		).toBeGreaterThan(1);
		if (!gemessen) throw new Error('Kartenbild ist nicht messbar');

		return gemessen.hash;
	}

	async function expectToMove(before: number, hinweis: string): Promise<void> {
		await expect
			.poll(async () => (await state())?.hash ?? null, {
				timeout: 4000,
				intervals: [150, 250, 400, 600],
				message: hinweis
			})
			.not.toBe(before);
	}

	/**
	 * `expect.poll` ist hier das falsche Werkzeug: Es prüft, bis eine Bedingung
	 * erfüllt ist — bei „hat sich nichts geändert" wäre sie sofort erfüllt und der
	 * Test damit gehaltlos. Stattdessen wird über ein Zeitfenster mehrfach gemessen
	 * und jede Messung geprüft.
	 *
	 * Die 8 × 200 ms sind so bemessen, dass ein **verzögerter** Zoom nicht
	 * durchrutscht: `MouseWheelZoom` sammelt Rad-Ereignisse hinter einem Timeout
	 * (80 ms) und zoomt dann animiert (250 ms). Das Fenster deckt beides mehrfach
	 * ab. Es ist damit kürzer als die 4 s, die `expectToMove` maximal wartet — die
	 * Zahlen messen Verschiedenes und dürfen nicht aneinander angeglichen werden.
	 */
	async function expectToStayPut(before: number, hinweis: string): Promise<void> {
		for (let versuch = 0; versuch < 8; versuch++) {
			await page.waitForTimeout(200);
			const jetzt = (await state())?.hash ?? null;
			expect(jetzt, `${hinweis} (Messung ${versuch + 1} von 8)`).toBe(before);
		}
	}

	async function drag(from: { x: number; y: number }, dx: number, dy: number): Promise<void> {
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		// Mehrere Zwischenschritte: OpenLayers braucht `pointermove` mit gedrückter
		// Taste, ein einzelner Sprung erzeugt keine belastbare Drag-Sequenz.
		await page.mouse.move(from.x + dx * 0.3, from.y + dy * 0.3, { steps: 5 });
		await page.mouse.move(from.x + dx, from.y + dy, { steps: 10 });
		await page.mouse.up();
	}

	/**
	 * Die Reihenfolge ist wesentlich: Schon das Bewegen der Maus kann das
	 * Kartenbild verändern — die Sichtungskarte sucht in ihrem
	 * `pointermove`-Handler Features unter dem Zeiger und setzt den Hover-Zustand.
	 * Wer die Basis vorher nimmt, misst hinterher diesen Effekt mit: Ein Test auf
	 * „hat sich bewegt" würde dann auch ohne Geste grün, einer auf „hat sich nicht
	 * bewegt" fälschlich rot (genau so ist der Mausrad-Test beim ersten Lauf
	 * gescheitert).
	 */
	async function hoverAndSettle(point: { x: number; y: number }): Promise<number> {
		await page.mouse.move(point.x, point.y);
		return settledHash();
	}

	return { state, settledHash, expectToMove, expectToStayPut, drag, hoverAndSettle };
}

/**
 * Weist die Kachel-Hosts ab, damit sich das Kartenbild nicht von selbst ändert.
 *
 * Nur für die Formular-Karte gedacht — die Sichtungskarte erledigt das in
 * `mockMapSightingsWithFeatures`, zusammen mit ihren Fest-Sichtungen.
 */
export async function blockTileHosts(page: Page, hosts: string[]): Promise<void> {
	for (const pattern of hosts) {
		await page.route(pattern, (route) => route.abort());
	}
}

/**
 * Kachel-Host der Formular-Karte. `createMap()` legt nur einen OSM-Layer an, den
 * OpenSeaMap-Layer der Sichtungskarte gibt es hier nicht.
 *
 * OLs `OSM`-Source nutzt den Einzelhost `tile.openstreetmap.org` (kein
 * Subdomain-Sharding) — ein Muster für `*.tile.openstreetmap.org` würde nie
 * greifen.
 */
export const FORM_TILE_HOSTS = ['**://tile.openstreetmap.org/**'];
