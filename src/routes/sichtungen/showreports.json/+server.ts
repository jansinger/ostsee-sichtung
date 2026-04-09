/**
 * @fileoverview Legacy REST API endpoint - PDF specification compliance
 *
 * GET /sichtungen/showreports.json
 *
 * Retrieves sightings in EXACT legacy format from PDF specification.
 * This endpoint MUST maintain 100% compatibility with original schweinswalsichtung.de API.
 *
 * CRITICAL: Response format uses abbreviated field names as specified in PDF!
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { formatDateDDMMYY, formatTimeHHMI, toUnixTimestamp } from '$lib/legacy-api/date-utils.js';
import { createLogger } from '$lib/logger';
import { getSpeciesLabel } from '$lib/report/formOptions/species.js';
import { db } from '$lib/server/db';
import { sightings } from '$lib/server/db/schema';
import { json, type RequestEvent } from '@sveltejs/kit';
import { and, between, sql } from 'drizzle-orm';

const logger = createLogger('api:legacy:showreports:pdf-compliant');

/**
 * PDF-compliant legacy sighting response format
 * Field names MUST match PDF specification exactly!
 */
interface PDFCompliantSightingResponse {
	ts: number; // Unix Timestamp
	id: number; // Report ID
	dt: string; // Date (DD.MM.YY format)
	ti: string; // Time (HH:MI format)
	lat: string; // Latitude as STRING (not number!)
	lon: string; // Longitude as STRING (not number!)
	ct: number; // Total count
	yo: number; // Young count
	ta?: string; // Tierart (species name as string)
	tf?: number; // Totfund (death finding): 0=false, 1=true
	sh?: string; // Ship name (only if consent)
	na?: string; // Name (first + last, only if consent)
	ar?: string; // Area/waterway
	bm?: number; // Baltic marker (admin only): 0=Outside, 1=inchartarea, 2=inbaltic
	va?: number; // Validated (admin only): 0=False, 1=True
}

/**
 * GET handler for PDF-compliant sighting retrieval
 *
 * Returns sightings in EXACT PDF format with abbreviated field names
 */
