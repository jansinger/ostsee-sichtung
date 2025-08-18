/**
 * @fileoverview Legacy API validation utilities
 * 
 * Provides validation functions specific to legacy API requirements.
 * Ensures data integrity while maintaining backwards compatibility.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import type { LegacyErrorResponse } from './types';

/**
 * Comprehensive validation for legacy sighting requests
 * 
 * @param data - Legacy API request data
 * @returns Validation result with errors if any
 */
export function validateLegacySighting(data: any): {
	isValid: boolean;
	errors: Record<string, string[]>;
} {
	const errors: Record<string, string[]> = {};

	// Required field validation
	validateRequiredFields(data, errors);
	
	// Format validation
	validateDateTimeFormats(data, errors);
	
	// Range validation
	validateNumericRanges(data, errors);
	
	// Email validation
	validateEmail(data, errors);
	
	// Enum validation
	validateEnumFields(data, errors);

	return {
		isValid: Object.keys(errors).length === 0,
		errors
	};
}

/**
 * Validates required fields according to legacy API specification
 */
function validateRequiredFields(data: any, errors: Record<string, string[]>): void {
	const requiredFields = [
		{ field: 'datum', message: 'Date is required' },
		{ field: 'vorname', message: 'First name is required' },
		{ field: 'nachname', message: 'Last name is required' },
		{ field: 'email', message: 'Email is required' },
		{ field: 'anzahlGesamt', message: 'Total count is required' }
	];

	for (const { field, message } of requiredFields) {
		if (data[field] === undefined || data[field] === null || data[field] === '') {
			addError(errors, field, message);
		}
	}
}

/**
 * Validates date and time formats
 */
function validateDateTimeFormats(data: any, errors: Record<string, string[]>): void {
	// Date format validation (YYYY-MM-DD)
	if (data.datum) {
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(data.datum)) {
			addError(errors, 'datum', 'Date must be in YYYY-MM-DD format');
		} else {
			// Validate actual date
			const date = new Date(data.datum);
			if (isNaN(date.getTime())) {
				addError(errors, 'datum', 'Invalid date value');
			}
		}
	}

	// Time format validation (HH:MM)
	if (data.uhrzeit) {
		const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
		if (!timeRegex.test(data.uhrzeit)) {
			addError(errors, 'uhrzeit', 'Time must be in HH:MM format');
		}
	}
}

/**
 * Validates numeric fields and their ranges
 */
function validateNumericRanges(data: any, errors: Record<string, string[]>): void {
	// Coordinate validation
	if (data.breitengrad !== undefined) {
		const lat = Number(data.breitengrad);
		if (isNaN(lat)) {
			addError(errors, 'breitengrad', 'Latitude must be a number');
		} else if (lat < -90 || lat > 90) {
			addError(errors, 'breitengrad', 'Latitude must be between -90 and 90');
		}
	}

	if (data.laengengrad !== undefined) {
		const lon = Number(data.laengengrad);
		if (isNaN(lon)) {
			addError(errors, 'laengengrad', 'Longitude must be a number');
		} else if (lon < -180 || lon > 180) {
			addError(errors, 'laengengrad', 'Longitude must be between -180 and 180');
		}
	}

	// Count validation
	if (data.anzahlGesamt !== undefined) {
		const count = Number(data.anzahlGesamt);
		if (isNaN(count)) {
			addError(errors, 'anzahlGesamt', 'Total count must be a number');
		} else if (count < 0) {
			addError(errors, 'anzahlGesamt', 'Total count cannot be negative');
		} else if (count > 1000) {
			addError(errors, 'anzahlGesamt', 'Total count seems unrealistically high');
		}
	}

	if (data.anzahlJung !== undefined) {
		const juvenileCount = Number(data.anzahlJung);
		if (isNaN(juvenileCount)) {
			addError(errors, 'anzahlJung', 'Juvenile count must be a number');
		} else if (juvenileCount < 0) {
			addError(errors, 'anzahlJung', 'Juvenile count cannot be negative');
		} else if (data.anzahlGesamt !== undefined && juvenileCount > data.anzahlGesamt) {
			addError(errors, 'anzahlJung', 'Juvenile count cannot exceed total count');
		}
	}
}

