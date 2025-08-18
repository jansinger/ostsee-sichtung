/**
 * @fileoverview Validation utilities for PDF-compliant Legacy REST API
 * 
 * Provides validation functions that match EXACTLY the original schweinswalsichtung.de
 * API specification from the PDF documentation.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import type { LegacySightingRequest, LegacyErrorResponse } from './types.js';

/**
 * Validates content type header
 */
export function validateContentType(contentType: string | null): boolean {
	return contentType === 'application/json';
}

/**
 * Creates a legacy error response in the exact PDF format
 */
export function createLegacyErrorResponse(
	message: string,
	errors: Record<string, string[]>
): LegacyErrorResponse {
	return {
		error: 'ValidationError',
		message,
		details: errors
	};
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
 * Comprehensive field validation for legacy sighting
 */
export function validateLegacySighting(data: LegacySightingRequest): { isValid: boolean; errors: Record<string, string[]> } {
	const errors: Record<string, string[]> = {};

	// Required field validation
	const requiredFields = [
		{ field: 'sichtungsdatum', message: 'Date is required' },
		{ field: 'vorname', message: 'First name is required' },
		{ field: 'name', message: 'Last name is required' },
		{ field: 'email', message: 'Email is required' },
		{ field: 'anzahl_gesamt', message: 'Total count is required' }
	];

	requiredFields.forEach(({ field, message }) => {
		const value = data[field as keyof LegacySightingRequest];
		// Special handling for anzahl_gesamt - 0 is valid (death finding)
		if (field === 'anzahl_gesamt') {
			if (value === undefined || value === null) {
				if (!errors[field]) errors[field] = [];
				errors[field]!.push(message);
			}
		} else if (!value) {
			if (!errors[field]) errors[field] = [];
			errors[field]!.push(message);
		}
	});

	// Coordinate validation
	if (data.gps_breite !== undefined) {
		const lat = Number(data.gps_breite);
		if (isNaN(lat) || lat < -90 || lat > 90) {
			if (!errors.gps_breite) errors.gps_breite = [];
			errors.gps_breite.push('Latitude must be between -90 and 90');
		}
	}

	if (data.gps_laenge !== undefined) {
		const lon = Number(data.gps_laenge);
		if (isNaN(lon) || lon < -180 || lon > 180) {
			if (!errors.gps_laenge) errors.gps_laenge = [];
			errors.gps_laenge.push('Longitude must be between -180 and 180');
		}
	}

	// Enum range validations as per PDF
	const enumValidations = [
		{ field: 'vonwo', min: 0, max: 3 },
		{ field: 'entfernung', min: 1, max: 5 },
		{ field: 'verteilung', min: 0, max: 3 },
		{ field: 'verhalten', min: 0, max: 3 },
		{ field: 'seegang', min: 0, max: 5 },
		{ field: 'sichtweite', min: 1, max: 4 },
		{ field: 'bootsantrieb', min: 0, max: 4 },
		{ field: 'eingangskanal', min: 0, max: 5 },
		{ field: 'tierart', min: 0, max: 10 },
		{ field: 'totfund_zustand', min: 0, max: 5 },
		{ field: 'totfund_geschlecht', min: 0, max: 2 }
	];

	enumValidations.forEach(({ field, min, max }) => {
		const value = data[field as keyof LegacySightingRequest];
		if (value !== undefined) {
			const num = Number(value);
			if (isNaN(num) || num < min || num > max) {
				if (!errors[field]) errors[field] = [];
				errors[field]!.push(`${field} must be between ${min} and ${max}`);
			}
		}
	});

	// Wind direction validation - PDF specifies exact values
	if (data.windrichtung !== undefined) {
		const validDirections = ['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
		if (!validDirections.includes(data.windrichtung)) {
			if (!errors.windrichtung) errors.windrichtung = [];
			errors.windrichtung.push('Wind direction must be one of: N, NW, W, SW, S, SO, O, NO');
		}
	}

	// Wind strength validation - PDF specifies 1-12 range
	if (data.windstaerke !== undefined) {
		const strength = Number(data.windstaerke);
		if (isNaN(strength) || strength < 1 || strength > 12) {
			if (!errors.windstaerke) errors.windstaerke = [];
			errors.windstaerke.push('Wind strength must be between 1 and 12');
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Validates death finding specific fields
 */
export function validateDeathFinding(data: LegacySightingRequest, errors: Record<string, string[]>): void {
	// If anzahl_gesamt is 0, it's a death finding
	if (data.anzahl_gesamt === 0) {
		// These are warnings/recommendations, not blocking errors
		if (!data.totfund_zustand) {
			if (!errors.totfund_zustand) errors.totfund_zustand = [];
			errors.totfund_zustand.push('Dead animal condition recommended for death findings');
		}
	}
}