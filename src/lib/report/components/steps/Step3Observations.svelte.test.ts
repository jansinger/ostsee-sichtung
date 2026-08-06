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
 * dem Umzug nach `BoatInfo` — inzwischen, Task 12, weiter nach
 * `Environment.svelte`), die Karte selbst wurde aber unbedingt gerendert.
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

/**
 * Review-Befund zu Task 8: `getFormSteps` entfernt `behavior`/`behaviorText`/
 * `reaction` beim Totfund nur aus der Validierung (`stepValidation.ts` liest
 * ausschließlich daraus). Gerendert wurde die Karte „Verhalten der Tiere"
 * bislang unbedingt — ein Totfund-Melder sah die Fragen weiterhin, konnte sie
 * ausfüllen, und die Werte gingen unvalidiert ans Backend. Sichtbarkeit und
 * Validierung müssen dieselbe Bedingung teilen (`isDeadFinding($form.isDead)`),
 * sonst entsteht genau diese Lücke wieder — nur mit vertauschten Vorzeichen.
 */
describe('Step3Observations — Verhaltens-Karte folgt dem Totfund-Zweig', () => {
	it('blendet „Verhalten der Tiere" beim Totfund aus', () => {
		renderWithFormContext(Step3Observations, { overrides: { isDead: true } });

		expect(document.body.textContent).not.toContain('Verhalten der Tiere');
	});

	it('zeigt „Verhalten der Tiere" bei einer Lebendbeobachtung', () => {
		renderWithFormContext(Step3Observations, { overrides: { isDead: false } });

		expect(document.body.textContent).toContain('Verhalten der Tiere');
	});

	it('behält Umweltbedingungen und Bootsangaben, wenn die Verhaltens-Karte beim Totfund fehlt', () => {
		renderWithFormContext(Step3Observations, { overrides: { isDead: true } });

		const text = document.body.textContent ?? '';
		expect(text).toContain('Umweltbedingungen');
		expect(text).toContain('Boot-/Schiffsinformationen');
	});

	/**
	 * Abschlussreview (nicht blockierend): Der Einleitungssatz warb beim
	 * Totfund weiterhin mit „Verhaltensinformationen … helfen bei der
	 * Artbestimmung", obwohl die Karte direkt darunter fehlt — ein Versprechen,
	 * das der Schritt nicht einlöst. `step3ObservationsIntro` (`wording.ts`)
	 * hängt den Satz an denselben Zweig wie die Karte selbst.
	 */
	it('verspricht Verhaltensinformationen im Kopf nicht mehr, wenn die Karte beim Totfund fehlt', () => {
		renderWithFormContext(Step3Observations, { overrides: { isDead: true } });

		expect(document.body.textContent).not.toContain('Verhaltensinformationen');
	});
});
