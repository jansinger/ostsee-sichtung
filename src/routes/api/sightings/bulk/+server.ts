import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { inArray, sql } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings:bulk');

interface BulkDeleteRequest {
	ids: number[];
}

interface BulkVerifyRequest {
	ids: number[];
	verified: 0 | 1;
}

interface BulkUpdateRequest {
	ids: number[];
	updates: {
		verified?: 0 | 1;
		approve?: boolean;
		internalComment?: string;
	};
}

export const POST: RequestHandler = async ({ request, locals, url }: any) => {
	// Authorization check - only admins can perform bulk operations
	requireUserRole(url, locals.user, ['admin']);

	try {
		const body = await request.json();
		const action = url.searchParams.get('action');

		if (!action) {
			logger.warn('Keine Aktion für Bulk-Operation angegeben');
			throw error(400, 'Aktion ist erforderlich');
		}

		switch (action) {
			case 'delete':
				return await handleBulkDelete(body as BulkDeleteRequest, locals.user?.email);

			case 'verify':
				return await handleBulkVerify(body as BulkVerifyRequest, locals.user?.email);

			case 'update':
				return await handleBulkUpdate(body as BulkUpdateRequest, locals.user?.email);

			default:
				logger.warn({ action }, 'Ungültige Bulk-Aktion');
				throw error(400, `Ungültige Aktion: ${action}`);
		}
	} catch (err) {
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		logger.error({ err }, 'Fehler bei Bulk-Operation');
		throw error(500, 'Interner Serverfehler bei Bulk-Operation');
	}
};

async function handleBulkDelete(request: BulkDeleteRequest, userEmail?: string) {
	const { ids } = request;

	// Validierung
	if (!ids || !Array.isArray(ids) || ids.length === 0) {
		logger.warn('Keine oder ungültige IDs für Bulk-Löschung');
		throw error(400, 'IDs müssen als nicht-leeres Array angegeben werden');
	}

	if (ids.length > 100) {
		logger.warn({ count: ids.length }, 'Zu viele IDs für Bulk-Löschung');
		throw error(400, 'Maximal 100 Sichtungen können gleichzeitig gelöscht werden');
	}

	// Sicherstellen, dass alle IDs gültige Zahlen sind
	const validIds = ids.filter((id) => typeof id === 'number' && !isNaN(id));

	if (validIds.length !== ids.length) {
		logger.warn({ invalidIds: ids.filter((id) => !validIds.includes(id)) }, 'Ungültige IDs gefunden');
		throw error(400, 'Alle IDs müssen gültige Zahlen sein');
	}

	try {
		// Prüfen, welche Sichtungen existieren
		const existingSightings = await db
			.select({ id: sightings.id })
			.from(sightings)
			.where(inArray(sightings.id, validIds));

		const existingIds = existingSightings.map((s) => s.id);
		const notFoundIds = validIds.filter((id) => !existingIds.includes(id));

		// Löschoperation durchführen
		await db.delete(sightings).where(inArray(sightings.id, existingIds));

		logger.info(
			{
				deletedCount: existingIds.length,
				deletedIds: existingIds,
				notFoundIds,
				deletedBy: userEmail
			},
			'Bulk-Löschung erfolgreich'
		);

		return json({
			success: true,
			deleted: existingIds.length,
			deletedIds: existingIds,
			notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
			message: `${existingIds.length} Sichtung(en) erfolgreich gelöscht`
		});
	} catch (err) {
		logger.error({ err, ids: validIds }, 'Fehler bei Bulk-Löschung');
		throw error(500, 'Fehler beim Löschen der Sichtungen');
	}
}

