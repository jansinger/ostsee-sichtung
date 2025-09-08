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
import type { StoredWeatherData } from '$lib/services/weatherService';
import { db } from '$lib/server/db';
import { sightingFiles, sightings, type SightingSelect } from '$lib/server/db/schema';
import { getCachedWeatherData } from '$lib/server/services/weatherDeduplication';
import { getUploadPath } from '$lib/server/uploads';
import type { ExifData, UploadedFileInfo } from '$lib/types';
import type { SightingFormValues } from '$lib/types/Form';
import type { NewSighting, UpdateSighting } from '$lib/types/sighting';
import type { SightingFileInsert } from '$lib/types/sightingFile';
import { isImageFile } from '$lib/utils';
import { count, eq, isNotNull, not, sql } from 'drizzle-orm';
import { readImageExifData } from '../media/exifUtils';
import { mapFormToSighting } from './mapFormToSighting';
import { setSightingIdForReferenceId } from './sightingFilesRepository';

// Logger für Repository-Operationen
const logger = createLogger('db:sightingRepository');

/**
 * Speichert eine neue Sichtung mit verknüpften Mediendateien und Wetterdaten in der Datenbank
 *
 * Diese Funktion führt eine transaktionale Operation durch, bei der sowohl
 * die Sichtungsdaten als auch alle hochgeladenen Mediendateien mit ihren
 * EXIF-Metadaten und verfügbare Wetterdaten persistent gespeichert werden.
 *
 * @param formData Validierte Formulardaten aus dem Sichtungs-Formular
 * @param weatherData Optional: Wetterdaten für diese Sichtung (Issue #110)
 * @returns Objekt mit der generierten Sichtungs-ID
 *
 * @example
 * const result = await saveSighting(formData, weatherData);
 * console.log(`Neue Sichtung gespeichert mit ID: ${result.id}`);
 *
 * @throws {Error} Bei Datenbankfehlern oder Validierungsfehlern
 */
export const saveSighting = async (
	formData: SightingFormValues,
	weatherData?: StoredWeatherData
): Promise<{ id: number | undefined }> => {
	// Konvertiere Formulardaten in das normalisierte Datenbankschema
	const sightingData: NewSighting = mapFormToSighting(formData);

	// Add weather data fields if provided (Issue #110)
	if (weatherData) {
		sightingData.weatherData = weatherData;
		sightingData.weatherFetchedAt = new Date(weatherData.fetched_at);
		sightingData.weatherProvider = weatherData.provider;
		sightingData.weatherApiVersion = weatherData.api_version;
		sightingData.weatherDataType = weatherData.data_type;

		logger.info(
			{ 
				sightingData: { ...sightingData, weatherData: undefined }, // Don't log full weather data
				hasWeatherData: true,
				weatherProvider: weatherData.provider,
				weatherDataType: weatherData.data_type
			}, 
			'Speichere neue Sichtung mit Wetterdaten'
		);
	} else {
		logger.info({ sightingData }, 'Speichere neue Sichtung ohne Wetterdaten');
	}

	// Führe Hauptinsert-Operation mit automatischer ID-Generierung aus
	const [result] = await db.insert(sightings).values(sightingData).returning({ id: sightings.id });

	const sightingId = result?.id;

	if (!sightingId) {
		logger.error({ sightingData }, 'Fehler beim Speichern der Sichtung');
		throw new Error('Fehler beim Speichern der Sichtung');
	} else {
		// Update referenced media files
		await setSightingIdForReferenceId(formData.referenceId, sightingId);
		logger.info({ sightingId, hasWeatherData: !!weatherData }, 'Sichtung erfolgreich gespeichert');
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
				id: file.id,
				uid: file.uid,
				originalName: file.originalName,
				fileName: file.fileName,
				filePath: file.filePath,
				url: fileUrl || undefined, // Gespeicherte oder generierte URL
				size: file.size,
				mimeType: file.mimeType,
				uploadedAt: file.uploadedAt,
				exifData: exifData as ExifData | null // Typgecastete EXIF-Daten
			};
		})
	);

	return filesWithExif.map((file) => {
		return {
			...file,
			uploadedAt: file.uploadedAt ? new Date(file.uploadedAt).toISOString() : undefined
		};
	});
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

	const timestamp = new Date();

	// Normalisiere Datei-Metadaten für Datenbank-Schema
	const fileData: SightingFileInsert[] = uploadedFiles.map((file) => ({
		uid: file.uid,
		sightingId,
		referenceId,
		originalName: file.originalName,
		fileName: file.fileName || file.originalName,
		filePath: file.filePath,
		mimeType: file.mimeType,
		size: file.size,
		uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : timestamp,
		createdAt: timestamp, // Aktuelle Zeit als Erstellungsdatum
		exifData: file.exifData || null
	}));

	// Lösche zuerst alle bestehenden Datei-Referenzen für diese Sichtung
	await db.delete(sightingFiles).where(eq(sightingFiles.sightingId, sightingId));

	// Batch-Insert aller neuen Datei-Referenzen
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

