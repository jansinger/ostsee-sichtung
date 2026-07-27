import { describe, expect, it } from 'vitest';
import { derivePositionMethod } from './positionMethod';

/**
 * Regressionstest für U10: Nach einem Reload aus der Session wiederhergestellte
 * Formulardaten sollen die initiale Positionsmethode bestimmen, statt immer
 * hart auf "Foto mit GPS" zu starten.
 */
describe('derivePositionMethod', () => {
	it('liefert "photo" für ein komplett leeres Formular', () => {
		expect(derivePositionMethod({})).toBe('photo');
	});

	it('liefert "map" wenn Breiten- und Längengrad als Zahlen vorliegen', () => {
		expect(derivePositionMethod({ latitude: 54.5, longitude: 13.2 })).toBe('map');
	});

	it('liefert "map" wenn Koordinaten als Strings vorliegen (z.B. aus EXIF/handleChange)', () => {
		expect(derivePositionMethod({ latitude: '54.5000', longitude: '13.2000' })).toBe('map');
	});

	it('liefert "manual" wenn kein GPS, aber das Fahrwasser ausgefüllt ist', () => {
		expect(derivePositionMethod({ waterway: 'Kieler Bucht' })).toBe('manual');
	});

	it('liefert "manual" wenn kein GPS, aber das Seezeichen ausgefüllt ist', () => {
		expect(derivePositionMethod({ seaMark: 'Leuchtturm Dahmeshöved' })).toBe('manual');
	});

	it('ignoriert reine Whitespace-Werte bei Fahrwasser/Seezeichen', () => {
		expect(derivePositionMethod({ waterway: '   ', seaMark: '\t' })).toBe('photo');
	});

	it('bevorzugt "map" gegenüber vorhandenem Fahrwasser, wenn beides gesetzt ist', () => {
		expect(
			derivePositionMethod({ latitude: 54.5, longitude: 13.2, waterway: 'Kieler Bucht' })
		).toBe('map');
	});

	it('liefert "photo" wenn nur eine der beiden Koordinaten vorhanden ist', () => {
		expect(derivePositionMethod({ latitude: 54.5 })).toBe('photo');
		expect(derivePositionMethod({ longitude: 13.2 })).toBe('photo');
	});

	it('ignoriert ungültige (nicht-numerische) Koordinaten-Strings', () => {
		expect(derivePositionMethod({ latitude: 'abc', longitude: 'def' })).toBe('photo');
	});

	it('ignoriert nicht-string Werte bei Fahrwasser/Seezeichen', () => {
		expect(derivePositionMethod({ waterway: undefined, seaMark: null })).toBe('photo');
	});
});
