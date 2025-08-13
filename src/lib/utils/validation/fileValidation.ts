/**
 * Centralized file validation utilities
 * Consolidates validation logic from multiple files
 */

import { ALLOWED_MIME_TYPES, UPLOAD_LIMITS, UPLOAD_ERROR_MESSAGES, type FILE_VALIDATION_PRESETS } from '$lib/constants/upload';
import { isMediaFile, isImageFile, isVideoFile } from '$lib/utils/file/fileType';

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface ValidationPreset {
	allowedTypes: readonly string[];
	maxFileSize: number;
	maxFiles: number;
	accept: string;
}

/**
 * Validates a single file against specified criteria
 * @param file - The file to validate
 * @param preset - Validation preset or custom rules
 * @returns Validation result with errors
 */
export function validateFile(
	file: File,
	preset: ValidationPreset
): ValidationResult {
	const errors: string[] = [];

	// Check if file object is valid
	if (!(file instanceof File)) {
		errors.push('Ungültiges Dateiformat empfangen.');
		return { isValid: false, errors };
	}

	// Check file name
	if (!file.name || file.name.trim() === '') {
		errors.push(UPLOAD_ERROR_MESSAGES.INVALID_NAME('Datei ohne Namen'));
	}

	// Check for dangerous characters in filename
	if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
		errors.push(UPLOAD_ERROR_MESSAGES.INVALID_NAME(file.name));
	}

	// Check file size
	if (file.size === 0) {
		errors.push(UPLOAD_ERROR_MESSAGES.EMPTY_FILE(file.name));
	}

	if (file.size > preset.maxFileSize) {
		errors.push(UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(file.name, preset.maxFileSize));
	}

	// Check MIME type
	if (!preset.allowedTypes.includes(file.type)) {
		errors.push(UPLOAD_ERROR_MESSAGES.INVALID_TYPE(file.name, preset.allowedTypes));
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Validates multiple files against specified criteria
 * @param files - Array of files to validate
 * @param preset - Validation preset or custom rules
 * @returns Validation result with errors
 */
export function validateFiles(
	files: File[],
	preset: ValidationPreset
): ValidationResult {
	const errors: string[] = [];

	// Check file count
	if (files.length > preset.maxFiles) {
		errors.push(UPLOAD_ERROR_MESSAGES.TOO_MANY_FILES(preset.maxFiles));
	}

	// Check total size
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	if (totalSize > UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
		errors.push(UPLOAD_ERROR_MESSAGES.TOTAL_SIZE_EXCEEDED(UPLOAD_LIMITS.MAX_TOTAL_SIZE));
	}

	// Validate each file individually
	for (const file of files) {
		const fileResult = validateFile(file, preset);
		errors.push(...fileResult.errors);
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Validates that uploaded files meet GPS photo requirements
 * @param files - Files to validate
 * @returns Validation result
 */
export function validateGPSPhotos(files: File[]): ValidationResult {
	const errors: string[] = [];

	for (const file of files) {
		// Must be image
		if (!isImageFile(file)) {
			errors.push(`${file.name}: GPS-Upload erfordert Bilddateien`);
		}

		// Size limit for GPS photos
		if (file.size > UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE) {
			errors.push(UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE(file.name, UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE));
		}
	}

	// GPS photo upload typically allows only one file
	if (files.length > 1) {
		errors.push('GPS-Upload erlaubt nur eine Datei');
	}

	return {
		isValid: errors.length === 0,
		errors
	};
}

/**
 * Quick validation functions for common scenarios
 */
export const quickValidation = {
	/**
	 * Check if file is a supported image type
	 */
	isValidImage: (file: File): boolean => {
		return isImageFile(file) && ALLOWED_MIME_TYPES.IMAGES.includes(file.type as any);
	},

	/**
	 * Check if file is a supported video type
	 */
	isValidVideo: (file: File): boolean => {
		return isVideoFile(file) && ALLOWED_MIME_TYPES.VIDEOS.includes(file.type as any);
	},

	/**
	 * Check if file is supported media (image or video)
	 */
	isValidMedia: (file: File): boolean => {
		return isMediaFile(file) && ALLOWED_MIME_TYPES.MEDIA.includes(file.type as any);
	},

	/**
	 * Check if file size is within standard limits
	 */
	isValidSize: (file: File, maxSize: number = UPLOAD_LIMITS.MAX_FILE_SIZE): boolean => {
		return file.size > 0 && file.size <= maxSize;
	},

	/**
	 * Check if filename is safe
	 */
	isSafeFilename: (filename: string): boolean => {
		return Boolean(filename && 
			   filename.trim() !== '' && 
			   !filename.includes('..') && 
			   !filename.includes('/') && 
			   !filename.includes('\\'));
	}
};

/**
 * Sanitizes a filename to be safe for storage
 * @param fileName - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFileName(fileName: string): string {
	return fileName
		.replace(/[^a-zA-Z0-9.-]/g, '_') // Replace unsafe characters
		.replace(/\.{2,}/g, '.') // Prevent multiple dots
		.replace(/^\./, '') // Remove leading dot
		.slice(0, 100); // Limit length
}

/**
 * Gets appropriate validation preset by name
 * @param _presetName - Name of the preset
 * @returns ValidationPreset
 */
export function getValidationPreset(_presetName: keyof typeof FILE_VALIDATION_PRESETS): ValidationPreset {
	// This will be implemented once we import the constants
	// For now, return a default preset
	return {
		allowedTypes: ALLOWED_MIME_TYPES.MEDIA,
		maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
		maxFiles: UPLOAD_LIMITS.MAX_FILES,
		accept: 'image/*,video/*'
	};
}