/**
 * Tests für die Einschluss-Maske der Ostsee-Geometrie-Pipeline.
 *
 * Die Maske (baltic-inclusion-mask.geojson) wird in build-baltic-geometry.sql
 * OHNE Landabzug zur Wasserfläche vereinigt. Jeder Quadratmeter Maske wird
 * `inBaltic = true` — die Korridore müssen deshalb eng an den realen
 * Wasserumrissen liegen. Die Punkte hier sind Wasser-Referenzen (Gewässermitte
 * bzw. Fahrwasser) und Ausschluss-Referenzen (Binnenwasser oberhalb der
 * brackigen Abschnitte), gegen die die Maske direkt getestet wird — nicht
 * gegen den gebauten Index, der erst nach `npm run geo:build` nachzieht.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));

const mask: FeatureCollection<Polygon | MultiPolygon> = JSON.parse(
	readFileSync(join(HERE, 'baltic-inclusion-mask.geojson'), 'utf8')
);

function isInMask(longitude: number, latitude: number): boolean {
	const p = point([longitude, latitude]);
	return mask.features.some((feature: Feature<Polygon | MultiPolygon>) =>
		booleanPointInPolygon(p, feature.geometry)
	);
}

/**
 * Wasser-Referenzpunkte, die die Maske abdecken MUSS.
 *
 * Alle Punkte sind per `ST_PointOnSurface` aus den UNGEPUFFERTEN
 * OSM-Wasserflächen berechnet (Overpass-Abzug 2026-08-03) — von Hand aus der
 * Karte geschätzte Punkte lagen beim ersten Anlauf mehrfach auf Land und haben
 * schon einmal eine falsche Lücken-Diagnose erzeugt (Salzhaff, Achterwasser).
 * Wer Punkte tauscht, muss sie erneut gegen die OSM-Wasserfläche belegen.
 *
 * Der Peenestrom hat bewusst KEINEN Korridor: Er liegt (wie Achterwasser und
 * Krumminer Wiek) seewärts der OSM-Küstenlinie bereits in der Wasserfläche;
 * die beiden Buchten sind nur defensiv aufgenommen.
 */
const DRIN: ReadonlyArray<[string, number, number]> = [
	// Bestand — darf durch den Umbau der Korridore nicht verloren gehen
	['Schlei, Ende bei Schleswig', 9.6063, 54.515],
	['Schlei, Große Breite', 9.8931, 54.6149],
	['Schlei, bei Kappeln', 9.9397, 54.665],
	['Untertrave, bei Lübeck', 10.6868, 53.875],
	['Untertrave, Travemünde', 10.8607, 53.9502],
	['Unterwarnow, Rostock Stadthafen', 12.1072, 54.1012],
	['Unterwarnow, Breitling', 12.1067, 54.1598],
	// Neu aufgenommen (Review 2026-08-03)
	['Dassower See (Untertrave)', 10.9575, 53.9123],
	['Saaler Bodden, Mitte', 12.4376, 54.33],
	['Saaler Bodden, Süd', 12.4144, 54.2932],
	['Achterwasser, Mitte', 13.9531, 54.005],
	['Krumminer Wiek', 13.8345, 54.0243],
	['Salzhaff, Mitte', 11.5687, 54.0646]
];

/**
 * Ausschluss-Referenzen: Binnenwasser jenseits der brackigen Abschnitte.
 * Liegt einer davon in der Maske, greift ein Korridor zu weit ins Binnenland.
 */
const DRAUSSEN: ReadonlyArray<[string, number, number]> = [
	['Müritz', 12.68, 53.42],
	['Peene bei Anklam (Fluss, oberhalb Mündung)', 13.68, 53.853],
	['Warnow oberhalb Mühlendamm Rostock', 12.14, 54.05],
	['Elbe-Lübeck-Kanal südlich Lübeck', 10.7, 53.82],
	['Nord-Ostsee-Kanal', 9.72, 54.34],
	['Recknitz oberhalb Ribnitz-Damgarten', 12.45, 54.22]
];

describe('Einschluss-Maske: Struktur', () => {
	it('ist eine FeatureCollection aus Polygonen mit name und grund', () => {
		expect(mask.type).toBe('FeatureCollection');
		expect(mask.features.length).toBeGreaterThan(0);
		for (const feature of mask.features) {
			expect(['Polygon', 'MultiPolygon']).toContain(feature.geometry.type);
			expect(typeof feature.properties?.name).toBe('string');
			expect(typeof feature.properties?.grund).toBe('string');
		}
	});

	it('bleibt im Korridor-Rahmen der deutschen Ostseeküste (8–15 O, 53–56 N)', () => {
		for (const feature of mask.features) {
			const rings =
				feature.geometry.type === 'Polygon'
					? feature.geometry.coordinates
					: feature.geometry.coordinates.flat();
			for (const ring of rings) {
				for (const [lon, lat] of ring) {
					expect(lon).toBeGreaterThan(8);
					expect(lon).toBeLessThan(15);
					expect(lat).toBeGreaterThan(53);
					expect(lat).toBeLessThan(56);
				}
			}
		}
	});
});

describe('Einschluss-Maske: Wasser-Referenzen abgedeckt', () => {
	it.each(DRIN)('%s (%f/%f) liegt in der Maske', (_name, lon, lat) => {
		expect(isInMask(lon, lat)).toBe(true);
	});
});

describe('Einschluss-Maske: Binnenwasser bleibt draußen', () => {
	it.each(DRAUSSEN)('%s (%f/%f) liegt nicht in der Maske', (_name, lon, lat) => {
		expect(isInMask(lon, lat)).toBe(false);
	});
});