/**
 * Interface für Statistik-Daten der FormHelp-Komponente
 */
export interface SightingStatistics {
	totalSightings: number;
	completionRate: number;
	averageOptionalFields: number;
	yearsOfService: number;
	uniqueUsers: number;
	sightingsWithMedia: number;
	deadAnimalsFound: number;
}

// Einträge mit falsch übermitteltem Datum aussortieren
const excludedDate = (() => {
	const res = new Date(0);
	res.setHours(2);
	return res;
})();

/**
 * Ermittelt statistische Daten über Sichtungen für die FormHelp-Komponente
 *
 * Diese Funktion berechnet verschiedene Metriken, die in der Hilfe-Sektion
 * angezeigt werden, um Benutzern den Wert ihrer Eingaben zu demonstrieren.
 *
 * @returns Promise mit statistischen Daten
 *
 * @example
 * const stats = await getSightingStatistics();
 * console.log(`Insgesamt ${stats.totalSightings} Sichtungen`);
 */
export const getSightingStatistics = async (): Promise<SightingStatistics> => {
	try {
		logger.info('Ermittle Sichtungs-Statistiken');

		// Gesamtanzahl Sichtungen
		const [totalResult] = await db.select({ count: count() }).from(sightings);

		const totalSightings = totalResult?.count || 0;

		const [mediaResult] = await db
			.selectDistinct({ count: count(sightingFiles.sightingId) })
			.from(sightingFiles);

		const sightingsWithMedia = mediaResult?.count || 0;

		// Completion Rate (Prozentsatz der Sichtungen mit mindestens 8 ausgefüllten optionalen Feldern)
		const completionRateQuery = await db
			.select({ count: count() })
			.from(sightings)
			.where(
				sql`(
					CASE WHEN ${sightings.seaState} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.visibility} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.windDirection} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.windForce} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.behavior} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.distribution} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.reaction} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.shipCount} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.shipName} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.boatType} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.sightingDate} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.notes} IS NOT NULL THEN 1 ELSE 0 END
				) >= 8`
			);

		const completeSightings = completionRateQuery[0]?.count || 0;
		const completionRate =
			totalSightings > 0 ? Math.round((completeSightings / totalSightings) * 100) : 0;

		// Durchschnittliche Anzahl ausgefüllter optionaler Felder
		const avgOptionalQuery = await db
			.select({
				avg: sql<number>`ROUND(AVG(
					CASE WHEN ${sightings.seaState} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.visibility} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.windDirection} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.windForce} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.behavior} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.distribution} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.reaction} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.shipCount} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.shipName} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.boatType} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.sightingDate} IS NOT NULL THEN 1 ELSE 0 END +
					CASE WHEN ${sightings.notes} IS NOT NULL THEN 1 ELSE 0 END
				))`
			})
			.from(sightings);

		const averageOptionalFields = avgOptionalQuery[0]?.avg || 0;

		// Jahre seit der ersten Sichtung
		const firstSightingQuery = await db
			.select({
				minDate: sql<string>`MIN(${sightings.sightingDate})`
			})
			.from(sightings)
			.where(not(eq(sightings.sightingDate, excludedDate)));

		const firstSighting = firstSightingQuery[0]?.minDate;
		const yearsOfService = firstSighting
			? new Date().getFullYear() - new Date(firstSighting).getFullYear()
			: 0;

		// Anzahl einzigartige Schiffe
		const uniqueUsersQuery = await db
			.select({ count: count() })
			.from(
				db
					.selectDistinct({ email: sightings.email })
					.from(sightings)
					.where(isNotNull(sightings.email))
					.as('unique_ships')
			);

		const uniqueUsers = uniqueUsersQuery[0]?.count || 0;

		// Anzahl Totfunde
		const deadAnimalsQuery = await db
			.select({ count: count() })
			.from(sightings)
			.where(eq(sightings.isDead, 1));

		const deadAnimalsFound = deadAnimalsQuery[0]?.count || 0;

		const statistics: SightingStatistics = {
			totalSightings,
			completionRate,
			averageOptionalFields,
			yearsOfService: Math.max(yearsOfService, 1), // Mindestens 1 Jahr anzeigen
			uniqueUsers,
			sightingsWithMedia,
			deadAnimalsFound
		};

		logger.info(
			{
				totalSightings,
				completionRate,
				averageOptionalFields,
				yearsOfService: statistics.yearsOfService,
				uniqueUsers,
				sightingsWithMedia,
				deadAnimalsFound
			},
			'Sichtungs-Statistiken erfolgreich ermittelt'
		);

		return statistics;
	} catch (error) {
		logger.error({ error }, 'Fehler beim Ermitteln der Sichtungs-Statistiken');

		// Fallback-Statistiken bei Datenbankfehlern
		return {
			totalSightings: 2847, // Fallback-Wert aus der ursprünglichen Implementierung
			completionRate: 89,
			averageOptionalFields: 8,
			yearsOfService: 15,
			uniqueUsers: 150,
			sightingsWithMedia: 1200,
			deadAnimalsFound: 25
		};
	}
};

