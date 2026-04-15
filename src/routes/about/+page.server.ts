import { version } from '../../../package.json';
import { createLogger } from '$lib/logger.server';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { and, count, countDistinct, isNotNull, ne } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const logger = createLogger('about:page');

export const load: PageServerLoad = async () => {
	try {
		const [totalResult] = await db
			.select({ count: count() })
			.from(sightings)
			.where(isNotNull(sightings.approvedAt));

		const [observersResult] = await db
			.select({ count: countDistinct(sightings.email) })
			.from(sightings)
			.where(
				and(isNotNull(sightings.approvedAt), isNotNull(sightings.email), ne(sightings.email, ''))
			);

		return {
			version,
			totalSightings: totalResult?.count ?? null,
			totalObservers: observersResult?.count ?? null
		};
	} catch (err) {
		logger.error({ err }, 'Fehler beim Laden der About-Statistiken');
		return {
			version,
			totalSightings: null,
			totalObservers: null
		};
	}
};
