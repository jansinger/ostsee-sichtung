import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings:verify');

export const PATCH: RequestHandler = async ({ params, request, locals, url }: any) => {
	// Authorization check - only admins can verify
	requireUserRole(url, locals.user, ['admin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		logger.warn({ id }, 'Ungültige Sichtungs-ID für Verifizierung');
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Request body für neuen Status parsen
		const body = await request.json();
		const { verified } = body;

		// Validierung des verified Status
		if (verified !== 0 && verified !== 1) {
			logger.warn({ verified }, 'Ungültiger Verifizierungsstatus');
			throw error(400, 'Ungültiger Verifizierungsstatus. Muss 0 oder 1 sein.');
		}

		// Prüfen ob die Sichtung existiert
		const existingSighting = await db
			.select({ id: sightings.id, verified: sightings.verified })
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (existingSighting.length === 0) {
			logger.warn({ id }, 'Sichtung zum Verifizieren nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Verifizierungsstatus aktualisieren
		await db
			.update(sightings)
			.set({
				verified
			})
			.where(eq(sightings.id, Number(id)));

		logger.info(
			{
				id,
				previousStatus: existingSighting[0]?.verified,
				newStatus: verified,
				verifiedBy: locals.user?.email
			},
			'Verifizierungsstatus erfolgreich geändert'
		);

		return json({
			success: true,
			id: Number(id),
			verified,
			message: `Sichtung wurde ${verified === 1 ? 'verifiziert' : 'als nicht verifiziert markiert'}`
		});
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Ändern des Verifizierungsstatus');
		throw error(500, 'Interner Serverfehler beim Ändern des Verifizierungsstatus');
	}
};

export const GET: RequestHandler = async ({ params, locals, url }: any) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		const sighting = await db
			.select({ id: sightings.id, verified: sightings.verified })
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (sighting.length === 0) {
			logger.warn({ id }, 'Sichtung nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		return json({
			id: sighting[0]?.id,
			verified: sighting[0]?.verified
		});
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Abrufen des Verifizierungsstatus');
		throw error(500, 'Interner Serverfehler');
	}
};