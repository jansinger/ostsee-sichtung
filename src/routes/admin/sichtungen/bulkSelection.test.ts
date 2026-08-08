import { describe, expect, it } from 'vitest';
import { getHeaderState, isSameIdList, setAllSelected, toggleSelection } from './bulkSelection';

describe('bulkSelection — Auswahl in der Sichtungstabelle', () => {
	describe('toggleSelection', () => {
		it('nimmt eine noch nicht gewählte ID auf', () => {
			expect(toggleSelection([1, 2], 3)).toEqual([1, 2, 3]);
		});

		it('entfernt eine bereits gewählte ID', () => {
			expect(toggleSelection([1, 2, 3], 2)).toEqual([1, 3]);
		});

		it('lässt die Eingabe unangetastet (kein In-Place-Mutieren)', () => {
			const vorher = [1, 2];
			toggleSelection(vorher, 3);
			expect(vorher).toEqual([1, 2]);
		});
	});

	describe('setAllSelected', () => {
		it('wählt alle IDs der aktuellen Seite', () => {
			expect(setAllSelected([7, 8, 9], true)).toEqual([7, 8, 9]);
		});

		it('leert die Auswahl beim Abwählen', () => {
			expect(setAllSelected([7, 8, 9], false)).toEqual([]);
		});
	});

	describe('getHeaderState', () => {
		it('meldet „none" ohne Auswahl', () => {
			expect(getHeaderState([], [1, 2, 3])).toBe('none');
		});

		it('meldet „partial" bei Teilauswahl — der indeterminate-Zustand', () => {
			expect(getHeaderState([2], [1, 2, 3])).toBe('partial');
		});

		it('meldet „all", wenn alle sichtbaren Zeilen gewählt sind', () => {
			expect(getHeaderState([3, 1, 2], [1, 2, 3])).toBe('all');
		});

		/* Ohne Zeilen gibt es nichts zu wählen — eine Kopf-Checkbox, die „alle"
		   meldet, während die Tabelle leer ist, lädt zu einer Aktion über nichts ein. */
		it('meldet „none" bei leerer Seite', () => {
			expect(getHeaderState([], [])).toBe('none');
		});

		/* Auswahl aus einer früheren Seite darf „all" nicht auslösen: Sonst
		   verspräche die Kopf-Checkbox eine Vollauswahl, die Unsichtbares enthält. */
		it('ignoriert IDs, die nicht auf der Seite stehen', () => {
			expect(getHeaderState([1, 99], [1, 2])).toBe('partial');
		});
	});

	describe('isSameIdList', () => {
		it('erkennt dieselbe Liste', () => {
			expect(isSameIdList([1, 2, 3], [1, 2, 3])).toBe(true);
		});

		it('erkennt eine neue Seite (andere IDs)', () => {
			expect(isSameIdList([1, 2, 3], [4, 5, 6])).toBe(false);
		});

		it('erkennt eine geänderte Länge', () => {
			expect(isSameIdList([1, 2], [1, 2, 3])).toBe(false);
		});

		/* Sortierwechsel ist ein Datenwechsel: dieselben IDs in anderer Reihenfolge
		   heißt, dass der Nutzer eine andere Liste vor sich hat. */
		it('erkennt eine geänderte Reihenfolge', () => {
			expect(isSameIdList([1, 2, 3], [3, 2, 1])).toBe(false);
		});
	});
});
