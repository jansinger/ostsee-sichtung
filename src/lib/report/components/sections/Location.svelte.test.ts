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
 * **Grenze, die dieser Test bewusst nicht überschreitet:** Die Komponente
 * rendert beide Ortsfelder nur im `{:else}`-Zweig von `{#if hasPosition}`, und
 * `adminEditInitialValues.ts:46` leitet `hasPosition` aus den Koordinaten ab.
 * Eine Sichtung MIT Koordinaten zeigt deshalb weder `waterway` noch `seaMark`
 * — im Bestand betrifft das 902 der 1.033 Datensätze mit Seezeichen (gemessen
 * am 2026-08-02). Das ist Verhalten von vor dieser Änderung und keine Folge des
 * Zusammenlegens; es hier festzuschreiben wäre falsch, es zu verschweigen auch.
 * Die Tests unten prüfen deshalb ausdrücklich den Fall ohne GPS-Position.
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
});
