/**
 * @fileoverview German error messages for Legacy REST API
 * 
 * Provides German error messages that match exactly with the original 
 * schweinswalsichtung.de API for 100% compatibility.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

/**
 * German error messages that match the original API exactly
 */
export const GERMAN_ERROR_MESSAGES = {
	// Required field errors
	SICHTUNGSDATUM_REQUIRED: 'Bitte geben Sie ein gültiges Datum an.',
	EMAIL_REQUIRED: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
	ANZAHL_GESAMT_REQUIRED: 'Dieses Feld kann nicht leer gelassen werden.',
	VORNAME_REQUIRED: 'Der Vorname darf nicht länger als 64 Zeichen sein.',
	NAME_REQUIRED: 'Der Name darf nicht länger als 64 Zeichen sein.',
	
	// Format validation errors
	SICHTUNGSDATUM_INVALID: 'Bitte geben Sie ein gültiges Datum an.',
	EMAIL_INVALID: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
	
	// Coordinate validation errors
	GPS_BREITE_RANGE: 'Der Breitengrad muss zwischen -90 und 90 liegen.',
	GPS_LAENGE_RANGE: 'Der Längengrad muss zwischen -180 und 180 liegen.',
	
	// General validation
	VALIDATION_FAILED: 'Validation failed.',
	NO_DATA_SEND: 'No data send.'
} as const;

/**
 * Maps field names to their German error messages
 */
export function getGermanFieldError(field: string, errorType: string): string {
	const key = `${field.toUpperCase()}_${errorType.toUpperCase()}` as keyof typeof GERMAN_ERROR_MESSAGES;
	return GERMAN_ERROR_MESSAGES[key] || `Ungültiger Wert für ${field}.`;
}

/**
 * Creates the exact error response format from the original API
 */
export function createOriginalApiErrorResponse(
	mainMessage: string, 
	fieldErrors?: Record<string, string[]>
): { message: { message: string; errors?: Record<string, string[]> } } {
	const response: { message: { message: string; errors?: Record<string, string[]> } } = {
		message: {
			message: mainMessage
		}
	};
	
	if (fieldErrors && Object.keys(fieldErrors).length > 0) {
		response.message.errors = fieldErrors;
	}
	
	return response;
}

/**
 * Creates simple error response for cases like "No data send"
 */
export function createSimpleErrorResponse(message: string): { message: { message: string } } {
	return {
		message: {
			message
		}
	};
}