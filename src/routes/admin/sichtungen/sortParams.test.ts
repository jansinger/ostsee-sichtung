import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ORDER,
	DEFAULT_SORT,
	SORTABLE_COLUMNS,
	naechsteRichtung,
	resolveSort
} from './sortParams';

describe('Sortierung der Sichtungstabelle', () => {
	it('liefert ohne Parameter die Vorgabe des Loaders', () => {
		// Der Kern des Befunds: Beim ersten Aufruf steht kein `sort` in der URL,
		// die Liste ist aber sortiert. Wer hier `null` zurückgibt, kann am
		// Spaltenkopf nichts anzeigen.
		expect(resolveSort(new URLSearchParams())).toEqual({
			column: DEFAULT_SORT,
			order: DEFAULT_ORDER
		});
	});

	it('übernimmt eine gültige Spalte samt Richtung aus der URL', () => {
		expect(resolveSort(new URLSearchParams('sort=species&order=asc'))).toEqual({
			column: 'species',
			order: 'asc'
		});
	});

	it('fällt bei unbekannter Spalte auf die Vorgabe zurück — wie der Loader', () => {
		// `+page.server.ts` kennt nur die Spalten aus SORTABLE_COLUMNS und
		// sortiert sonst nach Sichtungsdatum. Ein Kopf, der bei `sort=quatsch`
		// einen Pfeil an einer beliebigen Spalte zeigte, behauptete eine
		// Sortierung, nach der gar nicht sortiert wurde.
		expect(resolveSort(new URLSearchParams('sort=quatsch&order=asc')).column).toBe(DEFAULT_SORT);
	});

	it('fällt bei unbekannter Richtung auf die Vorgabe zurück', () => {
		expect(resolveSort(new URLSearchParams('sort=species&order=seitwaerts')).order).toBe(
			DEFAULT_ORDER
		);
	});

	it('dreht die Richtung nur an der aktiven Spalte um', () => {
		const aktiv = { column: 'species', order: 'asc' } as const;

		expect(naechsteRichtung(aktiv, 'species')).toBe('desc');
		expect(naechsteRichtung({ column: 'species', order: 'desc' }, 'species')).toBe('asc');
		// Eine andere Spalte startet aufsteigend, egal wie die aktive steht.
		expect(naechsteRichtung(aktiv, 'created')).toBe('asc');
	});

	it('führt jede sortierbare Spalte genau einmal', () => {
		expect(new Set(SORTABLE_COLUMNS).size).toBe(SORTABLE_COLUMNS.length);
	});
});
