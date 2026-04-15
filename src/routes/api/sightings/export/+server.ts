import { createLogger } from '$lib/logger.server';
import { requireUserRole } from '$lib/server/auth/auth';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, between, eq } from 'drizzle-orm';
import { isValidDateParam } from '../../../admin/dateParam';
import type { RequestHandler } from './$types';

const logger = createLogger('api:sightings:export');

export const GET: RequestHandler = async ({ url, locals }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('fromDate') || '';
	const toDate = url.searchParams.get('toDate') || '';
	const verified = url.searchParams.get('verified') === '1';
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	// Datum-Parameter validieren
	if ((fromDate || toDate) && !(isValidDateParam(fromDate) && isValidDateParam(toDate))) {
		return json({ error: 'Ungültiges Datumsformat. Erwartet: YYYY-MM-DD' }, { status: 400 });
	}

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [];

		// Datumsbereich hinzufügen, wenn vorhanden
		if (isValidDateParam(fromDate) && isValidDateParam(toDate)) {
			conditions.push(between(sightingsTable.sightingDate, new Date(fromDate), new Date(toDate)));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified) {
			conditions.push(eq(sightingsTable.verified, 1));
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

		// Audit-Log schreiben
		await logAuditEvent({
			action: 'export.download',
			resourceType: 'export',
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			details: {
				format: 'json',
				fromDate: fromDate || null,
				toDate: toDate || null
			}
		});

		// Erfolgreiche Antwort zurückgeben
		return json({
			sightings,
			count: sightings.length
		});
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Fehler beim Abrufen der Sichtungen für den Export'
		);

		// Fehlerantwort zurückgeben
		return json({ error: 'Fehler beim Abrufen der Sichtungen' }, { status: 500 });
	}
};
