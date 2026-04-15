import { sightingSchema } from '$lib/form/validation/sightingSchema';
import { createLogger } from '$lib/logger.server';
import type { SightingFormData } from '$lib/report/types';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { requireUserRole } from '$lib/server/auth/auth';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { posix } from 'path';
import {
	loadSightingFiles,
	saveSightingFiles,
	updateSighting
} from '$lib/server/db/sightingRepository';
import type { ExifData } from '$lib/types';
import { createId } from '@paralleldrive/cuid2';
import { error, isHttpError, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function normalizeValue(value: unknown): unknown {
	if (value === undefined) return null;
	if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
	return value;
}

function getChangedFields(
	current: Record<string, unknown>,
	next: Record<string, unknown>
): string[] {
	return Object.keys(next).filter(
		(key) =>
			JSON.stringify(normalizeValue(current[key])) !== JSON.stringify(normalizeValue(next[key]))
	);
}

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings');

export const GET: RequestHandler = async ({ params, locals, url }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	// Extrahiere die Sichtungs-ID aus den URL-Parametern
	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		const sighting = await db
			.select()
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (sighting.length === 0) {
			logger.warn({ id }, 'Sichtung nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Lade auch die zugehörigen Dateien
		const uploadedFiles = await loadSightingFiles(Number(id));

		return json({
			...sighting[0],
			uploadedFiles
		});
	} catch (err) {
		if (isHttpError(err)) throw err;
		logger.error(err, 'Fehler beim Laden der Sichtung:');
		throw error(500, 'Interner Serverfehler');
	}
};

export const PUT: RequestHandler = async ({ params, request, locals, url, getClientAddress }) => {
	// Authorization check
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Daten aus dem Request-Body abrufen
		const requestData = await request.json();
		const { uploadedFiles, ...formData } = requestData as SightingFormData & {
			uploadedFiles?: unknown[];
		};

		logger.debug({ formData, uploadedFiles }, 'Sichtung speichern');

		// Validierung der Formulardaten
		await sightingSchema.validate(formData, { abortEarly: false });

		// Load current state for changedFields diff
		const currentRecords = await db
			.select()
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		const updatedSighting = await updateSighting(Number(id), {
			...formData,
			uploadedFiles: uploadedFiles || []
		});

		if (currentRecords.length > 0 && updatedSighting) {
			const changedFields = getChangedFields(
				currentRecords[0] as Record<string, unknown>,
				updatedSighting as unknown as Record<string, unknown>
			);
			const ipAddress = getClientIp(getClientAddress, request);
			await logAuditEvent({
				action: 'sighting.edit',
				resourceType: 'sighting',
				resourceId: String(id),
				...(locals.user?.email ? { userEmail: locals.user.email } : {}),
				...(ipAddress ? { ipAddress } : {}),
				details: { changedFields }
			});
		}

		if (!updatedSighting) {
			logger.warn({ id }, 'Sichtung nicht gefunden oder konnte nicht aktualisiert werden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Speichere Datei-Referenzen falls vorhanden
		if (uploadedFiles && uploadedFiles.length > 0) {
			// Verwende eine existierende referenceId oder generiere eine neue
			const referenceId = updatedSighting.referenceId || createId();

			// Transform uploadedFiles to match UploadedFileInfo interface
			const { getStorageProvider } = await import('$lib/server/storage/factory');
			const storageProvider = getStorageProvider();

			const fileInfos = uploadedFiles.map((file: unknown) => {
				const fileObj = file as Record<string, unknown>;

				// Validate filePath is actually a string before any operations
				if (typeof fileObj.filePath !== 'string' || !fileObj.filePath) {
					logger.warn({ filePath: fileObj.filePath }, 'Ungültiger Dateipfad erkannt');
					throw error(400, 'Ungültiger Dateipfad');
				}
				const filePath = fileObj.filePath;

				// Prevent path traversal: decode URL-encoded sequences, then normalize
				let decodedPath: string;
				try {
					decodedPath = decodeURIComponent(filePath);
				} catch {
					logger.warn({ filePath }, 'Nicht dekodierbarer Dateipfad erkannt');
					throw error(400, 'Ungültiger Dateipfad');
				}
				const normalizedPath = posix.normalize(decodedPath);
				if (
					normalizedPath === '..' ||
					normalizedPath.startsWith('../') ||
					normalizedPath.startsWith('/') ||
					normalizedPath.includes('\\') ||
					// Catch double-encoded sequences (%252e, %252f, %255c)
					filePath.toLowerCase().includes('%25')
				) {
					logger.warn({ filePath, normalizedPath }, 'Pfad-Traversal erkannt');
					throw error(400, 'Ungültiger Dateipfad');
				}

				const fileUrl = storageProvider.getUrl(filePath);

				return {
					uid: (fileObj.uid as string) || createId(),
					originalName: fileObj.originalName as string,
					fileName: (fileObj.fileName as string) || filePath,
					filePath,
					url: fileUrl,
					size: fileObj.size as number,
					mimeType: fileObj.mimeType as string,
					uploadedAt: (fileObj.uploadedAt as string) || new Date().toISOString(),
					exifData: fileObj.exifData as ExifData | null
				};
			});

			await saveSightingFiles(Number(id), fileInfos, referenceId);
		}

		return json(updatedSighting);
	} catch (err) {
		if (isHttpError(err)) throw err;
		logger.error({ err }, 'Fehler beim Aktualisieren der Sichtung:');
		throw error(500, 'Interner Serverfehler');
	}
};

export const DELETE: RequestHandler = async ({
	params,
	request,
	locals,
	url,
	getClientAddress
}) => {
	// Authorization check - only admins can delete
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const { id } = params;

	if (!id || isNaN(Number(id))) {
		logger.warn({ id }, 'Ungültige Sichtungs-ID für Löschung');
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Prüfen ob die Sichtung existiert
		const existingSighting = await db
			.select({ id: sightings.id })
			.from(sightings)
			.where(eq(sightings.id, Number(id)))
			.limit(1);

		if (existingSighting.length === 0) {
			logger.warn({ id }, 'Sichtung zum Löschen nicht gefunden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Sichtung löschen (cascade delete für zugehörige Dateien)
		await db.delete(sightings).where(eq(sightings.id, Number(id)));

		const ipAddress = getClientIp(getClientAddress, request);
		await logAuditEvent({
			action: 'sighting.delete',
			resourceType: 'sighting',
			resourceId: String(id),
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			...(ipAddress ? { ipAddress } : {})
		});

		logger.info({ id, deletedBy: locals.user?.email }, 'Sichtung erfolgreich gelöscht');

		return json({ success: true, message: 'Sichtung erfolgreich gelöscht' });
	} catch (err) {
		if (isHttpError(err)) throw err;
		logger.error({ err, id }, 'Fehler beim Löschen der Sichtung');
		throw error(500, 'Interner Serverfehler beim Löschen der Sichtung');
	}
};
