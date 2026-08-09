import { describe, expect, it } from 'vitest';
import { toStoredIndicators } from './spam';

/**
 * `spam_indicators` ist untypisiertes `jsonb`. Die Spalte wird heute
 * ausschließlich aus `SpamCheckResult.indicators` befüllt und trägt damit immer
 * Strings — nachweisen lässt sich das beim Lesen aber nicht, und ein
 * `as string[]` ist genau die Behauptung, die keiner prüft.
 *
 * Der Helfer macht die Zusage der API (`items: { type: string }`) unabhängig
 * vom Spalteninhalt wahr, statt sie zu behaupten.
 */
describe('toStoredIndicators', () => {
	it('gibt eine Liste von Strings unverändert zurück', () => {
		const indikatoren = ['Formular verdächtig schnell abgeschickt', 'Spam-Keywords gefunden: win'];
		expect(toStoredIndicators(indikatoren)).toEqual(indikatoren);
	});

	it('wirft Nicht-Strings aus einem gemischten Array', () => {
		// Der Fall, den `Array.isArray` allein durchgehen lässt: Der Container
		// stimmt, der Inhalt nicht — die Antwort verletzte dann ihr eigenes Schema.
		expect(toStoredIndicators(['echt', 42, null, { text: 'x' }, ['y'], 'auch echt'])).toEqual([
			'echt',
			'auch echt'
		]);
	});

	it('liefert für alles, was kein Array ist, eine leere Liste', () => {
		for (const wert of [null, undefined, 'string', 7, { kaputt: true }]) {
			expect(toStoredIndicators(wert)).toEqual([]);
		}
	});

	it('reicht kein leeres Ergebnis als „keine Indikatoren" durch, das der Score wäre', () => {
		/* Bewusst festgehalten: Der Helfer sagt nur etwas über die Indikatorliste.
		   Ein unbrauchbarer Spaltenwert darf den **Score** nicht mitreißen — der
		   ist eine eigene Spalte und bleibt gültig (Zusicherung dazu steht im
		   Endpunkt-Test). */
		expect(toStoredIndicators({ kaputt: true })).toEqual([]);
	});
});
