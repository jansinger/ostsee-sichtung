import { createToast } from '$lib/stores/toastStore';
import { isInBalticSea, type ClientFileMetadata } from '$lib/utils/client/fileAnalysis';

export interface GPSData {
	latitude: number;
	longitude: number;
	altitude?: number;
	timestamp?: Date;
}

export interface FormHandlers {
	handleChange: (event: Event) => void;
}

/**
 * Extracts GPS data from file metadata
 */
export function extractGPSFromMetadata(metadata: ClientFileMetadata): GPSData | null {
	const { latitude, longitude, altitude, timestamp } = metadata.exif;
	
	if (latitude !== null && longitude !== null) {
		const gpsData: GPSData = {
			latitude,
			longitude
		};
		
		if (altitude !== null) {
			gpsData.altitude = altitude;
		}
		
		if (timestamp !== null) {
			gpsData.timestamp = timestamp;
		}
		
		return gpsData;
	}
	
	return null;
}

/**
 * Validates if GPS coordinates are in Baltic Sea
 */
export function validateBalticSeaLocation(gpsData: GPSData): boolean {
	return isInBalticSea(gpsData.latitude, gpsData.longitude);
}

/**
 * Updates form with GPS data from photo
 */
export function updateFormWithGPS(
	gpsData: GPSData,
	formHandlers: FormHandlers,
	showToast: boolean = true
): void {
	const { handleChange } = formHandlers;
	
	// Update position in form
	handleChange({
		target: { name: 'hasPosition', value: true }
	} as unknown as Event);
	
	handleChange({
		target: { name: 'latitude', value: gpsData.latitude.toString() }
	} as unknown as Event);
	
	handleChange({
		target: { name: 'longitude', value: gpsData.longitude.toString() }
	} as unknown as Event);

	// Auto-fill date/time from EXIF if available
	if (gpsData.timestamp) {
		const date = gpsData.timestamp;
		const dateStr = date.toISOString().split('T')[0];
		const timeStr = date.toTimeString().slice(0, 5);
		
		handleChange({
			target: { name: 'sightingDate', value: dateStr }
		} as unknown as Event);
		
		handleChange({
			target: { name: 'sightingTime', value: timeStr }
		} as unknown as Event);
	}

	if (showToast) {
		const isBalticSea = validateBalticSeaLocation(gpsData);
		if (isBalticSea) {
			createToast('success', 'Foto hochgeladen! GPS-Position und Datum automatisch erfasst.');
		} else {
			createToast('warning', 'Foto hochgeladen! GPS-Position gefunden, aber außerhalb der Ostsee.');
		}
	}

}

/**
 * Processes photo metadata and updates form if GPS data is found
 */
export function processPhotoGPSData(
	metadata: ClientFileMetadata,
	formHandlers: FormHandlers
): GPSData | null {
	const gpsData = extractGPSFromMetadata(metadata);
	
	if (gpsData) {
		updateFormWithGPS(gpsData, formHandlers);
		return gpsData;
	} else {
		createToast('info', 'Foto hochgeladen! Keine GPS-Daten gefunden - bitte Position manuell eingeben.');
		return null;
	}
}

/**
 * Clears GPS data from form
 */
export function clearFormGPS(formHandlers: FormHandlers): void {
	const { handleChange } = formHandlers;
	
	handleChange({
		target: { name: 'hasPosition', value: false }
	} as unknown as Event);
	
	handleChange({
		target: { name: 'latitude', value: '' }
	} as unknown as Event);
	
	handleChange({
		target: { name: 'longitude', value: '' }
	} as unknown as Event);
	
}