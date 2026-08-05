import { describe, expect, it } from 'vitest';
import { detailsSectionTitle, observationQuestion, speciesQuestion } from './wording';

/**
 * Das Museum will für den Totfund eine eigene Ansprache („Was haben Sie
 * gefunden?", „Funddetails"). Die beiden getrennten Formulare, die das Dokument
 * dafür vorsieht, gibt es noch nicht — der Totfund-Schalter steht aber seit
 * PR 2 ganz oben auf Schritt 2, und alles darunter kann auf ihn reagieren.
 *
 * Die Entscheidung „welches Wort bei welchem Zustand" steht deshalb hier an
 * EINER Stelle und nicht als Ternär in drei Komponenten: Sie wird beim Bau der
 * getrennten Formulare wieder gebraucht, und drei Kopien würden bis dahin
 * auseinanderlaufen.
 */
describe('wording — Totfund-Ansprache auf Schritt 2', () => {
	describe('speciesQuestion', () => {
		it('fragt bei einer Sichtung nach dem, was gesehen wurde', () => {
			expect(speciesQuestion(false)).toBe('Welche Tierart haben Sie gesehen?');
		});

		it('fragt beim Totfund nach dem, was gefunden wurde', () => {
			expect(speciesQuestion(true)).toBe('Welche Tierart haben Sie gefunden?');
		});

		/**
		 * `'1'` ist der Wert, den die Datenbank und die Legacy-API für `isDead`
		 * liefern. `formConfig.ts`s `isDeadFinding` behandelt ihn als Totfund;
		 * die frühere, separate Kopie hier in `wording.ts` prüfte nur auf den
		 * String `'true'` und hätte `'1'` fälschlich als Sichtung gewertet —
		 * mit der Folge, dass das Formular die Verhaltensfelder ausblendet
		 * (`getFormSteps` in `formConfig.ts`), während die Überschrift hier
		 * weiterhin nach einer Sichtung fragt.
		 */
		it('behandelt den String "1" (DB-Wert) wie einen Totfund', () => {
			expect(speciesQuestion('1')).toBe('Welche Tierart haben Sie gefunden?');
		});
	});

	describe('observationQuestion', () => {
		it('fragt bei einer Sichtung nach der Beobachtung', () => {
			expect(observationQuestion(false)).toBe('Was haben Sie beobachtet?');
		});

		it('fragt beim Totfund nach dem Fund', () => {
			expect(observationQuestion(true)).toBe('Was haben Sie gefunden?');
		});
	});

	describe('detailsSectionTitle', () => {
		it('nennt die Karte bei einer Sichtung „Sichtungsdetails"', () => {
			expect(detailsSectionTitle(false)).toBe('Sichtungsdetails');
		});

		it('nennt die Karte beim Totfund „Funddetails"', () => {
			expect(detailsSectionTitle(true)).toBe('Funddetails');
		});
	});

	/**
	 * `isDead` ist im Schema `boolean().default(false)`. Für den Schalter selbst
	 * liefert `createForm.handleChange` einen echten Boolean (`target.checked`)
	 * — der String-Fall entsteht dort also nicht. `undefined` sehr wohl: die
	 * Admin-Maske füllt das Formular aus einem geladenen Datensatz.
	 *
	 * Die String-Werte stehen trotzdem in der Liste. Sie kosten nichts, und die
	 * Verwechslung ist in genau dieser Codebasis schon einmal teuer gewesen:
	 * `BaseRadio` verglich strikt gegen Zahlen, während im State der String aus
	 * dem DOM-Event lag — der Bootsantrieb ließ sich dadurch gar nicht auswählen
	 * (behoben in PR 4). Ein `if (isDead)` auf `"false"` wäre `true` und drehte
	 * die Ansprache um.
	 */
	describe('duldet die Werte, die tatsächlich im Formular-State stehen', () => {
		it.each([undefined, null, false, 'false', 0])('behandelt %o als Sichtung', (value) => {
			expect(observationQuestion(value)).toBe('Was haben Sie beobachtet?');
		});

		it.each([true, 'true', '1'])('behandelt %o als Totfund', (value) => {
			expect(observationQuestion(value)).toBe('Was haben Sie gefunden?');
		});
	});
});
