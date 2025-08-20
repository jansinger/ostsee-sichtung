/**
 * Centralized export of all type definitions
 */

// EXIF Data types
export type { ExifData } from './ExifData.js';

// User types
export type { User, UserContactData } from './User.js';

// File upload types
export type { BrowserFileMetadata, UploadedFileInfo } from './UploadedFile.js';

// Sighting types
export type { FrontendSighting } from './FrontendSighting.js';

// Database sighting types (re-export from existing files)
export type { NewSighting, SightingModel, UpdateSighting } from './sighting.js';
export type { SightingFile } from './sightingFile.js';

// Pagination types
export type { PageData, Pagination } from './Pagination.js';

// Dropzone types
export type { DropzoneProps } from './Dropzone.js';

// Form types
export type {
	FormContext,
	FormContextKey,
	FormProgress,
	FormStep,
	SightingFormData
} from './Form.js';

// Form field types
export type {
	FieldOption,
	FieldSize,
	FieldState,
	FieldVariant,
	IconType,
	InputType
} from './FormField.js';

// Storage types
export type {
	FileMetadata,
	StorageProvider,
	StorageProviderType,
	UploadedFile,
	UploadOptions
} from './Storage.js';

// API response types
export type { CreateSightingResponse, SightingResponse } from './ApiResponse.js';

// Geographic types
export { GeographicValidationError } from './Geography.js';
export type {
	BalticSeaConstants,
	// File-based geographic validation types
	BalticSeaFileResult,
	BalticSeaValidationResult,
	BoundingBox,
	CoordinateValidationParams,
	DetailedFileValidationResult,
	DetailedValidationResult,
	GeographicValidationErrorInfo,
	GeoLimits,
	GPSCoordinate,
	PostGISValidationRow,
	RBushIndexJson,
	SpatialIndexItem,
	SpatialValidationMetrics,
	TurfValidationOptions
} from './Geography.js';
