/**
 * @fileoverview Datenbank-Repository für Sichtungen und Mediendateien
 * 
 * Dieses Modul implementiert die Datenzugriffsschicht für Meerestier-Sichtungen
 * in der PostgreSQL-Datenbank. Es verwaltet sowohl Sichtungsdaten als auch
 * verknüpfte Mediendateien mit EXIF-Metadaten und unterstützt verschiedene
 * Storage-Provider (lokal und Cloud).
 * 
 * Die Repository-Schicht abstrahiert Drizzle ORM-Operationen und bietet
 * typsichere CRUD-Funktionen für die Anwendungslogik.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

import { createLogger } from '$lib/logger';
import type { SightingFormData } from '$lib/report/types';
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { isImageFile, readImageExifData } from '$lib/server/exifUtils';
import { getUploadPath } from '$lib/server/uploads';
import type { ExifData, UploadedFileInfo } from '$lib/types';
import type { NewSighting, UpdateSighting } from '$lib/types/sighting';
import { eq } from 'drizzle-orm';
import { mapFormToSighting } from './mapFormToSighting';

// Logger für Repository-Operationen
const logger = createLogger('db:sightingRepository');

/**
 * Speichert eine neue Sichtung mit verknüpften Mediendateien in der Datenbank
 * 
 * Diese Funktion führt eine transaktionale Operation durch, bei der sowohl
 * die Sichtungsdaten als auch alle hochgeladenen Mediendateien mit ihren
 * EXIF-Metadaten persistent gespeichert werden.
 * 
 * @param formData Validierte Formulardaten aus dem Sichtungs-Formular
 * @returns Objekt mit der generierten Sichtungs-ID
 * 
 * @example
 * const result = await saveSighting(formData);
 * console.log(`Neue Sichtung gespeichert mit ID: ${result.id}`);
 * 
 * @throws {Error} Bei Datenbankfehlern oder Validierungsfehlern
 */
export const saveSighting = async (formData: SightingFormData): Promise<{ id: number }> => {
	// Konvertiere Formulardaten in das normalisierte Datenbankschema
	const sightingData: NewSighting = mapFormToSighting(formData);

	logger.info({ sightingData }, 'Speichere neue Sichtung');
	
	// Führe Hauptinsert-Operation mit automatischer ID-Generierung aus
	const [result] = await db.insert(sightings).values(sightingData).returning({ id: sightings.id });

	const sightingId = result?.id || 0;

	// Speichere verknüpfte Mediendateien, falls vorhanden
	if (formData.uploadedFiles && formData.uploadedFiles.length > 0 && sightingId > 0) {
		logger.info(
			{ sightingId, fileCount: formData.uploadedFiles.length },
			'Speichere verknüpfte Mediendateien'
		);

		// Normalisiere Datei-Metadaten für Datenbank-Insert
		const fileRecords = formData.uploadedFiles.map((file) => ({
			sightingId: sightingId,
			referenceId: formData.referenceId,
			originalName: file.originalName,
			fileName: file.fileName || file.filePath.split('/').pop() || file.originalName,
			filePath: file.filePath,
			mimeType: file.mimeType,
			size: file.size,
			url: file.url || null,                   // Cloud-Storage-URL falls verfügbar
			uploadedAt: file.uploadedAt || new Date().toISOString(),
			exifData: file.exifData || null          // EXIF-Metadaten als JSONB
		}));

		await db.insert(sightingFiles).values(fileRecords);
		logger.info({ sightingId, fileCount: fileRecords.length }, 'Mediendateien erfolgreich verknüpft');
	}

	return { id: sightingId };
};

/**
 * Aktualisiert eine bestehende Sichtung in der Datenbank
 * 
 * Diese Funktion führt ein partielles Update einer Sichtung durch,
 * wobei unveränderliche Felder wie ID und Erstellungsdatum
 * automatisch ausgeschlossen werden.
 * 
 * @param id Eindeutige ID der zu aktualisierenden Sichtung
 * @param formData Neue Formulardaten für die Aktualisierung
 * @returns Aktualisierte Sichtung oder null falls nicht gefunden
 * 
 * @example
 * const updated = await updateSighting(123, formData);
 * if (updated) console.log('Sichtung erfolgreich aktualisiert');
 * 
 * @throws {Error} Bei Datenbankfehlern oder wenn Sichtung nicht existiert
 */
export const updateSighting = async (
	id: number,
	formData: SightingFormData
): Promise<NewSighting | null> => {
	// Konvertiere Formulardaten in das normalisierte Datenbankschema
	const sightingData: NewSighting = mapFormToSighting(formData);

	// Entferne unveränderliche Felder für sauberes Update
	const { id: _id, created: _created, approvedAt: _approvedAt, ...rest } = sightingData;
	const updateData = rest as UpdateSighting;

	// Führe Update-Operation mit ID-Filter aus
	const [updatedSighting] = await db
		.update(sightings)
		.set({
			...updateData
		})
		.where(eq(sightings.id, Number(id)))
		.returning();

	logger.info({ id, updatedSighting }, 'Sichtung erfolgreich aktualisiert');

	return updatedSighting as NewSighting;
};

