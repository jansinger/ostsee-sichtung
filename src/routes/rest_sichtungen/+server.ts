/**
 * @fileoverview Legacy REST API endpoint - Exact PDF specification compliance
 * 
 * POST /rest_sichtungen
 * 
 * Creates a new sighting using the EXACT legacy API format from the PDF specification.
 * This endpoint MUST maintain 100% compatibility with original schweinswalsichtung.de API.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { createLogger } from '$lib/logger';
import { saveSighting } from '$lib/server/db/sightingRepository';
import { json, type RequestEvent } from '@sveltejs/kit';
import { mapLegacyToCurrentSchema } from '$lib/legacy-api/field-mapping.js';
import type { LegacyCreateResponse, LegacyErrorResponse, LegacySightingRequest } from '$lib/legacy-api/types.js';
import { 
	createLegacyErrorResponse, 
	validateContentType, 
	validateLegacySighting,
	validateDeathFinding,
	validateLegacyRequest
} from '$lib/legacy-api/validation.js';

const logger = createLogger('api:legacy:rest_sichtungen:pdf-compliant');

/**
 * POST handler - PDF specification compliant endpoint
 */
export async function POST(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();
	
	try {
		// Validate content type
		const contentType = event.request.headers.get('content-type');
		if (!validateContentType(contentType)) {
			logger.warn({ contentType, ip: clientIp }, 'Invalid content type for legacy API');
			
			const errorResponse: LegacyErrorResponse = {
				error: 'InvalidContentType',
				message: 'Content-Type must be application/json'
			};
			
			return json(errorResponse, { status: 400 });
		}

		// Parse request body
		let requestData: any;
		try {
			requestData = await event.request.json();
		} catch (parseError) {
			logger.warn({ error: parseError, ip: clientIp }, 'Failed to parse JSON request body');
			
			const errorResponse: LegacyErrorResponse = {
				error: 'InvalidJSON',
				message: 'Request body must be valid JSON'
			};
			
			return json(errorResponse, { status: 400 });
		}

		logger.debug({ 
			data: { ...requestData, email: '***masked***' },
			ip: clientIp 
		}, 'Legacy sighting creation request received (PDF compliant endpoint)');

		// Basic validation of legacy request format
		try {
			validateLegacyRequest(requestData);
		} catch (validationError: unknown) {
			const errorMsg = validationError instanceof Error ? validationError.message : 'Unknown validation error';
			logger.warn({ 
				error: errorMsg, 
				ip: clientIp 
			}, 'Legacy request validation failed');
			
			const errorResponse = createLegacyErrorResponse(
				'Validation failed',
				{ _general: [errorMsg] }
			);
			
			return json(errorResponse, { status: 400 });
		}

		// Comprehensive field validation
		const validation = validateLegacySighting(requestData);
		if (!validation.isValid) {
			logger.warn({ 
				errors: validation.errors, 
				ip: clientIp 
			}, 'Legacy field validation failed');
			
			const errorResponse = createLegacyErrorResponse(
				'Field validation failed',
				validation.errors
			);
			
			return json(errorResponse, { status: 400 });
		}

		// Death finding specific validation
		const deathFindingErrors: Record<string, string[]> = {};
		validateDeathFinding(requestData, deathFindingErrors);
		if (Object.keys(deathFindingErrors).length > 0) {
			logger.info({ 
				warnings: deathFindingErrors, 
				ip: clientIp 
			}, 'Death finding validation warnings (non-blocking)');
		}

		// Transform legacy data to current schema
		let transformedData;
		try {
			transformedData = mapLegacyToCurrentSchema(requestData as LegacySightingRequest);
		} catch (mappingError: unknown) {
			const errorMsg = mappingError instanceof Error ? mappingError.message : 'Unknown mapping error';
			logger.error({ 
				error: errorMsg, 
				ip: clientIp 
			}, 'Failed to map legacy data to current schema');
			
			const errorResponse = createLegacyErrorResponse(
				'Data transformation failed',
				{ _general: [errorMsg] }
			);
			
			return json(errorResponse, { status: 400 });
		}

		// Save sighting using existing repository
		let savedSighting;
		try {
			savedSighting = await saveSighting(transformedData);
			
			logger.info({ 
				sightingId: savedSighting.id,
				legacyCount: requestData.anzahl_gesamt,
				isDeathFinding: requestData.anzahl_gesamt === 0,
				ip: clientIp 
			}, 'Legacy sighting created successfully (PDF compliant)');

		} catch (saveError: unknown) {
			const isError = saveError instanceof Error;
			const errorMsg = isError ? saveError.message : 'Unknown save error';
			logger.error({ 
				error: errorMsg,
				stack: isError ? saveError.stack : undefined,
				ip: clientIp 
			}, 'Failed to save legacy sighting');

			// Handle different types of save errors
			if (isError && saveError.name === 'ValidationError') {
				const errorResponse = createLegacyErrorResponse(
					'Sighting validation failed',
					{ _general: [errorMsg] }
				);
				return json(errorResponse, { status: 400 });
			}

			// Database or system error
			const errorResponse = {
				error: 'Failed to save sighting',
				message: 'Internal server error occurred'
			};
			return json(errorResponse, { status: 500 });
		}

		// Create PDF-compliant success response
		const successResponse: LegacyCreateResponse = {
			message: 'Saved'
		};

		// Set Location header as per PDF specification
		const locationHeader = `/rest_sichtungen/view/${savedSighting.id}.json`;
		
		return json(successResponse, { 
			status: 201,
			headers: {
				'Location': locationHeader
			}
		});

	} catch (unexpectedError: unknown) {
		const isError = unexpectedError instanceof Error;
		logger.error({ 
			error: isError ? unexpectedError.message : 'Unknown error',
			stack: isError ? unexpectedError.stack : undefined,
			ip: clientIp 
		}, 'Unexpected error in PDF-compliant legacy sighting creation');

		const errorResponse = createLegacyErrorResponse(
			'Internal server error',
			{ _general: ['An unexpected error occurred'] }
		);

		return json(errorResponse, { status: 500 });
	}
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
	const errorResponse = {
		error: 'Method not allowed',
		message: 'Only POST method is supported for this endpoint'
	};
	
	return json(errorResponse, { status: 405 });
}

export async function PUT() {
	const errorResponse = {
		error: 'Method not allowed',
		message: 'Only POST method is supported for this endpoint'
	};
	
	return json(errorResponse, { status: 405 });
}

export async function DELETE() {
	const errorResponse = {
		error: 'Method not allowed',
		message: 'Only POST method is supported for this endpoint'
	};
	
	return json(errorResponse, { status: 405 });
}