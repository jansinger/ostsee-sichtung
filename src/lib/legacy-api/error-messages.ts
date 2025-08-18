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
	// General validation
	NO_DATA_SEND: 'No data send.'
} as const;


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