import { describe, expect, it } from 'vitest';
import { formatWallClockDateTime } from '$lib/utils/format/formatWallClockDateTime';
import { getActiveFiltersDisplay } from './exportFilterDisplay';

describe('getActiveFiltersDisplay', () => {
	it('meldet ohne Filter „Keine Filter aktiv"', () => {
		expect(getActiveFiltersDisplay({})).toEqual(['Keine Filter aktiv']);
	});

	// WP4: „Von"/„Bis" nannten kein Bezugsfeld. Der Export-Dialog beschreibt
	// dieselben Filter wie das Panel und Filter-Chips (+page.svelte,
	// filterChips.ts) und muss deshalb dasselbe Wort benutzen —
	// „Sichtung von"/„Sichtung bis", da der Bereich serverseitig das
	// Sichtungsdatum filtert (`sightingCalendarDate`).
	it('benennt den Datumsfilter nach dem Sichtungsdatum', () => {
		expect(getActiveFiltersDisplay({ fromDate: '2026-06-01' })).toEqual([
			`Sichtung von: ${formatWallClockDateTime('2026-06-01')}`
		]);
		expect(getActiveFiltersDisplay({ toDate: '2026-06-30' })).toEqual([
			`Sichtung bis: ${formatWallClockDateTime('2026-06-30')}`
		]);
	});

	it('zeigt den Suchbegriff an', () => {
		// Der Export erbt die Suche der Tabelle (exportFilterParams.ts). Fehlte
		// sie hier, versprächen die Badges eine größere Menge als die Datei
		// enthält — dieselbe Falle wie bei balticSea und deadFinding.
		expect(getActiveFiltersDisplay({ q: 'müller' })).toContain('Suche: „müller"');
	});

	it('ignoriert einen leeren Suchbegriff', () => {
		expect(getActiveFiltersDisplay({ q: '   ' })).toEqual(['Keine Filter aktiv']);
	});

	it('zeigt die Suche neben anderen aktiven Filtern', () => {
		const anzeige = getActiveFiltersDisplay({
			q: 'ostsee',
			verified: 'approved',
			deadFinding: '1'
		});

		expect(anzeige).toContain('Suche: „ostsee"');
		expect(anzeige).toContain('Nur freigegebene Sichtungen');
		expect(anzeige).toHaveLength(3);
	});
});
