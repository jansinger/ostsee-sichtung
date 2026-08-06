import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData } from '$lib/types';
import Behavior from './Behavior.svelte';

/**
 * Task 11: „Reaktion auf Ihr Boot" ist für einen Landbeobachter unbeantwortbar
 * — er hat kein Boot, auf das die Tiere reagieren könnten. `behavior`/
 * `behaviorText` bleiben stehen: Sie fragen nach dem Verhalten der Tiere
 * allgemein, nicht nach der Reaktion auf ein Wasserfahrzeug.
 *
 * `Behavior` wird von der Admin-Maske mitgenutzt (`AdminSightingEditForm.svelte`,
 * `adminMode={true}`) — die Bedingung greift deshalb nur außerhalb des
 * Admin-Modus, sonst verlöre die Sachbearbeitung die Möglichkeit, `reaction`
 * an einem Altbestands-Datensatz mit `vonwo = Land` zu korrigieren.
 */
function renderBehavior(
	overrides: Partial<SightingFormData> = {},
	props: { adminMode?: boolean } = {}
): void {
	renderWithFormContext(Behavior, { overrides, props });
}

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('sections/Behavior — Reaktion aufs Boot entfällt bei Land', () => {
	it('blendet reaction aus, wenn von Land gemeldet wird', () => {
		renderBehavior({ sightingFrom: SightingFromEnum.LAND });

		expect(field('reaction')).toBeNull();
	});

	it('zeigt reaction, wenn von einem Boot gemeldet wird', () => {
		renderBehavior({ sightingFrom: SightingFromEnum.SAILBOAT });

		expect(field('reaction')).not.toBeNull();
	});

	it('zeigt reaction bei „Sonstiges" — 0 ist Default UND „Sonstiges", nicht Land', () => {
		renderBehavior({ sightingFrom: SightingFromEnum.OTHER });

		expect(field('reaction')).not.toBeNull();
	});

	it('lässt behavior und behaviorText auch bei Land stehen', () => {
		renderBehavior({ sightingFrom: SightingFromEnum.LAND, behavior: 1 });

		expect(field('behavior')).not.toBeNull();
	});

	// Gegenprobe: Die Admin-Maske editiert auch Land-Altbestand mit `reaction`
	// (813 Bestandszeilen, siehe Behavior.svelte). Die Bedingung darf ihr das
	// Feld nicht nehmen.
	it('zeigt reaction in der Admin-Maske trotz Land', () => {
		renderBehavior({ sightingFrom: SightingFromEnum.LAND }, { adminMode: true });

		expect(field('reaction')).not.toBeNull();
	});
});
