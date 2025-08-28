import { FILE_VALIDATION_PRESETS } from '$lib/constants/upload';
import { createLogger } from '$lib/logger';
import { saveUploadedFile } from '$lib/server/db/sightingFilesRepository';
import { readImageExifData } from '$lib/server/media/exifUtils';
import { getStorageProvider } from '$lib/server/storage/factory';
import { isDangerousFileType, validateMagicBytes } from '$lib/server/validation/magicBytes';
import { validateFile } from '$lib/utils/validation/fileValidation';
import { ServerConfigService } from '$lib/services/configService';
import { isCuid } from '@paralleldrive/cuid2';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('FileUploadAPI');

// Get storage provider and upload file
const storage = getStorageProvider();

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') || '';

		if (!contentType.includes('multipart/form-data')) {
			throw error(400, 'Content-Type muss multipart/form-data sein');
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;
		const referenceId = formData.get('referenceId') as string;
		const uid = formData.get('uid') as string;

		if (!file) {
			throw error(400, 'Keine Datei hochgeladen');
		}

		if (!referenceId || !isCuid(referenceId)) {
			throw error(400, 'Reference ID ist erforderlich');
		}
		if (!uid || !isCuid(uid)) {
			throw error(400, 'Upload ID ist erforderlich');
		}

		// Get upload configuration from database
		const uploadConfig = await ServerConfigService.getUploadConfig();
		
		// Create dynamic validation preset using configuration
		const dynamicPreset = {
			allowedTypes: uploadConfig.allowedTypes,
			maxFileSize: uploadConfig.maxFileSizeBytes,
			maxFiles: FILE_VALIDATION_PRESETS.MEDIA.maxFiles,
			accept: uploadConfig.allowedTypes.map(type => 
				type.startsWith('image/') ? 'image/*' : 
				type.startsWith('video/') ? 'video/*' : type
			).join(',')
		};

		// Validierung der Datei mit konfigurierten Werten
		const validationResult = validateFile(file, dynamicPreset);
		if (!validationResult.isValid) {
			throw error(400, validationResult.errors.join(' '));
		}

		// JUST FOR TESTING await new Promise((f) => setTimeout(f, 5000));

		const fileBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(fileBuffer);

		// Validate magic bytes to ensure file content matches declared type
		const magicBytesValidation = validateMagicBytes(buffer, file.type);
		if (!magicBytesValidation.isValid) {
			logger.warn(
				{
					fileName: file.name,
					declaredType: file.type,
					detectedType: magicBytesValidation.actualType,
					referenceId
				},
				'File type mismatch detected'
			);
			throw error(
				400,
				magicBytesValidation.message || 'Dateiinhalt stimmt nicht mit dem angegebenen Typ überein'
			);
		}

		// Check for potentially dangerous file types
		if (isDangerousFileType(file.type)) {
			logger.warn(
				{
					fileName: file.name,
					fileType: file.type,
					referenceId
				},
				'Potentially dangerous file type rejected'
			);
			throw error(400, 'Dieser Dateityp ist aus Sicherheitsgründen nicht erlaubt');
		}

		const [uploadedFile, metadata] = await Promise.all([
			storage.upload(file, buffer, {
				uid,
				referenceId,
				preserveOriginalName: false
			}),
			readImageExifData(buffer)
		]);

		logger.info(
			{
				fileInfo: uploadedFile,
				referenceId,
				uid,
				size: file.size
			},
			'Datei erfolgreich hochgeladen'
		);

		uploadedFile.exifData = metadata;

		// Speichere die hochgeladene Datei in der Datenbank
		await saveUploadedFile(uploadedFile, referenceId);

		return json(uploadedFile);
	} catch (err) {
		if (err instanceof Response) {
			throw err; // Re-throw SvelteKit errors
		}

		logger.error({ error: err }, 'Unerwarteter Fehler beim Datei-Upload');
		throw error(500, 'Interner Server-Fehler beim Datei-Upload');
	}
};
