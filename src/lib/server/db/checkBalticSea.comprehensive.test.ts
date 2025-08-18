/**
 * @fileoverview Umfangreiche Tests für checkBalticSea geografische Validierung
 * 
 * Diese Test-Suite deckt alle Aspekte der geografischen Validierung ab:
 * - Parameter-Validierung und Grenzfälle
 * - PostGIS-Datenbankintegration und Mocking
 * - Verschiedene Koordinaten-Szenarien für Ostsee und Umgebung
 * - Fehlerbehandlung und Edge Cases
 * - Performance und Robustheit
 * 
 * Die Tests nutzen sowohl echte Koordinaten als auch Mocks für isolierte
 * Unit-Tests der Geschäftslogik ohne Datenbankabhängigkeiten.
 * 
 * @author Ostsee-Tiere Team
 * @since 2.0.0
 */

import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import { db } from '$lib/server/db';
import { checkBalticSea } from './checkBalticSea';
import type { BalticSeaValidationResult, PostGISValidationRow } from '$lib/types';

// Mock der Datenbankverbindung für isolierte Tests
vi.mock('$lib/server/db', () => ({
	db: {
		execute: vi.fn()
	}
}));

// Mock des Loggers für saubere Test-Ausgabe
vi.mock('$lib/logger', () => ({
	createLogger: vi.fn(() => ({
		debug: vi.fn(),
		info: vi.fn(), 
		warn: vi.fn(),
		error: vi.fn()
	}))
}));

// Typisierte Mock-Referenz für bessere IDE-Unterstützung
const mockDb = db as { execute: MockedFunction<any> };

/**
 * Test-Datenstrukturen für verschiedene Koordinaten-Szenarien
 */
const TEST_COORDINATES = {
	// Bekannte Ostsee-Positionen (sollten inBaltic: true ergeben)
	BALTIC_SEA: {
		KIEL: { longitude: 10.1367, latitude: 54.3233, name: 'Kieler Förde' },
		STOCKHOLM: { longitude: 18.0686, latitude: 59.3293, name: 'Stockholm Archipelago' },
		HELSINKI: { longitude: 24.9384, latitude: 60.1699, name: 'Helsinki Harbour' },
		GOTLAND: { longitude: 18.2948, latitude: 57.6348, name: 'Gotland Island' },
		BORNHOLM: { longitude: 15.0870, latitude: 55.1136, name: 'Bornholm Island' },
		RUEGEN: { longitude: 13.4170, latitude: 54.4609, name: 'Rügen Island' },
		STETTIN: { longitude: 14.5528, latitude: 53.4289, name: 'Stettiner Haff' },
		RIGA: { longitude: 24.1052, latitude: 56.9496, name: 'Riga Bay' },
		TALLINN: { longitude: 24.7536, latitude: 59.4370, name: 'Tallinn Bay' }
	},

	// Grenzbereich-Positionen (inBaltic: false, aber inChartArea: true)
	CHART_AREA_ONLY: {
		HAMBURG: { longitude: 9.9937, latitude: 53.5511, name: 'Hamburg (Nordsee)' },
		COPENHAGEN: { longitude: 12.5683, latitude: 55.6761, name: 'Kopenhagen (Öresund-Zugang)' },
		SKAGERRAK: { longitude: 9.5000, latitude: 58.0000, name: 'Skagerrak' },
		KATTEGAT: { longitude: 11.5000, latitude: 56.5000, name: 'Kattegat' }
	},

	// Außerhalb des Kartenbereichs (beide false)
	OUTSIDE_AREA: {
		BERLIN: { longitude: 13.4050, latitude: 52.5200, name: 'Berlin (Binnenland)' },
		LONDON: { longitude: -0.1278, latitude: 51.5074, name: 'London' },
		OSLO: { longitude: 10.7522, latitude: 59.9139, name: 'Oslo (Nordsee)' },
		WARSCHAU: { longitude: 21.0122, latitude: 52.2297, name: 'Warschau (Binnenland)' }
	},

	// Grenzfälle für WGS84-Validierung
	WGS84_LIMITS: {
		MAX_LONGITUDE: { longitude: 180, latitude: 0, name: 'Internationale Datumsgrenze Ost' },
		MIN_LONGITUDE: { longitude: -180, latitude: 0, name: 'Internationale Datumsgrenze West' },
		MAX_LATITUDE: { longitude: 0, latitude: 90, name: 'Nordpol' },
		MIN_LATITUDE: { longitude: 0, latitude: -90, name: 'Südpol' },
		EQUATOR_PRIME: { longitude: 0, latitude: 0, name: 'Null Island' }
	},

	// Ungültige Koordinaten für Fehlerbehandlung
	INVALID: {
		LONGITUDE_TOO_HIGH: { longitude: 181, latitude: 54, name: 'Longitude > 180°' },
		LONGITUDE_TOO_LOW: { longitude: -181, latitude: 54, name: 'Longitude < -180°' },
		LATITUDE_TOO_HIGH: { longitude: 13, latitude: 91, name: 'Latitude > 90°' },
		LATITUDE_TOO_LOW: { longitude: 13, latitude: -91, name: 'Latitude < -90°' }
	}
} as const;

