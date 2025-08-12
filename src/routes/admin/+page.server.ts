import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page')) || 1;
	const perPage = Number(url.searchParams.get('perPage')) || 10;
	const sortBy = url.searchParams.get('sort') || 'sightingDate';
	const sortOrder = url.searchParams.get('order') || 'desc';
	const dateFrom = url.searchParams.get('dateFrom');
	const dateTo = url.searchParams.get('dateTo');
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');

	// Bedingungen für die SQL-Abfrage sammeln
	const conditions = [];

	// Datums-Filter
	if (dateFrom && dateTo) {
		conditions.push(sql`${sightings.sightingDate} BETWEEN ${dateFrom} AND ${dateTo}`);
	}

	// Verifizierungs-Filter (als Integer 0/1)
	if (verified === '1') {
		conditions.push(eq(sightings.verified, 1));
	} else if (verified === '0') {
		conditions.push(eq(sightings.verified, 0));
	}

	// Eingangskanal-Filter
	if (entryChannel && entryChannel !== 'all') {
		const channelId = parseInt(entryChannel);
		if (!isNaN(channelId)) {
			conditions.push(eq(sightings.entryChannel, channelId));
		}
	}

	// Aufnahme-Filter (Media Upload)
	if (mediaUpload === '1') {
		conditions.push(eq(sightings.mediaUpload, 1));
	} else if (mediaUpload === '0') {
		conditions.push(eq(sightings.mediaUpload, 0));
	}

	// Kombinierte WHERE-Bedingung erstellen
	const whereCondition =
		conditions.length > 0
			? conditions.length === 1
				? conditions[0]
				: and(...conditions)
			: undefined;

	// Sortierungs-Mapping
	const sortingMap = {
		sightingDate: sightings.sightingDate,
		created: sightings.created,
		email: sightings.email,
		species: sightings.species,
		totalCount: sightings.totalCount,
		distance: sightings.distance,
		juvenileCount: sightings.juvenileCount,
		distribution: sightings.distribution
	};

	// Abfrage bauen
	const baseQuery = db.select().from(sightings);

	// WHERE-Klausel hinzufügen, wenn Bedingungen vorhanden sind
	const query = whereCondition ? baseQuery.where(whereCondition) : baseQuery;

	// Sortierung hinzufügen
	const sortField = sortingMap[sortBy as keyof typeof sortingMap] || sightings.sightingDate;
	const sortedQuery =
		sortOrder === 'desc' ? query.orderBy(desc(sortField)) : query.orderBy(asc(sortField));

	// Paginierung hinzufügen
	const paginatedQuery = sortedQuery.limit(perPage).offset((page - 1) * perPage);

	// Count-Abfrage für Pagination
	const countBaseQuery = db.select({ count: sql<number>`count(*)` }).from(sightings);

	// WHERE-Klausel zur Count-Abfrage hinzufügen
	const countQuery = whereCondition ? countBaseQuery.where(whereCondition) : countBaseQuery;

	// Abfragen ausführen
	const data = await paginatedQuery;
	const countResult = await countQuery;
	const count = countResult[0]?.count || 0;

	return {
		sightings: data,
		pagination: {
			page,
			perPage,
			totalPages: Math.ceil(count / perPage),
			total: count
		}
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const idValue = formData.get('id');

		if (idValue) {
			const id = Number(idValue);
			if (!isNaN(id)) {
				await db.delete(sightings).where(eq(sightings.id, id));
				return { type: 'success' };
			}
		}

		return {
			type: 'error',
			error: 'Ungültige ID'
		};
	},

	toggleVerified: async ({ request }) => {
		const formData = await request.formData();
		const idValue = formData.get('id');
		const currentStateValue = formData.get('currentState');

		if (idValue && currentStateValue !== null) {
			const id = Number(idValue);
			const currentState = Number(currentStateValue);

			if (!isNaN(id)) {
				// Umgekehrter Wert: 0 -> 1, 1 -> 0
				const newState = currentState === 1 ? 0 : 1;

				await db.update(sightings).set({ verified: newState }).where(eq(sightings.id, id));

				return {
					type: 'success',
					newState: newState
				};
			}
		}

		return {
			type: 'error',
			error: 'Ungültige Daten'
		};
	}
};
