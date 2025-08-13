/**
 * Centralized upload constants and configuration
 * Single source of truth for all upload-related settings
 */

// File size limits (in bytes)
export const UPLOAD_LIMITS = {
	/** Maximum file size for regular uploads (50MB) */
	MAX_FILE_SIZE: 50 * 1024 * 1024,
	
	/** Maximum file size for GPS photos in position step (10MB) */
	PHOTO_GPS_MAX_SIZE: 10 * 1024 * 1024,
	
	/** Maximum number of files per upload session */
	MAX_FILES: 20,
	
	/** Maximum total size for all files in one session (200MB) */
	MAX_TOTAL_SIZE: 200 * 1024 * 1024
} as const;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
	IMAGES: [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/gif',
		'image/webp',
		'image/bmp'
		// Note: image/svg+xml excluded for security reasons
	],
	
	VIDEOS: [
		'video/mp4',
		'video/avi',
		'video/mov',
		'video/wmv',
		'video/flv',
		'video/webm',
		'video/mkv',
		'video/m4v'
	],
	
	get MEDIA() {
		return [...this.IMAGES, ...this.VIDEOS];
	},
	
	get ALL() {
		return this.MEDIA;
	}
} as const;

// File validation presets for different upload contexts
export const FILE_VALIDATION_PRESETS = {
	/** Standard media upload (images and videos) */
	MEDIA: {
		allowedTypes: ALLOWED_MIME_TYPES.MEDIA,
		maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES,
		accept: 'image/*,video/*'
	},
	
	/** GPS photo upload (images only, smaller size limit) */
	GPS_PHOTO: {
		allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
		maxFileSize: UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE,
		maxFiles: 1,
		accept: 'image/*'
	},
	
	/** Images only upload */
	IMAGES_ONLY: {
		allowedTypes: ALLOWED_MIME_TYPES.IMAGES,
		maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES,
		accept: 'image/*'
	}
} as const;

// Upload paths and directories
export const UPLOAD_PATHS = {
	/** Base upload directory */
	BASE: 'uploads',
	
	/** Temporary uploads directory */
	TEMP: 'temp',
	
	/** Thumbnails directory */
	THUMBNAILS: 'thumbnails'
} as const;

// Error messages for upload validation
export const UPLOAD_ERROR_MESSAGES = {
	FILE_TOO_LARGE: (fileName: string, maxSize: number) => 
		`${fileName}: Datei zu groß. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,
	
	INVALID_TYPE: (fileName: string, allowedTypes: readonly string[]) =>
		`${fileName}: Ungültiger Dateityp. Erlaubt: ${allowedTypes.join(', ')}`,
	
	TOO_MANY_FILES: (maxFiles: number) =>
		`Zu viele Dateien. Maximum: ${maxFiles}`,
	
	TOTAL_SIZE_EXCEEDED: (maxSize: number) =>
		`Gesamtgröße überschritten. Maximum: ${Math.round(maxSize / 1024 / 1024)}MB`,
	
	EMPTY_FILE: (fileName: string) =>
		`${fileName}: Datei ist leer`,
	
	INVALID_NAME: (fileName: string) =>
		`${fileName}: Unsicherer Dateiname`,
	
	NO_FILE: 'Keine Datei ausgewählt',
	
	UPLOAD_FAILED: 'Upload fehlgeschlagen. Versuchen Sie es erneut.'
} as const;