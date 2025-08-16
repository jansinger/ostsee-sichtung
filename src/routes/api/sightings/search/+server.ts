import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, between, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings:search');

interface SearchFilters {
	dateFrom?: string;
	dateTo?: string;
	species?: string[];
	verified?: boolean;
	approved?: boolean;
	isDead?: boolean;
	entryChannel?: number[];
	mediaUpload?: boolean;
	waterway?: string;
	minDistance?: number;
	maxDistance?: number;
	hasLocation?: boolean;
	searchTerm?: string;
}

interface PaginationOptions {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
}

export const POST: RequestHandler = async ({ request, locals }: any) => {
	try {
		const body = await request.json();
		const { filters = {}, pagination = {} } = body as {
			filters: SearchFilters;
			pagination: PaginationOptions;
		};

		// Optional: Require authentication for search
		const isAuthenticated = locals.user !== null;
		const isAdmin = isAuthenticated && locals.user?.role === 'admin';

		// Build search conditions
		const conditions = buildSearchConditions(filters, isAdmin);

		// Pagination defaults
		const page = Math.max(1, pagination.page || 1);
		const limit = Math.min(100, Math.max(1, pagination.limit || 20));
		const offset = (page - 1) * limit;

		// Sorting
		const sortBy = getSortField(pagination.sortBy);
		const sortOrder = pagination.sortOrder === 'asc' ? 'asc' : 'desc';

		// Build and execute query
		const baseQuery = db
			.select({
				id: sightings.id,
				sightingDate: sightings.sightingDate,
				created: sightings.created,
				species: sightings.species,
				totalCount: sightings.totalCount,
				juvenileCount: sightings.juvenileCount,
				isDead: sightings.isDead,
				latitude: sightings.latitude,
				longitude: sightings.longitude,
				waterway: sightings.waterway,
				distance: sightings.distance,
				distribution: sightings.distribution,
				verified: sightings.verified,
				approvedAt: sightings.approvedAt,
				mediaUpload: sightings.mediaUpload,
				entryChannel: sightings.entryChannel,
				// Conditional fields based on consent
				firstName: sql<string | null>`CASE WHEN ${sightings.nameConsent} = 1 THEN ${sightings.firstName} ELSE NULL END`,
				lastName: sql<string | null>`CASE WHEN ${sightings.nameConsent} = 1 THEN ${sightings.lastName} ELSE NULL END`,
				email: isAdmin ? sightings.email : sql<null>`NULL`,
				shipName: sql<string | null>`CASE WHEN ${sightings.shipNameConsent} = 1 THEN ${sightings.shipName} ELSE NULL END`,
				// Admin-only fields
				internalComment: isAdmin ? sightings.internalComment : sql<null>`NULL`
			})
			.from(sightings);

		// Execute query with conditions, sorting and pagination
		const results = await (conditions.length > 0
			? baseQuery.where(and(...conditions))
			: baseQuery)
			.orderBy(sortOrder === 'asc' ? sql`${sortBy} ASC` : sql`${sortBy} DESC`)
			.limit(limit)
			.offset(offset);

		// Get total count for pagination
		const countBaseQuery = db
			.select({ count: sql<number>`count(*)` })
			.from(sightings);

		const countResult = await (conditions.length > 0
			? countBaseQuery.where(and(...conditions))
			: countBaseQuery);
		const totalCount = countResult[0]?.count || 0;
		const totalPages = Math.ceil(totalCount / limit);

		logger.info(
			{
				filters,
				pagination,
				resultCount: results.length,
				totalCount,
				user: locals.user?.email
			},
			'Sichtungssuche durchgeführt'
		);

		return json({
			success: true,
			data: results,
			pagination: {
				page,
				limit,
				totalCount,
				totalPages,
				hasNext: page < totalPages,
				hasPrevious: page > 1
			}
		});
	} catch (err) {
		logger.error({ err }, 'Fehler bei der Sichtungssuche');
		return json(
			{
				success: false,
				error: 'Fehler bei der Suche'
			},
			{ status: 500 }
		);
	}
};

