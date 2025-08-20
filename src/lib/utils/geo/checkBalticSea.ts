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
 * Erweiterte Ostsee-Bounding Box für Kartenbereich
 *
 * Diese Koordinaten definieren den erweiterten Ostsee-Kartenbereich,
 * der auch angrenzende Küstenregionen und Zuflüsse umfasst.
 * Identisch mit PostGIS CHART_AREA_ENVELOPE für Konsistenz.
 *
 * @constant
 */
const BALTIC_SEA_BBOX: BoundingBox = {
	minLongitude: 9.4, // Westgrenze (etwa Skagerrak)
	maxLongitude: 30.2, // Ostgrenze (etwa Finnischer Meerbusen)
	minLatitude: 53.0, // Südgrenze (etwa Norddeutsche Küste)
	maxLatitude: 66.0 // Nordgrenze (etwa Bottnischer Meerbusen)
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
 * - West: 9.4°E (Skagerrak-Region)
 * - Ost: 30.2°E (Finnischer Meerbusen)
 * - Süd: 53.0°N (Norddeutsche Küste)
 * - Nord: 66.0°N (Bottnischer Meerbusen)
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
