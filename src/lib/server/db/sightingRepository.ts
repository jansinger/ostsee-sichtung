import { createLogger } from '$lib/logger';
import type { SightingFormData } from '$lib/report/types';
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { isImageFile, readImageExifData } from '$lib/server/exifUtils';
import { getUploadPath } from '$lib/server/uploads';
import type { NewSighting, UpdateSighting } from '$lib/types/sighting';
import type { UploadedFileInfo } from '$lib/types/types';
import { eq } from 'drizzle-orm';
import { mapFormToSighting } from './mapFormToSighting';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings');

/**
 * Speichert eine neue Sichtung in der Datenbank
 *
 * @param formData - Die Formulardaten aus dem Sichtungs-Formular
 * @returns Das gespeicherte Sichtungs-Objekt mit ID
 */
export const saveSighting = async (formData: SightingFormData): Promise<{ id: number }> => {
	// Konvertiere Formulardaten in das Datenbankschema
	const sightingData: NewSighting = mapFormToSighting(formData);

	logger.info({ sightingData }, 'Speichere neue Sichtung');
	// Führe Datenbankoperation aus
	const [result] = await db.insert(sightings).values(sightingData).returning({ id: sightings.id });

	const sightingId = result?.id || 0;

	// Speichere verknüpfte Dateien
	if (formData.uploadedFiles && formData.uploadedFiles.length > 0 && sightingId > 0) {
		logger.info(
			{ sightingId, fileCount: formData.uploadedFiles.length },
			'Speichere verknüpfte Dateien'
		);

		const fileRecords = formData.uploadedFiles.map((file) => ({
			sightingId: sightingId,
			referenceId: formData.referenceId,
			originalName: file.originalName,
			fileName: file.filePath.split('/').pop() || file.originalName, // Extract filename from path
			filePath: file.filePath,
			mimeType: file.mimeType,
			size: file.size,
			uploadedAt: new Date().toISOString()
		}));

		await db.insert(sightingFiles).values(fileRecords);
		logger.info({ sightingId, fileCount: fileRecords.length }, 'Dateien erfolgreich verknüpft');
	}

	return { id: sightingId }; // Fallback auf 0, falls ID nicht vorhanden ist
};

export const updateSighting = async (
	id: number,
	formData: SightingFormData
): Promise<NewSighting | null> => {
	// Konvertiere Formulardaten in das Datenbankschema
	const sightingData: NewSighting = mapFormToSighting(formData);

	// Entferne Felder, die nicht in der Datenbank gespeichert werden sollen
	const { id: _id, created: _created, approvedAt: _approvedAt, ...rest } = sightingData;
	const updateData = rest as UpdateSighting;

	// Aktualisiere den Datensatz
	const [updatedSighting] = await db
		.update(sightings)
		.set({
			...updateData
		})
		.where(eq(sightings.id, Number(id)))
		.returning();

	logger.info({ id, updatedSighting }, 'Sichtung aktualisiert');

	return updatedSighting as NewSighting;
};

/**
 * Lade alle Dateien für eine Sichtung mit EXIF-Daten
 */
export const loadSightingFiles = async (sightingId: number): Promise<UploadedFileInfo[]> => {
	const files = await db
		.select()
		.from(sightingFiles)
		.where(eq(sightingFiles.sightingId, sightingId));

	// Parallel EXIF-Daten für Bilder laden
	const filesWithExif = await Promise.all(
		files.map(async (file) => {
			let exifData = null;

			// EXIF-Daten nur für Bilder laden - aber nur bei lokalem Storage
			// Bei Cloud Storage sind die EXIF-Daten bereits beim Upload extrahiert worden
			if (isImageFile(file.mimeType)) {
				const { isCloudStorage } = await import('$lib/server/storage/factory');
				
				if (!isCloudStorage()) {
					// Nur bei lokalem Storage EXIF-Daten nachlesen
					try {
						const fullPath = getUploadPath(file.filePath);
						exifData = await readImageExifData(fullPath);
						logger.debug(
							{
								fileId: file.id,
								filePath: file.filePath,
								fullPath,
								hasExif: !!exifData,
								exifData: exifData
									? {
											hasGPS: !!(exifData.latitude && exifData.longitude),
											hasCameraData: !!(exifData.make || exifData.model)
										}
									: null
							},
							'EXIF data loaded for file from local storage'
						);
					} catch (error) {
						logger.warn(
							{ error, fileId: file.id, filePath: file.filePath },
							'Failed to load EXIF data from local storage'
						);
					}
				} else {
					// Bei Cloud Storage: EXIF-Daten sind beim Upload verarbeitet worden
					// Für jetzt keine weiteren Versuche, da die Tabelle noch kein exifData Feld hat
					logger.debug(
						{
							fileId: file.id,
							filePath: file.filePath,
							storage: 'cloud'
						},
						'Skipping EXIF extraction for cloud storage file'
					);
				}
			}

			// Get the correct URL from storage provider
			const { getStorageProvider } = await import('$lib/server/storage/factory');
			const storageProvider = getStorageProvider();
			const fileUrl = storageProvider.getUrl(file.filePath);

			return {
				id: file.id.toString(),
				originalName: file.originalName,
				fileName: file.fileName,
				filePath: file.filePath,
				url: fileUrl, // Use the provider's URL instead of hardcoded path
				size: file.size,
				mimeType: file.mimeType,
				uploadedAt: file.uploadedAt,
				exifData: exifData
					? {
							...exifData,
							// Convert Date to ISO string for JSON serialization
							dateTimeOriginal: exifData.dateTimeOriginal?.toISOString() || undefined
						}
					: null
			};
		})
	);

	return filesWithExif;
};

/**
 * Speichere Datei-Referenzen für eine Sichtung
 */
export const saveSightingFiles = async (
	sightingId: number,
	uploadedFiles: UploadedFileInfo[],
	referenceId: string
): Promise<void> => {
	if (uploadedFiles.length === 0) return;

	const fileData = uploadedFiles.map((file) => ({
		sightingId,
		referenceId,
		originalName: file.originalName,
		fileName: file.fileName,
		filePath: file.filePath,
		mimeType: file.mimeType,
		size: file.size,
		uploadedAt: file.uploadedAt,
		createdAt: new Date().toISOString()
	}));

	await db.insert(sightingFiles).values(fileData);

	logger.info(
		{
			sightingId,
			referenceId,
			fileCount: uploadedFiles.length
		},
		'Datei-Referenzen gespeichert'
	);
};
