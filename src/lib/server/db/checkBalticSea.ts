import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

// Logger für diese Komponente erstellen
const logger = createLogger('checkBalticSea');

/**
 * Gültigkeitsbereich für geografische Koordinaten
 */
const GEO_LIMITS = {
	MIN_LONGITUDE: -180,
	MAX_LONGITUDE: 180,
	MIN_LATITUDE: -90,
	MAX_LATITUDE: 90
};

/**
 * Prüft, ob eine Position in der Ostsee liegt
 * @param longitude - Längengrad der Position (-180 bis 180)
 * @param latitude - Breitengrad der Position (-90 bis 90)
 * @returns Promise mit Boolean für inBaltic und inChartArea
 * @throws Error wenn ungültige Koordinaten übergeben werden
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

	// SQL-Abfrage mit Prepared Statement
	const query = sql`
    SELECT 
      ST_Contains(geom, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)) as in_baltic,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) && 
      ST_MakeEnvelope(9.4, 53, 30.2, 66, 4326) as in_chart_area 
    FROM ne_10m_ocean 
    WHERE id = 2
  `;

	try {
		logger.debug({ longitude, latitude }, 'Führe Ostsee-Prüfung durch');
		const result = await db.execute(query);

		// Prüfen, ob Ergebnisse zurückgegeben wurden
		if (!result || result.length === 0) {
			logger.warn({ longitude, latitude }, 'Keine Ergebnisse von der Datenbank');
			return {
				inBaltic: false,
				inChartArea: false
			};
		}

		// Ersten Datensatz aus dem Result extrahieren
		const row = result[0];

		const response = {
			inBaltic: row?.in_baltic === true,
			inChartArea: row?.in_chart_area === true
		};

		logger.debug({ ...response, longitude, latitude }, 'Ostsee-Prüfung abgeschlossen');
		return response;
	} catch (error) {
		logger.error({ error, longitude, latitude }, 'Fehler bei der Ostsee-Prüfung');
		throw new Error('Datenbankfehler bei der Ostsee-Prüfung');
	}
}
