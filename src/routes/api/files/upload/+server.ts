import { FILE_VALIDATION_PRESETS } from '$lib/constants/upload';
import { createLogger } from '$lib/logger';
import { saveUploadedFile } from '$lib/server/db/sightingFilesRepository';
import { readImageExifData } from '$lib/server/media/exifUtils';
import { getStorageProvider } from '$lib/server/storage/factory';
import { isDangerousFileType, validateMagicBytes } from '$lib/server/validation/magicBytes';
import { validateFile } from '$lib/utils/validation/fileValidation';
import { ServerConfigService } from '$lib/services/configService';
import {
	RATE_LIMITS,
	enforceRateLimit,
	createRateLimitIdentifier
} from '$lib/server/middleware/rateLimit';
import { isCuid } from '@paralleldrive/cuid2';
import { error, isHttpError, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('FileUploadAPI');

// Get storage provider and upload file
const storage = getStorageProvider();

export const POST: RequestHandler = async ({ request, locals }) => {
	// Security: Track authentication status
	const isAuthenticated = !!locals.user;
	const userIdentifier = locals.user?.sub || 'anonymous';
	const clientIp =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

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

		// Security: Stricter limits for unauthenticated users
		const MAX_SIZE_ANONYMOUS = 5 * 1024 * 1024; // 5MB for anonymous users
		const MAX_SIZE_AUTHENTICATED = 50 * 1024 * 1024; // 50MB for authenticated users

		if (!isAuthenticated && file.size > MAX_SIZE_ANONYMOUS) {
			logger.warn(
				{
					action: 'file_upload_rejected',
					reason: 'size_limit_exceeded',
					user: userIdentifier,
					clientIp,
					fileName: file.name,
					fileSize: file.size,
					maxAllowed: MAX_SIZE_ANONYMOUS
				},
				'Anonymous upload rejected - file too large'
			);
			throw error(413, 'Datei zu groß. Für größere Dateien bitte anmelden.');
		}

		if (isAuthenticated && file.size > MAX_SIZE_AUTHENTICATED) {
			logger.warn(
				{
					action: 'file_upload_rejected',
					reason: 'size_limit_exceeded',
					user: userIdentifier,
					fileName: file.name,
					fileSize: file.size,
					maxAllowed: MAX_SIZE_AUTHENTICATED
				},
				'Authenticated upload rejected - file too large'
			);
			throw error(413, `Datei zu groß. Maximale Größe: ${MAX_SIZE_AUTHENTICATED / 1024 / 1024}MB`);
		}

		// Security audit logging
		logger.info(
			{
				action: 'file_upload_attempt',
				user: userIdentifier,
				authenticated: isAuthenticated,
				clientIp,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
				referenceId,
				uid
			},
			'File upload initiated'
		);

		// Rate limiting based on authentication status
		const rateLimitConfig = isAuthenticated
			? RATE_LIMITS.FILE_UPLOAD_AUTHENTICATED
			: RATE_LIMITS.FILE_UPLOAD_ANONYMOUS;

		const rateLimitIdentifier = createRateLimitIdentifier(
			userIdentifier,
			clientIp,
			isAuthenticated
		);

		const rateLimitResult = enforceRateLimit(rateLimitIdentifier, rateLimitConfig, 'file_upload');

		// Get upload configuration from database
		const uploadConfig = await ServerConfigService.getUploadConfig();

		// Create dynamic validation preset using configuration
		const dynamicPreset = {
			allowedTypes: uploadConfig.allowedTypes,
			maxFileSize: uploadConfig.maxFileSizeBytes,
			maxFiles: FILE_VALIDATION_PRESETS.MEDIA.maxFiles,
			accept: uploadConfig.allowedTypes
				.map((type) =>
					type.startsWith('image/') ? 'image/*' : type.startsWith('video/') ? 'video/*' : type
				)
				.join(',')
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
				action: 'file_upload_success',
				user: userIdentifier,
				authenticated: isAuthenticated,
				clientIp,
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

		// Add rate limit headers from the already-computed result (no second counter increment)
		return json(uploadedFile, {
			headers: {
				'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
				'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
				'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
				'X-RateLimit-Window': Math.ceil(rateLimitConfig.windowMs / 1000).toString()
			}
		});
	} catch (err) {
		// Re-throw SvelteKit HttpErrors (from error() helper) and Responses
		if (isHttpError(err) || err instanceof Response) {
			throw err;
		}

		logger.error({ error: err }, 'Unerwarteter Fehler beim Datei-Upload');
		throw error(500, 'Interner Server-Fehler beim Datei-Upload');
	}
};
