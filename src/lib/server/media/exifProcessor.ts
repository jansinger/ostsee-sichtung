/**
 * Server-side EXIF-Utilities für das Auslesen von GPS-Koordinaten und anderen Metadaten aus Bildern
 */
import { createLogger } from '$lib/logger';

const logger = createLogger('server:exifProcessor');

export interface ExifGPS {
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	timestamp: Date | null;
}

export interface ServerFileMetadata {
	name: string;
	size: number;
	type: string;
	lastModified: Date;
	exif: ExifGPS;
}

/**
 * Liest EXIF-Daten aus einem Buffer mit der exifr Library (server-side)
 */
export async function readExifDataFromBuffer(buffer: ArrayBuffer, fileName: string): Promise<ExifGPS> {
	try {
		// Dynamically import exifr library
		const exifr = await import('exifr');

		// Parse GPS and DateTime from EXIF data
		const exifData = await exifr.parse(buffer, {
			gps: true,
			pick: [
				'GPSLatitude',
				'GPSLongitude',
				'GPSAltitude',
				'GPSAltitudeRef',
				'DateTimeOriginal',
				'DateTime'
			]
		});

		if (!exifData) {
			return {
				latitude: null,
				longitude: null,
				altitude: null,
				timestamp: null
			};
		}

		// Extract GPS data
		const gps: ExifGPS = {
			latitude: exifData.latitude || null,
			longitude: exifData.longitude || null,
			altitude: null,
			timestamp: null
		};

		// Handle altitude with reference
		if (exifData.GPSAltitude !== undefined) {
			gps.altitude = exifData.GPSAltitude;
			// GPSAltitudeRef: 0 = above sea level, 1 = below sea level
			if (exifData.GPSAltitudeRef === 1 && gps.altitude !== null) {
				gps.altitude = -gps.altitude;
			}
		}

		// Handle timestamp
		if (exifData.DateTimeOriginal) {
			gps.timestamp = new Date(exifData.DateTimeOriginal);
		} else if (exifData.DateTime) {
			gps.timestamp = new Date(exifData.DateTime);
		}

		return gps;
	} catch (error) {
		logger.warn({ error, fileName }, 'Error reading EXIF data from buffer');
		return {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		};
	}
}

/**
 * Analysiert Metadaten einer Datei (ohne Thumbnail-Erstellung)
 */
export async function analyzeFileMetadata(
	buffer: ArrayBuffer, 
	fileName: string, 
	fileSize: number, 
	fileType: string, 
	lastModified: number
): Promise<ServerFileMetadata> {
	const metadata: ServerFileMetadata = {
		name: fileName,
		size: fileSize,
		type: fileType,
		lastModified: new Date(lastModified),
		exif: {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		}
	};

	// EXIF-Daten nur bei Bildern lesen
	if (fileType.startsWith('image/')) {
		try {
			metadata.exif = await readExifDataFromBuffer(buffer, fileName);
		} catch (error) {
			logger.warn({ error, fileName }, 'Error analyzing file metadata');
		}
	}

	return metadata;
}

/**
 * Überprüft ob GPS-Koordinaten in der Ostsee liegen
 */
export function isInBalticSea(latitude: number | null, longitude: number | null): boolean {
	if (latitude === null || longitude === null) {
		return false;
	}

	// Grobe Bounding Box der Ostsee
	const balticBounds = {
		north: 66.0,
		south: 53.0,
		east: 30.0,
		west: 9.0
	};

	return (
		latitude >= balticBounds.south &&
		latitude <= balticBounds.north &&
		longitude >= balticBounds.west &&
		longitude <= balticBounds.east
	);
}