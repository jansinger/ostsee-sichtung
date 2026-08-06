import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData } from '$lib/types';
import Step4Contact from './Step4Contact.svelte';

/**
 * Task 11: `shipNameConsent` fragt nach der Freigabe eines Schiffsnamens.
 * Bei einer Land-Meldung wird nie ein Schiffsname erhoben (`BoatInfo.svelte`
 * blendet `shipName` dort aus) — die Einwilligung dazu ist dann eine Frage
 * ohne Bezugsgegenstand.
 *
 * `Step4Contact` gehört ausschließlich dem Meldeformular (`ModernReportForm.svelte`)
 * — keine Admin-Nutzung, also kein `adminMode`-Zweig zu prüfen.
 */
function renderStep4(overrides: Partial<SightingFormData> = {}): void {
	renderWithFormContext(Step4Contact, { overrides });
}

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('Step4Contact — Einwilligung zum Schiffsnamen entfällt bei Land', () => {
	it('blendet shipNameConsent aus, wenn von Land gemeldet wird', () => {
		renderStep4({ sightingFrom: SightingFromEnum.LAND });

		expect(field('shipNameConsent')).toBeNull();
	});

	it('zeigt shipNameConsent, wenn von einem Boot gemeldet wird', () => {
		renderStep4({ sightingFrom: SightingFromEnum.SAILBOAT });

		expect(field('shipNameConsent')).not.toBeNull();
	});

	it('zeigt shipNameConsent bei „Sonstiges" — 0 ist Default UND „Sonstiges", nicht Land', () => {
		renderStep4({ sightingFrom: SightingFromEnum.OTHER });

		expect(field('shipNameConsent')).not.toBeNull();
	});

	// Gegenprobe: `nameConsent` betrifft den eigenen Namen, nicht das Boot —
	// bleibt unabhängig vom Beobachtungsort stehen.
	it('lässt nameConsent auch bei Land stehen', () => {
		renderStep4({ sightingFrom: SightingFromEnum.LAND });

		expect(field('nameConsent')).not.toBeNull();
	});
});

/**
 * Task 14: `mediaConsent` steht seit dem 2026-08-05 hier bei den übrigen
 * Einwilligungen, nicht mehr bei der Dropzone auf Schritt 2 —
 * `sections/Media.svelte.test.ts` deckt ab, dass es dort im öffentlichen
 * Formular nicht mehr rendert. Anders als `shipNameConsent` hängt es hier an
 * keiner Bedingung; das Ausblenden ohne vorliegende Aufnahme ist Task 15.
 */
describe('Step4Contact — Medien-Einwilligung bei den übrigen Einwilligungen (Task 14)', () => {
	it('rendert mediaConsent', () => {
		renderStep4();

		expect(field('mediaConsent')).not.toBeNull();
	});

	it('rendert mediaConsent bedienbar — anders als in der Admin-Maske ist hier nichts gesperrt', () => {
		renderStep4();

		const input = document.querySelector<HTMLInputElement>('[data-testid="field-mediaConsent"]');
		expect(input?.disabled).toBe(false);
	});
});
