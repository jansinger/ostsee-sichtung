import { describe, it, expect } from 'vitest';
import { checkBalticSea } from './checkBalticSea.js';

describe('checkBalticSea', () => {
	it('erkennt eine Position in der Ostsee', () => {
		// Kieler Bucht — offenes Wasser
		expect(checkBalticSea(10.5, 54.5)).toEqual({ inBaltic: true, inChartArea: true });
	});

	it('erkennt eine Position an Land im Kartenbereich', () => {
		// Beispiel aus dem PDF: location=53,10 → Raum Hamburg
		expect(checkBalticSea(10, 53)).toEqual({ inBaltic: false, inChartArea: true });
	});

	it('erkennt eine Position weit außerhalb', () => {
		expect(checkBalticSea(-70, 40)).toEqual({ inBaltic: false, inChartArea: false });
	});

	it('liefert bei NaN alles false, statt zu werfen', () => {
		expect(checkBalticSea(NaN, 54)).toEqual({ inBaltic: false, inChartArea: false });
	});

	it('liefert bei unmöglichen Koordinaten alles false', () => {
		expect(checkBalticSea(500, 500)).toEqual({ inBaltic: false, inChartArea: false });
	});
});
