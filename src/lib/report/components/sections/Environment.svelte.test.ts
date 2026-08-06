import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import Environment from './Environment.svelte';

/**
 * Task 12: `shipCount` fragt laut Schema nach der Anzahl ANDERER Schiffe in
 * näherer Umgebung — Störungskontext, wie Seegang, Sichtweite und
 * Windstärke. Fachlich gehört es deshalb zu „Umweltbedingungen", nicht zu
 * „Boot-/Schiffsinformationen" (das ANDERE, das eigene Wasserfahrzeug des
 * Melders betraf). Die Land-Ausblendung des vorigen Tasks hat die
 * Fehlplatzierung nur sichtbar gemacht: Für Land-Melder blieb in
 * `BoatInfo.svelte` eine Karte mit Titel „Boot-/Schiffsinformationen" und
 * Einleitung „Falls Sie von einem Boot aus beobachtet haben …" stehen, die
 * nur noch nach FREMDEN Schiffen fragte.
 *
 * `Environment` wird von der Admin-Maske mitgenutzt
 * (`AdminSightingEditForm.svelte`, `adminMode={true}`), die aber `shipCount`
 * bereits über `OptionalSightingDetails` admin-only zeigt (Begründung dort:
 * `BoatInfo` ist dort nicht eingebunden). Ein zweites `shipCount` in
 * `Environment` träfe im Admin-Formular auf dasselbe Feld ein zweites Mal —
 * die Admin-Maske darf sich laut Auftrag nicht ändern.
 */
describe('sections/Environment — shipCount als Störungskontext', () => {
	it('zeigt die Anzahl anderer Schiffe bei den Umweltbedingungen', async () => {
		renderWithFormContext(Environment, {});

		await expect
			.element(document.querySelector<HTMLElement>('[data-testid="field-shipCount"]'))
			.toBeInTheDocument();
	});

	it('zeigt shipCount nicht zusätzlich in der Admin-Maske — dort steht es bereits in OptionalSightingDetails', () => {
		renderWithFormContext(Environment, { props: { adminMode: true } });

		expect(document.querySelector<HTMLElement>('[data-testid="field-shipCount"]')).toBeNull();
	});
});
