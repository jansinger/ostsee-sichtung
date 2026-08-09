import { describe, expect, it } from 'vitest';
import { paginationControls } from './paginationControls';

/**
 * paginationControls.test.ts — der Leerfall der Paginierung.
 *
 * **Der Befund.** `totalPages` kommt aus `Math.ceil(count / perPage)` und ist
 * bei null Treffern **0**. Daraus folgten im Markup zwei Fehler auf einmal:
 * Die Anzeige las „1 / 0", und die Sperre der Vorwärts-Schaltflächen prüfte
 * `page === totalPages`, also `1 === 0` — sie war damit **falsch** und ließ
 * „Nächste Seite" und „Letzte Seite" auf einer leeren Trefferliste bedienbar.
 * Ein Klick führte auf Seite 2 bzw. Seite 0, beides wieder leer.
 *
 * Die Rechnung liegt deshalb hier und nicht als Ausdruck im Template: Der
 * Leerfall ist genau der, den man beim Bauen nicht vor sich hat.
 */
describe('paginationControls', () => {
	it('meldet bei null Treffern eine Seite und sperrt in beide Richtungen', () => {
		expect(paginationControls(1, 0)).toEqual({ totalPages: 1, atFirst: true, atLast: true });
	});

	it('sperrt bei genau einer Seite ebenfalls beide Richtungen', () => {
		expect(paginationControls(1, 1)).toEqual({ totalPages: 1, atFirst: true, atLast: true });
	});

	it('gibt auf der ersten von mehreren Seiten nur den Rückweg frei', () => {
		expect(paginationControls(1, 5)).toEqual({ totalPages: 5, atFirst: true, atLast: false });
	});

	it('gibt in der Mitte beide Richtungen frei', () => {
		expect(paginationControls(3, 5)).toEqual({ totalPages: 5, atFirst: false, atLast: false });
	});

	it('sperrt auf der letzten Seite den Vorwärtsweg', () => {
		expect(paginationControls(5, 5)).toEqual({ totalPages: 5, atFirst: false, atLast: true });
	});

	/*
	 * Eine Seitenzahl jenseits des Bestands ist über die Adresszeile herstellbar
	 * (`?page=99`) und überlebt einen Filterwechsel, der die Treffermenge
	 * schrumpfen lässt. Sie darf nicht dazu führen, dass der Rückweg gesperrt
	 * ist — sonst säße man auf einer leeren Seite fest.
	 */
	it('lässt den Rückweg offen, wenn die Seitenzahl über dem Bestand liegt', () => {
		expect(paginationControls(99, 5)).toEqual({ totalPages: 5, atFirst: false, atLast: true });
	});
});
