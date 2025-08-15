import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, between, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('fromDate') || '';
	const toDate = url.searchParams.get('toDate') || '';
	const verified = url.searchParams.get('verified') === '1';

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [];

		// Datumsbereich hinzufügen, wenn vorhanden
		if (fromDate && toDate) {
			conditions.push(between(sightingsTable.sightingDate, fromDate, toDate));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified) {
			conditions.push(eq(sightingsTable.verified, 1));
		}

		// Sichtungen aus der Datenbank abrufen
		const sightings = await db
			.select()
			.from(sightingsTable)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(sightingsTable.sightingDate);

		// Erfolgreiche Antwort zurückgeben
		return json({
			sightings,
			count: sightings.length
		});
	} catch (error) {
		console.error('Fehler beim Abrufen der Sichtungen für den Export:', error);

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
