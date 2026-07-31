import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import LocationInput from './LocationInput.svelte';

/**
 * Deckt die beiden Einsatzorte von `LocationInput` ab. Sie unterscheiden sich
 * über ZWEI unabhängige Schalter:
 *
 * - `collapsibleCoordinates` legt die Koordinatenfelder hinter eine Disclosure.
 * - `enableMapGps` schaltet das OpenLayers-GPS-Control der Karte.
 *
 * Beides hing früher an `collapsibleCoordinates` allein. Das trug, solange die
 * Kombination „Felder sichtbar + eigenes GPS-Control" nur in der Admin-Maske
 * vorkam. Seit das Meldeformular die Koordinaten dauerhaft zeigt (Wunsch des
 * Deutschen Meeresmuseums), braucht es dort „Felder sichtbar + KEIN
 * GPS-Control" — mit einem einzigen Schalter nicht ausdrückbar.
 *
 * - Admin-Maske (`sections/Location.svelte`, beide Defaults): Felder sichtbar,
 *   Karte trägt das GPS-Control, weil daneben kein eigener Standort-Button steht.
 * - Meldeformular (`form/position/PositionPanel.svelte`): Felder sichtbar,
 *   `enableMapGps={false}` — `PositionPanel` hat einen eigenen Button „Mein
 *   aktueller Standort", zwei Bedienelemente für dieselbe Aktion wären ein
 *   Verstoß gegen `.claude/rules/design-system.md`.
 *
 * Das GPS-Control wird von `createMap` erzeugt (`FormLocationControl`,
 * `utils/map/openLayersHelpers.ts`) und trägt die Klasse `gps-control`. Die
 * Karte entsteht in einem `$effect`, deshalb wird auf das Element gepollt statt
 * es synchron zu erwarten.
 */
function gpsControlCount(): number {
	return document.querySelectorAll('.gps-control').length;
}

describe('LocationInput — GPS-Control der Karte', () => {
	it('zeigt in der Admin-Variante (Defaults) das GPS-Control', async () => {
		render(LocationInput, { latitude: 54.5, longitude: 13.5 });

		await expect.poll(gpsControlCount, { timeout: 5000 }).toBe(1);

		// Gegenprobe zum zweiten Unterschied: Die Koordinatenfelder liegen hier
		// NICHT hinter einer Disclosure.
		expect(document.querySelector('[data-testid="coordinate-fields"]')).toBeNull();
		expect(document.querySelector('#latitude')).not.toBeNull();
	});

	it('unterdrückt das GPS-Control im Meldeformular (enableMapGps=false)', async () => {
		render(LocationInput, {
			latitude: 54.5,
			longitude: 13.5,
			enableMapGps: false
		});

		// Auf die fertige Karte warten, damit die Aussage „kein Control" nicht
		// nur bedeutet, dass die Karte noch gar nicht existiert.
		await expect.poll(() => document.querySelectorAll('.ol-viewport').length).toBe(1);
		expect(gpsControlCount()).toBe(0);
	});

	it('zeigt die Koordinatenfelder auch ohne GPS-Control direkt an', async () => {
		render(LocationInput, { latitude: 54.5, longitude: 13.5, enableMapGps: false });

		await expect.poll(() => document.querySelector('#latitude'), { timeout: 5000 }).not.toBeNull();
		expect(document.querySelector('[data-testid="coordinate-fields"]')).toBeNull();
	});

	it('legt die Felder nur bei collapsibleCoordinates hinter eine Disclosure', async () => {
		render(LocationInput, { latitude: 54.5, longitude: 13.5, collapsibleCoordinates: true });

		await expect
			.poll(() => document.querySelector('[data-testid="coordinate-fields"]'), { timeout: 5000 })
			.not.toBeNull();
	});

	it('blendet den Koordinaten-Hinweis nur ein, wenn einer übergeben wird', async () => {
		render(LocationInput, {
			latitude: 54.5,
			longitude: 13.5,
			enableMapGps: false,
			coordinatesHint: 'Bitte tragen Sie die GPS-Koordinaten ein.'
		});

		await expect
			.poll(() => document.querySelector('[data-testid="coordinates-hint"]')?.textContent, {
				timeout: 5000
			})
			.toMatch(/GPS-Koordinaten/i);
	});
});

/**
 * Zustand der Karte, bevor eine Position gewählt wurde, und der Hinweistext
 * darunter.
 *
 * Hintergrund: Die Karte braucht immer konkrete Zahlen, sonst startet sie im
 * Nullmeridian (siehe `mapLatitude`/`mapLongitude` in `LocationInput.svelte`).
 * Ein Marker auf diesem Startpunkt sieht aber genauso aus wie eine bewusst
 * gesetzte Position — Melder halten die Vorgabe dann für ihre Sichtung. Der
 * Marker darf deshalb erst erscheinen, wenn `latitude`/`longitude` echte
 * Formularwerte tragen; `data-position` am Kartencontainer macht das prüfbar.
 *
 * Der Hinweistext nannte außerdem pauschal den GPS-Button, den es im
 * Meldeformular gar nicht gibt (`enableMapGps={false}`).
 */
function mapContainer(): HTMLElement | null {
	return document.querySelector('.ol-map-container');
}

function mapHintText(): string {
	return document.querySelector('[data-testid="map-hint"]')?.textContent?.trim() ?? '';
}

describe('LocationInput — Kartenzustand ohne gewählte Position', () => {
	it('zeigt ohne Koordinaten keinen Marker und sagt das im Hinweis', async () => {
		render(LocationInput, { enableMapGps: false });

		await expect.poll(() => mapContainer()?.dataset.position, { timeout: 5000 }).toBe('unset');
		expect(mapHintText()).toMatch(/Noch keine Position gewählt/i);
	});

	it('zeigt mit Koordinaten den Marker und einen Hinweis zum Verschieben', async () => {
		render(LocationInput, {
			latitude: 54.5,
			longitude: 13.5,
			enableMapGps: false
		});

		await expect.poll(() => mapContainer()?.dataset.position, { timeout: 5000 }).toBe('set');
		expect(mapHintText()).toMatch(/Marker/i);
		expect(mapHintText()).not.toMatch(/Noch keine Position/i);
	});
});

describe('LocationInput — Hinweistext nennt den GPS-Button nur wenn er da ist', () => {
	it('erwähnt im Meldeformular (kein GPS-Control) keinen GPS-Button', async () => {
		render(LocationInput, {
			latitude: 54.5,
			longitude: 13.5,
			enableMapGps: false
		});

		await expect.poll(() => mapHintText(), { timeout: 5000 }).not.toBe('');
		expect(gpsControlCount()).toBe(0);
		expect(mapHintText()).not.toMatch(/GPS/i);
	});

	it('erwähnt in der Admin-Variante (mit GPS-Control) den GPS-Button', async () => {
		render(LocationInput, { latitude: 54.5, longitude: 13.5 });

		await expect.poll(gpsControlCount, { timeout: 5000 }).toBe(1);
		expect(mapHintText()).toMatch(/GPS-Button/i);
	});
});
