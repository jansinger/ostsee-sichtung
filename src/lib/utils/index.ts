/**
 * Centralized utilities index
 * Provides easy access to all shared utility functions
 */

// File utilities
export { formatFileSize, formatFileSizeDE, parseFileSize } from './file/fileSize';
export {
	getFileExtension,
	getFileIcon,
	getMimeTypeFromExtension,
	isImageFile,
	isMediaFile,
	isVideoFile
} from './file/fileType';

// Form utilities
export {
	createBooleanOptionsFactory,
	createConsentOptionsFactory,
	createOptionsFactory,
	createSimpleOptionsFactory,
	type FormOption,
	type FormOptionsFactory
} from './form/optionsFactory';

// Validation utilities
export {
	getValidationPreset,
	quickValidation,
	sanitizeFileName,
	validateFile,
	validateFiles,
	validateGPSPhotos,
	type ValidationPreset,
	type ValidationResult
} from './validation/fileValidation';

// Upload utilities (existing)
export { deleteFileDirect, uploadFileDirect } from './uploadUtils';

// Constants
export {
	ALLOWED_MIME_TYPES,
	FILE_VALIDATION_PRESETS,
	UPLOAD_ERROR_MESSAGES,
	UPLOAD_LIMITS,
	UPLOAD_PATHS
} from '../constants/upload';
