import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { berlinCalendarDate } from '$lib/server/db/sqlTimeZone';
import {
	MEDIA_UPLOAD_ANNOUNCED_MISSING,
	mediaUploadCondition
} from '$lib/server/db/mediaUploadFilter';
import { balticSeaCondition } from '$lib/server/db/balticSeaFilter';
import { and, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { ServerConfigService } from '$lib/services/configService';
import { isValidDateParam } from './dateParam';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const paginationConfig = await ServerConfigService.getPaginationConfig();
	const requestedPerPage = Math.max(
		1,
		Number(url.searchParams.get('perPage')) || paginationConfig.defaultPageSize
	);
	// Enforce the maximum configured per page limit
	const perPage = Math.min(requestedPerPage, paginationConfig.maxSightingsPerPage);
	const sortBy = url.searchParams.get('sort') || 'sightingDate';
	const sortOrder = url.searchParams.get('order') || 'desc';
	const fromDate = url.searchParams.get('fromDate');
	const toDate = url.searchParams.get('toDate');
	const verified = url.searchParams.get('verified');
	const entryChannel = url.searchParams.get('entryChannel');
	const mediaUpload = url.searchParams.get('mediaUpload');
	const balticSea = url.searchParams.get('balticSea');

	// Bedingungen für die SQL-Abfrage sammeln
	const conditions = [];

	// Datums-Filter (nur mit validiertem YYYY-MM-DD Format)
	if (isValidDateParam(fromDate) && isValidDateParam(toDate)) {
		// Kalendertag in deutscher Ortszeit: `fromDate`/`toDate` kommen als lokales
		// "YYYY-MM-DD" aus der Admin-UI, `sichtungsdatum` hält seit der UTC-Migration
		// echte Zeitpunkte. Ohne Umrechnung fiele eine Sichtung vom 15.07. um 00:30
		// Ortszeit (= 14.07. 22:30 UTC) aus dem Filter.
		conditions.push(
			sql`${berlinCalendarDate(sightings.sightingDate)} BETWEEN ${fromDate} AND ${toDate}`
		);
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

	// Aufnahme-Filter (Media Upload) — inkl. „angekündigt, aber keine Datei
	// angehängt" (announced_missing), siehe mediaUploadFilter.ts.
	const mediaCondition = mediaUploadCondition(mediaUpload);
	if (mediaCondition) {
		conditions.push(mediaCondition);
	}

	// Ostsee-Status-Filter — dieselbe Fallunterscheidung wie die Anzeige in
	// getBalticSeaStatus(), siehe balticSeaFilter.ts.
	const balticSeaFilterCondition = balticSeaCondition(balticSea);
	if (balticSeaFilterCondition) {
		conditions.push(balticSeaFilterCondition);
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
		distribution: sightings.distribution,
		spamScore: sightings.spamScore
	};

	// Abfrage bauen
	const baseQuery = db.select().from(sightings);

	// WHERE-Klausel hinzufügen, wenn Bedingungen vorhanden sind
	const query = whereCondition ? baseQuery.where(whereCondition) : baseQuery;

	// Sortierung hinzufügen. NULLS LAST explizit in beide Richtungen: Postgres
	// sortiert DESC per Default NULLS FIRST — bei der nullbaren Spam-Spalte
	// stünden sonst die 19.000+ unbewerteten Altzeilen VOR den Treffern. Für
	// NOT-NULL-Spalten ist der Zusatz wirkungslos.
	const sortField = sortingMap[sortBy as keyof typeof sortingMap] || sightings.sightingDate;
	const sortedQuery =
		sortOrder === 'desc'
			? query.orderBy(sql`${sortField} desc nulls last`)
			: query.orderBy(sql`${sortField} asc nulls last`);

	// Paginierung hinzufügen
	const paginatedQuery = sortedQuery.limit(perPage).offset((page - 1) * perPage);

	// Count-Abfrage für Pagination
	const countBaseQuery = db.select({ count: sql<number>`count(*)` }).from(sightings);

	// WHERE-Klausel zur Count-Abfrage hinzufügen
	const countQuery = whereCondition ? countBaseQuery.where(whereCondition) : countBaseQuery;

	// Arbeitslisten-Zähler „Foto angekündigt, fehlt noch" — unabhängig vom
	// aktiven Filter, damit er als Hinweis im Dashboard-Kopf sichtbar ist, auch
	// wenn gerade eine andere Ansicht gefiltert ist.
	const pendingPhotoQuery = db
		.select({ count: sql<number>`count(*)` })
		.from(sightings)
		.where(mediaUploadCondition(MEDIA_UPLOAD_ANNOUNCED_MISSING));

	// Abfragen ausführen — voneinander unabhängig, deshalb parallel statt
	// sequenziell (drei Round-Trips gleichzeitig statt hintereinander).
	const [data, countResult, pendingPhotoResult] = await Promise.all([
		paginatedQuery,
		countQuery,
		pendingPhotoQuery
	]);
	const count = countResult[0]?.count || 0;
	const pendingPhotoAnnouncements = pendingPhotoResult[0]?.count || 0;

	return {
		sightings: data,
		pagination: {
			page,
			perPage,
			totalPages: Math.ceil(count / perPage),
			total: count,
			maxPerPage: paginationConfig.maxSightingsPerPage
		},
		pendingPhotoAnnouncements
	};
};
