import type { Page, Route } from '@playwright/test';

function emptyFeatureCollection(): string {
	return JSON.stringify({ type: 'FeatureCollection', features: [] });
}

async function replaceMapSightingsRoute(
	page: Page,
	handler: (route: Route) => Promise<void> | void
) {
	await page.unroute('**/api/map/sightings**');
	await page.route('**/api/map/sightings**', handler);
}

export async function mockMapSightingsSuccess(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: emptyFeatureCollection()
		})
	);
}

/** Jahr, für das `mockMapSightingsWithFeatures` Daten liefert. */
export const MOCK_SIGHTINGS_YEAR = 2024;

/**
 * Liefert eine feste Handvoll sichtbarer Sichtungen und blockiert gleichzeitig
 * alle externen Kacheln.
 *
 * Gedacht für Tests, die eine **Veränderung des Kartenbilds** messen (z. B. ob ein
 * Pan wirkt). Dafür müssen zwei Dinge gelten, die `mockMapSightingsSuccess` nicht
 * erfüllt:
 *
 * 1. Es muss überhaupt etwas gezeichnet werden — die leere FeatureCollection dort
 *    ergibt eine unveränderliche Fläche, an der sich kein Pan ablesen lässt.
 * 2. Der Hintergrund darf sich **nicht von selbst** ändern. Nachladende
 *    OSM-Kacheln würden das Bild auch ohne Pan verändern und einen Test, der auf
 *    „Bild hat sich geändert" prüft, fälschlich grün machen. Deshalb werden
 *    `tile.openstreetmap.org` und `tiles.openseamap.org` abgewiesen.
 *
 * Die Zeitstempel liegen in `MOCK_SIGHTINGS_YEAR`, damit der Zeitfilter des
 * Controllers (ganzes Jahr) sie nicht ausblendet. Die Positionen liegen in der
 * westlichen Ostsee und damit im Startausschnitt der Karte.
 */
export async function mockMapSightingsWithFeatures(page: Page): Promise<void> {
	const positions: Array<[number, number]> = [
		[11.2, 54.4],
		[12.1, 54.6],
		[13.4, 54.5],
		[10.6, 54.8],
		[12.8, 55.1]
	];

	const features = positions.map(([longitude, latitude], index) => ({
		type: 'Feature' as const,
		id: index + 1,
		geometry: { type: 'Point' as const, coordinates: [longitude, latitude] },
		properties: {
			id: index + 1,
			// Unix-Sekunden, Mitte des Jahres — innerhalb des Zeitfilters.
			ts: Date.UTC(MOCK_SIGHTINGS_YEAR, 6, 15) / 1000,
			ta: 0, // Schweinswal
			ct: 3 + index,
			jt: 0,
			tf: 0
		}
	}));

	await replaceMapSightingsRoute(page, (route: Route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ type: 'FeatureCollection', features })
		})
	);

	await page.unroute('**/api/map/sightings/years');
	await page.route('**/api/map/sightings/years', (route: Route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				years: [{ year: MOCK_SIGHTINGS_YEAR, count: features.length }]
			})
		})
	);

	// OLs `OSM`-Source nutzt den Einzelhost `tile.openstreetmap.org` (kein
	// Subdomain-Sharding), und der Controller übergibt kein eigenes `url` — ein
	// Muster für `*.tile.openstreetmap.org` würde nie greifen.
	for (const pattern of ['**://tile.openstreetmap.org/**', '**tiles.openseamap.org/**']) {
		await page.route(pattern, (route: Route) => route.abort());
	}
}

export async function mockMapSightingsAbort(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) => route.abort());
}

/**
 * Antwortet auf `POST /api/files/upload` wie der echte Endpunkt, ohne Storage-
 * und DB-Schreibzugriff.
 *
 * **Der `uid` aus dem Request MUSS zurückgespiegelt werden.** Der Server tut das
 * auch (`storage.upload({ uid })`), und `DropzoneEnhanced` verlässt sich darauf:
 * Sein `$effect.pre` legt für jede `uploadedFiles`-Zeile ohne passendes
 * `MediaFile` ein neues an — und schreibt dabei `mediaStore.mediaFiles` neu.
 * Ein Mock mit fremder uid würde also genau die Store-Zuweisung nachliefern, die
 * `e2e/form-position-photo.spec.ts` an anderer Stelle absichern soll, und den
 * Test blind machen.
 *
 * Bewusst ohne `exifData`: Der echte Endpunkt liefert sie zwar mit, aber alles,
 * was die Positionseingabe auswertet, stammt aus der **client-seitigen**
 * Analyse (`analyzeClientFile`). Der Mock lässt den zu testenden Pfad damit
 * unangetastet — `MediaFile` füllt `exifData` per `??` ohnehin aus den
 * Metadaten.
 */
export async function mockFileUploadSuccess(page: Page): Promise<void> {
	await page.route('**/api/files/upload', async (route: Route) => {
		const body = route.request().postData() ?? '';
		const field = (name: string): string => {
			const match = new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(body);
			if (!match) {
				// Laut statt still: Eine fremde/leere uid würde `DropzoneEnhanced` dazu
				// bringen, für die Antwort ein zusätzliches `MediaFile` anzulegen (siehe
				// Doc-Kommentar oben) — und genau die Store-Zuweisung, die
				// `form-position-photo.spec.ts` prüfen soll, unbemerkt nachliefern.
				// Ein Fehler hier zeigt eine Änderung am Multipart-Format sofort an,
				// statt die Zustand-C-Tests grün und bedeutungslos zu machen.
				throw new Error(
					`mockFileUploadSuccess: multipart field "${name}" nicht im Request-Body gefunden`
				);
			}
			return match[1];
		};

		const uid = field('uid');
		const originalName = /filename="([^"]*)"/.exec(body)?.[1] ?? 'foto.jpg';

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				uid,
				filePath: `e2e/${uid}.jpg`,
				fileName: `${uid}.jpg`,
				originalName,
				mimeType: 'image/jpeg',
				size: 12345,
				url: `/api/media/e2e/${uid}.jpg`,
				uploadedAt: '2025-08-15T08:30:00.000Z'
			})
		});
	});
}

export async function mockMapSightingsHttp500(page: Page): Promise<void> {
	await replaceMapSightingsRoute(page, (route: Route) =>
		route.fulfill({
			status: 500,
			contentType: 'application/json',
			body: '{"error":"Server error"}'
		})
	);
}
