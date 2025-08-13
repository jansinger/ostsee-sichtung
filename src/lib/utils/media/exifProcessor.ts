/**
 * Shared EXIF data processing utilities
 * Consolidates common logic between client and server EXIF handling
 */

export interface GPSData {
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
}

export interface CameraInfo {
	make?: string;
	model?: string;
	iso?: number;
	fNumber?: number;
	exposureTime?: string;
	focalLength?: number;
	flash?: boolean;
}

export interface ImageInfo {
	width?: number;
	height?: number;
	orientation?: string | number;
}

export interface ProcessedExifData extends GPSData, CameraInfo, ImageInfo {
	dateTimeOriginal?: Date | undefined;
}

/**
 * Abstract base class for EXIF extraction
 * Provides common logic while allowing different implementations
 */
export abstract class ExifExtractor {
	/**
	 * Extract GPS coordinates from EXIF data
	 * @param exifData - Raw EXIF data object
	 * @returns GPS coordinates or null values
	 */
	protected extractGPS(exifData: any): GPSData {
		const gps: GPSData = {
			latitude: null,
			longitude: null,
			altitude: null
		};

		try {
			// Handle different EXIF library formats
			const gpsData = exifData.gps || exifData.GPS || exifData;
			
			if (gpsData) {
				// Extract latitude
				if (gpsData.GPSLatitude && gpsData.GPSLatitudeRef) {
					gps.latitude = this.convertDMSToDD(gpsData.GPSLatitude, gpsData.GPSLatitudeRef);
				} else if (typeof gpsData.latitude === 'number') {
					gps.latitude = gpsData.latitude;
				}

				// Extract longitude
				if (gpsData.GPSLongitude && gpsData.GPSLongitudeRef) {
					gps.longitude = this.convertDMSToDD(gpsData.GPSLongitude, gpsData.GPSLongitudeRef);
				} else if (typeof gpsData.longitude === 'number') {
					gps.longitude = gpsData.longitude;
				}

				// Extract altitude
				if (gpsData.GPSAltitude !== undefined) {
					gps.altitude = typeof gpsData.GPSAltitude === 'number' 
						? gpsData.GPSAltitude 
						: parseFloat(gpsData.GPSAltitude);
					
					// Handle altitude reference (0 = above sea level, 1 = below)
					if (gpsData.GPSAltitudeRef === 1 && gps.altitude !== null) {
						gps.altitude = -gps.altitude;
					}
				} else if (typeof gpsData.altitude === 'number') {
					gps.altitude = gpsData.altitude;
				}
			}
		} catch (error) {
			// GPS extraction failed, return null values
			console.warn('Failed to extract GPS data:', error);
		}

		return gps;
	}

	/**
	 * Extract camera information from EXIF data
	 * @param exifData - Raw EXIF data object
	 * @returns Camera information
	 */
	protected extractCameraInfo(exifData: any): CameraInfo {
		const camera: CameraInfo = {};

		try {
			// Camera make and model
			camera.make = exifData.Make || exifData.make;
			camera.model = exifData.Model || exifData.model;

			// ISO
			if (exifData.ISOSpeedRatings) {
				camera.iso = Array.isArray(exifData.ISOSpeedRatings) 
					? exifData.ISOSpeedRatings[0] 
					: exifData.ISOSpeedRatings;
			} else if (exifData.iso) {
				camera.iso = exifData.iso;
			}

			// F-Number
			if (exifData.FNumber) {
				camera.fNumber = typeof exifData.FNumber === 'number' 
					? exifData.FNumber 
					: parseFloat(exifData.FNumber);
			} else if (exifData.fNumber) {
				camera.fNumber = exifData.fNumber;
			}

			// Exposure time
			camera.exposureTime = exifData.ExposureTime || exifData.exposureTime;

			// Focal length
			if (exifData.FocalLength) {
				camera.focalLength = typeof exifData.FocalLength === 'number' 
					? exifData.FocalLength 
					: parseFloat(exifData.FocalLength);
			} else if (exifData.focalLength) {
				camera.focalLength = exifData.focalLength;
			}

			// Flash
			if (exifData.Flash !== undefined) {
				camera.flash = Boolean(exifData.Flash & 1); // Check if flash fired
			} else if (exifData.flash !== undefined) {
				camera.flash = Boolean(exifData.flash);
			}
		} catch (error) {
			console.warn('Failed to extract camera info:', error);
		}

		return camera;
	}

