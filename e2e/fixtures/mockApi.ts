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
		const field = (name: string): string =>
			new RegExp(`name="${name}"\\r?\\n\\r?\\n([^\\r\\n]*)`).exec(body)?.[1] ?? '';

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
