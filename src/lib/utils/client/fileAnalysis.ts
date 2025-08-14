/**
 * Client-side file analysis utilities
 * Diese funktionen nutzen die browser APIs für basic file validation und analysis
 */
import { createLogger } from '$lib/logger';

const logger = createLogger('client:fileAnalysis');

export interface ClientFileMetadata {
	name: string;
	size: number;
	type: string;
	lastModified: Date;
	thumbnail?: string;
	exif: {
		latitude: number | null;
		longitude: number | null;
		altitude: number | null;
		timestamp: Date | null;
	};
}

/**
 * Analysiert eine Datei client-seitig (ohne EXIF-Daten)
 * Für EXIF-Daten muss die Datei server-seitig verarbeitet werden
 */
export async function analyzeClientFile(file: File): Promise<ClientFileMetadata> {
	const metadata: ClientFileMetadata = {
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

	// Erstelle Thumbnail für Bilder
	if (file.type.startsWith('image/')) {
		try {
			metadata.thumbnail = await createImageThumbnail(file);
		} catch (error) {
			logger.warn({ error, fileName: file.name }, 'Error creating image thumbnail');
		}
	} else if (file.type.startsWith('video/')) {
		try {
			metadata.thumbnail = await createVideoThumbnail(file);
		} catch (error) {
			logger.warn({ error, fileName: file.name }, 'Error creating video thumbnail');
		}
	}

	return metadata;
}

/**
 * Erstellt ein Thumbnail für eine Bilddatei
 */
async function createImageThumbnail(file: File, maxSize: number = 200): Promise<string> {
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
 * Konvertiert Server-EXIF-Daten zu Client-Format
 */
export function convertServerExifToClient(serverExifData: any): ClientFileMetadata['exif'] {
	if (!serverExifData) {
		return {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		};
	}

	return {
		latitude: serverExifData.latitude || null,
		longitude: serverExifData.longitude || null,
		altitude: serverExifData.altitude || null,
		timestamp: serverExifData.dateTimeOriginal ? new Date(serverExifData.dateTimeOriginal) : null
	};
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