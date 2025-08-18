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
import type { LegacySightingRequest, LegacySightingResponse } from './types';

/**
 * Maps legacy API request to current SightingFormData format
 * 
 * @param legacyData - Legacy API request data
 * @returns Transformed data in current schema format
 */
export function mapLegacyToCurrentSchema(legacyData: LegacySightingRequest): SightingFormData {
	// Combine date and time into ISO datetime string
	const sichtungsdatum = combineDateAndTime(legacyData.datum, legacyData.uhrzeit);

	return {
		// Date and location
		sightingDate: sichtungsdatum,
		latitude: legacyData.breitengrad || 0,
		longitude: legacyData.laengengrad || 0,
		waterway: legacyData.gebiet || '',
		seaMark: legacyData.seezeichen || '',

		// Observer information  
		firstName: legacyData.vorname,
		lastName: legacyData.nachname,
		email: legacyData.email,
		phone: legacyData.telefon || '',
		street: legacyData.strasse || '',
		zipCode: legacyData.plz || '',
		city: legacyData.ort || '',

		// Sighting details
		totalCount: legacyData.anzahlGesamt,
		juvenileCount: legacyData.anzahlJung || 0,
		species: legacyData.tierart || 0,

		// Observation context
		sightingFrom: legacyData.beobachtungsort || 0,
		distance: legacyData.entfernung || 0,
		distribution: legacyData.verteilung || 0,
		distributionText: '', // Legacy API doesn't separate this
		behavior: legacyData.verhalten || 0,
		behaviorText: '', // Legacy API doesn't separate this
		reaction: legacyData.reaktion || '',

		// Environmental conditions
		seaState: legacyData.seegang || 0,
		windDirection: (legacyData.windrichtung as any) || '',
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
		otherObservations: legacyData.sonstigeAuffaelligkeiten || '',
		notes: legacyData.bemerkungen || '',

		// Consent flags (convert 0/1 to boolean)
		nameConsent: legacyData.namensnennung ? true : false,
		shipNameConsent: legacyData.schiffnamensnennung ? true : false,
		privacyConsent: legacyData.datenschutzEinverstaendnis ? true : false,

		// Death finding detection and fields
		isDead: legacyData.anzahlGesamt === 0 ? true : false,
		deadSize: legacyData.totfundGroesse || undefined,
		deadCondition: legacyData.totfundZustand || 0,
		deadSex: legacyData.totfundGeschlecht || 0,
		deadPhoneContact: legacyData.totfundTelefon ? true : false,

		// System fields
		entryChannel: EntryChannelEnum.APP,
		shipCount: null, // Legacy API doesn't track ship count separately
		
		// Required fields that legacy API doesn't provide
		verified: false,
		referenceId: `LEGACY-${Date.now()}`, // Generate a reference ID for legacy imports
		uploadedFiles: [], // Legacy API handles media differently
		hasPosition: !!(legacyData.breitengrad && legacyData.laengengrad), // True if coordinates provided
		
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
export function mapCurrentToLegacySchema(currentData: any): LegacySightingResponse {
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
		totfund: currentData.isDead || 0,
		
		// Conditional fields based on consent
		beobachterName: currentData.nameConsent === 1 
			? `${currentData.firstName || ''} ${currentData.lastName || ''}`.trim()
			: '',
		gebiet: currentData.waterway || undefined,
		schiffsname: currentData.shipNameConsent === 1 
			? currentData.shipName || undefined
			: undefined
	};
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
	
	// Format date as DD.MM.YYYY for legacy API
	const datum = date.toLocaleDateString('de-DE', {
		day: '2-digit',
		month: '2-digit', 
		year: 'numeric'
	});

	// Format time as HH:MM for legacy API
	const uhrzeit = date.toLocaleTimeString('de-DE', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	return { datum, uhrzeit };
}

/**
 * Validates legacy API request data format
 * 
 * @param data - Legacy API request data
 * @throws Error if validation fails
 */
export function validateLegacyRequest(data: any): asserts data is LegacySightingRequest {
	// Required fields validation
	if (!data.datum) {
		throw new Error('Field "datum" is required');
	}
	if (!data.vorname) {
		throw new Error('Field "vorname" is required');
	}
	if (!data.nachname) {
		throw new Error('Field "nachname" is required');  
	}
	if (!data.email) {
		throw new Error('Field "email" is required');
	}
	if (data.anzahlGesamt === undefined || data.anzahlGesamt === null) {
		throw new Error('Field "anzahlGesamt" is required');
	}

	// Date format validation (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(data.datum)) {
		throw new Error('Field "datum" must be in YYYY-MM-DD format');
	}

	// Time format validation (HH:MM) if provided
	if (data.uhrzeit) {
		const timeRegex = /^\d{2}:\d{2}$/;
		if (!timeRegex.test(data.uhrzeit)) {
			throw new Error('Field "uhrzeit" must be in HH:MM format');
		}
		
		// Validate actual time values
		const [hours, minutes] = data.uhrzeit.split(':').map(Number);
		if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
			throw new Error('Field "uhrzeit" must be in HH:MM format');
		}
	}

	// Coordinate validation if provided
	if (data.breitengrad !== undefined) {
		const lat = Number(data.breitengrad);
		if (isNaN(lat) || lat < -90 || lat > 90) {
			throw new Error('Field "breitengrad" must be a number between -90 and 90');
		}
	}

	if (data.laengengrad !== undefined) {
		const lon = Number(data.laengengrad);
		if (isNaN(lon) || lon < -180 || lon > 180) {
			throw new Error('Field "laengengrad" must be a number between -180 and 180');
		}
	}

	// Count validation
	const count = Number(data.anzahlGesamt);
	if (isNaN(count) || count < 0) {
		throw new Error('Field "anzahlGesamt" must be a non-negative number');
	}

	// Email format validation (basic)
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(data.email)) {
		throw new Error('Field "email" must be a valid email address');
	}
}