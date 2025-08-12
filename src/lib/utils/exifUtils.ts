/**
 * EXIF-Utilities für das Auslesen von GPS-Koordinaten und anderen Metadaten aus Bildern
 */
import { createLogger } from '$lib/logger';

const logger = createLogger('exifUtils');

export interface ExifGPS {
	latitude: number | null;
	longitude: number | null;
	altitude: number | null;
	timestamp: Date | null;
}

export interface FileMetadata {
	name: string;
	size: number;
	type: string;
	lastModified: Date;
	exif: ExifGPS;
	thumbnail?: string;
}

/**
 * Liest EXIF-Daten aus einem Bild mit der exifr Library
 */
async function readExifData(file: File): Promise<ExifGPS> {
	try {
		// Dynamically import exifr library
		const exifr = await import('exifr');

		// Parse GPS and DateTime from EXIF data
		const exifData = await exifr.parse(file, {
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
		logger.warn({ error, fileName: file.name }, 'Error reading EXIF data');
		return {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		};
	}
}

/**
 * Erstellt ein Thumbnail für eine Bilddatei
 */
async function createThumbnail(file: File, maxSize: number = 200): Promise<string> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();

		img.onload = () => {
			// Berechne die Thumbnail-Dimensionen
			let { width, height } = img;

			if (width > height) {
				if (width > maxSize) {
					height = (height * maxSize) / width;
					width = maxSize;
				}
			} else {
				if (height > maxSize) {
					width = (width * maxSize) / height;
					height = maxSize;
				}
			}

			canvas.width = width;
			canvas.height = height;

			// Zeichne das verkleinerte Bild
			ctx?.drawImage(img, 0, 0, width, height);

			// Konvertiere zu Data URL
			resolve(canvas.toDataURL('image/jpeg', 0.7));
		};

		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Erstellt ein Thumbnail für eine Videodatei
 */
async function createVideoThumbnail(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video');
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		video.addEventListener('loadedmetadata', () => {
			// Setze die Videozeit auf die erste Sekunde
			video.currentTime = 1;
		});

		video.addEventListener('seeked', () => {
			// Canvas-Größe auf Video-Dimensionen setzen (max. 200px)
			const maxSize = 200;
			let { videoWidth: width, videoHeight: height } = video;

			if (width > height) {
				if (width > maxSize) {
					height = (height * maxSize) / width;
					width = maxSize;
				}
			} else {
				if (height > maxSize) {
					width = (width * maxSize) / height;
					height = maxSize;
				}
			}

			canvas.width = width;
			canvas.height = height;

			// Zeichne den aktuellen Frame
			ctx?.drawImage(video, 0, 0, width, height);

			// Konvertiere zu Data URL
			resolve(canvas.toDataURL('image/jpeg', 0.7));

			// Cleanup
			URL.revokeObjectURL(video.src);
		});

		video.onerror = () => reject(new Error('Failed to load video'));
		video.src = URL.createObjectURL(file);
	});
}

/**
 * Analysiert eine Datei und extrahiert Metadaten
 */
export async function analyzeFile(file: File): Promise<FileMetadata> {
	const metadata: FileMetadata = {
		name: file.name,
		size: file.size,
		type: file.type,
		lastModified: new Date(file.lastModified),
		exif: {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		}
	};

	// Erstelle Thumbnail basierend auf Dateityp
	try {
		if (file.type.startsWith('image/')) {
			// Bild: Erstelle Thumbnail und lese EXIF-Daten
			const [thumbnail, exifData] = await Promise.all([createThumbnail(file), readExifData(file)]);

			metadata.thumbnail = thumbnail;
			metadata.exif = exifData;
		} else if (file.type.startsWith('video/')) {
			// Video: Erstelle Video-Thumbnail
			metadata.thumbnail = await createVideoThumbnail(file);
		}
	} catch (error) {
		logger.warn({ error, fileName: file.name }, 'Error analyzing file');
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
