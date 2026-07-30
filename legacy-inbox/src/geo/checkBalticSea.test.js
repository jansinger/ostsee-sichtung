import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('checkBalticSea mit nicht ladbarem Index', () => {
	// Das Modul cached den Index als Singleton (Modul-Scope). Um einen kaputten
	// Index zu simulieren, ohne die 5 Tests oben zu beeinflussen, mocken wir
	// node:fs pro Test und laden das Modul mit vi.resetModules() frisch neu.
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.doUnmock('node:fs');
		vi.doUnmock('../logger.js');
	});

	async function ladeModulMitKaputtemIndex() {
		vi.doMock('node:fs', () => ({
			readFileSync: () => {
				throw new Error('Index-Datei ist kaputt');
			}
		}));
		return import('./checkBalticSea.js');
	}

	it('wirft nicht, sondern liefert ein Ergebnis', async () => {
		const { checkBalticSea: pruefen } = await ladeModulMitKaputtemIndex();
		expect(() => pruefen(10.5, 54.5)).not.toThrow();
	});

	it('inBaltic ist false, inChartArea bleibt die reale Bounding-Box-Antwort', async () => {
		const { checkBalticSea: pruefen } = await ladeModulMitKaputtemIndex();

		// Kieler Bucht — läge normalerweise in der Ostsee-Geometrie, aber ohne
		// Index kann das nicht geprüft werden → inBaltic false, inChartArea bleibt real.
		expect(pruefen(10.5, 54.5)).toEqual({ inBaltic: false, inChartArea: true });

		// Weit außerhalb des Kartenbereichs — inChartArea bleibt korrekt false.
		expect(pruefen(-70, 40)).toEqual({ inBaltic: false, inChartArea: false });
	});

	it('protokolliert den Ladefehler genau einmal, nicht pro Aufruf', async () => {
		const protokolliereMock = vi.fn();
		vi.doMock('../logger.js', () => ({ protokolliere: protokolliereMock }));
		const { checkBalticSea: pruefen } = await ladeModulMitKaputtemIndex();

		pruefen(10.5, 54.5);
		pruefen(10.6, 54.6);
		pruefen(-70, 40);

		expect(protokolliereMock).toHaveBeenCalledTimes(1);
		expect(protokolliereMock).toHaveBeenCalledWith(
			'fehler',
			expect.any(String),
			expect.objectContaining({ meldung: 'Index-Datei ist kaputt' })
		);
	});
});
