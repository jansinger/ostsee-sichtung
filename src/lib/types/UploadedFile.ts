/**
 * File upload and media interfaces
 */

import type { ExifData } from './ExifData.js';
import type { SightingFormData } from './Form.js';

/**
 * Metadata for uploaded files, extracted in the browser
 */
export interface BrowserFileMetadata {
	thumbnail?: string; // Optional thumbnail URL for images/videos
	url?: string;
	fileName?: string;
	size: number;
	mimeType: string;
	exifData?: ExifData | null | undefined; // EXIF data for images, null if not available
	lastModified?: Date;
}

/**
 * Upload file data interface that is hold in the form
 */
export type UploadedFileInfo = SightingFormData['uploadedFiles'][0] & {
	id?: number;
	exifData?: ExifData | null | undefined; // EXIF data for images, null if not available
};

export interface UploadOptions {
	referenceId: string;
	preserveOriginalName?: boolean;
}

export interface FileMetadata {
	size: number;
	mimeType: string;
	lastModified: Date;
	etag?: string;
}