/**
 * Validates email format
 */
function validateEmail(data: any, errors: Record<string, string[]>): void {
	if (data.email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(data.email)) {
			addError(errors, 'email', 'Invalid email format');
		}
	}
}

/**
 * Validates enum field values
 */
function validateEnumFields(data: any, errors: Record<string, string[]>): void {
	const enumValidations = [
		{ field: 'tierart', min: 0, max: 6, name: 'Species' },
		{ field: 'beobachtungsort', min: 0, max: 3, name: 'Observation location' },
		{ field: 'entfernung', min: 1, max: 5, name: 'Distance' },
		{ field: 'verteilung', min: 0, max: 5, name: 'Distribution' },
		{ field: 'verhalten', min: 0, max: 10, name: 'Behavior' },
		{ field: 'seegang', min: 0, max: 9, name: 'Sea state' },
		{ field: 'sichtweite', min: 0, max: 5, name: 'Visibility' },
		{ field: 'bootsantrieb', min: 0, max: 5, name: 'Boat drive' },
		{ field: 'totfundZustand', min: 0, max: 4, name: 'Dead animal condition' },
		{ field: 'totfundGeschlecht', min: 0, max: 2, name: 'Dead animal sex' }
	];

	for (const { field, min, max, name } of enumValidations) {
		if (data[field] !== undefined) {
			const value = Number(data[field]);
			if (isNaN(value)) {
				addError(errors, field, `${name} must be a number`);
			} else if (value < min || value > max) {
				addError(errors, field, `${name} must be between ${min} and ${max}`);
			}
		}
	}

	// Wind direction validation
	if (data.windrichtung) {
		const validWindDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
		if (!validWindDirections.includes(data.windrichtung)) {
			addError(errors, 'windrichtung', 'Invalid wind direction');
		}
	}

	// Wind force validation  
	if (data.windstaerke) {
		const windForce = Number(data.windstaerke);
		if (isNaN(windForce) || windForce < 0 || windForce > 12) {
			addError(errors, 'windstaerke', 'Wind force must be between 0 and 12');
		}
	}

	// Boolean fields validation (should be 0 or 1)
	const booleanFields = [
		'namensnennung',
		'schiffnamensnennung', 
		'datenschutzEinverstaendnis',
		'totfundTelefon'
	];

	for (const field of booleanFields) {
		if (data[field] !== undefined) {
			const value = Number(data[field]);
			if (value !== 0 && value !== 1) {
				addError(errors, field, 'Value must be 0 or 1');
			}
		}
	}
}

/**
 * Helper function to add validation errors
 */
function addError(errors: Record<string, string[]>, field: string, message: string): void {
	if (!errors[field]) {
		errors[field] = [];
	}
	errors[field].push(message);
}

/**
 * Creates a legacy API error response
 * 
 * @param message - Main error message
 * @param details - Field-specific validation errors
 * @returns Legacy API error response
 */
export function createLegacyErrorResponse(
	message: string,
	details?: Record<string, string[]>
): LegacyErrorResponse {
	return {
		error: 'ValidationError',
		message,
		...(details && { details })
	};
}

/**
 * Validates POST content type for legacy API
 * 
 * @param contentType - Request content type header
 * @returns True if valid, false otherwise
 */
export function validateContentType(contentType: string | null): boolean {
	if (!contentType) {
		return false;
	}
	
	return contentType.includes('application/json');
}

/**
 * Validates that death finding fields are properly set when anzahlGesamt = 0
 * 
 * @param data - Legacy API request data
 * @param errors - Errors object to add validation errors to
 */
export function validateDeathFinding(data: any, errors: Record<string, string[]>): void {
	if (data.anzahlGesamt === 0) {
		// When it's a death finding, certain fields are recommended
		if (!data.totfundZustand) {
			addError(errors, 'totfundZustand', 'Condition is recommended for death findings');
		}
		
		// Juvenile count should be 0 for death findings
		if (data.anzahlJung && data.anzahlJung > 0) {
			addError(errors, 'anzahlJung', 'Juvenile count should be 0 for death findings');
		}
	}
}