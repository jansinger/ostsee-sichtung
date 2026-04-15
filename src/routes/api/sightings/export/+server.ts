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
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	// Filter-Parameter aus der URL extrahieren
	const fromDate = url.searchParams.get('fromDate') || '';
	const toDate = url.searchParams.get('toDate') || '';
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	// Datum-Parameter einzeln validieren (nur wenn gesetzt)
	if (fromDate && !isValidDateParam(fromDate)) {
		return json({ error: 'Ungültiges fromDate-Format. Erwartet: YYYY-MM-DD' }, { status: 400 });
	}
	if (toDate && !isValidDateParam(toDate)) {
		return json({ error: 'Ungültiges toDate-Format. Erwartet: YYYY-MM-DD' }, { status: 400 });
	}

	try {
		// Erstellen der Abfrage-Bedingungen
		const conditions = [];

		// Datumsbereich nur wenn beide Werte gültig sind
		if (isValidDateParam(fromDate) && isValidDateParam(toDate)) {
			conditions.push(between(sightingsTable.sightingDate, new Date(fromDate), new Date(toDate)));
		}

		// Verifizierungsstatus hinzufügen, wenn erforderlich
		if (verified === '1') {
			conditions.push(eq(sightingsTable.verified, 1));
		} else if (verified === '0') {
			conditions.push(eq(sightingsTable.verified, 0));
		}

		// Eingangskanal-Filter
		if (entryChannel && entryChannel !== 'all') {
			const channelId = parseInt(entryChannel, 10);
			if (!isNaN(channelId)) {
				conditions.push(eq(sightingsTable.entryChannel, channelId));
			}
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
