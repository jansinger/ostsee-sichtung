import { createLogger } from '$lib/logger.server';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { and, eq, isNotNull, ne, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const logger = createLogger('admin:statistics:page');

export const load: PageServerLoad = async () => {
	try {
		// Basic statistics
		const [basicStats] = await db
			.select({
				totalSightings: sql<number>`COUNT(*)::integer`,
				avgGroupSize: sql<number>`COALESCE(AVG(${sightings.totalCount})::numeric, 0)`,
				maxGroupSize: sql<number>`COALESCE(MAX(${sightings.totalCount})::integer, 0)`,
				deadAnimals: sql<number>`COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END)::integer`,
				verifiedSightings: sql<number>`COUNT(CASE WHEN ${sightings.verified} = 1 THEN 1 END)::integer`,
				approvedSightings: sql<number>`COUNT(CASE WHEN ${sightings.approvedAt} IS NOT NULL THEN 1 END)::integer`,
				withMedia: sql<number>`COUNT(CASE WHEN ${sightings.mediaUpload} != 0 THEN 1 END)::integer`
			})
			.from(sightings);

		// Species distribution
		const speciesStats = await db
			.select({
				species: sightings.species,
				count: sql<number>`COUNT(*)::integer`,
				percentage: sql<number>`ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2)::numeric`,
				avgGroupSize: sql<number>`AVG(${sightings.totalCount})::numeric`,
				deadCount: sql<number>`COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END)::integer`,
				deadPercentage: sql<number>`ROUND(COUNT(CASE WHEN ${sightings.isDead} = 1 THEN 1 END) * 100.0 / COUNT(*), 2)::numeric`
			})
			.from(sightings)
			.where(eq(sightings.verified, 1))
			.groupBy(sightings.species)
			.orderBy(sql`COUNT(*) DESC`);

		// Jahr und Monat in deutscher Ortszeit gruppieren: `sichtungsdatum` hält
		// seit der UTC-Migration echte Zeitpunkte. Eine Sichtung am 01.01. um 00:30
		// Ortszeit steht darin als 31.12. 23:30 UTC und gehört trotzdem ins neue Jahr.
		// Yearly trends (excluding obvious data errors)
		const yearlyStats = await db
			.select({
				year: sql<number>`EXTRACT(year FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(and(isNotNull(sightings.sightingDate), eq(sightings.verified, 1)))
			.groupBy(
				sql`EXTRACT(year FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
			)
			.orderBy(
				sql`EXTRACT(year FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
			);

		// Monthly distribution (last 10 years)
		const monthlyStats = await db
			.select({
				month: sql<number>`EXTRACT(month FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(and(isNotNull(sightings.sightingDate), eq(sightings.verified, 1)))
			.groupBy(
				sql`EXTRACT(month FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
			)
			.orderBy(
				sql`EXTRACT(month FROM ${sightings.sightingDate} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
			);

		// Recent activity (last 30 days)
		const recentActivity = await db
			.select({
				date: sql<string>`DATE(${sightings.created})`,
				count: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(sql`${sightings.created} >= NOW() - INTERVAL '30 days'`)
			.groupBy(sql`DATE(${sightings.created})`)
			.orderBy(sql`DATE(${sightings.created}) DESC`)
			.limit(30);

		// User engagement statistics - simple version
		const [userCount] = await db
			.select({
				uniqueUsers: sql<number>`COUNT(DISTINCT email)::integer`
			})
			.from(sightings)
			.where(and(sql`email IS NOT NULL AND email != ''`, eq(sightings.verified, 1)));

		// Repeat users count - safe subquery approach
		const repeatUsers = await db
			.select({
				email: sql<string>`email`,
				count: sql<number>`COUNT(*)::integer`
			})
			.from(sightings)
			.where(and(sql`email IS NOT NULL AND email != ''`, eq(sightings.verified, 1)))
			.groupBy(sql`email`)
			.having(sql`COUNT(*) > 1`);

		const userStats = {
			uniqueUsers: userCount?.uniqueUsers || 0,
			repeatUsers: repeatUsers.length,
			repeatUserPercentage:
				(userCount?.uniqueUsers || 0) > 0
					? (repeatUsers.length / (userCount?.uniqueUsers || 1)) * 100
					: 0
		};

		// Ship name statistics - safe version
		const [shipCount] = await db
			.select({
				uniqueShips: sql<number>`COUNT(DISTINCT schiffsname)::integer`,
				totalWithShipName: sql<number>`COUNT(*)::integer`
			})
			.from(sightings)
			.where(and(sql`schiffsname IS NOT NULL AND schiffsname != ''`, eq(sightings.verified, 1)));

		const shipStats = [
			{
				uniqueShips: shipCount?.uniqueShips || 0,
				totalWithShipName: shipCount?.totalWithShipName || 0
			}
		];

		// Top observers - admin view with email addresses
		const topObservers = await db
			.select({
				email: sightings.email,
				sightingCount: sql<number>`COUNT(*)::integer`,
				firstSighting: sql<string>`MIN(${sightings.created})::date`,
				lastSighting: sql<string>`MAX(${sightings.created})::date`,
				avgGroupSize: sql<number>`AVG(${sightings.totalCount})::numeric`
			})
			.from(sightings)
			.where(
				sql`${sightings.email} IS NOT NULL AND ${sightings.email} != '' AND ${sightings.email} NOT LIKE '%@meeresmuseum.de' AND ${sightings.verified} = 1`
			)
			.groupBy(sightings.email)
			.having(sql`COUNT(*) > 1`)
			.orderBy(sql`COUNT(*) DESC`)
			.limit(10);

		// Data quality statistics - step-by-step safe approach
		const [totalVerified] = await db
			.select({ total: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(eq(sightings.verified, 1));

		const [coordVerified] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(
				and(
					eq(sightings.verified, 1),
					isNotNull(sightings.latitude),
					isNotNull(sightings.longitude)
				)
			);

		const [behaviorVerified] = await db
			.select({ count: sql<number>`COUNT(*)` })
			.from(sightings)
			.where(
				and(eq(sightings.verified, 1), isNotNull(sightings.behavior), ne(sightings.behavior, 0))
			);

		const qualityStats = [
			{
				withCoordinates: Number(coordVerified?.count) || 0,
				withBehavior: Number(behaviorVerified?.count) || 0,
				total: Number(totalVerified?.total) || 0
			}
		];

		// Geographic distribution (simplified)
		const geographicStats = await db
			.select({
				inBalticSea: sql<number>`COUNT(CASE WHEN ${sightings.inBalticSeaGeo} = 1 THEN 1 END)::integer`,
				outsideBalticSea: sql<number>`COUNT(CASE WHEN ${sightings.inBalticSeaGeo} = 0 THEN 1 END)::integer`,
				total: sql<number>`COUNT(*)::integer`
			})
			.from(sightings)
			.where(eq(sightings.verified, 1));

		return {
			basicStats,
			speciesStats,
			yearlyStats,
			monthlyStats,
			recentActivity,
			geographicStats,
			userStats,
			shipStats: shipStats[0] || { uniqueShips: 0, totalWithShipName: 0 },
			topObservers,
			qualityStats: qualityStats[0] || {
				withCoordinates: 0,
				withDate: 0,
				withBehavior: 0,
				withMedia: 0,
				total: 0
			}
		};
	} catch (error) {
		logger.error(
			{ error: error instanceof Error ? error.message : error },
			'Error loading statistics'
		);
		throw error;
	}
};
