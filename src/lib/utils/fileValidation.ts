/**
 * Legacy file validation - DEPRECATED
 * Use /src/lib/utils/validation/fileValidation.ts and /src/lib/constants/upload.ts instead
 * @deprecated
 */

import { ALLOWED_MIME_TYPES, UPLOAD_LIMITS } from '$lib/constants/upload';

export interface FileValidationConfig {
	allowedTypes: string[];
	maxSize?: number; // in bytes
	maxFiles?: number;
}

export interface FileValidationResult {
	isValid: boolean;
	errors: string[];
	validFiles: File[];
	invalidFiles: File[];
}

/**
 * Standard-Konfigurationen für verschiedene Upload-Szenarien
 * @deprecated Use FILE_VALIDATION_PRESETS from /src/lib/constants/upload.ts
 */
export const FILE_VALIDATION_PRESETS = {
	// Für Foto-Upload im Position-Schritt (nur Bilder mit GPS)
	PHOTO_GPS: {
		allowedTypes: [...ALLOWED_MIME_TYPES.IMAGES],
		maxSize: UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE,
		maxFiles: 1
	} as FileValidationConfig,

	// Für allgemeine Medien-Uploads (Bilder und Videos)  
	MEDIA: {
		allowedTypes: [...ALLOWED_MIME_TYPES.MEDIA],
		maxSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES
	} as FileValidationConfig
} as const;

/**
 * Validiert eine Liste von Dateien anhand der gegebenen Konfiguration
 */
export function validateFiles(files: FileList | File[], config: FileValidationConfig): FileValidationResult {
	const fileArray = Array.from(files);
	const errors: string[] = [];
	const validFiles: File[] = [];
	const invalidFiles: File[] = [];

	// Maximale Anzahl Dateien prüfen
	if (config.maxFiles && fileArray.length > config.maxFiles) {
		errors.push(`Maximal ${config.maxFiles} Datei${config.maxFiles > 1 ? 'en' : ''} erlaubt. Sie haben ${fileArray.length} ausgewählt.`);
	}

	fileArray.forEach((file) => {
		const fileErrors: string[] = [];

		// MIME-Type prüfen
		if (!config.allowedTypes.includes(file.type)) {
			fileErrors.push(`Dateityp "${file.type}" nicht erlaubt`);
		}

		// Dateigröße prüfen
		if (config.maxSize && file.size > config.maxSize) {
			const maxSizeMB = (config.maxSize / (1024 * 1024)).toFixed(1);
			const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
			fileErrors.push(`Datei zu groß (${fileSizeMB}MB). Maximal ${maxSizeMB}MB erlaubt`);
		}

		if (fileErrors.length > 0) {
			invalidFiles.push(file);
			errors.push(`${file.name}: ${fileErrors.join(', ')}`);
		} else {
			validFiles.push(file);
		}
	});

	return {
		isValid: errors.length === 0,
		errors,
		validFiles,
		invalidFiles
	};
}

/**
 * Generiert eine benutzerfreundliche Liste der erlaubten Dateitypen
 */
export function getFileTypeDescription(allowedTypes: string[]): string {
	const extensions = allowedTypes.map(type => {
		const extension = type.split('/')[1]?.toUpperCase();
		// Spezielle Behandlung für bekannte Typen
		switch (extension) {
			case 'JPEG': return 'JPG';
			default: return extension;
		}
	});
	
	return extensions.join(', ');
}

/**
 * Prüft ob eine Datei ein Bildformat ist
 */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/**
 * Prüft ob eine Datei ein Videoformat ist
 */
export function isVideoFile(file: File): boolean {
	return file.type.startsWith('video/');
}

/**
 * Formatiert Dateigröße in lesbarem Format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}