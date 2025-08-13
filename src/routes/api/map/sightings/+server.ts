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
		const conditions = [eq(sightingsTable.verified, 1)]; // Nur öffentliche Sichtungen

		// Jahr-Filter hinzufügen, wenn vorhanden
		if (year) {
			const yearStart = `${year}-01-01`;
			const yearEnd = `${year}-12-31`;
			conditions.push(between(sightingsTable.sightingDate, yearStart, yearEnd));
		}

		// Suchfilter hinzufügen, wenn vorhanden
		if (search) {
			// Suche in mehreren Feldern
			conditions.push(
				sql`(
          ${sightingsTable.email} LIKE ${`%${search}%`} OR
          ${sightingsTable.firstName} LIKE ${`%${search}%`} OR
          ${sightingsTable.lastName} LIKE ${`%${search}%`} OR
          ${sightingsTable.shipName} LIKE ${`%${search}%`}
        )`
			);
		}

		// Sichtungen aus der Datenbank abrufen
		const sightingsFromDB = await db
			.select()
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
