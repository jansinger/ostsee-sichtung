import { describe, expect, it } from 'vitest';
import { checkBalticSeaFile } from '$lib/server/geo/checkBalticSeaFile';

/**
 * Fachliche Referenzpunkte für die bereinigte Ostsee-Geometrie.
 * Herkunft und Begründung: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md
 */

/** Fehler A — Binnenwasser-Artefakte der IHO-Geometrie. Müssen draußen sein. */
const FEHLER_A: ReadonlyArray<[string, number, number]> = [
	['Ladogasee', 31.5, 60.8],
	['Onegasee', 35.5, 61.8],
	['Weichsel bei Włocławek', 19.0, 52.7],
	['Torne-Flusslauf', 24.0, 66.5],
	['Limfjord bei Aalborg', 9.38, 57.02]
];

/**
 * Fehler B — innere Küstengewässer, die die grobe IHO-Küstenlinie weglässt.
 * Die drei nachfolgend kommentierten Punkte waren ursprünglich von Hand aus der
 * Karte geschätzt und lagen laut OSM-Küstenlinie tatsächlich auf Land (siehe
 * .superpowers/sdd/progress.md, Abschnitt „BEFUND: Aufgabe 1 hat drei
 * unbrauchbare Referenzkoordinaten"). Ersetzt durch belegte Wasserpunkte,
 * geprüft mit `ogrinfo -dialect SQLITE` (ST_Intersects/MakePoint) gegen
 * land-polygons-complete-4326.
 */
const FEHLER_B: ReadonlyArray<[string, number, number]> = [
	// Sichtung id 1170, mit ogrinfo als Wasser bestätigt.
	['Flensburger Förde', 9.680556, 54.840278],
	// Sichtung id 452, mit ogrinfo als Wasser bestätigt.
	['Eckernförder Bucht', 9.984398, 54.497362],
	['Greifswalder Bodden', 13.45, 54.2],
	// Mit ogrinfo als Wasser bestätigt (nicht aus Sichtungsdaten, aus der Kartenmitte).
	['Strelasund bei Stralsund', 13.12, 54.29]
];

/** Muss auch nach der Bereinigung draußen bleiben. */
const AUSSEN: ReadonlyArray<[string, number, number]> = [
	['Helgoland (Nordsee)', 7.89, 54.18],
	['Hamburg', 10.0, 53.55],
	['Hannover', 9.73, 52.37],
	['Doggerbank', 2.02, 54.87]
];

/** Offene Ostsee — war vorher drin und muss drin bleiben (Regressionsschutz). */
const KERNGEBIET: ReadonlyArray<[string, number, number]> = [
	['Fehmarnbelt', 11.3, 54.6],
	['Arkonabecken', 13.5, 55.0],
	['Bornholmbecken', 15.0, 55.2],
	['Newa-Bucht', 30.05, 59.93]
];

describe('Ostsee-Geometrie: Fehler A — Binnenwasser ausgeschlossen', () => {
	it.each(FEHLER_A)('%s (%f/%f) liegt nicht in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(false);
	});
});

describe('Ostsee-Geometrie: Fehler B — Küstengewässer eingeschlossen', () => {
	it.each(FEHLER_B)('%s (%f/%f) liegt in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(true);
	});
});

describe('Ostsee-Geometrie: Außenpunkte bleiben außen', () => {
	it.each(AUSSEN)('%s (%f/%f) liegt nicht in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(false);
	});
});

describe('Ostsee-Geometrie: Kerngebiet unverändert', () => {
	it.each(KERNGEBIET)('%s (%f/%f) liegt in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(true);
	});
});

describe('Ostsee-Geometrie: Uferstreifen für Strandfunde', () => {
	// Strandabschnitt Prerow, Nordseite Darß. Küstenlinie verläuft hier bei ~54.4560 N.
	it('nimmt einen Punkt rund 100 m landeinwärts noch auf', () => {
		expect(checkBalticSeaFile(12.5427, 54.4551).inBaltic).toBe(true);
	});

	it('schließt einen Punkt 5 km landeinwärts aus', () => {
		expect(checkBalticSeaFile(12.5427, 54.411).inBaltic).toBe(false);
	});
});
