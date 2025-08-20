/**
 * Validation-related type definitions
 */

/**
 * Result of a file validation operation
 */
export interface ValidationResult {
	isValid: boolean;
	errors: string[];
	validFiles?: File[];
	invalidFiles?: File[];
}

/**
 * Configuration preset for file validation
 */
export interface ValidationPreset {
	allowedTypes: readonly string[];
	maxFileSize: number;
	maxFiles: number;
	accept: string;
}

/**
 * Legacy file validation configuration
 * @deprecated Use ValidationPreset instead
 */
export interface FileValidationConfig {
	allowedTypes: readonly string[];
	maxFileSize?: number; // in bytes
	maxFiles?: number;
	accept?: string;
}