function buildSearchConditions(filters: SearchFilters, isAdmin: boolean): any[] {
	const conditions = [];

	// Date range filter
	if (filters.dateFrom && filters.dateTo) {
		conditions.push(between(sightings.sightingDate, filters.dateFrom, filters.dateTo));
	} else if (filters.dateFrom) {
		conditions.push(gte(sightings.sightingDate, filters.dateFrom));
	} else if (filters.dateTo) {
		conditions.push(lte(sightings.sightingDate, filters.dateTo));
	}

	// Species filter (species is stored as integer in DB)
	if (filters.species && filters.species.length > 0) {
		// Ensure species are numbers
		const speciesNumbers = filters.species.map((s) => typeof s === 'number' ? s : parseInt(s as any));
		conditions.push(inArray(sightings.species, speciesNumbers));
	}

	// Verification status
	if (filters.verified !== undefined) {
		conditions.push(eq(sightings.verified, filters.verified ? 1 : 0));
	}

	// Approval status (admin only)
	if (isAdmin && filters.approved !== undefined) {
		if (filters.approved) {
			conditions.push(isNotNull(sightings.approvedAt));
		} else {
			conditions.push(isNull(sightings.approvedAt));
		}
	}

	// Dead animal filter
	if (filters.isDead !== undefined) {
		conditions.push(eq(sightings.isDead, filters.isDead ? 1 : 0));
	}

	// Entry channel filter
	if (filters.entryChannel && filters.entryChannel.length > 0) {
		conditions.push(inArray(sightings.entryChannel, filters.entryChannel));
	}

	// Media upload filter
	if (filters.mediaUpload !== undefined) {
		conditions.push(eq(sightings.mediaUpload, filters.mediaUpload ? 1 : 0));
	}

	// Waterway filter
	if (filters.waterway) {
		conditions.push(ilike(sightings.waterway, `%${filters.waterway}%`));
	}

	// Distance range filter
	if (filters.minDistance !== undefined && filters.maxDistance !== undefined) {
		conditions.push(
			and(
				gte(sightings.distance, filters.minDistance),
				lte(sightings.distance, filters.maxDistance)
			)
		);
	} else if (filters.minDistance !== undefined) {
		conditions.push(gte(sightings.distance, filters.minDistance));
	} else if (filters.maxDistance !== undefined) {
		conditions.push(lte(sightings.distance, filters.maxDistance));
	}

	// Location filter
	if (filters.hasLocation === true) {
		conditions.push(
			and(
				isNotNull(sightings.latitude),
				isNotNull(sightings.longitude)
			)
		);
	} else if (filters.hasLocation === false) {
		conditions.push(
			or(
				isNull(sightings.latitude),
				isNull(sightings.longitude)
			)
		);
	}

	// Full text search
	if (filters.searchTerm) {
		const searchPattern = `%${filters.searchTerm}%`;
		const searchConditions = [
			ilike(sightings.waterway, searchPattern)
		];

		// Include name fields if consent given
		searchConditions.push(
			sql`${sightings.nameConsent} = 1 AND (
				${sightings.firstName} ILIKE ${searchPattern} OR
				${sightings.lastName} ILIKE ${searchPattern}
			)`
		);

		// Include ship name if consent given
		searchConditions.push(
			sql`${sightings.shipNameConsent} = 1 AND ${sightings.shipName} ILIKE ${searchPattern}`
		);

		// Admin can search in all fields
		if (isAdmin) {
			searchConditions.push(
				ilike(sightings.email, searchPattern),
				ilike(sightings.phone, searchPattern),
				ilike(sightings.internalComment, searchPattern)
			);
		}

		conditions.push(or(...searchConditions));
	}

	return conditions;
}

function getSortField(sortBy?: string): any {
	const sortFieldMap: Record<string, unknown> = {
		date: sightings.sightingDate,
		created: sightings.created,
		species: sightings.species,
		count: sightings.totalCount,
		distance: sightings.distance,
		waterway: sightings.waterway,
		verified: sightings.verified,
		approvedAt: sightings.approvedAt
	};

	return sortFieldMap[sortBy || 'date'] || sightings.sightingDate;
}

export const GET: RequestHandler = async ({ url, locals }: any) => {
	// Simple GET endpoint for basic queries
	try {
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = Math.min(100, Number(url.searchParams.get('limit')) || 20);
		const species = url.searchParams.get('species');
		const year = url.searchParams.get('year');

		const conditions = [];

		// Year filter
		if (year) {
			const yearNum = parseInt(year);
			if (!isNaN(yearNum)) {
				const startDate = new Date(yearNum, 0, 1);
				const endDate = new Date(yearNum + 1, 0, 1);
				conditions.push(
					and(
						gte(sightings.sightingDate, startDate.toISOString()),
						lte(sightings.sightingDate, endDate.toISOString())
					)
				);
			}
		}

		// Species filter
		if (species) {
			const speciesNum = parseInt(species);
			if (!isNaN(speciesNum)) {
				conditions.push(eq(sightings.species, speciesNum));
			}
		}

		// Only show approved sightings for public access
		if (!locals.user || locals.user.role !== 'admin') {
			conditions.push(isNotNull(sightings.approvedAt));
		}

		const offset = (page - 1) * limit;

		const baseQuery = db
			.select({
				id: sightings.id,
				sightingDate: sightings.sightingDate,
				species: sightings.species,
				totalCount: sightings.totalCount,
				latitude: sightings.latitude,
				longitude: sightings.longitude,
				waterway: sightings.waterway,
				isDead: sightings.isDead
			})
			.from(sightings);

		const results = await (conditions.length > 0
			? baseQuery.where(and(...conditions))
			: baseQuery)
			.orderBy(desc(sightings.sightingDate))
			.limit(limit)
			.offset(offset);

		return json({
			success: true,
			data: results
		});
	} catch (err) {
		logger.error({ err }, 'Fehler beim Abrufen der Sichtungen');
		return json(
			{
				success: false,
				error: 'Fehler beim Abrufen der Daten'
			},
			{ status: 500 }
		);
	}
};