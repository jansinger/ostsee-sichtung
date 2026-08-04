import { describe, expect, it } from 'vitest';
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';
import type { SightingFormData } from '$lib/types';
import Step2SightingDetails from './Step2SightingDetails.svelte';

/**
 * Zwei Wünsche des Museums treffen sich auf diesem Schritt:
 *
 * 1. **Der Medien-Upload gehört hierher, vor die Tierangaben.** Er stand auf
 *    Schritt 3 unter dem prominenten „Schritt überspringen"-Knopf — wer den
 *    nutzte, sah die Foto-Frage nie. Und wer unsicher ist, welche Art er
 *    gesehen hat, soll das Bild hochladen können, bevor er sich auf eine Art
 *    festlegt.
 * 2. **Beim Totfund fragt der Kopf nach einem Fund, nicht nach einer
 *    Beobachtung.** Die Entscheidung dazu steht in `$lib/report/wording`.
 */
function renderStep2(overrides: Partial<SightingFormData> = {}): void {
	renderWithFormContext(Step2SightingDetails, { overrides });
}

/**
 * Render-Reihenfolge über `[data-field]` statt über Pixel — dieselbe Technik
 * wie in `sections/AnimalInfo.svelte.test.ts`, samt lesbarer Namensliste bei
 * einer Regression.
 */
function fieldOrder(): string[] {
	return Array.from(document.querySelectorAll<HTMLElement>('[data-field]')).map(
		(el) => el.dataset.field ?? ''
	);
}

describe('Step2SightingDetails — Medien-Upload vor den Tierangaben', () => {
	it('rendert die Medien-Einwilligung im DOM vor der Artauswahl', () => {
		renderStep2();

		const order = fieldOrder();
		expect(order.indexOf('mediaConsent')).toBeGreaterThanOrEqual(0);
		expect(order.indexOf('species')).toBeGreaterThanOrEqual(0);
		expect(order.indexOf('mediaConsent')).toBeLessThan(order.indexOf('species'));
	});

	it('kündigt den Upload als optional an — der Schritt selbst ist Pflicht', () => {
		renderStep2();

		expect(document.body.textContent).toContain('Fotos/Videos hochladen (optional)');
	});
});

describe('Step2SightingDetails — Ansprache bei Sichtung und Totfund', () => {
	it('fragt bei einer Sichtung nach der Beobachtung', () => {
		renderStep2({ isDead: false });

		expect(document.body.textContent).toContain('Was haben Sie beobachtet?');
	});

	it('fragt beim Totfund nach dem Fund', () => {
		renderStep2({ isDead: true, deadCondition: 1 });

		expect(document.body.textContent).toContain('Was haben Sie gefunden?');
		expect(document.body.textContent).not.toContain('Was haben Sie beobachtet?');
	});

	// Der Rest des Einleitungstextes ist für beide Fälle richtig und bleibt
	// unverändert — er nennt Tierart und Anzahl, nicht den Vorgang.
	it('behält den Hinweis auf Tierart und Anzahl in beiden Fällen', () => {
		renderStep2({ isDead: true, deadCondition: 1 });

		expect(document.body.textContent).toContain('Tierart und Anzahl');
	});
});
