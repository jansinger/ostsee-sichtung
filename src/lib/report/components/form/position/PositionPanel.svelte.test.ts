import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import PositionPanel from './PositionPanel.svelte';

/**
 * Deckt nur die Verdrahtung der konditionalen Koordinaten-Pflicht ab.
 *
 * `latitude`/`longitude` sind laut Schema Pflicht, sobald `hasPosition` gesetzt
 * ist. Sie laufen als einzige Felder des Formulars nicht über `FormField` →
 * `FieldRenderer` (rohe Inputs in `LocationInput.svelte`), das Sternchen und
 * `aria-required` sonst zentral aus einer Variablen erzeugt — die Pflicht wird
 * hier als Prop durchgereicht. Wie sie in den drei Eingabeformaten dargestellt
 * wird, prüft `LocationInput.svelte.test.ts`.
 *
 * `hasPosition` ist im Meldeformular kein Bedienelement, sondern wird aus den
 * Koordinaten abgeleitet (`syncHasPosition`) — die beiden Fälle unten setzen es
 * deshalb zusammen mit den Koordinaten.
 */
function renderPositionPanel(overrides: Partial<SightingFormData> = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, ...overrides } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	render(PositionPanel, { context: new Map([[formContextKey, context]]) });
}

function requiredMarkIn(inputId: string): Element | null {
	return document.querySelector(`label[for="${inputId}"] [aria-label="Pflichtfeld"]`);
}

function ariaRequiredOf(inputId: string): string | null {
	return document.getElementById(inputId)?.getAttribute('aria-required') ?? null;
}

describe('PositionPanel — Pflicht-Markierung der Koordinaten', () => {
	it('markiert die Koordinaten, sobald eine Position vorliegt', async () => {
		renderPositionPanel({ hasPosition: true, latitude: 54.5, longitude: 13.5 });

		await expect.poll(() => document.getElementById('latitude'), { timeout: 5000 }).not.toBeNull();

		for (const inputId of ['latitude', 'longitude']) {
			expect(requiredMarkIn(inputId), `Sternchen an ${inputId}`).not.toBeNull();
			expect(ariaRequiredOf(inputId), `aria-required an ${inputId}`).toBe('true');
		}
	});

	/**
	 * Ohne Position ist die Ortsbeschreibung die Alternative — dann tragen die
	 * Koordinaten keine Pflicht, sondern `waterway` (siehe
	 * `LocationDescription.svelte.test.ts`).
	 *
	 * `toBeNull()` und nicht `.not.toBe('true')`: Im Nein-Fall soll das Attribut
	 * ganz fehlen statt als `aria-required="false"` dazustehen — so hält es
	 * `BaseInput.svelte` (`restProps.required || undefined`) für jedes andere
	 * Feld. Dieselbe Assertion wie in `LocationInput.svelte.test.ts`; eine
	 * laxere hier ließe die Verdrahtung ein `false` durchreichen, das die
	 * Komponententests längst verbieten.
	 */
	it('lässt die Koordinaten ohne Position unmarkiert', async () => {
		renderPositionPanel({ hasPosition: false, latitude: undefined, longitude: undefined });

		await expect.poll(() => document.getElementById('latitude'), { timeout: 5000 }).not.toBeNull();

		for (const inputId of ['latitude', 'longitude']) {
			expect(requiredMarkIn(inputId), `Sternchen an ${inputId}`).toBeNull();
			expect(ariaRequiredOf(inputId), `aria-required an ${inputId}`).toBeNull();
		}
	});
});
