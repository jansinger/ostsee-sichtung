import { describe, expect, it } from 'vitest';
import { getActiveFiltersDisplay } from './exportFilterDisplay';

describe('getActiveFiltersDisplay', () => {
	it('meldet ohne Filter „Keine Filter aktiv"', () => {
		expect(getActiveFiltersDisplay({})).toEqual(['Keine Filter aktiv']);
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
