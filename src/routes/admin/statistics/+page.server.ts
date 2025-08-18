import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

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
				withMedia: sql<number>`COUNT(CASE WHEN ${sightings.mediaFile} IS NOT NULL AND ${sightings.mediaFile} != '' THEN 1 END)::integer`
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
			.groupBy(sightings.species)
			.orderBy(sql`COUNT(*) DESC`);

		// Yearly trends (excluding obvious data errors)
		const yearlyStats = await db
			.select({
				year: sql<number>`EXTRACT(year FROM ${sightings.sightingDate}::timestamp)`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(
				sql`${sightings.sightingDate} IS NOT NULL 
					AND EXTRACT(year FROM ${sightings.sightingDate}::timestamp) BETWEEN 2010 AND 2025`
			)
			.groupBy(sql`EXTRACT(year FROM ${sightings.sightingDate}::timestamp)`)
			.orderBy(sql`EXTRACT(year FROM ${sightings.sightingDate}::timestamp)`);

		// Monthly distribution (last 10 years)
		const monthlyStats = await db
			.select({
				month: sql<number>`EXTRACT(month FROM ${sightings.sightingDate}::timestamp)`,
				sightings: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(
				sql`${sightings.sightingDate} IS NOT NULL 
					AND EXTRACT(year FROM ${sightings.sightingDate}::timestamp) BETWEEN 2015 AND 2024`
			)
			.groupBy(sql`EXTRACT(month FROM ${sightings.sightingDate}::timestamp)`)
			.orderBy(sql`EXTRACT(month FROM ${sightings.sightingDate}::timestamp)`);

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

		// Geographic distribution (top regions)
		const geographicStats = await db
			.select({
				seaState: sightings.seaState,
				count: sql<number>`COUNT(*)`
			})
			.from(sightings)
			.where(sql`${sightings.seaState} > 0`)
			.groupBy(sightings.seaState)
			.orderBy(sql`COUNT(*) DESC`);

		return {
			basicStats,
			speciesStats,
			yearlyStats,
			monthlyStats,
			recentActivity,
			geographicStats
		};
	} catch (error) {
		console.error('Error loading statistics:', error);
		throw error;
	}
};