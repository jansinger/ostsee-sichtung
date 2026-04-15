import { version } from '../../../package.json';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { count, countDistinct, isNotNull } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [totalResult] = await db
			.select({ count: count() })
			.from(sightings)
			.where(isNotNull(sightings.approvedAt));

		const [observersResult] = await db
			.select({ count: countDistinct(sightings.email) })
			.from(sightings)
			.where(isNotNull(sightings.email));

		return {
			version,
			totalSightings: totalResult?.count ?? null,
			totalObservers: observersResult?.count ?? null
		};
	} catch {
		return {
			version,
			totalSightings: null,
			totalObservers: null
		};
	}
};
