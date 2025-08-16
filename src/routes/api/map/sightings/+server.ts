import { sightingsToGeoJSON, type DBSighting } from '$lib/map/mapUtils';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, between, eq, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	// Filter-Parameter aus der URL extrahieren
	const year = url.searchParams.get('year');
	const search = url.searchParams.get('search');

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [
			eq(sightingsTable.verified, 1) // Nur verifizierte Sichtungen
		];

		// Jahr-Filter hinzufügen, wenn vorhanden
		if (year) {
			const yearStart = `${year}-01-01`;
			const yearEnd = `${year}-12-31`;
			conditions.push(between(sightingsTable.sightingDate, yearStart, yearEnd));
		}

		// Suchfilter hinzufügen, wenn vorhanden
		if (search) {
			// Suche nur in nicht-personenbezogenen Feldern oder mit Consent
			conditions.push(
				sql`(
          ${sightingsTable.waterway} LIKE ${`%${search}%`} OR
          ${sightingsTable.seaMark} LIKE ${`%${search}%`} OR
          (${sightingsTable.nameConsent} = 1 AND (
            ${sightingsTable.firstName} LIKE ${`%${search}%`} OR
            ${sightingsTable.lastName} LIKE ${`%${search}%`}
          )) OR
          (${sightingsTable.shipNameConsent} = 1 AND 
            ${sightingsTable.shipName} LIKE ${`%${search}%`}
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
		console.error('Fehler beim Abrufen der Sichtungen für die Karte:', error);

		// Fehlerantwort zurückgeben
		return json(
			{
				error: 'Fehler beim Abrufen der Sichtungen',
				details: error instanceof Error ? error.message : 'Unbekannter Fehler'
			},
			{ status: 500 }
		);
	}
};
