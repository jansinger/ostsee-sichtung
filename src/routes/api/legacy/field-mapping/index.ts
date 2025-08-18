/**
 * @fileoverview Field mapping adapter for Legacy REST API
 * 
 * Provides bidirectional field mapping between legacy API format and current schema.
 * Handles data transformation, validation, and format conversion for backwards compatibility.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import type { SightingFormData } from '$lib/types';
import type { LegacySightingRequest, LegacySightingResponse, LegacySightingRequestSeparateDateTime } from './types';

/**
 * Maps legacy API request to current SightingFormData format
 * 
 * @param legacyData - Legacy API request data
 * @returns Transformed data in current schema format
 */
export function mapLegacyToCurrentSchema(legacyData: LegacySightingRequest): SightingFormData {
	// Parse the single datetime field (YYYY-MM-DD HH:MI) into ISO format
	const sightingDate = parseLegacyDateTime(legacyData.sichtungsdatum);

	return {
		// Date and location
		sightingDate,
		latitude: legacyData.gps_breite || 0,
		longitude: legacyData.gps_laenge || 0,
		waterway: legacyData.fahrwasser || '',
		seaMark: legacyData.seezeichen || '',

		// Observer information  
		firstName: legacyData.vorname,
		lastName: legacyData.name, // Note: "name" in legacy API, not "nachname"
		email: legacyData.email,
		phone: legacyData.telefon || '',
		street: legacyData.strasse || '',
		zipCode: legacyData.plz || '',
		city: legacyData.ort || '',

		// Sighting details
		totalCount: legacyData.anzahl_gesamt,
		juvenileCount: legacyData.anzahl_jung || 0,
		species: legacyData.tierart || 0,

		// Observation context
		sightingFrom: legacyData.vonwo || 0, // vonwo maps to sightingFrom
		sightingFromText: legacyData.vonwo_text || '',
		distance: legacyData.entfernung || 0,
		distribution: legacyData.verteilung || 0,
		distributionText: '', // Legacy API doesn't separate this
		behavior: legacyData.verhalten || 0,
		behaviorText: '', // Legacy API doesn't separate this
		reaction: legacyData.reaktion || '',

		// Environmental conditions
		seaState: legacyData.seegang || 0,
		windDirection: (legacyData.windrichtung && ['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'].includes(legacyData.windrichtung as string) 
			? legacyData.windrichtung as '' | 'N' | 'NW' | 'W' | 'SW' | 'S' | 'SO' | 'O' | 'NO'
			: ''),
		windForce: legacyData.windstaerke ? Number(legacyData.windstaerke) : undefined,
		visibility: legacyData.sichtweite || 0,

		// Vessel information
		shipName: legacyData.schiffsname || '',
		homePort: legacyData.heimathafen || '',
		boatType: legacyData.bootstyp || '',
		boatDrive: legacyData.bootsantrieb || 0,
		boatDriveText: '', // Legacy API doesn't separate this

		// Media and observations
		mediaFile: legacyData.aufnahme || '',
		mediaUpload: legacyData.aufnahme ? true : false,
		otherObservations: legacyData.sonstige_auffälligkeiten || '',
		notes: legacyData.bemerkungen || '',

		// Consent flags (convert 0/1 to boolean)
		nameConsent: legacyData.namensnennung ? true : false,
		shipNameConsent: legacyData.schiffnamensnennung ? true : false,
		privacyConsent: legacyData.datenschutzEinverstaendnis ? true : false,

		// Death finding detection and fields
		isDead: legacyData.anzahl_gesamt === 0 ? true : false,
		deadSize: legacyData.totfund_groesse || undefined,
		deadCondition: legacyData.totfund_zustand || 0,
		deadSex: legacyData.totfund_geschlecht || 0,
		deadPhoneContact: legacyData.totfund_telefon ? true : false,

		// System fields
		entryChannel: EntryChannelEnum.APP,
		shipCount: null, // Legacy API doesn't track ship count separately
		
		// Required fields that legacy API doesn't provide
		verified: false,
		referenceId: `LEGACY-${Date.now()}`, // Generate a reference ID for legacy imports
		uploadedFiles: [], // Legacy API handles media differently
		hasPosition: !!(legacyData.gps_breite && legacyData.gps_laenge), // True if coordinates provided
		
		// Additional required fields
		persistentDataConsent: true, // Legacy API users implicitly consent to data storage
		informedAuthorities: false, // Legacy API doesn't track this
		mediaConsent: true // Legacy API users consent to media handling
	};
}

/**
 * Maps current schema to legacy API response format
 * 
 * @param currentData - Current schema sighting data
 * @returns Data in legacy API response format
 */
export function mapCurrentToLegacySchema(currentData: SightingFormData & { id: number }): LegacySightingResponse {
	// Split datetime back into date and time components
	const { datum, uhrzeit } = splitDateAndTime(currentData.sightingDate);

	return {
		id: currentData.id,
		datum, // DD.MM.YYYY format
		uhrzeit, // HH:MM format
		breitengrad: currentData.latitude || undefined,
		laengengrad: currentData.longitude || undefined,
		anzahlGesamt: currentData.totalCount || 0,
		anzahlJung: currentData.juvenileCount || 0,
		tierart: currentData.species || 0,
		totfund: currentData.isDead ? 1 : 0,
		
		// Conditional fields based on consent
		beobachterName: currentData.nameConsent 
			? `${currentData.firstName || ''} ${currentData.lastName || ''}`.trim()
			: '',
		gebiet: currentData.waterway || undefined,
		schiffsname: currentData.shipNameConsent 
			? currentData.shipName || undefined
			: undefined
	};
}

