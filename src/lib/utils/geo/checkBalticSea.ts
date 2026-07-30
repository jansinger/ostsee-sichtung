import type { BoundingBox, GeoLimits } from '$lib/types';

/**
 * WGS84-Koordinaten-Limits für globale GPS-Validierung
 *
 * Identisch mit PostGIS-Version für Konsistenz zwischen den Implementierungen.
 *
 * @see {@link checkBalticSea.ts} für die entsprechende PostGIS-Implementierung
 * @constant
 */
export const GEO_LIMITS: GeoLimits = {
	MIN_LONGITUDE: -180, // International Date Line West (180°W)
	MAX_LONGITUDE: 180, // International Date Line East (180°E)
	MIN_LATITUDE: -90, // Geografischer Südpol (-90°)
	MAX_LATITUDE: 90 // Geografischer Nordpol (+90°)
};

/**
 * Ostsee-Bounding Box — Hülle der bereinigten Ostsee-Geometrie
 *
 * **Nicht von Hand pflegen.** Die Werte sind der Extent aus
 * `src/lib/server/geo/baltic-extent.json`, nach außen auf 0,05° gerundet.
 * Erzeugt von `npm run geo:build`. `checkBalticSea.test.ts` schlägt fehl,
 * wenn Konstante und Extent auseinanderlaufen, und prüft zusätzlich die
 * Invariante „Polygon liegt vollständig in der Box".
 *
 * Die Geometrie umfasst die IHO-Seegebiete Baltic Sea, Gulf of Bothnia,
 * Gulf of Finland, Gulf of Riga und **Kattegat** — das Skagerrak gehört
 * nicht dazu. Ausgeschlossen ist Binnenwasser (Ladogasee, Onegasee,
 * Weichsel- und Torne-Flussläufe, Limfjord, Oder oberhalb des Stettiner
 * Haffs); eingeschlossen sind Schlei, Trave- und Warnow-Mündung.
 *
 * Hintergrund: `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`
 *
 * @constant
 */
export const BALTIC_SEA_BBOX: BoundingBox = {
	minLongitude: 9.4, // Westgrenze — Kattegat vor Nordjütland
	maxLongitude: 30.25, // Ostgrenze — Kopf der Newa-Bucht
	minLatitude: 53.55, // Südgrenze — Oder bei Police
	maxLatitude: 65.95 // Nordgrenze — Bottenwiek bei Tornio
};

/**
 * Prüft ob GPS-Koordinaten im erweiterten Ostsee-Kartenbereich liegen
 *
 * Diese schnelle Bounding-Box-Prüfung dient als erste Filterungsebene
 * vor der teureren Punkt-in-Polygon-Validierung. Sie umfasst den erweiterten
 * Kartenbereich inklusive angrenzender Küstengebiete und Zuflüsse.
 *
 * ## Performance-Charakteristika
 *
 * - **Komplexität**: O(1) - konstante Zeit unabhängig von Geometrie-Komplexität
 * - **Latency**: <0.01ms typisch bei modernen CPUs
 * - **Memory Usage**: Negligible - nur einfache numerische Vergleiche
 * - **Accuracy**: Rechteckige Approximation, kann false positives ergeben
 *
 * ## Koordinaten-Referenz
 *
 * Verwendet identische Bounding Box wie PostGIS CHART_AREA_ENVELOPE:
 * - West: 9,40°E (Kattegat vor Nordjütland — **nicht** Skagerrak)
 * - Ost: 30,25°E (Kopf der Newa-Bucht)
 * - Süd: 53,55°N (Oder bei Police)
 * - Nord: 65,95°N (Bottenwiek bei Tornio)
 *
 * @param longitude Längengrad in Dezimalgrad (WGS84)
 * @param latitude Breitengrad in Dezimalgrad (WGS84)
 * @returns true wenn Punkt im erweiterten Ostsee-Kartenbereich liegt
 *
 * @example
 * // Kiel (innerhalb Kartenbereich)
 * isInBalticArea(10.1367, 54.3233); // returns true
 *
 * @example
 * // London (außerhalb Kartenbereich)
 * isInBalticArea(-0.1276, 51.5074); // returns false
 *
 * @private
 * @since 1.0.0
 * @performance Optimiert für <0.01ms Antwortzeit
 */
export function isInBalticArea(longitude: number, latitude: number): boolean {
	// Rechteckige Bounding-Box-Prüfung mit vier einfachen Vergleichen
	return (
		longitude >= BALTIC_SEA_BBOX.minLongitude &&
		longitude <= BALTIC_SEA_BBOX.maxLongitude &&
		latitude >= BALTIC_SEA_BBOX.minLatitude &&
		latitude <= BALTIC_SEA_BBOX.maxLatitude
	);
}