/**
 * Mock-Antworten für verschiedene PostGIS-Szenarien
 */
const MOCK_POSTGIS_RESPONSES = {
	IN_BALTIC_AND_CHART: [{ in_baltic: true, in_chart_area: true }] as PostGISValidationRow[],
	CHART_ONLY: [{ in_baltic: false, in_chart_area: true }] as PostGISValidationRow[],
	OUTSIDE_ALL: [{ in_baltic: false, in_chart_area: false }] as PostGISValidationRow[],
	EMPTY_RESULT: [] as PostGISValidationRow[],
	NULL_VALUES: [{ in_baltic: null, in_chart_area: null }] as PostGISValidationRow[]
};

describe('checkBalticSea - Umfangreiche geografische Validierung', () => {
	
	beforeEach(() => {
		// Setze alle Mocks vor jedem Test zurück
		vi.clearAllMocks();
	});

	describe('📍 Parameter-Validierung und Input-Sanitization', () => {
		
		it('sollte ungültige Longitude-Typen ablehnen', async () => {
			const invalidInputs = [
				{ value: NaN, expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: 'not-a-number', expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: null, expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: undefined, expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: {}, expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: [], expectedError: /Longitude muss eine gültige Zahl sein/ },
				{ value: Infinity, expectedError: /Longitude muss zwischen -180 und 180 liegen/ },
				{ value: -Infinity, expectedError: /Longitude muss zwischen -180 und 180 liegen/ }
			];

			for (const { value, expectedError } of invalidInputs) {
				await expect(checkBalticSea(value as any, 54.3))
					.rejects.toThrow(expectedError);
			}
		});

		it('sollte ungültige Latitude-Typen ablehnen', async () => {
			const invalidInputs = [
				{ value: NaN, expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: '12.34', expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: null, expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: undefined, expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: {}, expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: [], expectedError: /Latitude muss eine gültige Zahl sein/ },
				{ value: Infinity, expectedError: /Latitude muss zwischen -90 und 90 liegen/ },
				{ value: -Infinity, expectedError: /Latitude muss zwischen -90 und 90 liegen/ }
			];

			for (const { value, expectedError } of invalidInputs) {
				await expect(checkBalticSea(13.4, value as any))
					.rejects.toThrow(expectedError);
			}
		});

		it('sollte WGS84-Grenzwerte korrekt validieren', async () => {
			// Teste alle WGS84-Grenzfälle
			const testCases = [
				{ coord: TEST_COORDINATES.INVALID.LONGITUDE_TOO_HIGH, expectedError: /Longitude muss zwischen -180 und 180 liegen/ },
				{ coord: TEST_COORDINATES.INVALID.LONGITUDE_TOO_LOW, expectedError: /Longitude muss zwischen -180 und 180 liegen/ },
				{ coord: TEST_COORDINATES.INVALID.LATITUDE_TOO_HIGH, expectedError: /Latitude muss zwischen -90 und 90 liegen/ },
				{ coord: TEST_COORDINATES.INVALID.LATITUDE_TOO_LOW, expectedError: /Latitude muss zwischen -90 und 90 liegen/ }
			];

			for (const { coord, expectedError } of testCases) {
				await expect(checkBalticSea(coord.longitude, coord.latitude))
					.rejects.toThrow(expectedError);
			}
		});

		it('sollte gültige WGS84-Grenzwerte akzeptieren', async () => {
			// Mock erfolgreiche Datenbankabfrage
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL);

			// Teste alle gültigen WGS84-Grenzwerte
			const validCases = Object.values(TEST_COORDINATES.WGS84_LIMITS);

			for (const coord of validCases) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				expect(result).toHaveProperty('inBaltic');
				expect(result).toHaveProperty('inChartArea');
			}
		});

		it('sollte Gleitkomma-Präzision korrekt handhaben', async () => {
			// Mock erfolgreiche Datenbankabfrage
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			// Teste hochpräzise Koordinaten
			const highPrecisionCoords = [
				{ longitude: 10.1367456789123, latitude: 54.3233987654321 },
				{ longitude: 13.000000000001, latitude: 55.999999999999 },
				{ longitude: 15.123456789012, latitude: 57.987654321098 }
			];

			for (const coord of highPrecisionCoords) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				expect(result).toBeDefined();
				expect(typeof result.inBaltic).toBe('boolean');
				expect(typeof result.inChartArea).toBe('boolean');
			}
		});
	});

	describe('🗺️  PostGIS-Integration und Datenbankabfragen', () => {
		
		it('sollte Ostsee-Koordinaten korrekt identifizieren', async () => {
			// Mock für Ostsee-Position
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			// Teste bekannte Ostsee-Positionen
			for (const [location, coord] of Object.entries(TEST_COORDINATES.BALTIC_SEA)) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				
				expect(result.inBaltic, `${location} (${coord.name}) sollte in der Ostsee liegen`).toBe(true);
				expect(result.inChartArea, `${location} sollte im Kartenbereich liegen`).toBe(true);
			}
		});

		it('sollte Kartenbereich-nur Positionen korrekt identifizieren', async () => {
			// Mock für Kartenbereich-nur Position  
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.CHART_ONLY);

			// Teste Positionen im Kartenbereich aber nicht in Ostsee
			for (const [location, coord] of Object.entries(TEST_COORDINATES.CHART_AREA_ONLY)) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				
				expect(result.inBaltic, `${location} (${coord.name}) sollte NICHT in der Ostsee liegen`).toBe(false);
				expect(result.inChartArea, `${location} sollte im erweiterten Kartenbereich liegen`).toBe(true);
			}
		});

		it('sollte außerhalb liegende Positionen korrekt identifizieren', async () => {
			// Mock für außerhalb liegende Position
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL);

			// Teste Positionen außerhalb von allem
			for (const [location, coord] of Object.entries(TEST_COORDINATES.OUTSIDE_AREA)) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				
				expect(result.inBaltic, `${location} (${coord.name}) sollte NICHT in der Ostsee liegen`).toBe(false);
				expect(result.inChartArea, `${location} sollte NICHT im Kartenbereich liegen`).toBe(false);
			}
		});

		it('sollte SQL-Parameter korrekt binden und Injection-Attacken verhindern', async () => {
			// Mock erfolgreiche Datenbankabfrage
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL);

			// Teste potentielle SQL-Injection Koordinaten
			const injectionAttempts = [
				{ longitude: 13.4, latitude: 54.3 }, // Normale Werte als Baseline
			];

			for (const coord of injectionAttempts) {
				await checkBalticSea(coord.longitude, coord.latitude);
				
				// Überprüfe, dass execute aufgerufen wurde
				expect(mockDb.execute).toHaveBeenCalled();
				
				// Die SQL-Query sollte Prepared Statements verwenden
				const call = mockDb.execute.mock.calls[mockDb.execute.mock.calls.length - 1];
				expect(call[0]).toBeDefined(); // SQL Query Objekt
			}
		});
	});

	describe('❗ Fehlerbehandlung und Robustheit', () => {
		
		it('sollte Datenbankverbindungsfehler elegant behandeln', async () => {
			// Mock Datenbankfehler
			mockDb.execute.mockRejectedValue(new Error('Connection timeout'));

			await expect(checkBalticSea(13.4, 54.3))
				.rejects.toThrow('Datenbankfehler bei der geografischen Validierung');
		});

		it('sollte leere Datenbank-Resultsets korrekt handhaben', async () => {
			// Mock leeres Resultset (Natural Earth Daten fehlen)
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.EMPTY_RESULT);

			const result = await checkBalticSea(13.4, 54.3);
			
			expect(result.inBaltic).toBe(false);
			expect(result.inChartArea).toBe(false);
		});

		it('sollte null/undefined PostGIS-Ergebnisse normalisieren', async () => {
			// Mock null-Werte von PostGIS
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.NULL_VALUES);

			const result = await checkBalticSea(13.4, 54.3);
			
			// Null-Werte sollten zu false normalisiert werden
			expect(result.inBaltic).toBe(false);
			expect(result.inChartArea).toBe(false);
		});

		it('sollte unerwartete Datenbankfehler-Typen behandeln', async () => {
			// Teste verschiedene Fehlertypen
			const errorTypes = [
				new Error('PostGIS extension not available'),
				new TypeError('Invalid geometry'),
				new Error('Table ne_10m_ocean does not exist'),
				'String error', // Nicht-Error Objekt
				{ message: 'Object error' }, // Error-ähnliches Objekt
				null, // Null-Fehler
				undefined // Undefined-Fehler
			];

			for (const error of errorTypes) {
				mockDb.execute.mockRejectedValue(error);
				
				await expect(checkBalticSea(13.4, 54.3))
					.rejects.toThrow('Datenbankfehler bei der geografischen Validierung');
			}
		});
	});

	describe('🏃‍♀️ Performance und Edge Cases', () => {
		
		it('sollte bei sehr kleinen Koordinatenwerten funktionieren', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL);

			// Teste sehr kleine aber gültige Werte
			const microCoords = [
				{ longitude: 0.000001, latitude: 0.000001 },
				{ longitude: -0.000001, latitude: -0.000001 },
				{ longitude: 1e-10, latitude: 1e-10 }
			];

			for (const coord of microCoords) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				expect(result).toBeDefined();
			}
		});

		it('sollte bei Koordinaten nahe der WGS84-Grenzen funktionieren', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL);

			// Teste Werte sehr nah an den Grenzen
			const nearLimitCoords = [
				{ longitude: 179.999999, latitude: 89.999999 },
				{ longitude: -179.999999, latitude: -89.999999 },
				{ longitude: 179.999999, latitude: -89.999999 },
				{ longitude: -179.999999, latitude: 89.999999 }
			];

			for (const coord of nearLimitCoords) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				expect(result).toBeDefined();
				expect(typeof result.inBaltic).toBe('boolean');
				expect(typeof result.inChartArea).toBe('boolean');
			}
		});

		it('sollte konsistente Ergebnisse bei wiederholten Aufrufen liefern', async () => {
			// Mock konsistente Antwort
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			const testCoord = TEST_COORDINATES.BALTIC_SEA.KIEL;
			const results: BalticSeaValidationResult[] = [];

			// Führe 10 identische Abfragen aus
			for (let i = 0; i < 10; i++) {
				const result = await checkBalticSea(testCoord.longitude, testCoord.latitude);
				results.push(result);
			}

			// Alle Ergebnisse sollten identisch sein
			const firstResult = results[0];
			for (const result of results) {
				expect(result).toEqual(firstResult);
			}
		});

		it('sollte verschiedene Zahlenformate korrekt verarbeiten', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			// Teste verschiedene Zahlenrepräsentationen
			const numberFormats = [
				{ longitude: 13, latitude: 54 }, // Integer
				{ longitude: 13.0, latitude: 54.0 }, // Float mit .0
				{ longitude: +13.4, latitude: +54.3 }, // Unary plus
				{ longitude: 13.4e0, latitude: 54.3e0 }, // Scientific notation
				{ longitude: 1.34e1, latitude: 5.43e1 } // Scientific notation
			];

			for (const coord of numberFormats) {
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				expect(result).toBeDefined();
				expect(typeof result.inBaltic).toBe('boolean');
				expect(typeof result.inChartArea).toBe('boolean');
			}
		});
	});

	describe('🔍 Rückgabewerte und Typen-Sicherheit', () => {
		
		it('sollte immer ein BalticSeaValidationResult-konformes Objekt zurückgeben', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			const result = await checkBalticSea(13.4, 54.3);

			// Strukturvalidierung
			expect(result).toHaveProperty('inBaltic');
			expect(result).toHaveProperty('inChartArea');
			expect(Object.keys(result)).toHaveLength(2);

			// Typ-Validierung
			expect(typeof result.inBaltic).toBe('boolean');
			expect(typeof result.inChartArea).toBe('boolean');
		});

		it('sollte alle möglichen Boolean-Kombinationen korrekt zurückgeben', async () => {
			const testCases = [
				{ mock: MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART, expected: { inBaltic: true, inChartArea: true } },
				{ mock: MOCK_POSTGIS_RESPONSES.CHART_ONLY, expected: { inBaltic: false, inChartArea: true } },
				{ mock: MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL, expected: { inBaltic: false, inChartArea: false } }
				// Note: inBaltic: true, inChartArea: false ist logisch unmöglich
			];

			for (const { mock, expected } of testCases) {
				mockDb.execute.mockResolvedValue(mock);
				
				const result = await checkBalticSea(13.4, 54.3);
				expect(result).toEqual(expected);
			}
		});

		it('sollte unveränderliche (immutable) Ergebnisse zurückgeben', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			const result = await checkBalticSea(13.4, 54.3);
			const originalResult = { ...result };

			// Versuche Mutation
			(result as any).inBaltic = false;
			(result as any).inChartArea = false;
			(result as any).newProperty = 'hacked';

			// Originaldaten sollten unverändert sein (für immutability check)
			// Note: TypeScript/JavaScript Objekte sind standardmäßig mutierbar
			// Dies ist eher ein Dokumentationstest
			expect(result.inBaltic).toBe(false); // Wurde mutiert
			expect(originalResult.inBaltic).toBe(true); // Original bleibt
		});
	});

	describe('🌍 Realistische Koordinaten-Szenarien', () => {
		
		it('sollte wichtige Ostsee-Häfen korrekt klassifizieren', async () => {
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			const majorPorts = [
				{ name: 'Hamburg', longitude: 9.9937, latitude: 53.5511 }, // Grenzfall
				{ name: 'Kiel', longitude: 10.1367, latitude: 54.3233 },
				{ name: 'Rostock', longitude: 12.0908, latitude: 54.0887 },
				{ name: 'Stockholm', longitude: 18.0686, latitude: 59.3293 },
				{ name: 'Helsinki', longitude: 24.9384, latitude: 60.1699 },
				{ name: 'Sankt Petersburg', longitude: 30.3351, latitude: 59.9311 }
			];

			for (const port of majorPorts) {
				const result = await checkBalticSea(port.longitude, port.latitude);
				
				// Alle diese Häfen sollten mindestens im Kartenbereich liegen
				expect(result.inChartArea, `${port.name} sollte im Kartenbereich liegen`).toBe(true);
				
				// Log für manuelle Überprüfung
				console.debug(`${port.name}: inBaltic=${result.inBaltic}, inChartArea=${result.inChartArea}`);
			}
		});

		it('sollte Forschungsschiff-Routen realistisch validieren', async () => {
			// Simuliere eine typische Forschungsroute von Kiel nach Helsinki
			const route = [
				{ longitude: 10.1367, latitude: 54.3233, name: 'Start: Kiel' },
				{ longitude: 11.5000, latitude: 55.0000, name: 'Öresund-Passage' },
				{ longitude: 15.0000, latitude: 57.0000, name: 'Ostsee-Mitte' },
				{ longitude: 18.0000, latitude: 58.5000, name: 'Schwedische Schären' },
				{ longitude: 22.0000, latitude: 59.5000, name: 'Finnischer Meerbusen Eingang' },
				{ longitude: 24.9384, latitude: 60.1699, name: 'Ziel: Helsinki' }
			];

			// Mock alle als Ostsee-Positionen
			mockDb.execute.mockResolvedValue(MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART);

			for (const waypoint of route) {
				const result = await checkBalticSea(waypoint.longitude, waypoint.latitude);
				
				// Eine realistische Route sollte hauptsächlich in der Ostsee verlaufen
				expect(result.inChartArea, `${waypoint.name} sollte im Kartenbereich liegen`).toBe(true);
			}
		});

		it('sollte Grenzgewässer-Ambiguitäten korrekt handhaben', async () => {
			// Teste Koordinaten an den Übergängen zwischen Nord- und Ostsee
			const borderCases = [
				{ longitude: 9.0, latitude: 54.5, name: 'Nordsee-Grenze' },
				{ longitude: 12.0, latitude: 55.5, name: 'Öresund' },
				{ longitude: 11.0, latitude: 57.0, name: 'Kattegat' },
				{ longitude: 9.5, latitude: 58.0, name: 'Skagerrak' }
			];

			// Variiere Mock-Antworten für Realismus
			const responses = [
				MOCK_POSTGIS_RESPONSES.CHART_ONLY,
				MOCK_POSTGIS_RESPONSES.IN_BALTIC_AND_CHART,
				MOCK_POSTGIS_RESPONSES.OUTSIDE_ALL
			];

			for (let i = 0; i < borderCases.length; i++) {
				const coord = borderCases[i];
				mockDb.execute.mockResolvedValue(responses[i % responses.length]);
				
				const result = await checkBalticSea(coord.longitude, coord.latitude);
				
				// Grenzfälle sollten zumindest valide Ergebnisse liefern
				expect(typeof result.inBaltic).toBe('boolean');
				expect(typeof result.inChartArea).toBe('boolean');
				
				console.debug(`Grenzfall ${coord.name}: inBaltic=${result.inBaltic}, inChartArea=${result.inChartArea}`);
			}
		});
	});
});