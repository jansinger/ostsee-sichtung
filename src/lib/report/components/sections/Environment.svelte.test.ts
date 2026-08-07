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
/**
 * DOM-Reihenfolge statt Pixel-Position: `FormField` wrapt jedes Feld in
 * `<div data-field={name}>`. `querySelectorAll('[data-field]')` liefert damit
 * die tatsächliche Render-Reihenfolge und bei einer Regression eine lesbare
 * Namensliste (Präzedenz: `AnimalInfo.svelte.test.ts`).
 */
function fieldOrder(): string[] {
	return Array.from(document.querySelectorAll<HTMLElement>('[data-field]')).map(
		(el) => el.dataset.field ?? ''
	);
}

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

/**
 * Die Karte kündigt oben an: „Sobald Position und Datum gesetzt sind, werden
 * Wetterdaten automatisch vorgeschlagen." `shipCount` ist das einzige Feld
 * darin, das der Wetter-Abruf NIE füllt — an erster Stelle direkt unter diesem
 * Satz las es sich für den Melder wie ein Wetterfeld. Es gehört deshalb hinter
 * `windForce`, also ans Ende der vom Abruf befüllten Felder.
 *
 * Die Liste in `formConfig.ts` (Schritt `observations`) muss dieselbe
 * Reihenfolge tragen — `scrollToFirstError` läuft sie ab, um zum ersten
 * fehlerhaften Feld zu springen. Geprüft wird das in `formConfig.test.ts`;
 * hier zählt, was der Melder wirklich sieht.
 */
describe('sections/Environment — Feldreihenfolge in der Karte', () => {
	it('stellt shipCount hinter die vom Wetter-Abruf befüllten Felder', () => {
		renderWithFormContext(Environment, {});

		expect(fieldOrder()).toEqual(['seaState', 'visibility', 'windForce', 'shipCount']);
	});

	// Gegenprobe: Die Admin-Maske bindet dieselbe Komponente ein und darf sich
	// laut Auftrag nicht verändern. Sie zeigt `shipCount` über
	// `OptionalSightingDetails` und dafür zusätzlich `windDirection`.
	it('lässt die Admin-Reihenfolge unverändert', () => {
		renderWithFormContext(Environment, { props: { adminMode: true } });

		expect(fieldOrder()).toEqual(['seaState', 'visibility', 'windForce', 'windDirection']);
	});
});