export async function GET(event: RequestEvent): Promise<Response> {
	const clientIp = event.getClientAddress();

	try {
		// Parse query parameters exactly as specified in PDF
		const searchParams = event.url.searchParams;
		const year = searchParams.get('year');
		const location = searchParams.get('location');
		const distance = searchParams.get('distance');
		const bbox = searchParams.get('bbox');
		const search = searchParams.get('search');

		logger.debug(
			{
				year,
				location,
				distance,
				bbox,
				search: search ? '***masked***' : null, // Privacy: mask search terms
				ip: clientIp
			},
			'PDF-compliant legacy sightings retrieval request'
		);

		// Build where conditions array
		const whereConditions = [];

		// Only show approved sightings (as per PDF: "freigegeben")
		whereConditions.push(sql`${sightings.approvedAt} IS NOT NULL`);

		// Year filter - PDF specification behavior
		if (year) {
			const yearNum = parseInt(year);
			if (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 1) {
				const startDate = new Date(yearNum, 0, 1); // January 1st
				const endDate = new Date(yearNum + 1, 0, 1); // January 1st next year

				whereConditions.push(and(between(sightings.sightingDate, startDate, endDate)));

				logger.debug(
					{
						year: yearNum,
						startDate,
						endDate,
						ip: clientIp
					},
					'Applied year filter (PDF compliant)'
				);
			} else {
				logger.warn(
					{
						year,
						ip: clientIp
					},
					'Invalid year parameter (PDF compliant)'
				);

				return json(
					{
						error: 'InvalidYear',
						message: 'Year must be a valid number between 1900 and current year'
					},
					{ status: 400 }
				);
			}
		}

		// Distance validation (only used together with location) - PDF specification
		// Strict integer validation: reject partial numbers like "50000abc"
		let distanceMeters = 100000; // default 100km in meters
		if (distance) {
			if (!/^\d+$/.test(distance) || parseInt(distance, 10) <= 0) {
				return json(
					{
						error: 'InvalidDistance',
						message: 'Distance must be a positive integer in meters'
					},
					{ status: 400 }
				);
			}
			distanceMeters = parseInt(distance, 10);
		}

		// Location filter using ST_DWithin for accurate meter-based radius - PDF specification
		if (location) {
			const coords = location.split(',');
			if (coords.length === 2) {
				const lat = parseFloat(coords[0]!.trim());
				const lon = parseFloat(coords[1]!.trim());

				if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
					whereConditions.push(
						sql`ST_DWithin(
							ST_SetSRID(ST_MakePoint(
								CAST(${sightings.longitude} AS double precision),
								CAST(${sightings.latitude} AS double precision)
							), 4326)::geography,
							ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
							${distanceMeters}
						)`
					);

					logger.debug(
						{
							location,
							lat,
							lon,
							distanceMeters,
							ip: clientIp
						},
						'Applied location filter (PDF compliant)'
					);
				} else {
					return json(
						{
							error: 'InvalidLocation',
							message: 'Location must be in format "latitude,longitude" with valid ranges'
						},
						{ status: 400 }
					);
				}
			} else {
				return json(
					{
						error: 'InvalidLocationFormat',
						message: 'Location must be in format "latitude,longitude"'
					},
					{ status: 400 }
				);
			}
		}

		// Bounding box filter - PDF specification format
		if (bbox) {
			const coords = bbox.split(',');
			if (coords.length === 4) {
				const coordNumbers = coords.map((c) => parseFloat(c.trim()));

				if (coordNumbers.length === 4 && coordNumbers.every((n) => !isNaN(n))) {
					const [minLon, minLat, maxLon, maxLat] = coordNumbers as [number, number, number, number];

					// PDF: No results outside bbox=9,53,31,66 (Baltic Sea area)
					if (minLon < 9 || minLat < 53 || maxLon > 31 || maxLat > 66) {
						logger.debug(
							{
								bbox,
								note: 'Bounding box outside standard Baltic area',
								ip: clientIp
							},
							'Bounding box filter may return no results (PDF compliant)'
						);
					}

					whereConditions.push(
						and(
							between(sightings.longitude, minLon.toString(), maxLon.toString()),
							between(sightings.latitude, minLat.toString(), maxLat.toString())
						)
					);

					logger.debug(
						{
							bbox,
							minLon,
							minLat,
							maxLon,
							maxLat,
							ip: clientIp
						},
						'Applied bounding box filter (PDF compliant)'
					);
				} else {
					return json(
						{
							error: 'InvalidBBox',
							message: 'Bounding box must contain 4 valid numbers'
						},
						{ status: 400 }
					);
				}
			} else {
				return json(
					{
						error: 'InvalidBBoxFormat',
						message: 'Bounding box must be in format "minLon,minLat,maxLon,maxLat"'
					},
					{ status: 400 }
				);
			}
		}

		// Search filter - PDF specification: searches in Email, Name, First name, Ship name
		if (search && search.trim().length > 0) {
			const searchTerm = `%${search.trim()}%`;

			whereConditions.push(
				sql`(
					${sightings.email} ILIKE ${searchTerm} OR 
					${sightings.firstName} ILIKE ${searchTerm} OR 
					${sightings.lastName} ILIKE ${searchTerm} OR
					${sightings.shipName} ILIKE ${searchTerm}
				)`
			);

			logger.debug(
				{
					searchLength: search.length,
					ip: clientIp
				},
				'Applied search filter (PDF compliant)'
			);
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
				firstName: sightings.firstName,
				lastName: sightings.lastName,
				nameConsent: sightings.nameConsent,
				waterway: sightings.waterway,
				shipName: sightings.shipName,
				shipNameConsent: sightings.shipNameConsent,
				approvedAt: sightings.approvedAt,
				species: sightings.species,
				isDead: sightings.isDead
			})
			.from(sightings)
			.where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
			.orderBy(sql`${sightings.sightingDate} DESC`)
			.limit(1000); // Reasonable limit to prevent abuse

		// Transform to PDF-compliant format with EXACT field names
		const pdfCompliantSightings: PDFCompliantSightingResponse[] = dbSightings.map((sighting) => {
			const date = new Date(sighting.sichtungsdatum);

			// PDF format: DD.MM.YY (2-digit year!) - timezone-safe formatting
			const dt = formatDateDDMMYY(date);

			// PDF format: HH:MI - timezone-safe formatting
			const ti = formatTimeHHMI(date);

			// Create base response with required fields
			const response: PDFCompliantSightingResponse = {
				ts: toUnixTimestamp(date), // Unix timestamp
				id: sighting.id,
				dt, // Date in DD.MM.YY format
				ti, // Time in HH:MI format
				lat: sighting.latitude || '0', // MUST be string as per PDF
				lon: sighting.longitude || '0', // MUST be string as per PDF
				ct: sighting.totalCount || 0, // Total count
				yo: sighting.juvenileCount || 0 // Young count
			};

			// Add species name (ta) - convert from enum to German label
			if (sighting.species !== null && sighting.species !== undefined) {
				response.ta = getSpeciesLabel(sighting.species);
			}

			// Add death finding flag (tf) - convert boolean to 0/1
			response.tf = sighting.isDead ? 1 : 0;

			// Conditional fields based on consent (as per PDF specification)
			if (sighting.shipNameConsent && sighting.shipName) {
				response.sh = sighting.shipName;
			}

			if (sighting.nameConsent && (sighting.firstName || sighting.lastName)) {
				response.na = `${sighting.firstName || ''} ${sighting.lastName || ''}`.trim();
			}

			if (sighting.waterway) {
				response.ar = sighting.waterway;
			}

			// Admin-only fields (bm, va) are not included in public API
			// PDF: "wird nur bei angemeldetem Admin geliefert"

			return response;
		});

		logger.info(
			{
				totalResults: pdfCompliantSightings.length,
				filtersApplied: {
					year: !!year,
					location: !!location,
					distance: !!distance,
					bbox: !!bbox,
					search: !!search
				},
				ip: clientIp
			},
			'Legacy sightings retrieval completed'
		);

		return json(pdfCompliantSightings, {
			headers: {
				'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
				'Content-Type': 'application/json'
			}
		});
	} catch (dbError) {
		const error = dbError instanceof Error ? dbError : new Error('Unknown database error');
		logger.error(
			{
				error: error.message,
				stack: error.stack,
				ip: clientIp
			},
			'Error retrieving PDF-compliant legacy sightings'
		);

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
	return json(
		{
			error: 'MethodNotAllowed',
			message: 'Only GET method is supported for this endpoint'
		},
		{ status: 405 }
	);
}

export async function PUT() {
	return json(
		{
			error: 'MethodNotAllowed',
			message: 'Only GET method is supported for this endpoint'
		},
		{ status: 405 }
	);
}

export async function DELETE() {
	return json(
		{
			error: 'MethodNotAllowed',
			message: 'Only GET method is supported for this endpoint'
		},
		{ status: 405 }
	);
}
