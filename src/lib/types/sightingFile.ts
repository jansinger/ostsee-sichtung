/**
 * Type definitions for sighting files
 */

export interface SightingFile {
	id: number;
	sightingId: number;
	referenceId: string;
	originalName: string;
	fileName: string;
	filePath: string;
	mimeType: string;
	size: number;
	uploadedAt: string;
	createdAt: string;
	url: string;
	// Optional EXIF data for images
	exifData?: {
		latitude?: number | null;
		longitude?: number | null;
		altitude?: number | null;
		make?: string;
		model?: string;
		dateTimeOriginal?: string;
		exposureTime?: string;
		fNumber?: number;
		iso?: number;
		focalLength?: number;
		flash?: boolean;
		width?: number;
		height?: number;
		orientation?: string | number;
	};
}
