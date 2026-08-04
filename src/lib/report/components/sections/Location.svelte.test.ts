import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import Location from './Location.svelte';

/**
 * Die **Admin-Maske** behält beide Ortsfelder — auch nachdem das Meldeformular
 * sie zu einem zusammengelegt hat (A2.4). Sie ist der einzige Ort, an dem die
 * `seezeichen`-Spalte des Altbestands noch bearbeitet werden kann; die
 * Legacy-API nimmt `seezeichen` weiterhin entgegen.
 *
 * Der Test existiert wegen eines konkreten Präzedenzfalls: In PR #669 hat eine
 * Feld-Entfernung im Meldeformular der Admin-Maske drei Felder mit weggenommen,
 * weil beide dieselbe Komponente teilten. Hier sind es zwei getrennte
 * (`position/LocationDescription.svelte` vs. diese) — dieser Test hält fest,
 * dass das so bleibt.
 *
 * **Beide Felder stehen unabhängig von der GPS-Position.** Vorher lagen sie im
 * `{:else}`-Zweig von `{#if hasPosition}`, und `adminEditInitialValues.ts:46`
 * leitet `hasPosition` aus den Koordinaten ab — eine Sichtung MIT Koordinaten
 * zeigte deshalb weder `waterway` noch `seaMark`. Im Bestand betraf das 902 der
 * 1.033 Datensätze mit Seezeichen und 1.191 mit Fahrwasser (gemessen am
 * 2026-08-02): genau die Altmeldungen, die zu korrigieren der Grund ist, aus dem
 * `seaMark` überhaupt im Schema bleibt. Die Kopplung an `hasPosition` war im
 * Meldeformular sinnvoll (dort ist die Beschreibung die Alternative zur
 * Position), in der Admin-Maske ist sie es nie gewesen: Dort wird ein
 * vorhandener Datensatz korrigiert, nicht eine Meldung erfasst.
 */
function renderAdminLocation(overrides: Partial<SightingFormData> = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, ...overrides } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	render(Location, { context: new Map([[formContextKey, context]]) });
}

function field(name: string): HTMLInputElement | null {
	return document.querySelector<HTMLInputElement>(`[data-testid="field-${name}"]`);
}

describe('sections/Location — Admin-Maske', () => {
	it('zeigt ohne GPS-Position weiterhin BEIDE Ortsfelder', () => {
		renderAdminLocation({ hasPosition: false });

		expect(field('waterway')).not.toBeNull();
		expect(field('seaMark')).not.toBeNull();
	});

	it('lässt das Seezeichen bearbeiten — der Altbestand muss korrigierbar bleiben', () => {
		renderAdminLocation({ hasPosition: false, seaMark: 'Tonne 14' });

		const seaMark = field('seaMark');
		expect(seaMark?.value).toBe('Tonne 14');
		expect(seaMark?.disabled).toBe(false);
		expect(seaMark?.readOnly).toBe(false);
	});

	/**
	 * Der praktisch wichtigere Fall: 902 der 1.033 Datensätze mit Seezeichen
	 * tragen zugleich Koordinaten. Blieben die Felder an `hasPosition` gekoppelt,
	 * wäre genau dieser Altbestand nicht erreichbar.
	 */
	it('zeigt beide Ortsfelder AUCH mit GPS-Position', () => {
		renderAdminLocation({
			hasPosition: true,
			latitude: 54.5,
			longitude: 13.5,
			waterway: 'Greifswalder Bodden',
			seaMark: 'Leuchtturm Warnemünde'
		});

		expect(field('waterway')?.value).toBe('Greifswalder Bodden');
		expect(field('seaMark')?.value).toBe('Leuchtturm Warnemünde');
	});

	it('lässt beide Felder mit GPS-Position bearbeiten', () => {
		renderAdminLocation({ hasPosition: true, latitude: 54.5, longitude: 13.5 });

		for (const name of ['waterway', 'seaMark']) {
			expect(field(name)?.disabled, name).toBe(false);
			expect(field(name)?.readOnly, name).toBe(false);
		}
	});

	/**
	 * Die Koordinaten sind laut Schema Pflicht, sobald `hasPosition` gesetzt ist
	 * (`latitude.when('hasPosition', { is: true, … })`). Sie laufen aber nicht
	 * über `FormField` → `FieldRenderer`, das Sternchen und `aria-required` sonst
	 * zentral setzt — `LocationInput` bekommt die Pflicht deshalb als Prop
	 * durchgereicht. Dieser Test hält die Verdrahtung fest; die Darstellung in
	 * allen drei Eingabeformaten prüft `LocationInput.svelte.test.ts`.
	 */
	it('markiert die Koordinaten als Pflicht, sobald die Position angegeben wird', async () => {
		renderAdminLocation({ hasPosition: true, latitude: 54.5, longitude: 13.5 });

		await expect.poll(() => document.getElementById('latitude'), { timeout: 5000 }).not.toBeNull();

		for (const inputId of ['latitude', 'longitude']) {
			expect(
				document.querySelector(`label[for="${inputId}"] [aria-label="Pflichtfeld"]`),
				`Sternchen an ${inputId}`
			).not.toBeNull();
			expect(
				document.getElementById(inputId)?.getAttribute('aria-required'),
				`aria-required an ${inputId}`
			).toBe('true');
		}
	});
});
