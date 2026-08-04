import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import Step3Observations from './Step3Observations.svelte';

/**
 * Die Gegenprobe zu `Step2SightingDetails.svelte.test.ts`: Was auf Schritt 2
 * angekommen ist, darf auf Schritt 3 nicht zusätzlich stehen.
 *
 * Der Einleitungstext gehört mit umgezogen. Er warb für „Verhaltensinformationen,
 * Umweltbedingungen und **Fotos/Videos**" — eine Aufzählung dessen, was der
 * Schritt enthält. Bliebe der Halbsatz stehen, verspräche der Kopf etwas, das
 * einen Schritt weiter vorne liegt, und das ausgerechnet direkt über dem
 * „Schritt überspringen"-Knopf.
 */
function renderStep3(): void {
	renderWithFormContext(Step3Observations);
}

describe('Step3Observations — Medien sind auf Schritt 2 gewandert', () => {
	it('rendert die Medien-Einwilligung nicht mehr', () => {
		renderStep3();

		expect(document.querySelector('[data-field="mediaConsent"]')).toBeNull();
	});

	it('nennt Fotos/Videos nicht mehr in der Einleitung', () => {
		renderStep3();

		expect(document.body.textContent).not.toContain('Fotos/Videos');
	});

	// Gegenprobe: Der Schritt behält, was ihn ausmacht — sonst prüfte der Test
	// oben nur, dass die Komponente überhaupt nichts rendert.
	it('wirbt weiterhin mit Verhalten und Umweltbedingungen', () => {
		renderStep3();

		const text = document.body.textContent ?? '';
		expect(text).toContain('Verhaltensinformationen');
		expect(text).toContain('Umweltbedingungen');
	});
});

/**
 * Die Karte „Weitere Sichtungsdetails" stand im Meldeformular leer da: Beide
 * Felder sind `adminMode`-only (`distribution` seit PR #746, `shipCount` seit
 * dem Umzug nach `BoatInfo`), die Karte selbst wurde aber unbedingt gerendert.
 *
 * Der Test sitzt bewusst **auch** hier und nicht nur an der Sektion selbst: Die
 * Sektion schützt sich inzwischen zwar selbst, aber der Fehler war ein Fehler
 * der Einbindung — Schritt 3 hat eine Komponente gerendert, die für ihn nichts
 * mehr zu zeigen hatte.
 */
describe('Step3Observations — keine leere Sichtungsdetail-Karte', () => {
	it('zeigt die Karte „Weitere Sichtungsdetails" nicht mehr', () => {
		renderStep3();

		expect(document.body.textContent).not.toContain('Weitere Sichtungsdetails');
	});
});
