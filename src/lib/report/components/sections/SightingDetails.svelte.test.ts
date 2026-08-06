import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData } from '$lib/types';
import SightingDetails from './SightingDetails.svelte';

/**
 * Konditionale Pflichtfelder: `sightingFromText` und `boatDrive` sind im
 * Yup-Schema nur unter einer Bedingung Pflicht (`when('sightingFrom')`).
 * `FieldRenderer` leitet die Markierung aber aus `describe()` ab, und dort ist
 * ein `when()` nicht sichtbar — ohne den `required`-Override an `FormField`
 * zeigt das Feld weder Sternchen noch `aria-required`, obwohl „Weiter" daran
 * scheitert (design-system.md, „Formularfeld-Muster").
 *
 * **Die beiden Felder liegen dabei unterschiedlich:**
 *
 * - `boatDrive` ist in **beiden** Masken Pflicht, sobald von Segelschiff oder
 *   Motorboot gemeldet wird — `adminSightingSchema` lockert es nicht. Der
 *   Meldeformular-Zweig hat den Override seit `479ef33c`; der Admin-Zweig
 *   rendert unter derselben Bedingung und braucht ihn genauso.
 * - `sightingFromText` ist **nur im Meldeformular** Pflicht.
 *   `adminSightingSchema` baut das Feld ausdrücklich als `notRequired()` neu
 *   auf, weil 1.120 Bestandszeilen `vonwo = 0` ohne Freitext tragen. Ein
 *   unbedingtes `required={true}` wäre in der Admin-Maske also eine Lüge über
 *   die Validierung — der Override hängt hier an `adminMode`.
 */
function renderSightingDetails(
	overrides: Partial<SightingFormData> = {},
	props: { adminMode?: boolean } = {}
): void {
	renderWithFormContext(SightingDetails, { overrides, props });
}

/** Das Pflicht-Sternchen der Feld-Pipeline, auf ein Feld eingegrenzt. */
function requiredMark(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-field="${name}"] [aria-label="Pflichtfeld"]`);
}

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('sections/SightingDetails — sightingFromText als konditionales Pflichtfeld', () => {
	it('markiert den Freitext im Meldeformular als Pflicht, wenn "Sonstiges" gewählt ist', () => {
		renderSightingDetails({ sightingFrom: SightingFromEnum.OTHER });

		expect(field('sightingFromText')).not.toBeNull();
		expect(requiredMark('sightingFromText')).not.toBeNull();
		expect(field('sightingFromText')?.getAttribute('aria-required')).toBe('true');
	});

	/**
	 * Der Gegenprobe-Fall: In der Admin-Maske gilt `adminSightingSchema`, dort
	 * ist der Freitext optional. Ein Sternchen würde hier eine Pflicht behaupten,
	 * die beim Speichern niemand prüft.
	 */
	it('markiert den Freitext in der Admin-Maske NICHT als Pflicht', () => {
		renderSightingDetails({ sightingFrom: SightingFromEnum.OTHER }, { adminMode: true });

		expect(field('sightingFromText')).not.toBeNull();
		expect(requiredMark('sightingFromText')).toBeNull();
		expect(field('sightingFromText')?.getAttribute('aria-required')).toBeNull();
	});
});

describe('sections/SightingDetails — boatDrive in der Admin-Maske', () => {
	it.each([
		['Segelschiff', SightingFromEnum.SAILBOAT],
		['Motorboot', SightingFromEnum.MOTORBOAT]
	])('markiert den Bootsantrieb bei "%s" als Pflicht', (_label, sightingFrom) => {
		renderSightingDetails({ sightingFrom }, { adminMode: true });

		expect(field('boatDrive')).not.toBeNull();
		expect(requiredMark('boatDrive')).not.toBeNull();
		expect(field('boatDrive')?.getAttribute('aria-required')).toBe('true');
	});

	/**
	 * Bei Land/Fähre/Sonstiges verlangt das Schema keinen Antrieb — der ganze
	 * Block rendert dann gar nicht, es kann also auch keine falsche Markierung
	 * stehenbleiben.
	 */
	it('zeigt den Bootsantrieb bei "Land" gar nicht erst', () => {
		renderSightingDetails({ sightingFrom: SightingFromEnum.LAND }, { adminMode: true });

		expect(document.querySelector('[data-field="boatDrive"]')).toBeNull();
	});

	/**
	 * Review-Befund 2 (Task 11): Der vorherige Test rendert ausschließlich mit
	 * `adminMode: true` — „war schon vorher grün" belegte damit nur den
	 * Admin-Zweig. `showsBoatDrive` (`isBoatSightingFrom`) kennt `adminMode`
	 * gar nicht, trotzdem war der Bürger-Zweig bis hierhin ungetestet.
	 * Gegenprobe ohne `adminMode` (Standardwert `false`, siehe
	 * `renderSightingDetails`).
	 */
	it('zeigt den Bootsantrieb bei "Land" auch im Meldeformular gar nicht erst', () => {
		renderSightingDetails({ sightingFrom: SightingFromEnum.LAND });

		expect(document.querySelector('[data-field="boatDrive"]')).toBeNull();
	});
});

/**
 * „Statt Sichtungsdetails ‚Funddetails' einfügen" — Wunsch des Museums für den
 * Totfund. Die Karte reagiert auf den Totfund-Schalter, der auf Schritt 2 über
 * ihr steht; die Zuordnung selbst liegt in `$lib/report/wording`.
 *
 * Gilt auch in der Admin-Maske: Dort kommt `isDead` aus dem geladenen
 * Datensatz, und ein Totfund heißt auch dort ein Fund.
 */
describe('sections/SightingDetails — Kartentitel folgt dem Totfund-Schalter', () => {
	it('heißt bei einer Sichtung „Sichtungsdetails"', () => {
		renderSightingDetails({ isDead: false });

		expect(document.body.textContent).toContain('Sichtungsdetails');
	});

	it('heißt beim Totfund „Funddetails"', () => {
		renderSightingDetails({ isDead: true });

		const text = document.body.textContent ?? '';
		expect(text).toContain('Funddetails');
		expect(text).not.toContain('Sichtungsdetails');
	});

	// Gegenprobe über die Admin-Maske: Der Titel hängt am Datensatz, nicht am
	// Modus — sonst führe die Sachbearbeitung einen Totfund unter „Sichtung".
	it('heißt beim Totfund auch in der Admin-Maske „Funddetails"', () => {
		renderSightingDetails({ isDead: true }, { adminMode: true });

		expect(document.body.textContent).toContain('Funddetails');
	});
});
