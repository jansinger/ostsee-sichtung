import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import DeadAnimal from './DeadAnimal.svelte';

/**
 * `deadSex` (Geschlecht beim Totfund) verlässt das Meldeformular — das Museum hat
 * es am 2026-08-04 abbestellt (Analyse-Punkt C4,
 * docs/MEERESMUSEUM_FORMULAR_PLAN_2026-08-04.md, PR 2 Teil b). Anders als bei
 * `distribution`/`OptionalSightingDetails.svelte` bleiben die drei übrigen Felder
 * dieser Section (`deadCondition`, `deadSize`, `deadPhoneContact`) in **beiden**
 * Modi sichtbar — nur `deadSex` verschwindet ohne `adminMode`.
 *
 * `DeadAnimal` bekommt dafür wie `OptionalSightingDetails` eine `adminMode`-Prop
 * (Default `false`); `AnimalInfo` reicht sie durch, `AdminSightingEditForm.svelte`
 * setzt `adminMode={true}`.
 */
function renderDeadAnimal(props: { adminMode?: boolean } = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, isDead: true } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	// Sobald `context` mitgegeben wird, verlangt die Render-API die Props unter
	// dem `props`-Schlüssel — sonst gelten sie als unbekannte Svelte-Optionen.
	render(DeadAnimal, { props, context: new Map([[formContextKey, context]]) });
}

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('sections/DeadAnimal — Geschlecht nur im Admin-Modus', () => {
	it('zeigt das Geschlecht-Feld NICHT im Meldeformular (ohne adminMode)', () => {
		renderDeadAnimal();

		expect(field('deadSex')).toBeNull();
	});

	it('zeigt das Geschlecht-Feld in der Admin-Maske (adminMode)', () => {
		renderDeadAnimal({ adminMode: true });

		expect(field('deadSex')).not.toBeNull();
	});

	/**
	 * Abgrenzung zum Präzedenzfall PR #669 (siehe Location.svelte.test.ts,
	 * OptionalSightingDetails.svelte.test.ts): Dort verschwand ein Feld komplett
	 * hinter `adminMode`. Hier gilt das NUR für `deadSex` — die übrigen drei
	 * Felder der Section sind für Melder unverändert Pflicht bzw. sichtbar und
	 * dürfen durch die Prop nicht mitgenommen werden.
	 */
	it.each(['deadCondition', 'deadSize', 'deadPhoneContact'])(
		'zeigt %s weiterhin OHNE adminMode',
		(name) => {
			renderDeadAnimal();

			expect(field(name)).not.toBeNull();
		}
	);

	it.each(['deadCondition', 'deadSize', 'deadPhoneContact'])(
		'zeigt %s auch MIT adminMode',
		(name) => {
			renderDeadAnimal({ adminMode: true });

			expect(field(name)).not.toBeNull();
		}
	);
});