	/**
	 * Extract image dimensions and orientation
	 * @param exifData - Raw EXIF data object
	 * @returns Image information
	 */
	protected extractImageInfo(exifData: any): ImageInfo {
		const image: ImageInfo = {};

		try {
			image.width = exifData.ExifImageWidth || exifData.width;
			image.height = exifData.ExifImageHeight || exifData.height;
			image.orientation = exifData.Orientation || exifData.orientation;
		} catch (error) {
			console.warn('Failed to extract image info:', error);
		}

		return image;
	}

	/**
	 * Extract date/time from EXIF data
	 * @param exifData - Raw EXIF data object
	 * @returns Date object or null
	 */
	protected extractDateTime(exifData: any): Date | null {
		try {
			const dateTimeStr = exifData.DateTimeOriginal || 
							   exifData.DateTime || 
							   exifData.dateTimeOriginal || 
							   exifData.dateTime;

			if (!dateTimeStr) return null;

			// Handle different date formats
			if (dateTimeStr instanceof Date) {
				return dateTimeStr;
			}

			// Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
			if (typeof dateTimeStr === 'string') {
				const formatted = dateTimeStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
				const date = new Date(formatted);
				
				return isNaN(date.getTime()) ? null : date;
			}

			return null;
		} catch (error) {
			console.warn('Failed to extract date/time:', error);
			return null;
		}
	}

	/**
	 * Convert DMS (Degrees, Minutes, Seconds) to DD (Decimal Degrees)
	 * @param dms - DMS array [degrees, minutes, seconds]
	 * @param ref - Reference direction (N, S, E, W)
	 * @returns Decimal degrees
	 */
	protected convertDMSToDD(dms: number[] | any, ref: string): number {
		if (!Array.isArray(dms) || dms.length < 3) return 0;

		const degrees = typeof dms[0] === 'number' ? dms[0] : parseFloat(dms[0]);
		const minutes = typeof dms[1] === 'number' ? dms[1] : parseFloat(dms[1]);
		const seconds = typeof dms[2] === 'number' ? dms[2] : parseFloat(dms[2]);

		let dd = degrees + (minutes / 60) + (seconds / 3600);

		// Apply direction
		if (ref === 'S' || ref === 'W') {
			dd = -dd;
		}

		return dd;
	}

	/**
	 * Process raw EXIF data into standardized format
	 * @param exifData - Raw EXIF data from any library
	 * @returns Processed EXIF data
	 */
	public processExifData(exifData: any): ProcessedExifData {
		return {
			...this.extractGPS(exifData),
			...this.extractCameraInfo(exifData),
			...this.extractImageInfo(exifData),
			dateTimeOriginal: this.extractDateTime(exifData) || undefined
		};
	}
}

/**
 * Utility functions for EXIF data validation and conversion
 */
export const exifUtils = {
	/**
	 * Check if GPS coordinates are valid
	 */
	hasValidGPS: (data: GPSData): boolean => {
		return data.latitude !== null && 
			   data.longitude !== null && 
			   !isNaN(data.latitude) && 
			   !isNaN(data.longitude) &&
			   Math.abs(data.latitude) <= 90 &&
			   Math.abs(data.longitude) <= 180;
	},

	/**
	 * Check if coordinates are in Baltic Sea region (approximate bounds)
	 */
	isInBalticSeaRegion: (latitude: number, longitude: number): boolean => {
		return latitude >= 53.5 && latitude <= 66.0 && 
			   longitude >= 9.0 && longitude <= 31.0;
	},

	/**
	 * Convert EXIF data to JSON-safe format
	 */
	sanitizeForJSON: (data: ProcessedExifData): Record<string, any> => {
		return {
			...data,
			dateTimeOriginal: data.dateTimeOriginal?.toISOString() || null
		};
	},

	/**
	 * Restore EXIF data from JSON format
	 */
	restoreFromJSON: (data: Record<string, any>): ProcessedExifData => {
		return {
			...data,
			dateTimeOriginal: data.dateTimeOriginal ? new Date(data.dateTimeOriginal) : undefined
		} as ProcessedExifData;
	}
};