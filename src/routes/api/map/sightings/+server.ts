import { createLogger } from '$lib/logger.server';
import { sightingsToGeoJSON, type DBSighting } from '$lib/map/mapUtils';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { berlinDayRangeUtc } from '$lib/server/datetime/berlinDayRange';
import { json } from '@sveltejs/kit';
import { and, gte, isNotNull, lt, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const logger = createLogger('api:map:sightings');

export const GET: RequestHandler = async ({ url }) => {
	// Filter-Parameter aus der URL extrahieren
	const year = url.searchParams.get('year');
	const search = url.searchParams.get('search');

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [
			// Geprüft heißt veröffentlicht: dieselbe Grundmenge wie die Legacy-API
			// (/sichtungen/showreports.json), damit beide öffentlichen Flächen
			// nachweislich an derselben Spalte hängen.
			isNotNull(sightingsTable.approvedAt)
		];

		// Jahr-Filter hinzufügen, wenn vorhanden
		if (year) {
			// Jahresgrenzen sind Berliner Mitternacht, die Spalte hält UTC. Halboffenes
			// Intervall statt BETWEEN, sonst fehlt der gesamte 31.12.
			const { start, endExclusive } = berlinDayRangeUtc(`${year}-01-01`, `${year}-12-31`);
			conditions.push(gte(sightingsTable.sightingDate, start));
			conditions.push(lt(sightingsTable.sightingDate, endExclusive));
		}

		// Suchfilter hinzufügen, wenn vorhanden
		if (search) {
			// LIKE-Wildcards im Suchbegriff escapen, damit % und _ literal gesucht werden
			const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
			// Suche nur in nicht-personenbezogenen Feldern oder mit Consent
			conditions.push(
				sql`(
          ${sightingsTable.waterway} LIKE ${`%${escapedSearch}%`} ESCAPE '\\' OR
          ${sightingsTable.seaMark} LIKE ${`%${escapedSearch}%`} ESCAPE '\\' OR
          (${sightingsTable.nameConsent} = 1 AND (
            ${sightingsTable.firstName} LIKE ${`%${escapedSearch}%`} ESCAPE '\\' OR
            ${sightingsTable.lastName} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'
          )) OR
          (${sightingsTable.shipNameConsent} = 1 AND
            ${sightingsTable.shipName} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'
          )
        )`
			);
		}

		// Sichtungen aus der Datenbank abrufen - nur benötigte Felder
		const sightingsFromDB = await db
			.select({
				id: sightingsTable.id,
				sightingDate: sightingsTable.sightingDate,
				longitude: sightingsTable.longitude,
				latitude: sightingsTable.latitude,
				species: sightingsTable.species,
				totalCount: sightingsTable.totalCount,
				juvenileCount: sightingsTable.juvenileCount,
				isDead: sightingsTable.isDead,
				// Personenbezogene Daten mit Consent-Flags
				firstName: sightingsTable.firstName,
				lastName: sightingsTable.lastName,
				nameConsent: sightingsTable.nameConsent,
				shipName: sightingsTable.shipName,
				shipNameConsent: sightingsTable.shipNameConsent,
				// Nicht-personenbezogene Daten
				waterway: sightingsTable.waterway,
				seaMark: sightingsTable.seaMark
			})
			.from(sightingsTable)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(sightingsTable.sightingDate);

		// Konvertiere die Sichtungen in GeoJSON-Format
		const geoJson = sightingsToGeoJSON(sightingsFromDB as unknown as DBSighting[]);

		// Erfolgreiche Antwort zurückgeben
		return json(geoJson);
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim Abrufen der Sichtungen für die Karte'
		);

		// Fehlerantwort zurückgeben — keine internen Fehlerdetails an den Client leaken
		// (der konkrete Fehler wurde oben serverseitig geloggt).
		return json({ error: 'Fehler beim Abrufen der Sichtungen' }, { status: 500 });
	}
};
