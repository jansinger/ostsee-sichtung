/**
 * EXIF data interfaces for image metadata
 */

// EXIF data interface (shared between client and server)
export interface ExifData {
	// GPS Daten
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	// Kamera Daten
	make?: string;
	model?: string;
	dateTimeOriginal?: string | undefined; // ISO string for JSON serialization
	exposureTime?: string;
	fNumber?: number;
	iso?: number;
	focalLength?: number;
	flash?: boolean;
	// Bild Daten
	width?: number;
	height?: number;
	orientation?: string | number; // orientation can be string or number
}

// Server-side EXIF data interface (before serialization)
export interface ExifDataRaw {
	// GPS Daten
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	// Kamera Daten
	make?: string;
	model?: string;
	dateTimeOriginal?: Date; // Date object on server
	exposureTime?: string;
	fNumber?: number;
	iso?: number;
	focalLength?: number;
	flash?: boolean;
	// Bild Daten
	width?: number;
	height?: number;
	orientation?: string | number; // orientation can be string or number
}