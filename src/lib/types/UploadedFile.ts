/**
 * File upload and media interfaces
 */

import type { ExifData } from './ExifData.js';

// File upload interfaces
export interface UploadedFileInfo {
	id: string;
	originalName: string;
	fileName: string;
	filePath: string;
	url: string; // Full URL to access the file (provider-specific)
	size: number;
	mimeType: string;
	uploadedAt: string;
	exifData?: ExifData | null;
}