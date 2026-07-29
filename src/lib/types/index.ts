/**
 * Centralized export of all type definitions
 */

// EXIF Data types
export type { ExifData } from './ExifData.js';

// User types
export type { User, UserContactData } from './User.js';

// File upload types
export type {
	BrowserFileMetadata,
	FileMetadata,
	UploadedFileInfo,
	UploadOptions
} from './UploadedFile.js';

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
export type { StorageProvider, StorageProviderType } from './Storage.js';

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

// Validation types
export type { FileValidationConfig, ValidationPreset, ValidationResult } from './validation.js';

// Toast notification types
export type { CreateToastOptions, ToastMessage, ToastOptions, ToastType } from './toast.js';

// Export types
export type { ExportFormat, ExportOptions, KmlPlacemark, XmlSighting } from './export.js';

// Media types
export type {
	MediaFileData,
	MediaProcessingOptions,
	MediaStore,
	MediaType,
	MediaUploadResult
} from './media.js';

// Weather types
export type { WeatherDataWithMetadata } from './weather.js';
