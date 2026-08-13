import { createLogger } from '$lib/logger.server';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { berlinDatePart } from '$lib/server/db/sqlTimeZone';
import { json } from '@sveltejs/kit';
import { and, sql } from 'drizzle-orm';
import { mapSightingConditions } from '../publicMapConditions';
import type { RequestHandler } from './$types';

const logger = createLogger('api:map:sightings:years');

/**
 * Verfügbare Jahre für die Sichtungskarte, jeweils mit Anzahl der Sichtungen.
 *
 * Grundmenge identisch zu `GET /api/map/sightings` (`publicMapConditions.ts`):
 * freigegeben und mit plausiblen Ostsee-Koordinaten. Kalenderjahr wird über
 * `berlinDatePart('year', ...)` gebildet — derselbe Ausdruck wie überall sonst
 * im Projekt, damit der vorhandene Ausdrucksindex (`idx_year_sichtungen`) greift.
 */
export const GET: RequestHandler = async () => {
	try {
		const yearExpression = berlinDatePart('year', sightingsTable.sightingDate);

		const rows = await db
			.select({
				year: sql<number | string>`${yearExpression}`,
				count: sql<number | string>`COUNT(*)`
			})
			.from(sightingsTable)
			.where(and(...mapSightingConditions()))
			.groupBy(yearExpression)
			.orderBy(sql`${yearExpression} DESC`);

		const years = rows
			.map((row) => ({ year: Number(row.year), count: Number(row.count) }))
			.filter((entry) => entry.count > 0);

		return json({ years });
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim Abrufen der verfügbaren Jahre für die Karte'
		);

		// Fehlerantwort zurückgeben — keine internen Fehlerdetails an den Client leaken
		// (der konkrete Fehler wurde oben serverseitig geloggt).
		return json({ error: 'Fehler beim Abrufen der verfügbaren Jahre' }, { status: 500 });
	}
};
