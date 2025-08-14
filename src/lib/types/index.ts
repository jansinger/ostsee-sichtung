/**
 * Centralized export of all type definitions
 */

// EXIF Data types
export type { ExifData, ExifDataRaw } from './ExifData.js';

// User types
export type { User, UserContactData } from './User.js';

// File upload types
export type { UploadedFileInfo } from './UploadedFile.js';

// Sighting types
export type { FrontendSighting } from './FrontendSighting.js';

// Database sighting types (re-export from existing files)
export type { NewSighting, SightingModel, UpdateSighting } from './sighting.js';
export type { SightingFile } from './sightingFile.js';

// Pagination types
export type { Pagination, PageData } from './Pagination.js';

// Dropzone types
export type { DropzoneProps } from './Dropzone.js';

// Form types
export type { 
	FormStep, 
	FormProgress, 
	SightingFormData, 
	FormContext, 
	FormContextKey 
} from './Form.js';

// Form field types
export type { 
	IconType, 
	FieldOption, 
	FieldSize, 
	FieldVariant, 
	InputType, 
	FieldState 
} from './FormField.js';

// Storage types
export type { 
	UploadedFile, 
	StorageProvider, 
	UploadOptions, 
	FileMetadata, 
	StorageProviderType 
} from './Storage.js';

// API response types
export type { SightingResponse, CreateSightingResponse } from './ApiResponse.js';