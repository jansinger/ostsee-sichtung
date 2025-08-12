import type { SightingFormData } from '$lib/report/types';
import { sightingSchema } from '$lib/form/validation/sightingSchema';
import type { ExifData } from '$lib/types/types';
import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { updateSighting, loadSightingFiles, saveSightingFiles } from '$lib/server/db/sightingRepository';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Logger für diesen API-Endpunkt erstellen
const logger = createLogger('api:sightings');

export const GET: RequestHandler = async ({ params }) => {
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
		const files = await loadSightingFiles(Number(id));

		return json({
			...sighting[0],
			files
		});
	} catch (err) {
		logger.error(err, 'Fehler beim Laden der Sichtung:');
		throw error(500, 'Interner Serverfehler');
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const { id } = params;

	if (!id || isNaN(Number(id))) {
		throw error(400, 'Ungültige Sichtungs-ID');
	}

	try {
		// Daten aus dem Request-Body abrufen
		const requestData = await request.json();
		const { uploadedFiles, ...formData } = requestData as SightingFormData & { uploadedFiles?: unknown[] };

		logger.debug({ formData, uploadedFiles }, 'Sichtung speichern');

		// Validierung der Formulardaten
		await sightingSchema.validate(formData, { abortEarly: false });

		const updatedSighting = await updateSighting(Number(id), { ...formData, uploadedFiles: uploadedFiles || [] });

		if (!updatedSighting) {
			logger.warn({ id }, 'Sichtung nicht gefunden oder konnte nicht aktualisiert werden');
			throw error(404, 'Sichtung nicht gefunden');
		}

		// Speichere Datei-Referenzen falls vorhanden
		if (uploadedFiles && uploadedFiles.length > 0) {
			// Verwende eine existierende referenceId oder generiere eine neue
			const referenceId = updatedSighting.referenceId || `ref-${Date.now()}-admin`;
			
			// Transform uploadedFiles to match UploadedFileInfo interface
			const fileInfos = uploadedFiles.map((file: unknown) => {
				const fileObj = file as Record<string, unknown>;
				// Generate URL using storage provider
				const { getStorageProvider } = require('$lib/server/storage/factory');
				const storageProvider = getStorageProvider();
				const fileUrl = storageProvider.getUrl(fileObj.filePath as string);
				
				return {
					id: (fileObj.id as string) || Math.random().toString(36),
					originalName: fileObj.originalName as string,
					fileName: (fileObj.fileName as string) || (fileObj.filePath as string),
					filePath: fileObj.filePath as string,
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
		logger.error({ err }, 'Fehler beim Aktualisieren der Sichtung:');
		throw error(500, 'Interner Serverfehler');
	}
};
