/**
 * Centralized utilities index
 * Provides easy access to all shared utility functions
 */

// File utilities
export { formatFileSize, formatFileSizeDE, parseFileSize } from './file/fileSize';
export { 
	isImageFile, 
	isVideoFile, 
	isMediaFile, 
	getFileIcon, 
	getFileExtension, 
	getMimeTypeFromExtension 
} from './file/fileType';

// Form utilities
export { 
	createOptionsFactory, 
	createBooleanOptionsFactory, 
	createConsentOptionsFactory,
	createSimpleOptionsFactory,
	type FormOption,
	type FormOptionsFactory
} from './form/optionsFactory';

// Validation utilities
export {
	validateFile,
	validateFiles,
	validateGPSPhotos,
	quickValidation,
	sanitizeFileName,
	getValidationPreset,
	type ValidationResult,
	type ValidationPreset
} from './validation/fileValidation';

// Media/EXIF utilities
export {
	ExifExtractor,
	exifUtils,
	type GPSData,
	type CameraInfo,
	type ImageInfo,
	type ProcessedExifData
} from './media/exifProcessor';

// Upload utilities (existing)
export { uploadFileDirect, deleteFileDirect } from './uploadUtils';
export { 
	uploadResultToFormData, 
	formDataToUploadData, 
	createUploadData,
	type UploadFileData 
} from './uploadHelpers';

// Constants
export {
	UPLOAD_LIMITS,
	ALLOWED_MIME_TYPES,
	FILE_VALIDATION_PRESETS,
	UPLOAD_PATHS,
	UPLOAD_ERROR_MESSAGES
} from '../constants/upload';