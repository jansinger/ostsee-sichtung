import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import type { SightingFormData } from '$lib/types';
import BoatInfo from './BoatInfo.svelte';

/**
 * Task 11: Wer ausdrücklich „Land" als Beobachtungsort meldet, bekommt keine
 * Fragen zum eigenen Boot mehr gestellt — `shipName`, `homePort` und `boatType`
 * betreffen ein Wasserfahrzeug, das ein Landbeobachter nicht hat.
 *
 * `shipCount` bleibt stehen: Es fragt nach ANDEREN Schiffen in der Umgebung
 * (Störungskontext), das ist auch von Land aus zu beobachten. Ein Folge-Task
 * verschiebt `shipCount` fachlich in die Umweltbedingungen — hier nicht
 * vorweggenommen.
 *
 * `BoatInfo` wird ausschließlich vom Meldeformular eingebunden
 * (`Step3Observations.svelte`), nicht von der Admin-Maske — anders als
 * `SightingDetails`/`Behavior` gibt es hier keinen `adminMode`-Zweig zu prüfen.
 */
function renderBoatInfo(overrides: Partial<SightingFormData> = {}): void {
	renderWithFormContext(BoatInfo, { overrides });
}

function field(name: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-testid="field-${name}"]`);
}

describe('sections/BoatInfo — Bootsfelder entfallen bei Land', () => {
	it.each(['shipName', 'homePort', 'boatType'])(
		'blendet %s aus, wenn von Land gemeldet wird',
		(name) => {
			renderBoatInfo({ sightingFrom: SightingFromEnum.LAND });

			expect(field(name)).toBeNull();
		}
	);

	it.each(['shipName', 'homePort', 'boatType'])(
		'zeigt %s, wenn von einem Boot gemeldet wird',
		(name) => {
			renderBoatInfo({ sightingFrom: SightingFromEnum.SAILBOAT });

			expect(field(name)).not.toBeNull();
		}
	);

	it.each(['shipName', 'homePort', 'boatType'])(
		'zeigt %s bei „Sonstiges" — 0 ist Default UND „Sonstiges", nicht Land',
		(name) => {
			renderBoatInfo({ sightingFrom: SightingFromEnum.OTHER });

			expect(field(name)).not.toBeNull();
		}
	);

	it('lässt shipCount auch bei Land stehen — es fragt nach ANDEREN Schiffen', () => {
		renderBoatInfo({ sightingFrom: SightingFromEnum.LAND });

		expect(field('shipCount')).not.toBeNull();
	});
});