/**
 * Ruft eine Sichtung anhand der ReferenzID ab
 *
 * Diese Funktion sucht nach einer Sichtung in der Datenbank anhand
 * ihrer eindeutigen ReferenzID und gibt die vollständigen Sichtungsdaten zurück.
 *
 * @param referenceId Die ReferenzID der zu suchenden Sichtung
 * @returns Sichtungsdaten oder null wenn nicht gefunden
 *
 * @example
 * const sighting = await getSightingByReferenceId('REF-2024-001');
 * if (sighting) {
 *   console.log(`Sichtung gefunden: ID ${sighting.id}`);
 * }
 *
 * @throws {Error} Bei Datenbankfehlern
 */
export const getSightingByReferenceId = async (referenceId: string) => {
	try {
		logger.info({ referenceId }, 'Suche Sichtung anhand ReferenzID');

		const result = await db
			.select()
			.from(sightings)
			.where(eq(sightings.referenceId, referenceId))
			.limit(1);

		const sighting = result[0] || null;

		if (sighting) {
			logger.info({ sightingId: sighting.id, referenceId }, 'Sichtung anhand ReferenzID gefunden');
		} else {
			logger.warn({ referenceId }, 'Keine Sichtung mit dieser ReferenzID gefunden');
		}

		return sighting;
	} catch (error) {
		logger.error({ error, referenceId }, 'Fehler beim Suchen der Sichtung anhand ReferenzID');
		throw error;
	}
};

/**
 * Lädt eine Sichtung mit Wetterdaten anhand der ID (Issue #110)
 *
 * @param sightingId ID der zu ladenden Sichtung
 * @returns Sichtung mit Wetterdaten oder null wenn nicht gefunden
 */
