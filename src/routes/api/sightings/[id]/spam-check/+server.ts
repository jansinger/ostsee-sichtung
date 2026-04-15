import { createLogger } from '$lib/logger.server';
import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { detectSpamIndicators } from '$lib/server/spam/spamDetector';
import type { SightingFormValues } from '$lib/types/Form';
import { error, isHttpError, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

const logger = createLogger('api:sightings:spam-check');

export const GET: RequestHandler = async ({ params, locals, url }) => {
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		const sightingResult = await db
			.select()
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (!sightingResult || sightingResult.length === 0) {
			throw error(404, 'Sichtung nicht gefunden');
		}

		const sighting = sightingResult[0]!;

		// Convert DB row to SightingFormValues (same mapping as emailService)
		const sightingFormValues = {
			latitude: sighting.latitude ? parseFloat(sighting.latitude) : 0,
			longitude: sighting.longitude ? parseFloat(sighting.longitude) : 0,
			sightingDate: (sighting.sightingDate || new Date()).toISOString().split('T')[0] as string,
			species: sighting.species || 0,
			totalCount: sighting.totalCount || 1,
			firstName: sighting.firstName || '',
			lastName: sighting.lastName || '',
			email: sighting.email || '',
			privacyConsent: true,
			juvenileCount: sighting.juvenileCount || 0,
			waterway: sighting.waterway || undefined,
			seaMark: sighting.seaMark || undefined,
			notes: sighting.notes || undefined,
			isDead: !!sighting.isDead,
			distribution: sighting.distribution || 0,
			hasPosition: !!(sighting.latitude && sighting.longitude)
		} as SightingFormValues;

		const result = await detectSpamIndicators(sightingFormValues);

		logger.info(
			{ id, score: result.score, isHighRisk: result.isHighRisk },
			'Spam-Check für Sichtung durchgeführt'
		);

		return json(result);
	} catch (err) {
		if (isHttpError(err)) {
			throw err;
		}
		logger.error({ err, id }, 'Fehler beim Spam-Check');
		throw error(500, 'Interner Serverfehler beim Spam-Check');
	}
};
