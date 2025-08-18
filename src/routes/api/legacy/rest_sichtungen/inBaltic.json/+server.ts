/**
 * @fileoverview Legacy REST API endpoint for location checking
 * 
 * GET /api/legacy/rest_sichtungen/inBaltic.json
 * 
 * Checks if a location is within the Baltic Sea area using legacy API format.
 * Reuses existing geo validation logic but returns legacy field names.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { createLogger } from '$lib/logger';
import { checkBalticSeaFile } from '$lib/server/geo/checkBalticSeaFile';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { LegacyLocationResponse } from '../../field-mapping/types.js';

const logger = createLogger('api:legacy:inBaltic');

/**
 * GET handler for checking if coordinates are in the Baltic Sea
 * 
 * Accepts a 'location' parameter in format "latitude,longitude" and returns
 * legacy API response with inbaltic and inchartarea flags.
 * 
 * @param event - SvelteKit request event
 * @returns JSON response with location validation result
 */
export async function GET(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();
	
	try {
		// Get location parameter from query string
		const locationParam = event.url.searchParams.get('location');
		
		logger.debug({ 
			location: locationParam,
			ip: clientIp 
		}, 'Legacy Baltic Sea location check requested');

		// Validate location parameter presence
		if (!locationParam) {
			logger.warn({ ip: clientIp }, 'Missing location parameter');
			
			const errorResponse = {
				error: 'MissingParameter',
				message: 'Parameter "location" is required in format "latitude,longitude"'
			};
			
			return json(errorResponse, { status: 400 });
		}

		// Parse location parameter (format: "latitude,longitude")
		const coordinates = locationParam.split(',');
		if (coordinates.length !== 2) {
			logger.warn({ 
				location: locationParam,
				ip: clientIp 
			}, 'Invalid location parameter format');
			
			const errorResponse = {
				error: 'InvalidFormat',
				message: 'Parameter "location" must be in format "latitude,longitude"'
			};
			
			return json(errorResponse, { status: 400 });
		}

		// Convert to numbers and validate
		const latitude = parseFloat(coordinates[0]!.trim());
		const longitude = parseFloat(coordinates[1]!.trim());

		// Validate coordinate values
		if (isNaN(latitude) || isNaN(longitude)) {
			logger.warn({ 
				latitude: coordinates[0],
				longitude: coordinates[1],
				ip: clientIp 
			}, 'Invalid coordinate values');
			
			const errorResponse = {
				error: 'InvalidCoordinates',
				message: 'Coordinates must be valid numbers'
			};
			
			return json(errorResponse, { status: 400 });
		}

		// Validate coordinate ranges
		if (latitude < -90 || latitude > 90) {
			logger.warn({ 
				latitude,
				ip: clientIp 
			}, 'Latitude out of valid range');
			
			const errorResponse = {
				error: 'InvalidLatitude',
				message: 'Latitude must be between -90 and 90'
			};
			
			return json(errorResponse, { status: 400 });
		}

		if (longitude < -180 || longitude > 180) {
			logger.warn({ 
				longitude,
				ip: clientIp 
			}, 'Longitude out of valid range');
			
			const errorResponse = {
				error: 'InvalidLongitude',
				message: 'Longitude must be between -180 and 180'
			};
			
			return json(errorResponse, { status: 400 });
		}

		// Round coordinates to reasonable precision (6 decimal places)
		const normalizedLatitude = Number(latitude.toFixed(6));
		const normalizedLongitude = Number(longitude.toFixed(6));

		logger.debug({ 
			originalLat: latitude,
			originalLon: longitude,
			normalizedLat: normalizedLatitude,
			normalizedLon: normalizedLongitude,
			ip: clientIp 
		}, 'Coordinates normalized for validation');

		// Use existing Baltic Sea validation logic
		const result = checkBalticSeaFile(normalizedLongitude, normalizedLatitude);

		// Map to legacy API response format
		const legacyResponse: LegacyLocationResponse = {
			inbaltic: result.inBaltic,      // Note: lowercase 'b' for legacy compatibility
			inchartarea: result.inChartArea // Note: lowercase for legacy compatibility
		};

		logger.info({ 
			latitude: normalizedLatitude,
			longitude: normalizedLongitude,
			inBaltic: result.inBaltic,
			inChartArea: result.inChartArea,
			ip: clientIp 
		}, 'Legacy Baltic Sea location check completed');

		return json(legacyResponse, {
			headers: {
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
				'Content-Type': 'application/json'
			}
		});

	} catch (geoError) {
		const error = geoError instanceof Error ? geoError : new Error('Unknown geo validation error');
		logger.error({ 
			error: error.message,
			stack: error.stack,
			ip: clientIp 
		}, 'Error during Baltic Sea geo validation');

		const errorResponse = {
			error: 'GeoValidationError',
			message: 'Failed to validate location coordinates'
		};

		return json(errorResponse, { status: 500 });
	}
}

/**
 * Handle unsupported HTTP methods
 */
export async function POST() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}

export async function PUT() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}

export async function DELETE() {
	return json({ 
		error: 'MethodNotAllowed',
		message: 'Only GET method is supported for this endpoint' 
	}, { status: 405 });
}