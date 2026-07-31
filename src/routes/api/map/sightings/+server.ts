import { createLogger } from '$lib/logger.server';
import { sightingsToGeoJSON, type DBSighting } from '$lib/map/mapUtils';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { berlinDayRangeUtc } from '$lib/server/datetime/berlinDayRange';
import { consentGatedNameSearch, containsPattern } from '$lib/server/db/consentGatedSearch';
import { json } from '@sveltejs/kit';
import { and, gte, lt, sql } from 'drizzle-orm';
import { publicMapSightingConditions } from './publicMapConditions';
import type { RequestHandler } from './$types';

const logger = createLogger('api:map:sightings');

export const GET: RequestHandler = async ({ url }) => {
	// Filter-Parameter aus der URL extrahieren
	const year = url.searchParams.get('year');
	const search = url.searchParams.get('search');

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [
			// Geprüft heißt veröffentlicht (dieselbe Grundmenge wie die Legacy-API,
			// /sichtungen/showreports.json) UND plausible Ostsee-Koordinaten.
			// Ohne den Koordinatenfilter fallen NULL-Koordinaten in
			// sightingsToGeoJSON auf [0,0] zurück ("Null Island"). Identische
			// Grundmenge wie /api/map/sightings/years — siehe publicMapConditions.ts.
			...publicMapSightingConditions()
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
			// Fahrwasser und Seezeichen sind nicht personenbezogen und bleiben frei
			// durchsuchbar; Name und Schiffsname nur mit Einwilligung des Melders.
			// Das Gate ist mit der Legacy-API geteilt, damit beide öffentlichen
			// Flächen dieselbe Teilmenge freigeben — siehe consentGatedSearch.ts.
			const pattern = containsPattern(search);
			conditions.push(
				sql`(
          ${sightingsTable.waterway} LIKE ${pattern} ESCAPE '\\' OR
          ${sightingsTable.seaMark} LIKE ${pattern} ESCAPE '\\' OR
          ${consentGatedNameSearch(pattern, 'LIKE')}
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
