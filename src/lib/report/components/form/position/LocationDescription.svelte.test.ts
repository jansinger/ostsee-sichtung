import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { flushSync, tick } from 'svelte';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import LocationDescription from './LocationDescription.svelte';

/**
 * Der Block darf die Felder, in denen gerade getippt wird, nicht neu aufbauen.
 *
 * Vorher rendert die Komponente `waterway`/`seaMark` in zwei Zweigen eines
 * `{#if collapsed}` — und `collapsed` hängt an genau diesen Feldern. Der erste
 * Tastendruck, der `waterway` füllt, riss deshalb den gesamten Teilbaum ab: Das
 * gerade fokussierte Feld wurde ersetzt, `document.activeElement` fiel auf
 * `<body>` zurück und der nächste Tab begann wieder oben auf der Seite.
 */
function renderWithForm(overrides: Partial<SightingFormData> = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, ...overrides } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	render(LocationDescription, { context: new Map([[formContextKey, context]]) });
}

function field(name: string): HTMLInputElement {
	const element = document.querySelector<HTMLInputElement>(`[data-testid="field-${name}"]`);
	if (!element) throw new Error(`Feld "${name}" nicht im DOM`);
	return element;
}

function block(): HTMLDetailsElement {
	const element = document.querySelector<HTMLDetailsElement>(
		'[data-testid="location-description"]'
	);
	if (!element) throw new Error('Ortsbeschreibung nicht im DOM');
	return element;
}

/** Simuliert das `change`-Ereignis, das der Browser beim Verlassen des Feldes feuert. */
async function fireChange(input: HTMLInputElement, value: string): Promise<void> {
	input.value = value;
	input.dispatchEvent(new Event('change', { bubbles: true }));
	flushSync();
	await tick();
}

const WITH_COORDINATES: Partial<SightingFormData> = {
	latitude: 54.5,
	longitude: 13.5,
	hasPosition: true,
	waterway: '',
	seaMark: ''
};

describe('LocationDescription', () => {
	it('behält Fokus und Feld-Knoten, wenn waterway seinen ersten Wert bekommt', async () => {
		renderWithForm(WITH_COORDINATES);

		// Nutzer klappt den Block auf und tippt — genau der Pfad, der vorher brach.
		block().open = true;
		await tick();

		const seaMarkBefore = field('seaMark');
		seaMarkBefore.focus();
		expect(document.activeElement).toBe(seaMarkBefore);

		await fireChange(field('waterway'), 'Kieler Bucht');

		expect(document.activeElement).toBe(seaMarkBefore);
		expect(field('seaMark')).toBe(seaMarkBefore);
	});

	it('verliert den getippten Text nicht, wenn waterway wieder geleert wird', async () => {
		renderWithForm(WITH_COORDINATES);

		block().open = true;
		await tick();

		const waterwayBefore = field('waterway');
		await fireChange(waterwayBefore, 'Kieler Bucht');
		await fireChange(waterwayBefore, '');

		// Derselbe Knoten, und der Block bleibt offen — kein Zuklappen mitten im Tippen.
		expect(field('waterway')).toBe(waterwayBefore);
		expect(block().open).toBe(true);
	});

	it('ist ohne Koordinaten von Anfang an offen', async () => {
		renderWithForm({ latitude: undefined, longitude: undefined, waterway: '', seaMark: '' });

		expect(block().open).toBe(true);
	});

	it('startet mit Koordinaten und leeren Feldern zugeklappt, bleibt aber erreichbar', async () => {
		renderWithForm(WITH_COORDINATES);

		expect(block().open).toBe(false);
		// `PositionPanel.focusDescription()` klappt Vorfahren-<details> imperativ auf.
		// Das funktioniert nur, solange hier kein `bind:open` dagegenhält.
		block().open = true;
		await tick();
		field('waterway').focus();
		expect(document.activeElement).toBe(field('waterway'));
	});
});
