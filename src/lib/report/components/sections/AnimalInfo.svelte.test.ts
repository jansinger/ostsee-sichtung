import { render } from 'vitest-browser-svelte';
import { describe, expect, it } from 'vitest';
import { createForm } from '$lib/form/createForm';
import { key as formContextKey } from '$lib/report/formContext';
import { initialFormState } from '$lib/report/formConfig';
import type { FormContext, SightingFormData } from '$lib/types';
import AnimalInfo from './AnimalInfo.svelte';

/**
 * PR 2, Teil a (docs/MEERESMUSEUM_FORMULAR_PLAN_2026-08-04.md): „Totfund erstmal
 * so lassen, aber prominenter platzieren" — `isDead` rückt an die erste Stelle
 * der Karte „Tierinformationen", der Totfund-Detailblock (`DeadAnimal`) folgt
 * unmittelbar darauf, statt am Ende der Karte zu stehen (heute: drei Felder von
 * seinem Auslöser entfernt).
 *
 * DOM-Reihenfolge statt Pixel-Position: `FormField` wraps jedes Feld in
 * `<div data-field={name}>` (siehe FormField.svelte:77) — dieselben Attribute,
 * die `e2e/form-ux.spec.ts` schon für die Sichtbarkeit abfragt
 * (`[data-field="deadCondition"]`). `querySelectorAll('[data-field]')` liefert
 * damit die tatsächliche Render-Reihenfolge ohne Layout-Messung; das ist
 * robuster als `compareDocumentPosition` an zwei Einzelknoten, weil es die
 * volle Kette auf einmal prüft und bei einer Regression eine lesbare
 * Namensliste statt einer Bitmaske liefert.
 */
function renderAnimalInfo(overrides: Partial<SightingFormData> = {}): void {
	const context = {
		...createForm<SightingFormData>({
			initialValues: { ...initialFormState, ...overrides } as SightingFormData,
			onSubmit: () => undefined
		}),
		mediaStore: { mediaFiles: [] }
	} as unknown as FormContext;

	render(AnimalInfo, { context: new Map([[formContextKey, context]]) });
}

function fieldOrder(): string[] {
	return Array.from(document.querySelectorAll<HTMLElement>('[data-field]')).map(
		(el) => el.dataset.field ?? ''
	);
}

describe('sections/AnimalInfo — Totfund prominent platziert (PR 2, Teil a)', () => {
	it('rendert isDead als allererstes Feld der Karte — auch ohne Totfund', () => {
		renderAnimalInfo({ isDead: false });

		expect(fieldOrder()[0]).toBe('isDead');
	});

	it('rendert isDead im DOM vor species', () => {
		renderAnimalInfo({ isDead: false });

		const order = fieldOrder();
		expect(order.indexOf('isDead')).toBeLessThan(order.indexOf('species'));
	});

	it('rendert bei isDead=true den Totfund-Detailblock unmittelbar nach dem Schalter', () => {
		renderAnimalInfo({ isDead: true, deadCondition: 1 });

		const order = fieldOrder();
		const isDeadIndex = order.indexOf('isDead');

		// "Unmittelbar" heißt: das direkt folgende Feld gehört zu DeadAnimal
		// (deadCondition ist dort das erste gerenderte Feld) — nicht species
		// oder totalCount, die heute dazwischenstehen.
		expect(order[isDeadIndex + 1]).toBe('deadCondition');
	});

	it('rendert den Totfund-Detailblock NICHT mehr am Ende der Karte', () => {
		renderAnimalInfo({ isDead: true, deadCondition: 1 });

		const order = fieldOrder();
		// deadPhoneContact ist das letzte Feld von DeadAnimal. Stünde der Block
		// weiterhin am Kartenende (heutiger Stand), kämen species/totalCount
		// VOR ihm. Nach der Umsortierung müssen sie NACH dem Block folgen.
		const lastDeadAnimalField = order.indexOf('deadPhoneContact');
		expect(order.indexOf('species')).toBeGreaterThan(lastDeadAnimalField);
		expect(order.indexOf('totalCount')).toBeGreaterThan(lastDeadAnimalField);
	});

	it('lässt species und die Zähler-Felder in ihrer bisherigen Reihenfolge', () => {
		renderAnimalInfo({ isDead: false });

		const order = fieldOrder();
		expect(order.indexOf('species')).toBeLessThan(order.indexOf('totalCount'));
		expect(order.indexOf('totalCount')).toBeLessThan(order.indexOf('juvenileCount'));
	});
});

/**
 * `adminMode` wird von `AnimalInfo` nur durchgereicht (PR 2, Teil b) — die
 * Fach-Entscheidung, ob `deadSex` erscheint, trifft `DeadAnimal` selbst
 * (siehe DeadAnimal.svelte.test.ts). Hier wird nur die Weitergabe geprüft,
 * analog zu OptionalSightingDetails.svelte.test.ts / Location.svelte.test.ts.
 */
describe('sections/AnimalInfo — adminMode wird an DeadAnimal durchgereicht', () => {
	function renderWithAdminMode(adminMode: boolean): void {
		const context = {
			...createForm<SightingFormData>({
				initialValues: { ...initialFormState, isDead: true, deadCondition: 1 } as SightingFormData,
				onSubmit: () => undefined
			}),
			mediaStore: { mediaFiles: [] }
		} as unknown as FormContext;

		render(AnimalInfo, { props: { adminMode }, context: new Map([[formContextKey, context]]) });
	}

	it('zeigt deadSex NICHT ohne adminMode', () => {
		renderWithAdminMode(false);

		expect(document.querySelector('[data-testid="field-deadSex"]')).toBeNull();
	});

	it('zeigt deadSex MIT adminMode={true}', () => {
		renderWithAdminMode(true);

		expect(document.querySelector('[data-testid="field-deadSex"]')).not.toBeNull();
	});
});
