/**
 * @fileoverview Legacy REST API endpoint for retrieving sightings
 * 
 * GET /api/legacy/sichtungen/showreports.json
 * 
 * Retrieves filtered sighting data in legacy API format for mobile app compatibility.
 * Supports various filter parameters and maps current schema to legacy response format.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { and, between, eq, gte, lt, sql } from 'drizzle-orm';
import { json, type RequestEvent } from '@sveltejs/kit';
import { mapCurrentToLegacySchema } from '../../field-mapping/index.js';
import type { LegacySightingResponse } from '../../field-mapping/types.js';

const logger = createLogger('api:legacy:showreports');

/**
 * GET handler for retrieving sightings in legacy format
 * 
 * Supports filtering by year, location, distance, bounding box, and search terms.
 * Returns approved sightings only, formatted according to legacy API specification.
 * 
 * @param event - SvelteKit request event
 * @returns JSON array of sightings in legacy format
 */
export async function GET(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();
	
	try {
		// Parse query parameters
		const searchParams = event.url.searchParams;
		const year = searchParams.get('year');
		const location = searchParams.get('location');
		const distance = searchParams.get('distance');
		const bbox = searchParams.get('bbox');
		const search = searchParams.get('search');

		logger.debug({ 
			year,
			location,
			distance,
			bbox,
			search: search ? '***masked***' : null, // Mask search terms for privacy
			ip: clientIp 
		}, 'Legacy sightings retrieval request');

		// Build where conditions array
		const whereConditions = [];

		// Only show approved sightings
		whereConditions.push(eq(sightings.approvedAt, sql`NOT NULL`));

		// Year filter
		if (year) {
			const yearNum = parseInt(year);
			if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 1) {
				const startDate = new Date(yearNum, 0, 1); // January 1st
				const endDate = new Date(yearNum + 1, 0, 1); // January 1st next year
				
				whereConditions.push(
					and(
						gte(sightings.sightingDate, startDate.toISOString()),
						lt(sightings.sightingDate, endDate.toISOString())
					)
				);

				logger.debug({ 
					year: yearNum,
					startDate,
					endDate,
					ip: clientIp 
				}, 'Applied year filter');
			} else {
				logger.warn({ 
					year,
					ip: clientIp 
				}, 'Invalid year parameter');
				
				return json({ 
					error: 'InvalidYear',
					message: 'Year must be a valid number between 1900 and current year' 
				}, { status: 400 });
			}
		}

		// Location filter (point-based search with radius)
		if (location) {
			const coords = location.split(',');
			if (coords.length === 2) {
				const lat = parseFloat(coords[0]!.trim());
				const lon = parseFloat(coords[1]!.trim());
				
				if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
					// Use a reasonable search radius (approximately 10km)
					const radius = 0.1; // degrees
					
					whereConditions.push(
						and(
							between(sightings.latitude, (lat - radius).toString(), (lat + radius).toString()),
							between(sightings.longitude, (lon - radius).toString(), (lon + radius).toString())
						)
					);

					logger.debug({ 
						location,
						lat,
						lon,
						radius,
						ip: clientIp 
					}, 'Applied location filter');
				} else {
					logger.warn({ 
						location,
						ip: clientIp 
					}, 'Invalid location coordinates');
					
					return json({ 
						error: 'InvalidLocation',
						message: 'Location must be in format "latitude,longitude" with valid ranges' 
					}, { status: 400 });
				}
			} else {
				logger.warn({ 
					location,
					ip: clientIp 
				}, 'Invalid location format');
				
				return json({ 
					error: 'InvalidLocationFormat',
					message: 'Location must be in format "latitude,longitude"' 
				}, { status: 400 });
			}
		}

		// Distance filter (enum value)
		if (distance) {
			const distanceNum = parseInt(distance);
			if (!isNaN(distanceNum) && distanceNum >= 1 && distanceNum <= 5) {
				whereConditions.push(eq(sightings.distance, distanceNum));

				logger.debug({ 
					distance: distanceNum,
					ip: clientIp 
				}, 'Applied distance filter');
			} else {
				logger.warn({ 
					distance,
					ip: clientIp 
				}, 'Invalid distance parameter');
				
				return json({ 
					error: 'InvalidDistance',
					message: 'Distance must be a number between 1 and 5' 
				}, { status: 400 });
			}
		}

		// Bounding box filter (bbox=minLon,minLat,maxLon,maxLat)
		if (bbox) {
			const coords = bbox.split(',');
			if (coords.length === 4) {
				const coordNumbers = coords.map(c => parseFloat(c.trim()));
				
				if (coordNumbers.length === 4 && coordNumbers.every(n => !isNaN(n))) {
					const [minLon, minLat, maxLon, maxLat] = coordNumbers as [number, number, number, number];
					whereConditions.push(
						and(
							between(sightings.longitude, minLon.toString(), maxLon.toString()),
							between(sightings.latitude, minLat.toString(), maxLat.toString())
						)
					);

					logger.debug({ 
						bbox,
						minLon,
						minLat,
						maxLon,
						maxLat,
						ip: clientIp 
					}, 'Applied bounding box filter');
				} else {
					logger.warn({ 
						bbox,
						ip: clientIp 
					}, 'Invalid bounding box coordinates');
					
					return json({ 
						error: 'InvalidBBox',
						message: 'Bounding box must contain 4 valid numbers' 
					}, { status: 400 });
				}
			} else {
				logger.warn({ 
					bbox,
					ip: clientIp 
				}, 'Invalid bounding box format');
				
				return json({ 
					error: 'InvalidBBoxFormat',
					message: 'Bounding box must be in format "minLon,minLat,maxLon,maxLat"' 
				}, { status: 400 });
			}
		}

		// Search filter (searches in notes, waterway, and reaction fields)
		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.trim()}%`;
			
			whereConditions.push(
				sql`(
					${sightings.notes} ILIKE ${searchTerm} OR 
					${sightings.waterway} ILIKE ${searchTerm} OR 
					${sightings.reaction} ILIKE ${searchTerm} OR
					${sightings.otherObservations} ILIKE ${searchTerm}
				)`
			);

			logger.debug({ 
				searchLength: search.length,
				ip: clientIp 
			}, 'Applied search filter');
		}

		// Execute query with filters
		const dbSightings = await db
			.select({
				id: sightings.id,
				sichtungsdatum: sightings.sightingDate,
				latitude: sightings.latitude,
				longitude: sightings.longitude,
				totalCount: sightings.totalCount,
				juvenileCount: sightings.juvenileCount,
				species: sightings.species,
				isDead: sightings.isDead,
				firstName: sightings.firstName,
				lastName: sightings.lastName,
				nameConsent: sightings.nameConsent,
				waterway: sightings.waterway,
				shipName: sightings.shipName,
				shipNameConsent: sightings.shipNameConsent
			})
			.from(sightings)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
			.orderBy(sql`${sightings.sightingDate} DESC`)
			.limit(1000); // Reasonable limit to prevent abuse

		// Transform to legacy format
		const legacySightings: LegacySightingResponse[] = dbSightings.map(sighting => 
			mapCurrentToLegacySchema(sighting)
		);

		logger.info({ 
			totalResults: legacySightings.length,
			filtersApplied: {
				year: !!year,
				location: !!location,
				distance: !!distance,
				bbox: !!bbox,
				search: !!search
			},
			ip: clientIp 
		}, 'Legacy sightings retrieval completed');

		return json(legacySightings, {
			headers: {
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
				'Content-Type': 'application/json'
			}
		});

	} catch (dbError) {
		const error = dbError instanceof Error ? dbError : new Error('Unknown database error');
		logger.error({ 
			error: error.message,
			stack: error.stack,
			ip: clientIp 
		}, 'Error retrieving legacy sightings');

		const errorResponse = {
			error: 'DatabaseError',
			message: 'Failed to retrieve sightings'
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