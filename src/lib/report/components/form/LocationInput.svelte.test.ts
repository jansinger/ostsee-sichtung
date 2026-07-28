import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import LocationInput from './LocationInput.svelte';

/**
 * Deckt die beiden Einsatzorte von `LocationInput` ab — sie unterscheiden sich
 * über `collapsibleCoordinates`:
 *
 * - Admin-Maske (`sections/Location.svelte`, Default `false`): Koordinatenfelder
 *   stehen direkt sichtbar da, und die Karte trägt das OpenLayers-GPS-Control,
 *   weil daneben kein eigener Standort-Button existiert.
 * - Meldeformular (`form/position/PositionPanel.svelte`, `true`): Felder liegen
 *   hinter einer Disclosure, das GPS-Control entfällt — `PositionPanel` hat
 *   einen eigenen Button „Mein aktueller Standort" über der Karte, zwei
 *   Bedienelemente für dieselbe Aktion wären ein Verstoß gegen
 *   `.claude/rules/design-system.md`.
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
	it('zeigt in der Admin-Variante (collapsibleCoordinates=false) das GPS-Control', async () => {
		render(LocationInput, { latitude: 54.5, longitude: 13.5 });

		await expect.poll(gpsControlCount, { timeout: 5000 }).toBe(1);

		// Gegenprobe zum zweiten Unterschied: Die Koordinatenfelder liegen hier
		// NICHT hinter einer Disclosure.
		expect(document.querySelector('[data-testid="coordinate-fields"]')).toBeNull();
		expect(document.querySelector('#latitude')).not.toBeNull();
	});

	it('unterdrückt das GPS-Control im Meldeformular (collapsibleCoordinates=true)', async () => {
		render(LocationInput, {
			latitude: 54.5,
			longitude: 13.5,
			collapsibleCoordinates: true
		});

		// Auf die fertige Karte warten, damit die Aussage „kein Control" nicht
		// nur bedeutet, dass die Karte noch gar nicht existiert.
		await expect.poll(() => document.querySelectorAll('.ol-viewport').length).toBe(1);
		expect(gpsControlCount()).toBe(0);

		// Die Felder liegen hier hinter der Disclosure.
		expect(document.querySelector('[data-testid="coordinate-fields"]')).not.toBeNull();
	});
});
