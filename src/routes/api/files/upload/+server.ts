import { createLogger } from '$lib/logger';
import { readImageExifData } from '$lib/server/media/exifUtils';
import { getStorageProvider } from '$lib/server/storage/factory';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('FileUploadAPI');

// Upload-Ordner konfigurieren - keeping for backward compatibility but unused with storage abstraction
const _UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || 'uploads';

// Erlaubte Dateitypen (aus api/upload übernommen)
const ALLOWED_IMAGE_TYPES = [
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/bmp',
	'image/svg+xml'
];
const ALLOWED_VIDEO_TYPES = [
	'video/mp4',
	'video/avi',
	'video/mov',
	'video/wmv',
	'video/flv',
	'video/webm',
	'video/mkv',
	'video/m4v'
];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 100MB

// Get storage provider and upload file
const storage = getStorageProvider();

// Dateivalidierung (aus api/upload übernommen)
function validateFile(file: File): string[] {
	const errors: string[] = [];
	if (!(file instanceof File)) {
		errors.push('Ungültiges Dateiformat empfangen.');
		return errors;
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		errors.push(
			`${file.name}: Ungültiger MIME-Type "${file.type}". Nur Bild- und Videoformate sind erlaubt.`
		);
	}
	if (file.size > MAX_FILE_SIZE) {
		errors.push(
			`${file.name}: Datei zu groß (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 10MB`
		);
	}
	if (file.size === 0) {
		errors.push(`${file.name}: Datei ist leer.`);
	}
	if (!file.name || file.name.trim() === '') {
		errors.push('Dateiname ist ungültig.');
	}
	if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
		errors.push(`${file.name}: Unsicherer Dateiname.`);
	}
	return errors;
}

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

		if (!referenceId) {
			throw error(400, 'Reference ID ist erforderlich');
		}
		if (!uid) {
			throw error(400, 'Upload ID ist erforderlich');
		}

		// Validierung der Datei
		const validationErrors = validateFile(file);
		if (validationErrors.length > 0) {
			throw error(400, validationErrors.join(' '));
		}

		// JUST FOR TESTING await new Promise((f) => setTimeout(f, 5000));

		const fileBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(fileBuffer);

		const [uploadedFile, metadata] = await Promise.all([
			storage.upload(file, buffer, {
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

		return json({ ...uploadedFile, uid, exifData: metadata });
	} catch (err) {
		if (err instanceof Response) {
			throw err; // Re-throw SvelteKit errors
		}

		logger.error({ error: err }, 'Unerwarteter Fehler beim Datei-Upload');
		throw error(500, 'Interner Server-Fehler beim Datei-Upload');
	}
};