/**
 * Parses legacy datetime string (YYYY-MM-DD HH:MI) into ISO datetime string
 * 
 * @param datetime - DateTime in "YYYY-MM-DD HH:MI" format
 * @returns ISO datetime string for current schema
 */
function parseLegacyDateTime(datetime: string): string {
	// Split datetime into date and time parts
	const parts = datetime.trim().split(' ');
	if (parts.length !== 2) {
		throw new Error(`Invalid datetime format: ${datetime}. Expected "YYYY-MM-DD HH:MI"`);
	}
	
	const date = parts[0]!;
	const time = parts[1]!;
	return combineDateAndTime(date, time);
}

/**
 * Combines legacy date (YYYY-MM-DD) and time (HH:MM) into ISO datetime string
 * 
 * @param date - Date in YYYY-MM-DD format
 * @param time - Optional time in HH:MM format (defaults to 12:00)
 * @returns ISO datetime string for current schema
 */
function combineDateAndTime(date: string, time?: string): string {
	const timeStr = time || '12:00'; // Default to noon if no time provided
	
	// Validate date format (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(date)) {
		throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
	}
	
	// Validate actual date values  
	const testDate = new Date(date + 'T00:00:00.000Z');
	if (isNaN(testDate.getTime()) || testDate.toISOString().slice(0, 10) !== date) {
		throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
	}

	// Validate time format (HH:MM)
	const timeRegex = /^\d{2}:\d{2}$/;
	if (!timeRegex.test(timeStr)) {
		throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
	}
	
	// Validate actual time values
	const timeParts = timeStr.split(':').map(Number);
	const hours = timeParts[0];
	const minutes = timeParts[1];
	if (hours == null || minutes == null || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
		throw new Error(`Invalid time format: ${timeStr}. Expected HH:MM`);
	}

	// Combine and return as ISO string (compatible with current schema)
	return `${date}T${timeStr}:00.000Z`;
}

/**
 * Splits ISO datetime string into legacy date and time components
 * 
 * @param datetime - ISO datetime string from current schema
 * @returns Object with datum (DD.MM.YYYY) and uhrzeit (HH:MM) for legacy API
 */
function splitDateAndTime(datetime: string): { datum: string; uhrzeit: string } {
	const date = new Date(datetime);
	
	// Format date as DD.MM.YYYY for legacy API (use UTC to avoid timezone issues)
	const day = date.getUTCDate().toString().padStart(2, '0');
	const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
	const year = date.getUTCFullYear().toString();
	const datum = `${day}.${month}.${year}`;

	// Format time as HH:MM for legacy API (use UTC to avoid timezone issues)
	const hours = date.getUTCHours().toString().padStart(2, '0');
	const minutes = date.getUTCMinutes().toString().padStart(2, '0');
	const uhrzeit = `${hours}:${minutes}`;

	return { datum, uhrzeit };
}

/**
 * Validates legacy API request data format
 * 
 * @param data - Legacy API request data
 * @throws Error if validation fails
 */
export function validateLegacyRequest(data: unknown): asserts data is LegacySightingRequest {
	const record = data as Record<string, unknown>;
	
	// Required fields validation
	if (!record.sichtungsdatum) {
		throw new Error('Field "sichtungsdatum" is required');
	}
	if (!record.vorname) {
		throw new Error('Field "vorname" is required');
	}
	if (!record.name) {
		throw new Error('Field "name" is required');  
	}
	if (!record.email) {
		throw new Error('Field "email" is required');
	}
	if (record.anzahl_gesamt === undefined || record.anzahl_gesamt === null) {
		throw new Error('Field "anzahl_gesamt" is required');
	}

	// Date format validation (YYYY-MM-DD HH:MI)
	const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
	if (!datetimeRegex.test(record.sichtungsdatum as string)) {
		throw new Error('Field "sichtungsdatum" must be in "YYYY-MM-DD HH:MI" format');
	}

	// Legacy API doesn't use separate time field - it's combined in sichtungsdatum

	// Coordinate validation if provided
	if (record.gps_breite !== undefined) {
		const lat = Number(record.gps_breite);
		if (isNaN(lat) || lat < -90 || lat > 90) {
			throw new Error('Field "gps_breite" must be a number between -90 and 90');
		}
	}

	if (record.gps_laenge !== undefined) {
		const lon = Number(record.gps_laenge);
		if (isNaN(lon) || lon < -180 || lon > 180) {
			throw new Error('Field "gps_laenge" must be a number between -180 and 180');
		}
	}

	// Count validation
	const count = Number(record.anzahl_gesamt);
	if (isNaN(count) || count < 0) {
		throw new Error('Field "anzahl_gesamt" must be a non-negative number');
	}

	// Email format validation (basic)
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(record.email as string)) {
		throw new Error('Field "email" must be a valid email address');
	}
}

/**
 * Converts separate date/time format to combined datetime format
 * 
 * @param separateData - Legacy request with separate date/time fields
 * @returns Legacy request with combined datetime field
 */
export function convertSeparateToCombinedDateTime(separateData: LegacySightingRequestSeparateDateTime): LegacySightingRequest {
	const { datum, uhrzeit, ...rest } = separateData;
	const sichtungsdatum = `${datum} ${uhrzeit || '12:00'}`;
	
	return {
		sichtungsdatum,
		...rest
	};
}