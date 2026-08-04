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

/**
 * Pflicht-Markierung der Koordinaten.
 *
 * `latitude`/`longitude` sind im Yup-Schema konditionale Pflichtfelder
 * (`.when('hasPosition', { is: true, … })`). Anders als jedes andere Feld laufen
 * sie NICHT über `FormField` → `FieldRenderer`, das Sternchen und
 * `aria-required` sonst zentral aus einer Variablen erzeugt — es sind rohe
 * Inputs. Ohne das `required`-Prop hier trüge die Koordinaten-Eingabe deshalb
 * weder eine sichtbare noch eine maschinenlesbare Pflicht, während die
 * Validierung sie einfordert.
 *
 * Geprüft wird über ALLE drei Eingabeformate, weil jedes seine eigenen Labels
 * und Inputs rendert: Ein Sternchen nur im Dezimalgrad-Zweig wäre für jeden,
 * der auf „Grad, Minute, Sekunde" umstellt, wieder weg.
 *
 * Das Attribut sitzt am beschrifteten Feld — dem Grad-Feld bzw. dem
 * Dezimalgrad-Feld. Minuten und Sekunden bleiben ohne: sie dürfen leer bleiben
 * (`part()` reicht sie als NaN weiter, die Konverter lesen das als 0), eine
 * Pflicht-Ansage dort wäre schlicht falsch.
 */
const COORDINATE_FIELDS = [
	{ mode: 'dd' as const, latitude: 'latitude', longitude: 'longitude' },
	{ mode: 'dm' as const, latitude: 'dm-lat-deg', longitude: 'dm-lon-deg' },
	{ mode: 'dms' as const, latitude: 'dms-lat-deg', longitude: 'dms-lon-deg' }
];

function requiredMarkIn(inputId: string): Element | null {
	return document.querySelector(`label[for="${inputId}"] [aria-label="Pflichtfeld"]`);
}

function ariaRequiredOf(inputId: string): string | null {
	return document.getElementById(inputId)?.getAttribute('aria-required') ?? null;
}

describe('LocationInput — Pflicht-Markierung der Koordinaten', () => {
	for (const { mode, latitude, longitude } of COORDINATE_FIELDS) {
		it(`markiert Breite und Länge im Format "${mode}" als Pflicht, wenn required gesetzt ist`, async () => {
			render(LocationInput, { mode, required: true, enableMapGps: false });

			await expect.poll(() => document.getElementById(latitude), { timeout: 5000 }).not.toBeNull();

			for (const inputId of [latitude, longitude]) {
				expect(requiredMarkIn(inputId), `Sternchen an ${inputId}`).not.toBeNull();
				expect(ariaRequiredOf(inputId), `aria-required an ${inputId}`).toBe('true');
			}
		});

		/**
		 * `toBeNull()` und nicht `.not.toBe('true')`: Im Nein-Fall soll das
		 * Attribut ganz fehlen, nicht als `aria-required="false"` dastehen — so
		 * hält es `BaseInput.svelte` (`restProps.required || undefined`) für jedes
		 * andere Feld des Formulars. Beides wäre gültiges ARIA; die schärfere
		 * Assertion hält die Gleichheit fest, statt sie nur zu behaupten.
		 */
		it(`lässt Breite und Länge im Format "${mode}" ohne required unmarkiert`, async () => {
			render(LocationInput, { mode, enableMapGps: false });

			await expect.poll(() => document.getElementById(latitude), { timeout: 5000 }).not.toBeNull();

			for (const inputId of [latitude, longitude]) {
				expect(requiredMarkIn(inputId), `Sternchen an ${inputId}`).toBeNull();
				expect(ariaRequiredOf(inputId), `aria-required an ${inputId}`).toBeNull();
			}
		});
	}

	/**
	 * Sternchen und `aria-required` stammen aus derselben Variable
	 * (`.claude/rules/design-system.md`: „Nie eines von beidem separat setzen").
	 * Der Test hält fest, dass es keinen Zwischenzustand gibt, in dem nur eines
	 * von beidem gesetzt ist — die häufigste Art, wie die zwei auseinanderdriften.
	 */
	it('setzt Sternchen und aria-required immer gemeinsam', async () => {
		render(LocationInput, { mode: 'dms', required: true, enableMapGps: false });

		await expect
			.poll(() => document.getElementById('dms-lat-deg'), { timeout: 5000 })
			.not.toBeNull();

		const marks = document.querySelectorAll('[aria-label="Pflichtfeld"]').length;
		const flagged = document.querySelectorAll('input[aria-required="true"]').length;

		expect(marks).toBe(2);
		expect(flagged).toBe(2);
	});

	/**
	 * Die Minuten- und Sekundenfelder tragen keine eigene Pflicht — siehe die
	 * Begründung über `COORDINATE_FIELDS`. Ohne diese Gegenprobe wäre ein
	 * pauschales `aria-required` auf allen sechs Inputs vom Test nicht zu
	 * unterscheiden.
	 *
	 * `toBeNull()` wie im Nein-Fall oben: Diese Inputs sollen das Attribut gar
	 * nicht tragen. Ein eingeschlichenes `aria-required="false"` wäre zwar
	 * harmlos, würde die Parität zu `BaseInput.svelte` aber unbemerkt aufgeben.
	 */
	it('lässt Minuten und Sekunden auch bei required ohne Pflicht-Ansage', async () => {
		render(LocationInput, { mode: 'dms', required: true, enableMapGps: false });

		await expect
			.poll(() => document.querySelector('[aria-label="Breite Minuten"]'), { timeout: 5000 })
			.not.toBeNull();

		for (const label of ['Breite Minuten', 'Breite Sekunden', 'Länge Minuten', 'Länge Sekunden']) {
			const input = document.querySelector(`[aria-label="${label}"]`);
			expect(input?.getAttribute('aria-required') ?? null, label).toBeNull();
		}
	});
});