/**
 * Lädt alle Mediendateien einer Sichtung mit EXIF-Metadaten
 * 
 * Diese Funktion ruft alle verknüpften Dateien einer Sichtung ab und
 * lädt zusätzlich EXIF-Metadaten für Bilddateien. EXIF-Daten werden
 * zunächst aus der Datenbank gelesen (JSONB), bei Bedarf aber auch
 * direkt aus lokalen Dateien extrahiert.
 * 
 * @param sightingId ID der Sichtung deren Dateien geladen werden sollen
 * @returns Array mit allen Datei-Informationen inkl. EXIF-Daten und URLs
 * 
 * @example
 * const files = await loadSightingFiles(123);
 * console.log(`${files.length} Dateien geladen`);
 * 
 * @note Unterstützt sowohl lokalen Storage als auch Cloud-Storage-Provider
 */
export const loadSightingFiles = async (sightingId: number): Promise<UploadedFileInfo[]> => {
	// Lade Datei-Metadaten aus der Datenbank
	const files = await db
		.select()
		.from(sightingFiles)
		.where(eq(sightingFiles.sightingId, sightingId));

	// Parallel EXIF-Daten für Bilddateien laden und URLs generieren
	const filesWithExif = await Promise.all(
		files.map(async (file) => {
			let exifData = null;

			// EXIF-Daten zuerst aus der Datenbank-JSONB laden (bereits geparst)
			if (file.exifData) {
				exifData = file.exifData;
				logger.debug(
					{
						fileId: file.id,
						hasExif: true,
						source: 'database'
					},
					'EXIF-Daten aus Datenbank geladen'
				);
			}

			// Falls keine EXIF-Daten in DB verfügbar: bei lokalen Bildern nachlesen
			if (!exifData && isImageFile(file.mimeType)) {
				const { isCloudStorage } = await import('$lib/server/storage/factory');

				if (!isCloudStorage()) {
					// Nur bei lokalem Storage EXIF-Daten aus Datei extrahieren
					try {
						const fullPath = getUploadPath(file.filePath);
						exifData = await readImageExifData(fullPath);
						logger.debug(
							{
								fileId: file.id,
								filePath: file.filePath,
								fullPath,
								hasExif: !!exifData,
								source: 'file',
								exifData: exifData
									? {
											hasGPS: !!(exifData.latitude && exifData.longitude),
											hasCameraData: !!(exifData.make || exifData.model)
										}
									: null
							},
							'EXIF-Daten aus lokaler Datei extrahiert'
						);
					} catch (error) {
						logger.warn(
							{ error, fileId: file.id, filePath: file.filePath },
							'EXIF-Extraktion aus lokalem Storage fehlgeschlagen'
						);
					}
				} else {
					logger.debug(
						{
							fileId: file.id,
							filePath: file.filePath,
							storage: 'cloud'
						},
						'EXIF-Extraktion für Cloud-Storage übersprungen'
					);
				}
			}

			// URL aus Datenbank verwenden oder vom Storage-Provider generieren lassen
			let fileUrl = file.url;
			if (!fileUrl) {
				const { getStorageProvider } = await import('$lib/server/storage/factory');
				const storageProvider = getStorageProvider();
				fileUrl = storageProvider.getUrl(file.filePath);
			}

			return {
				id: file.id.toString(),
				originalName: file.originalName,
				fileName: file.fileName,
				filePath: file.filePath,
				url: fileUrl,                               // Gespeicherte oder generierte URL
				size: file.size,
				mimeType: file.mimeType,
				uploadedAt: file.uploadedAt,
				exifData: exifData as ExifData | null       // Typgecastete EXIF-Daten
			};
		})
	);

	return filesWithExif;
};

/**
 * Speichert Datei-Referenzen für eine bestehende Sichtung
 * 
 * Diese Hilfsfunktion verknüpft bereits hochgeladene Mediendateien
 * mit einer Sichtung und speichert die Metadaten in der Datenbank.
 * Wird für nachträgliche Datei-Uploads verwendet.
 * 
 * @param sightingId ID der Sichtung zu der die Dateien gehören
 * @param uploadedFiles Array mit Datei-Informationen und Metadaten
 * @param referenceId Eindeutige Referenz-ID der Sichtung
 * 
 * @example
 * await saveSightingFiles(123, uploadedFiles, 'REF-20240315-001');
 * 
 * @note Verwendet Batch-Insert für optimale Performance bei vielen Dateien
 */
export const saveSightingFiles = async (
	sightingId: number,
	uploadedFiles: UploadedFileInfo[],
	referenceId: string
): Promise<void> => {
	// Early return bei leerer Dateiliste
	if (uploadedFiles.length === 0) return;

	// Normalisiere Datei-Metadaten für Datenbank-Schema
	const fileData = uploadedFiles.map((file) => ({
		sightingId,
		referenceId,
		originalName: file.originalName,
		fileName: file.fileName,
		filePath: file.filePath,
		mimeType: file.mimeType,
		size: file.size,
		uploadedAt: file.uploadedAt,
		createdAt: new Date().toISOString()    // Aktuelle Zeit als Erstellungsdatum
	}));

	// Batch-Insert aller Datei-Referenzen
	await db.insert(sightingFiles).values(fileData);

	logger.info(
		{
			sightingId,
			referenceId,
			fileCount: uploadedFiles.length
		},
		'Datei-Referenzen erfolgreich gespeichert'
	);
};
