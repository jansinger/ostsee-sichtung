import { createLogger } from '$lib/logger.server';
import { getDistanceLabel } from '$lib/report/formOptions/distance';
import { getDistributionLabel } from '$lib/report/formOptions/distribution';
import { getSpeciesLabel } from '$lib/report/formOptions/species';
import { requireUserRole } from '$lib/server/auth/auth';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { text } from '@sveltejs/kit';
import { and } from 'drizzle-orm';
import { buildExportConditions, parseExportFilterParams } from '../exportFilterParams';
import type { RequestHandler } from './$types';

const logger = createLogger('api:sightings:export:csv');

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const filterResult = parseExportFilterParams(url);
	if ('error' in filterResult) {
		return text(filterResult.error.message, {
			status: 400,
			headers: { 'Content-Type': 'text/plain' }
		});
	}
	const { fromDate, toDate } = filterResult.params;

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = buildExportConditions(filterResult.params);

		// Sichtungen aus der Datenbank abrufen
		const sightings = await db
			.select()
			.from(sightingsTable)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(sightingsTable.sightingDate);

		// CSV-Header
		const headers = [
			'Referenz-ID',
			'Sichtungsdatum',
			'Meldedatum',
			'Email',
			'Name',
			'Telefon',
			'Tierart',
			'Anzahl Total',
			'Anzahl Jungtiere',
			'Entfernung',
			'Verteilung',
			'Längengrad',
			'Breitengrad',
			'Ort',
			'Position Unsicher',
			'Totfund',
			'Kommentar',
			'Seegang',
			'Wind',
			'Sicht',
			'Aufnahme',
			'Ostsee',
			'Verifiziert',
			'Eingangskanal'
		];

		// CSV-Zeilen erstellen
		const csvRows = sightings.map((sighting) => [
			sighting.referenceId || '',
			sighting.sightingDate || '',
			sighting.created || '',
			sighting.email || '',
			sighting.lastName || '',
			sighting.phone || '',
			getSpeciesLabel(sighting.species || 0),
			sighting.totalCount || '',
			sighting.juvenileCount || '',
			getDistanceLabel(sighting.distance || 0),
			getDistributionLabel(sighting.distribution || 0),
			sighting.longitude || '',
			sighting.latitude || '',
			sighting.city || '', // Using city instead of location
			'', // positionUncertain doesn't exist in schema
			sighting.isDead ? 'Ja' : 'Nein',
			(sighting.notes || '').replace(/"/g, '""'), // Using notes instead of comment
			sighting.seaState || '',
			sighting.windForce || '',
			sighting.visibility || '',
			sighting.mediaUpload ? 'Ja' : 'Nein',
			sighting.inBalticSeaGeo ? 'Ja' : 'Nein',
			sighting.verified ? 'Ja' : 'Nein',
			sighting.entryChannel || ''
		]);

		// CSV-String erstellen
		const csvContent = [
			headers.map((header) => `"${header}"`).join(','),
			...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(','))
		].join('\n');

		// Audit-Log schreiben
		await logAuditEvent({
			action: 'export.download',
			resourceType: 'export',
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			details: {
				format: 'csv',
				fromDate: fromDate || null,
				toDate: toDate || null
			}
		});

		// CSV-Datei zurückgeben
		return text(csvContent, {
			headers: {
				'Content-Type': 'text/csv;charset=utf-8',
				'Content-Disposition': 'attachment; filename="sichtungen-export.csv"'
			}
		});
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim CSV-Export'
		);

		return text('Fehler beim CSV-Export', {
			status: 500,
			headers: {
				'Content-Type': 'text/plain'
			}
		});
	}
};