async function handleBulkVerify(request: BulkVerifyRequest, userEmail?: string) {
	const { ids, verified } = request;

	// Validierung
	if (!ids || !Array.isArray(ids) || ids.length === 0) {
		logger.warn('Keine oder ungültige IDs für Bulk-Verifizierung');
		throw error(400, 'IDs müssen als nicht-leeres Array angegeben werden');
	}

	if (verified !== 0 && verified !== 1) {
		logger.warn({ verified }, 'Ungültiger Verifizierungsstatus');
		throw error(400, 'Verifizierungsstatus muss 0 oder 1 sein');
	}

	if (ids.length > 100) {
		logger.warn({ count: ids.length }, 'Zu viele IDs für Bulk-Verifizierung');
		throw error(400, 'Maximal 100 Sichtungen können gleichzeitig verifiziert werden');
	}

	const validIds = ids.filter((id) => typeof id === 'number' && !isNaN(id));

	if (validIds.length !== ids.length) {
		logger.warn({ invalidIds: ids.filter((id) => !validIds.includes(id)) }, 'Ungültige IDs gefunden');
		throw error(400, 'Alle IDs müssen gültige Zahlen sein');
	}

	try {
		// Update durchführen
		await db
			.update(sightings)
			.set({
				verified
			})
			.where(inArray(sightings.id, validIds));

		// Anzahl der aktualisierten Zeilen ermitteln
		const affectedRows = await db
			.select({ count: sql<number>`count(*)` })
			.from(sightings)
			.where(inArray(sightings.id, validIds));

		const updatedCount = affectedRows[0]?.count || 0;

		logger.info(
			{
				updatedCount,
				ids: validIds,
				verified,
				verifiedBy: userEmail
			},
			'Bulk-Verifizierung erfolgreich'
		);

		return json({
			success: true,
			updated: updatedCount,
			verified,
			message: `${updatedCount} Sichtung(en) ${verified === 1 ? 'verifiziert' : 'als nicht verifiziert markiert'}`
		});
	} catch (err) {
		logger.error({ err, ids: validIds, verified }, 'Fehler bei Bulk-Verifizierung');
		throw error(500, 'Fehler beim Verifizieren der Sichtungen');
	}
}

async function handleBulkUpdate(request: BulkUpdateRequest, userEmail?: string) {
	const { ids, updates } = request;

	// Validierung
	if (!ids || !Array.isArray(ids) || ids.length === 0) {
		logger.warn('Keine oder ungültige IDs für Bulk-Update');
		throw error(400, 'IDs müssen als nicht-leeres Array angegeben werden');
	}

	if (!updates || Object.keys(updates).length === 0) {
		logger.warn('Keine Updates für Bulk-Update angegeben');
		throw error(400, 'Mindestens ein Update-Feld ist erforderlich');
	}

	if (ids.length > 100) {
		logger.warn({ count: ids.length }, 'Zu viele IDs für Bulk-Update');
		throw error(400, 'Maximal 100 Sichtungen können gleichzeitig aktualisiert werden');
	}

	const validIds = ids.filter((id) => typeof id === 'number' && !isNaN(id));

	if (validIds.length !== ids.length) {
		logger.warn({ invalidIds: ids.filter((id) => !validIds.includes(id)) }, 'Ungültige IDs gefunden');
		throw error(400, 'Alle IDs müssen gültige Zahlen sein');
	}

	// Validierung der Update-Felder
	const allowedUpdates: Record<string, unknown> = {};

	if ('verified' in updates) {
		if (updates.verified !== 0 && updates.verified !== 1) {
			throw error(400, 'Verifizierungsstatus muss 0 oder 1 sein');
		}
		allowedUpdates.verified = updates.verified;
	}

	if ('approve' in updates) {
		if (typeof updates.approve !== 'boolean') {
			throw error(400, 'Genehmigungsstatus muss ein boolean sein');
		}
		allowedUpdates.approvedAt = updates.approve ? new Date().toISOString() : null;
	}

	if ('internalComment' in updates) {
		if (typeof updates.internalComment !== 'string') {
			throw error(400, 'Interner Kommentar muss ein String sein');
		}
		allowedUpdates.internalComment = updates.internalComment;
	}

	try {
		// Update durchführen
		await db
			.update(sightings)
			.set({
				...allowedUpdates
			})
			.where(inArray(sightings.id, validIds));

		// Anzahl der aktualisierten Zeilen ermitteln
		const affectedRows = await db
			.select({ count: sql<number>`count(*)` })
			.from(sightings)
			.where(inArray(sightings.id, validIds));

		const updatedCount = affectedRows[0]?.count || 0;

		logger.info(
			{
				updatedCount,
				ids: validIds,
				updates: allowedUpdates,
				updatedBy: userEmail
			},
			'Bulk-Update erfolgreich'
		);

		return json({
			success: true,
			updated: updatedCount,
			updates: allowedUpdates,
			message: `${updatedCount} Sichtung(en) erfolgreich aktualisiert`
		});
	} catch (err) {
		logger.error({ err, ids: validIds, updates: allowedUpdates }, 'Fehler bei Bulk-Update');
		throw error(500, 'Fehler beim Aktualisieren der Sichtungen');
	}
}