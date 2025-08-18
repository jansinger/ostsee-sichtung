/**
 * @fileoverview Geografische Validierung für Ostsee-Koordinaten
 * 
 * Dieses Modul bietet PostGIS-basierte Funktionen zur Validierung von
 * GPS-Koordinaten gegen die Ostsee-Geometrie. Es nutzt Natural Earth
 * Geodaten für präzise geografische Abfragen und stellt sicher, dass
 * nur Sichtungen in relevanten Meeresgebieten akzeptiert werden.
 * 
 * Die Validierung erfolgt über räumliche SQL-Queries gegen die
 * `ne_10m_ocean` Tabelle mit PostGIS-Geometriefunktionen.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

// Logger für geografische Validierung
const logger = createLogger('geo:balticSea');

/**
 * Gültigkeitsbereich für geografische Koordinaten nach WGS84-Standard
 * Definiert die absoluten Grenzen für Längen- und Breitengrade
 */
const GEO_LIMITS = {
	MIN_LONGITUDE: -180,    // Westlichste Position
	MAX_LONGITUDE: 180,     // Östlichste Position  
	MIN_LATITUDE: -90,      // Südlichste Position (Südpol)
	MAX_LATITUDE: 90        // Nördlichste Position (Nordpol)
};

/**
 * Prüft, ob GPS-Koordinaten in der Ostsee oder im erweiterten Kartenbereich liegen
 * 
 * Diese Funktion nutzt PostGIS-Geometriefunktionen zur präzisen räumlichen
 * Validierung gegen die Natural Earth Ostsee-Polygone. Sie validiert sowohl
 * die exakte Ostsee-Zugehörigkeit als auch die Lage im erweiterten Kartenbereich.
 * 
 * @param longitude Längengrad der Position (-180 bis 180, WGS84)
 * @param latitude Breitengrad der Position (-90 bis 90, WGS84)
 * @returns Promise mit Validierungsergebnissen für Ostsee und Kartenbereich
 * 
 * @example
 * const result = await checkBalticSea(13.4, 54.3);
 * if (result.inBaltic) console.log('Position liegt in der Ostsee');
 * 
 * @throws {Error} Bei ungültigen Koordinaten oder Datenbankfehlern
 * 
 * @note Verwendet PostGIS ST_Contains für exakte Geometrie-Prüfung
 * @note Der Kartenbereich umfasst das erweiterte Ostsee-Gebiet (9.4°-30.2° E, 53°-66° N)
 */
export async function checkBalticSea(
	longitude: number,
	latitude: number
): Promise<{
	inBaltic: boolean;
	inChartArea: boolean;
}> {
	// Parameter validieren
	if (typeof longitude !== 'number' || isNaN(longitude)) {
		logger.error({ longitude }, 'Ungültiger longitude-Parameter');
		throw new Error('Longitude muss eine gültige Zahl sein');
	}

	if (typeof latitude !== 'number' || isNaN(latitude)) {
		logger.error({ latitude }, 'Ungültiger latitude-Parameter');
		throw new Error('Latitude muss eine gültige Zahl sein');
	}

	// Bereichsprüfung
	if (longitude < GEO_LIMITS.MIN_LONGITUDE || longitude > GEO_LIMITS.MAX_LONGITUDE) {
		logger.warn({ longitude }, 'Longitude außerhalb des gültigen Bereichs');
		throw new Error(
			`Longitude muss zwischen ${GEO_LIMITS.MIN_LONGITUDE} und ${GEO_LIMITS.MAX_LONGITUDE} liegen`
		);
	}

	if (latitude < GEO_LIMITS.MIN_LATITUDE || latitude > GEO_LIMITS.MAX_LATITUDE) {
		logger.warn({ latitude }, 'Latitude außerhalb des gültigen Bereichs');
		throw new Error(
			`Latitude muss zwischen ${GEO_LIMITS.MIN_LATITUDE} und ${GEO_LIMITS.MAX_LATITUDE} liegen`
		);
	}

	// PostGIS-Abfrage mit räumlichen Funktionen (Prepared Statement)
	const query = sql`
    SELECT 
      -- Exakte Geometrie-Prüfung: Liegt der Punkt innerhalb der Ostsee-Polygone?
      ST_Contains(geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)) as in_baltic,
      -- Bounding-Box-Prüfung: Liegt der Punkt im erweiterten Kartenbereich?
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) && 
      ST_MakeEnvelope(9.4, 53, 30.2, 66, 4326) as in_chart_area 
    FROM ne_10m_ocean 
    WHERE id = 2  -- Natural Earth ID für Ostsee
  `;

	try {
		logger.debug({ longitude, latitude }, 'Führe PostGIS-Geometrievalidierung durch');
		const result = await db.execute(query);

		// Validiere Datenbank-Antwort
		if (!result || result.length === 0) {
			logger.warn({ longitude, latitude }, 'Keine Geometriedaten von der Datenbank erhalten');
			return {
				inBaltic: false,
				inChartArea: false
			};
		}

		// Extrahiere räumliche Validierungsergebnisse
		const row = result[0];

		const response = {
			inBaltic: row?.in_baltic === true,      // Exakte Ostsee-Zugehörigkeit
			inChartArea: row?.in_chart_area === true // Erweiteter Kartenbereich
		};

		logger.debug({ ...response, longitude, latitude }, 'Geometrievalidierung erfolgreich abgeschlossen');
		return response;
	} catch (error) {
		logger.error({ error, longitude, latitude }, 'PostGIS-Datenbankfehler bei Geometrievalidierung');
		throw new Error('Datenbankfehler bei der geografischen Validierung');
	}
}
