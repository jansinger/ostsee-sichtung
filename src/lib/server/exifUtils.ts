/**
 * Server-seitige EXIF-Utilities für das Auslesen von Metadaten aus hochgeladenen Bildern
 */
import { createLogger } from '$lib/logger';
import type { ExifDataRaw } from '$lib/types/types';
// import { formatLocation } from '$lib/utils/format/formatLocation';
import { readFileSync } from 'fs';

const logger = createLogger('server:exifUtils');

/**
 * Liest EXIF-Daten aus einer Bilddatei
 */
export async function readImageExifData(filePath: string): Promise<ExifDataRaw | null> {
	try {
		// Dynamically import exifr library
		const { default: exifr } = await import('exifr');
		
		// Read file buffer
		const buffer = readFileSync(filePath);
		
		// Parse EXIF data with comprehensive options
		const exifData = await exifr.parse(buffer, {
			gps: true,
			exif: true,
			iptc: false,
			icc: false,
			jfif: false,
			ihdr: true,
			pick: [
				// GPS
				'GPSLatitude',
				'GPSLongitude', 
				'GPSAltitude',
				'GPSAltitudeRef',
				// Camera
				'Make',
				'Model',
				'DateTimeOriginal',
				'DateTime',
				'ExposureTime',
				'FNumber',
				'ISO',
				'FocalLength',
				'Flash',
				// Image
				'ImageWidth',
				'ImageHeight',
				'Orientation'
			]
		});

		if (!exifData) {
			return null;
		}

		// Extract and format data
		const result: ExifDataRaw = {
			latitude: exifData.latitude || null,
			longitude: exifData.longitude || null,
			altitude: null,
			make: exifData.Make,
			model: exifData.Model,
			width: exifData.ImageWidth,
			height: exifData.ImageHeight,
			orientation: exifData.Orientation
		};

		// Handle altitude with reference
		if (exifData.GPSAltitude !== undefined) {
			result.altitude = exifData.GPSAltitude;
			// GPSAltitudeRef: 0 = above sea level, 1 = below sea level
			if (exifData.GPSAltitudeRef === 1 && result.altitude !== null) {
				result.altitude = -result.altitude;
			}
		}

		// Handle timestamp
		if (exifData.DateTimeOriginal) {
			result.dateTimeOriginal = new Date(exifData.DateTimeOriginal);
		} else if (exifData.DateTime) {
			result.dateTimeOriginal = new Date(exifData.DateTime);
		}

		// Handle exposure time
		if (exifData.ExposureTime) {
			if (exifData.ExposureTime < 1) {
				result.exposureTime = `1/${Math.round(1 / exifData.ExposureTime)}`;
			} else {
				result.exposureTime = `${exifData.ExposureTime}s`;
			}
		}

		// Handle f-number
		if (exifData.FNumber) {
			result.fNumber = Math.round(exifData.FNumber * 10) / 10;
		}

		// Handle ISO
		if (exifData.ISO) {
			result.iso = exifData.ISO;
		}

		// Handle focal length
		if (exifData.FocalLength) {
			result.focalLength = Math.round(exifData.FocalLength);
		}

		// Handle flash
		if (exifData.Flash !== undefined) {
			result.flash = (exifData.Flash & 1) === 1; // Flash fired
		}

		logger.debug({ 
			filePath, 
			hasGPS: !!(result.latitude && result.longitude),
			hasCameraData: !!(result.make || result.model),
			exifKeys: Object.keys(exifData || {}),
			result: {
				...result,
				dateTimeOriginal: result.dateTimeOriginal?.toISOString()
			}
		}, 'EXIF data extracted');

		return result;
	} catch (error) {
		logger.warn({ 
			error: {
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				name: error instanceof Error ? error.name : undefined
			}, 
			filePath 
		}, 'Error reading EXIF data');
		return null;
	}
}


/**
 * Überprüft ob GPS-Koordinaten verfügbar sind
 */
export function hasGPSData(exifData: ExifDataRaw | null): boolean {
	return !!(exifData?.latitude && exifData?.longitude);
}

/**
 * Überprüft ob die Datei ein Bild ist (für EXIF-Verarbeitung)
 */
export function isImageFile(mimeType: string): boolean {
	return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
}