export const getSightingWithWeatherData = async (
	sightingId: number
): Promise<{ sighting: SightingSelect; weatherData: StoredWeatherData | null } | null> => {
	try {
		logger.info({ sightingId }, 'Lade Sichtung mit Wetterdaten');

		const result = await db
			.select()
			.from(sightings)
			.where(eq(sightings.id, sightingId))
			.limit(1);

		if (result.length === 0) {
			logger.warn({ sightingId }, 'Sichtung nicht gefunden');
			return null;
		}

		const sighting = result[0]!;
		const weatherData = sighting.weatherData as StoredWeatherData | null;

		logger.info(
			{ sightingId, hasWeatherData: !!weatherData },
			'Sichtung mit Wetterdaten geladen'
		);

		return {
			sighting,
			weatherData
		};
	} catch (error) {
		logger.error({ error, sightingId }, 'Fehler beim Laden der Sichtung mit Wetterdaten');
		throw error;
	}
};

/**
 * Aktualisiert die Wetterdaten einer bestehenden Sichtung (Issue #110)
 *
 * @param sightingId ID der zu aktualisierenden Sichtung
 * @param weatherData Neue Wetterdaten
 * @returns True wenn erfolgreich aktualisiert
 */
export const updateSightingWeatherData = async (
	sightingId: number,
	weatherData: StoredWeatherData
): Promise<boolean> => {
	try {
		logger.info(
			{ sightingId, weatherProvider: weatherData.provider, weatherDataType: weatherData.data_type },
			'Aktualisiere Wetterdaten für Sichtung'
		);

		const result = await db
			.update(sightings)
			.set({
				weatherData,
				weatherFetchedAt: new Date(weatherData.fetched_at),
				weatherProvider: weatherData.provider,
				weatherApiVersion: weatherData.api_version,
				weatherDataType: weatherData.data_type
			})
			.where(eq(sightings.id, sightingId))
			.returning({ id: sightings.id });

		const success = result.length > 0;

		logger.info(
			{ sightingId, success },
			'Wetterdaten-Update abgeschlossen'
		);

		return success;
	} catch (error) {
		logger.error({ error, sightingId }, 'Fehler beim Aktualisieren der Wetterdaten');
		throw error;
	}
};

/**
 * Prüft und lädt cached Wetterdaten für eine Position/Datum-Kombination (Issue #110)
 *
 * @param latitude Breitengrad der Sichtung
 * @param longitude Längengrad der Sichtung  
 * @param date Datum der Sichtung (YYYY-MM-DD)
 * @returns Cached Wetterdaten oder null
 */
export const getCachedWeatherForSighting = async (
	latitude: number,
	longitude: number,
	date: string
): Promise<StoredWeatherData | null> => {
	try {
		logger.debug({ latitude, longitude, date }, 'Prüfe cached Wetterdaten');

		const cachedData = await getCachedWeatherData(latitude, longitude, date);

		if (cachedData) {
			logger.info(
				{ latitude, longitude, date, fetchedAt: cachedData.fetched_at },
				'Cached Wetterdaten gefunden'
			);
		} else {
			logger.debug({ latitude, longitude, date }, 'Keine cached Wetterdaten verfügbar');
		}

		return cachedData;
	} catch (error) {
		logger.error({ error, latitude, longitude, date }, 'Fehler beim Laden cached Wetterdaten');
		return null;
	}
};

/**
 * Loads a single sighting by its ID from the database
 *
 * @param sightingId ID of the sighting
 * @returns Sighting data or null if not found
 */
export const getSightingById = async (sightingId: number): Promise<SightingSelect | null> => {
	try {
		logger.debug({ sightingId }, 'Loading sighting by ID');

		const [sighting] = await db
			.select()
			.from(sightings)
			.where(eq(sightings.id, sightingId))
			.limit(1);

		if (sighting) {
			logger.debug({ sightingId, hasWeatherData: !!sighting.weatherData }, 'Sighting found');
		} else {
			logger.warn({ sightingId }, 'Sighting not found');
		}

		return sighting || null;
	} catch (error) {
		logger.error({ error, sightingId }, 'Error loading sighting');
		throw error;
	}
};
