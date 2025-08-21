/**
 * Server-seitige EXIF-Utilities für das Auslesen von Metadaten aus hochgeladenen Bildern
 */
import { createLogger } from '$lib/logger';
import type { ExifData } from '$lib/types';
const logger = createLogger('server:exifUtils');

/**
 * Corrects the UTC offset for Central European Summer Time (CEST).
 * This function adjusts the given UTC date to account for daylight saving time in Central Europe.
 *
 * @param date - The UTC date to be corrected. Must be a UTC date.
 * @returns The corrected date, adjusted for CEST or CET as appropriate.
 */
function correctCestOffsetUTC(date: Date): Date {
	// Das Datum muss ein UTC-Datum sein!
	const year = date.getUTCFullYear();

	// Letzter Sonntag im März (Sommerzeit beginnt)
	const march = new Date(Date.UTC(year, 2, 31)); // 31. März
	const marchDay = march.getUTCDay();
	const lastMarchSunday = 31 - marchDay;
	const cestStart = Date.UTC(year, 2, lastMarchSunday, 1); // 2:00 MEZ == 1:00 UTC

	// Letzter Sonntag im Oktober (Sommerzeit endet)
	const october = new Date(Date.UTC(year, 9, 31)); // 31. Oktober
	const octoberDay = october.getUTCDay();
	const lastOctoberSunday = 31 - octoberDay;
	const cestEnd = Date.UTC(year, 9, lastOctoberSunday, 1); // 3:00 MESZ == 1:00 UTC

	const time = date.getTime();

	// CEST gilt von cestStart (einschließlich) bis cestEnd (ausschließlich)
	if (time >= cestStart && time < cestEnd) {
		date.setHours(date.getHours() - 2); // UTC+2 (CEST)
		return date;
	} else {
		date.setHours(date.getHours() - 1); // UTC+1 (CET)
		return date;
	}
}

/**
 * Liest EXIF-Daten aus einem Buffer oder einer Datei
 */
export async function readImageExifData(source: string | Buffer): Promise<ExifData | null> {
	try {
		// Dynamically import exifr library
		const { default: exifr } = await import('exifr');

		// Get buffer - either passed directly or read from file
		let buffer: Buffer;
		if (Buffer.isBuffer(source)) {
			buffer = source;
		} else {
			// For backward compatibility - read from file path
			const { readFileSync } = await import('fs');
			buffer = readFileSync(source);
		}

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
		const result: ExifData = {
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
			if (exifData.GPSAltitudeRef === 1 && result.altitude) {
				result.altitude = -result.altitude;
			}
		}

		// Handle timestamp
		if (exifData.DateTimeOriginal) {
			result.dateTimeOriginal = new Date(exifData.DateTimeOriginal);
		} else if (exifData.DateTime) {
			result.dateTimeOriginal = new Date(exifData.DateTime);
		}

		// Correct CEST offset for UTC dates (EXIF enthält keine Timezone, daher manuelle Korrektur)
		if (result.dateTimeOriginal && result.dateTimeOriginal.getTimezoneOffset() == 0) {
			result.dateTimeOriginal = correctCestOffsetUTC(result.dateTimeOriginal);
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

		logger.debug(
			{
				source: Buffer.isBuffer(source) ? 'buffer' : source,
				hasGPS: !!(result.latitude && result.longitude),
				hasCameraData: !!(result.make || result.model),
				exifKeys: Object.keys(exifData || {}),
				result: {
					...result,
					dateTimeOriginal: result.dateTimeOriginal ? result.dateTimeOriginal.toISOString() : null
				}
			},
			'EXIF data extracted'
		);

		return result;
	} catch (error) {
		logger.warn(
			{
				error: {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
					name: error instanceof Error ? error.name : undefined
				},
				source: Buffer.isBuffer(source) ? 'buffer' : source
			},
			'Error reading EXIF data'
		);
		return null;
	}
}

/**
 * Überprüft ob GPS-Koordinaten verfügbar sind
 */
export function hasGPSData(exifData: ExifData | null): boolean {
	return !!(exifData?.latitude && exifData?.longitude);
}
