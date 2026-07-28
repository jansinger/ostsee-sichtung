import { createLogger } from '$lib/logger.server';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { requireUserRole } from '$lib/server/auth/auth';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import type { RequestHandler } from '@sveltejs/kit';
import { error, isHttpError, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings:verify');

/**
 * Eine Sichtung kennt genau zwei Zustände: ungeprüft und geprüft.
 * Geprüft bedeutet zugleich veröffentlicht — einen dritten Zustand
 * "geprüft, aber nicht freigegeben" gibt es fachlich nicht.
 *
 * Die Datenbank führt aus historischen Gründen zwei Spalten (`geprueft` und
 * `freigegeben_am`). Sie werden deshalb ausschließlich hier und immer
 * gemeinsam geschrieben: `freigegeben_am` trägt den Zeitpunkt der Prüfung,
 * `geprueft` das Kennzeichen. Die öffentlichen Flächen (Legacy-API und
 * Karte) filtern auf `freigegeben_am`.
 */
export const PATCH: RequestHandler = async ({ params, request, locals, url, getClientAddress }) => {
	// Authorization check - nur Admins dürfen prüfen und damit freigeben
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		logger.warn({ id }, 'Ungültige Sichtungs-ID für Prüfung');
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Request body für neuen Status parsen
		const body = await request.json();
		const { verified } = body;

		// Validierung des Prüfstatus
		if (verified !== 0 && verified !== 1) {
			logger.warn({ verified }, 'Ungültiger Prüfstatus');
			throw error(400, 'Ungültiger Prüfstatus. Muss 0 oder 1 sein.');
		}

		// Prüfen ob die Sichtung existiert
		const existingSighting = await db
			.select({
				id: sightings.id,
				verified: sightings.verified,
				approvedAt: sightings.approvedAt
			})
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (existingSighting.length === 0) {
			logger.warn({ id }, 'Sichtung zum Prüfen nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		const approved = verified === 1;
		// Freigabezeitpunkt: beim Prüfen setzen, beim Zurücknehmen löschen
		const approvedAt = approved ? new Date() : null;

		// Beide Spalten in einem einzigen Update, damit sie nicht auseinanderlaufen
		await db
			.update(sightings)
			.set({
				verified,
				approvedAt
			})
			.where(eq(sightings.id, Number(id)));

		const ipAddress = getClientIp(getClientAddress, request);
		await logAuditEvent({
			action: 'sighting.verify',
			resourceType: 'sighting',
			resourceId: String(id),
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			...(ipAddress ? { ipAddress } : {}),
			details: {
				verified,
				approved,
				previousVerified: existingSighting[0]?.verified,
				previouslyApproved: !!existingSighting[0]?.approvedAt
			}
		});

		logger.info(
			{
				id,
				previousStatus: existingSighting[0]?.verified,
				newStatus: verified,
				approvedAt,
				verifiedBy: locals.user?.email
			},
			'Prüfstatus erfolgreich geändert'
		);

		return json({
			success: true,
			id: Number(id),
			verified,
			approvedAt,
			message: `Sichtung wurde ${approved ? 'geprüft und freigegeben' : 'als ungeprüft markiert und zurückgezogen'}`
		});
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Ändern des Prüfstatus');
		throw error(500, 'Interner Serverfehler beim Ändern des Prüfstatus');
	}
};

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		const sighting = await db
			.select({
				id: sightings.id,
				verified: sightings.verified,
				approvedAt: sightings.approvedAt
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
			verified: sighting[0]?.verified,
			approvedAt: sighting[0]?.approvedAt ?? null
		});
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Abrufen des Prüfstatus');
		throw error(500, 'Interner Serverfehler');
	}
};
