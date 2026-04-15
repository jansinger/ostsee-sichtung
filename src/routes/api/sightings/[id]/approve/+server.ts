import { createLogger } from '$lib/logger';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { requireUserRole } from '$lib/server/auth/auth';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { error, isHttpError, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings:approve');

export const PATCH: RequestHandler = async ({ params, request, locals, url, getClientAddress }) => {
	// Authorization check - only admins can approve
	requireUserRole(url, locals.user, ['admin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		logger.warn({ id }, 'Ungültige Sichtungs-ID für Genehmigung');
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Request body für neuen Status parsen
		const body = await request.json();
		const { approve, internalComment } = body;

		// Validierung des approve Status (true/false wird zu timestamp/null)
		if (typeof approve !== 'boolean') {
			logger.warn({ approve }, 'Ungültiger Genehmigungsstatus');
			throw error(400, 'Genehmigungsstatus muss ein boolean sein.');
		}

		// Prüfen ob die Sichtung existiert
		const existingSighting = await db
			.select({
				id: sightings.id,
				approvedAt: sightings.approvedAt,
				internalComment: sightings.internalComment
			})
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (existingSighting.length === 0) {
			logger.warn({ id }, 'Sichtung zum Genehmigen nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Update-Objekt vorbereiten
		const updateData: {
			approvedAt: Date | null;
			internalComment?: string;
		} = {
			approvedAt: approve ? new Date() : null
		};

		// Optionalen internen Kommentar hinzufügen
		if (internalComment !== undefined) {
			if (typeof internalComment !== 'string') {
				throw error(400, 'Interner Kommentar muss ein String sein');
			}
			updateData.internalComment = internalComment;
		}

		// Genehmigungsstatus aktualisieren
		await db
			.update(sightings)
			.set(updateData)
			.where(eq(sightings.id, Number(id)));

		const ipAddress = getClientIp(getClientAddress, request);
		await logAuditEvent({
			action: approve ? 'sighting.approve' : 'sighting.reject',
			resourceType: 'sighting',
			resourceId: String(id),
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			...(ipAddress ? { ipAddress } : {}),
			details: { previousStatus: !!existingSighting[0]?.approvedAt }
		});

		logger.info(
			{
				id,
				previousStatus: existingSighting[0]?.approvedAt,
				newStatus: approve,
				approvedBy: locals.user?.email,
				hasComment: !!internalComment
			},
			'Genehmigungsstatus erfolgreich geändert'
		);

		return json({
			success: true,
			id: Number(id),
			approved: approve,
			internalComment: internalComment || existingSighting[0]?.internalComment,
			message: `Sichtung wurde ${approve ? 'genehmigt' : 'abgelehnt'}`
		});
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Ändern des Genehmigungsstatus');
		throw error(500, 'Interner Serverfehler beim Ändern des Genehmigungsstatus');
	}
};

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		const sighting = await db
			.select({
				id: sightings.id,
				approvedAt: sightings.approvedAt,
				internalComment: sightings.internalComment
			})
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (sighting.length === 0) {
			logger.warn({ id }, 'Sichtung nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		return json({
			id: sighting[0]?.id,
			approved: !!sighting[0]?.approvedAt,
			approvedAt: sighting[0]?.approvedAt,
			internalComment: sighting[0]?.internalComment
		});
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Abrufen des Genehmigungsstatus');
		throw error(500, 'Interner Serverfehler');
	}
};
