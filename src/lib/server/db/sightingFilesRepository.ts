import { createLogger } from '$lib/logger.server';
import type { UploadedFileInfo } from '$lib/types';
import { eq } from 'drizzle-orm';
import { db } from '.';
import { sightingFiles } from './schema';

const logger = createLogger('repository:sightingFiles');

export async function saveUploadedFile(
	uploadedFile: UploadedFileInfo,
	referenceId: string,
	sightingId?: number
) {
	// Speichere verknüpfte Mediendateien, falls vorhanden
	logger.info({ referenceId, sightingId }, 'Speichere hochgeladene Mediendatei');

	// Normalisiere Datei-Metadaten für Datenbank-Insert
	const fileRecord = {
		uid: uploadedFile.uid,
		sightingId: sightingId || null,
		referenceId: referenceId,
		originalName: uploadedFile.originalName,
		fileName: uploadedFile.fileName ?? uploadedFile.originalName,
		filePath: uploadedFile.filePath,
		mimeType: uploadedFile.mimeType,
		size: uploadedFile.size,
		url: uploadedFile.url || null, // Cloud-Storage-URL falls verfügbar
		uploadedAt: uploadedFile.uploadedAt ? new Date(uploadedFile.uploadedAt) : new Date(),
		exifData: uploadedFile.exifData || null // EXIF-Metadaten als JSONB
	};

	await db.insert(sightingFiles).values(fileRecord);
	logger.info({ referenceId, sightingId }, 'Mediendatei erfolgreich gespeichert');
}

export async function deleteFileByPath(filePath: string) {
	logger.info({ filePath }, 'Lösche Mediendatei');

	const result = await db
		.delete(sightingFiles)
		.where(eq(sightingFiles.filePath, filePath))
		.returning({ uid: sightingFiles.uid });
	logger.info({ filePath, count: result.length }, 'Mediendatei erfolgreich gelöscht');
}

export async function setSightingIdForReferenceId(referenceId: string, sightingId: number) {
	logger.info({ referenceId, sightingId }, 'Aktualisiere Mediendatein');

	const result = await db
		.update(sightingFiles)
		.set({ sightingId })
		.where(eq(sightingFiles.referenceId, referenceId))
		.returning({ uid: sightingFiles.uid });
	logger.info({ referenceId, count: result.length }, 'Mediendateien erfolgreich aktualisiert');
}
