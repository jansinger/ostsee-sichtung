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
export function validateLegacySighting(data: unknown): {
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
function validateRequiredFields(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	const requiredFields = [
		{ field: 'sichtungsdatum', message: 'Date is required' },
		{ field: 'vorname', message: 'First name is required' },
		{ field: 'name', message: 'Last name is required' },
		{ field: 'email', message: 'Email is required' },
		{ field: 'anzahl_gesamt', message: 'Total count is required' }
	];

	for (const { field, message } of requiredFields) {
		if (record[field] === undefined || record[field] === null || record[field] === '') {
			addError(errors, field, message);
		}
	}
}

/**
 * Validates date and time formats
 */
function validateDateTimeFormats(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	// Combined datetime format validation (YYYY-MM-DD HH:MM)
	if (record.sichtungsdatum) {
		const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
		if (!datetimeRegex.test(record.sichtungsdatum as string)) {
			addError(errors, 'sichtungsdatum', 'DateTime must be in YYYY-MM-DD HH:MM format');
		} else {
			// Validate actual date and time components
			const [datePart, timePart] = (record.sichtungsdatum as string).split(' ');
			const date = new Date(datePart + 'T' + timePart + ':00.000Z');
			if (isNaN(date.getTime())) {
				addError(errors, 'sichtungsdatum', 'Invalid date or time value');
			}
		}
	}
}

/**
 * Validates numeric fields and their ranges
 */
function validateNumericRanges(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	// Coordinate validation
	if (record.gps_breite !== undefined) {
		const lat = Number(record.gps_breite);
		if (isNaN(lat)) {
			addError(errors, 'gps_breite', 'Latitude must be a number');
		} else if (lat < -90 || lat > 90) {
			addError(errors, 'gps_breite', 'Latitude must be between -90 and 90');
		}
	}

	if (record.gps_laenge !== undefined) {
		const lon = Number(record.gps_laenge);
		if (isNaN(lon)) {
			addError(errors, 'gps_laenge', 'Longitude must be a number');
		} else if (lon < -180 || lon > 180) {
			addError(errors, 'gps_laenge', 'Longitude must be between -180 and 180');
		}
	}

	// Count validation
	if (record.anzahl_gesamt !== undefined) {
		const count = Number(record.anzahl_gesamt);
		if (isNaN(count)) {
			addError(errors, 'anzahl_gesamt', 'Total count must be a number');
		} else if (count < 0) {
			addError(errors, 'anzahl_gesamt', 'Total count cannot be negative');
		} else if (count > 1000) {
			addError(errors, 'anzahl_gesamt', 'Total count seems unrealistically high');
		}
	}

	if (record.anzahl_jung !== undefined) {
		const juvenileCount = Number(record.anzahl_jung);
		if (isNaN(juvenileCount)) {
			addError(errors, 'anzahl_jung', 'Juvenile count must be a number');
		} else if (juvenileCount < 0) {
			addError(errors, 'anzahl_jung', 'Juvenile count cannot be negative');
		} else if (record.anzahl_gesamt !== undefined && juvenileCount > Number(record.anzahl_gesamt)) {
			addError(errors, 'anzahl_jung', 'Juvenile count cannot exceed total count');
		}
	}
}

/**
 * Validates email format
 */
function validateEmail(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	if (record.email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(record.email as string)) {
			addError(errors, 'email', 'Invalid email format');
		}
	}
}

/**
 * Validates enum field values
 */
function validateEnumFields(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	const enumValidations = [
		{ field: 'tierart', min: 0, max: 6, name: 'Species' },
		{ field: 'vonwo', min: 0, max: 3, name: 'Observation location' },
		{ field: 'entfernung', min: 1, max: 5, name: 'Distance' },
		{ field: 'verteilung', min: 0, max: 5, name: 'Distribution' },
		{ field: 'verhalten', min: 0, max: 10, name: 'Behavior' },
		{ field: 'seegang', min: 0, max: 9, name: 'Sea state' },
		{ field: 'sichtweite', min: 0, max: 5, name: 'Visibility' },
		{ field: 'bootsantrieb', min: 0, max: 5, name: 'Boat drive' },
		{ field: 'totfund_zustand', min: 0, max: 4, name: 'Dead animal condition' },
		{ field: 'totfund_geschlecht', min: 0, max: 2, name: 'Dead animal sex' }
	];

	for (const { field, min, max, name } of enumValidations) {
		if (record[field] !== undefined) {
			const value = Number(record[field]);
			if (isNaN(value)) {
				addError(errors, field, `${name} must be a number`);
			} else if (value < min || value > max) {
				addError(errors, field, `${name} must be between ${min} and ${max}`);
			}
		}
	}

	// Wind direction validation
	if (record.windrichtung) {
		const validWindDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
		if (!validWindDirections.includes(record.windrichtung as string)) {
			addError(errors, 'windrichtung', 'Invalid wind direction');
		}
	}

	// Wind force validation  
	if (record.windstaerke) {
		const windForce = Number(record.windstaerke);
		if (isNaN(windForce) || windForce < 0 || windForce > 12) {
			addError(errors, 'windstaerke', 'Wind force must be between 0 and 12');
		}
	}

	// Boolean fields validation (should be 0 or 1)
	const booleanFields = [
		'namensnennung',
		'schiffnamensnennung', 
		'datenschutzEinverstaendnis',
		'totfund_telefon'
	];

	for (const field of booleanFields) {
		if (record[field] !== undefined) {
			const value = Number(record[field]);
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
export function validateDeathFinding(data: unknown, errors: Record<string, string[]>): void {
	const record = data as Record<string, unknown>;
	if (record.anzahl_gesamt === 0) {
		// When it's a death finding, certain fields are recommended
		if (!record.totfund_zustand) {
			addError(errors, 'totfund_zustand', 'Condition is recommended for death findings');
		}
		
		// Juvenile count should be 0 for death findings
		if (record.anzahl_jung && Number(record.anzahl_jung) > 0) {
			addError(errors, 'anzahl_jung', 'Juvenile count should be 0 for death findings');
		}
	}
}