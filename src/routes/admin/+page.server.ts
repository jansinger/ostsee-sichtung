import { db } from '$lib/server/db';
import { openOnly } from '$lib/server/db/approvalFilter';
import {
	MEDIA_UPLOAD_ANNOUNCED_MISSING,
	mediaUploadCondition
} from '$lib/server/db/mediaUploadFilter';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { and, asc, desc, inArray, like, sql } from 'drizzle-orm';
import { istTabellenUrl } from './tableRedirect';
import type { PageServerLoad } from './$types';

/**
 * Obergrenze der Eingangsseite. Eine Task-Liste ist kein Archiv: Wer mehr als
 * 50 offene Meldungen hat, arbeitet sie von oben ab — der Zähler nennt die
 * Gesamtzahl, nachladen ist unnötig (die Liste schrumpft beim Abarbeiten).
 */
const INBOX_LIMIT = 50;

export const load: PageServerLoad = async ({ url }) => {
	// Bookmarks der früheren Tabellen-URL (/admin?page=…) weiterleiten.
	if (istTabellenUrl(url)) {
		throw redirect(301, `/admin/sichtungen?${url.searchParams.toString()}`);
	}

	// Sortierrichtung nach Meldedatum. Default älteste zuerst (FIFO — nichts
	// bleibt liegen); per ?order=desc umkehrbar, gehalten in der URL.
	const order: 'asc' | 'desc' = url.searchParams.get('order') === 'desc' ? 'desc' : 'asc';

	const openQuery = db
		.select()
		.from(sightings)
		.where(openOnly())
		.orderBy(order === 'desc' ? desc(sightings.created) : asc(sightings.created))
		.limit(INBOX_LIMIT);

	const openCountQuery = db
		.select({ count: sql<number>`count(*)` })
		.from(sightings)
		.where(openOnly());

	const pendingPhotoQuery = db
		.select({ count: sql<number>`count(*)` })
		.from(sightings)
		.where(mediaUploadCondition(MEDIA_UPLOAD_ANNOUNCED_MISSING));

	// Bild-Vorschauen für genau die gelisteten Sichtungen — ein Query, in JS
	// gruppiert. Nur Bilder: Videos brauchen einen Player, das leistet die
	// Detailansicht. Per `.then()` an die Liste gekettet statt danach awaited:
	// so überlappt der Bild-Query mit den beiden Count-Queries, statt auf sie
	// zu warten (er hängt nur von der Liste ab).
	const openWithImagesQuery = openQuery.then(async (open) => {
		const ids = open.map((s) => s.id);
		const imageRows = ids.length
			? await db
					.select({
						id: sightingFiles.id,
						sightingId: sightingFiles.sightingId,
						filePath: sightingFiles.filePath,
						originalName: sightingFiles.originalName
					})
					.from(sightingFiles)
					.where(
						and(inArray(sightingFiles.sightingId, ids), like(sightingFiles.mimeType, 'image/%'))
					)
			: [];
		return { open, imageRows };
	});

	const [{ open, imageRows }, openCountResult, pendingPhotoResult] = await Promise.all([
		openWithImagesQuery,
		openCountQuery,
		pendingPhotoQuery
	]);

	const imagesBySighting: Record<number, { id: number; filePath: string; originalName: string }[]> =
		{};
	for (const row of imageRows) {
		if (row.sightingId == null) continue;
		(imagesBySighting[row.sightingId] ??= []).push({
			id: row.id,
			filePath: row.filePath,
			originalName: row.originalName
		});
	}

	return {
		open,
		openTotal: openCountResult[0]?.count || 0,
		order,
		imagesBySighting,
		pendingPhotoAnnouncements: pendingPhotoResult[0]?.count || 0
	};
};
