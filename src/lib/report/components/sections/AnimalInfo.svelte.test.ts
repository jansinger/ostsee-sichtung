import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
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
	renderWithFormContext(AnimalInfo, { overrides });
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
 * „Welche Tierart haben Sie gefunden?" — Wunsch des Museums für den Totfund.
 * Das Artfeld liegt in derselben Karte wie der Totfund-Schalter und kann ihm
 * deshalb folgen; die Zuordnung selbst steht in `$lib/report/wording`.
 *
 * Geprüft wird das gerenderte `<label>`, nicht das Schema-`.label()`: Der
 * Wortlaut kommt hier über den `label`-Override an `FormField` (derselbe Weg,
 * den PR 4 für den Bootsantrieb gebaut hat), das Schema bleibt unverändert.
 */
describe('sections/AnimalInfo — Artfrage folgt dem Totfund-Schalter', () => {
	function speciesLabel(): string {
		const field = document.querySelector<HTMLElement>('[data-field="species"]');
		if (!field) throw new Error('Feld "species" nicht im DOM');
		return field.querySelector('label')?.textContent ?? '';
	}

	it('fragt bei einer Sichtung, was gesehen wurde', () => {
		renderAnimalInfo({ isDead: false });

		expect(speciesLabel()).toContain('Welche Tierart haben Sie gesehen?');
	});

	it('fragt beim Totfund, was gefunden wurde', () => {
		renderAnimalInfo({ isDead: true, deadCondition: 1 });

		expect(speciesLabel()).toContain('Welche Tierart haben Sie gefunden?');
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
		renderWithFormContext(AnimalInfo, {
			overrides: { isDead: true, deadCondition: 1 },
			props: { adminMode }
		});
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
