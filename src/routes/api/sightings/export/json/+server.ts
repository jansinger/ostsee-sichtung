import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and, between, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('dateFrom') || '';
	const toDate = url.searchParams.get('dateTo') || '';
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [];

		// Datumsbereich hinzufügen, wenn vorhanden
		if (fromDate && toDate) {
			conditions.push(between(sightingsTable.sightingDate, fromDate, toDate));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified === '1') {
			conditions.push(eq(sightingsTable.verified, 1));
		} else if (verified === '0') {
			conditions.push(eq(sightingsTable.verified, 0));
		}

		// Eingangskanal-Filter
		if (entryChannel && entryChannel !== 'all') {
			conditions.push(eq(sightingsTable.entryChannel, parseInt(entryChannel)));
		}

		// Aufnahme-Filter
		if (mediaUpload === '1') {
			conditions.push(eq(sightingsTable.mediaUpload, 1));
		} else if (mediaUpload === '0') {
			conditions.push(eq(sightingsTable.mediaUpload, 0));
		}

		// Sichtungen aus der Datenbank abrufen
		const sightings = await db
			.select()
			.from(sightingsTable)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(sightingsTable.sightingDate);

		// Export-Metadaten hinzufügen
		const exportData = {
			metadata: {
				exportDate: new Date().toISOString(),
				recordCount: sightings.length,
				filters: {
					dateFrom: fromDate || null,
					dateTo: toDate || null,
					verified: verified || null,
					entryChannel: entryChannel || null,
					mediaUpload: mediaUpload || null
				}
			},
			sichtungen: sightings
		};

		// JSON-String erstellen (schön formatiert)
		const jsonContent = JSON.stringify(exportData, null, 2);

		// JSON-Datei zurückgeben
		return text(jsonContent, {
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.json"'
			}
		});
	} catch (error) {
		console.error('Fehler beim JSON-Export:', error);

		return text(JSON.stringify({ error: 'Fehler beim JSON-Export' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
};
