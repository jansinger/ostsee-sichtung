/**
 * @fileoverview Tests for Legacy REST API sighting retrieval endpoint
 * 
 * Tests the GET /api/legacy/sichtungen/showreports.json endpoint for
 * retrieving filtered sighting data in legacy API format.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { LegacySightingResponse } from '../../field-mapping/types';

vi.mock('$lib/server/db', () => {
	const mockDbSelect = vi.fn().mockReturnThis();
	const mockDbFrom = vi.fn().mockReturnThis();
	const mockDbWhere = vi.fn().mockReturnThis();
	const mockDbOrderBy = vi.fn().mockReturnThis();
	const mockDbLimit = vi.fn().mockResolvedValue([]);

	return {
		db: {
			select: mockDbSelect,
			from: mockDbFrom,
			where: mockDbWhere,
			orderBy: mockDbOrderBy,
			limit: mockDbLimit
		}
	};
});

// Mock field mapping
vi.mock('../../field-mapping/index.js', () => ({
	mapCurrentToLegacySchema: vi.fn().mockImplementation((data) => ({
		id: data.id,
		datum: '15.03.2024',
		uhrzeit: '15:30',
		breitengrad: data.latitude,
		laengengrad: data.longitude,
		anzahlGesamt: data.totalCount,
		anzahlJung: data.juvenileCount,
		tierart: data.species,
		totfund: data.isDead,
		beobachterName: data.nameConsent === 1 ? `${data.firstName} ${data.lastName}` : '',
		gebiet: data.waterway,
		schiffsname: data.shipNameConsent === 1 ? data.shipName : ''
	}))
}));

// Mock logger
vi.mock('$lib/logger', () => ({
	createLogger: vi.fn().mockReturnValue({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// Helper to create mock request event
function createMockRequestEvent(searchParams: Record<string, string> = {}): RequestEvent {
	const url = new URL('https://example.com/api/legacy/sichtungen/showreports.json');
	Object.entries(searchParams).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});

	return {
		url,
		getClientAddress: () => '127.0.0.1'
	} as any;
}

// Sample database sighting data
const mockSightingData = [
	{
		id: 1,
		sichtungsdatum: '2024-03-15T14:30:00.000Z',
		latitude: 54.5,
		longitude: 11.2,
		totalCount: 3,
		juvenileCount: 1,
		species: 0,
		isDead: 0,
		firstName: 'Max',
		lastName: 'Mustermann',
		nameConsent: 1,
		waterway: 'Kieler Bucht',
		shipName: 'MS Baltic',
		shipNameConsent: 1
	},
	{
		id: 2,
		sichtungsdatum: '2024-03-14T10:15:00.000Z',
		latitude: 55.2,
		longitude: 12.8,
		totalCount: 1,
		juvenileCount: 0,
		species: 1,
		isDead: 0,
		firstName: 'Anna',
		lastName: 'Schmidt',
		nameConsent: 0,
		waterway: null,
		shipName: null,
		shipNameConsent: 0
	}
];

// Get mocked functions
let mockDbSelect: any;
let mockDbFrom: any;
let mockDbWhere: any;
let mockDbOrderBy: any;
let mockDbLimit: any;
let mockLogger: any;

describe('Legacy REST API - GET /sichtungen/showreports.json', () => {
	beforeEach(async () => {
		// Get the mocked functions
		const dbModule = await import('$lib/server/db');
		mockDbSelect = vi.mocked(dbModule.db.select);
		mockDbFrom = vi.mocked(dbModule.db.from);
		mockDbWhere = vi.mocked(dbModule.db.where);
		mockDbOrderBy = vi.mocked(dbModule.db.orderBy);
		mockDbLimit = vi.mocked(dbModule.db.limit);
		
		const loggerModule = await import('$lib/logger');
		mockLogger = vi.mocked(loggerModule.createLogger)();
		
		vi.clearAllMocks();
		// Reset chain methods
		mockDbSelect.mockReturnThis();
		mockDbFrom.mockReturnThis(); 
		mockDbWhere.mockReturnThis();
		mockDbOrderBy.mockReturnThis();
		mockDbLimit.mockResolvedValue(mockSightingData);
	});

	describe('Basic Functionality', () => {
		it('should return all approved sightings without filters', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);

			const responseData: LegacySightingResponse[] = await response.json();
			expect(Array.isArray(responseData)).toBe(true);
			expect(responseData.length).toBe(2);

			// Verify structure of first sighting
			expect(responseData[0]).toMatchObject({
				id: 1,
				datum: '15.03.2024',
				uhrzeit: '15:30',
				breitengrad: 54.5,
				laengengrad: 11.2,
				anzahlGesamt: 3,
				anzahlJung: 1,
				tierart: 0,
				totfund: 0
			});

			// Verify approved sightings filter is applied
			expect(mockDbWhere).toHaveBeenCalled();
		});

		it('should apply proper response headers', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});
	});

	describe('Year Filter', () => {
		it('should filter by year correctly', async () => {
			const event = createMockRequestEvent({ year: '2024' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					year: 2024,
					ip: '127.0.0.1'
				}),
				'Applied year filter'
			);
		});

		it('should reject invalid year values', async () => {
			const event = createMockRequestEvent({ year: 'abc' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidYear',
				message: 'Year must be a valid number between 1900 and current year'
			});
		});

		it('should reject year out of range', async () => {
			const event = createMockRequestEvent({ year: '1800' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData.error).toBe('InvalidYear');
		});

		it('should reject future years beyond reasonable range', async () => {
			const currentYear = new Date().getFullYear();
			const futureYear = (currentYear + 10).toString();
			
			const event = createMockRequestEvent({ year: futureYear });
			const response = await GET(event);

			expect(response.status).toBe(400);
		});
	});

	describe('Location Filter', () => {
		it('should filter by location coordinates', async () => {
			const event = createMockRequestEvent({ location: '54.5,11.2' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					location: '54.5,11.2',
					lat: 54.5,
					lon: 11.2,
					radius: 0.1,
					ip: '127.0.0.1'
				}),
				'Applied location filter'
			);
		});

		it('should reject invalid location format', async () => {
			const event = createMockRequestEvent({ location: '54.5' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLocationFormat',
				message: 'Location must be in format "latitude,longitude"'
			});
		});

		it('should reject invalid coordinates', async () => {
			const event = createMockRequestEvent({ location: 'abc,def' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLocation',
				message: 'Location must be in format "latitude,longitude" with valid ranges'
			});
		});

		it('should reject coordinates out of range', async () => {
			const event = createMockRequestEvent({ location: '95.0,200.0' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData.error).toBe('InvalidLocation');
		});
	});

	describe('Distance Filter', () => {
		it('should filter by distance value', async () => {
			const event = createMockRequestEvent({ distance: '2' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					distance: 2,
					ip: '127.0.0.1'
				}),
				'Applied distance filter'
			);
		});

		it('should reject invalid distance values', async () => {
			const event = createMockRequestEvent({ distance: '0' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidDistance',
				message: 'Distance must be a number between 1 and 5'
			});
		});

		it('should reject distance out of range', async () => {
			const event = createMockRequestEvent({ distance: '10' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData.error).toBe('InvalidDistance');
		});

		it('should reject non-numeric distance', async () => {
			const event = createMockRequestEvent({ distance: 'far' });
			const response = await GET(event);

			expect(response.status).toBe(400);
		});
	});

	describe('Bounding Box Filter', () => {
		it('should filter by bounding box coordinates', async () => {
			const event = createMockRequestEvent({ bbox: '10.0,53.0,13.0,56.0' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					bbox: '10.0,53.0,13.0,56.0',
					minLon: 10.0,
					minLat: 53.0,
					maxLon: 13.0,
					maxLat: 56.0,
					ip: '127.0.0.1'
				}),
				'Applied bounding box filter'
			);
		});

		it('should reject invalid bounding box format', async () => {
			const event = createMockRequestEvent({ bbox: '10.0,53.0,13.0' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidBBoxFormat',
				message: 'Bounding box must be in format "minLon,minLat,maxLon,maxLat"'
			});
		});

		it('should reject invalid bounding box coordinates', async () => {
			const event = createMockRequestEvent({ bbox: 'a,b,c,d' });
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidBBox',
				message: 'Bounding box must contain 4 valid numbers'
			});
		});
	});

	describe('Search Filter', () => {
		it('should filter by search term', async () => {
			const event = createMockRequestEvent({ search: 'whale' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					searchLength: 5,
					ip: '127.0.0.1'
				}),
				'Applied search filter'
			);
		});

		it('should ignore empty search terms', async () => {
			const event = createMockRequestEvent({ search: '' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			// Search filter should not be applied for empty string
			expect(mockLogger.debug).not.toHaveBeenCalledWith(
				expect.objectContaining({ searchLength: expect.any(Number) }),
				'Applied search filter'
			);
		});

		it('should ignore whitespace-only search terms', async () => {
			const event = createMockRequestEvent({ search: '   ' });
			const response = await GET(event);

			expect(response.status).toBe(200);
			// Search filter should not be applied for whitespace-only string
		});
	});

	describe('Combined Filters', () => {
		it('should apply multiple filters simultaneously', async () => {
			const event = createMockRequestEvent({
				year: '2024',
				location: '54.5,11.2',
				distance: '2',
				search: 'whale'
			});
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockDbWhere).toHaveBeenCalled();

			// Verify all filters were logged
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({ year: 2024 }),
				'Applied year filter'
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({ lat: 54.5, lon: 11.2 }),
				'Applied location filter'
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({ distance: 2 }),
				'Applied distance filter'
			);
			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({ searchLength: 5 }),
				'Applied search filter'
			);
		});

		it('should return filtered results summary', async () => {
			const event = createMockRequestEvent({
				year: '2024',
				distance: '2'
			});
			await GET(event);

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					totalResults: 2,
					filtersApplied: {
						year: true,
						location: false,
						distance: true,
						bbox: false,
						search: false
					},
					ip: '127.0.0.1'
				}),
				'Legacy sightings retrieval completed'
			);
		});
	});

	describe('Data Privacy', () => {
		it('should respect name consent settings', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacySightingResponse[] = await response.json();

			// First sighting has name consent
			expect(responseData[0].beobachterName).toBe('Max Mustermann');
			
			// Second sighting does not have name consent (nameConsent: 0)
			expect(responseData[1].beobachterName).toBe('');
		});

		it('should respect ship name consent settings', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacySightingResponse[] = await response.json();

			// First sighting has ship name consent
			expect(responseData[0].schiffsname).toBe('MS Baltic');
			
			// Second sighting does not have ship name consent
			expect(responseData[1].schiffsname).toBe('');
		});

		it('should mask search terms in logs for privacy', async () => {
			const event = createMockRequestEvent({ search: 'sensitive data' });
			await GET(event);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					search: '***masked***'
				}),
				expect.any(String)
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle database errors gracefully', async () => {
			mockDbLimit.mockRejectedValue(new Error('Database connection failed'));

			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(500);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'DatabaseError',
				message: 'Failed to retrieve sightings'
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'Database connection failed',
					ip: '127.0.0.1'
				}),
				'Error retrieving legacy sightings'
			);
		});
	});

	describe('Performance and Limits', () => {
		it('should apply reasonable result limit', async () => {
			const event = createMockRequestEvent();
			await GET(event);

			expect(mockDbLimit).toHaveBeenCalledWith(1000);
		});

		it('should sort results by date descending', async () => {
			const event = createMockRequestEvent();
			await GET(event);

			expect(mockDbOrderBy).toHaveBeenCalled();
		});
	});

	describe('HTTP Method Restrictions', () => {
		it('should reject POST requests', async () => {
			const response = await POST();

			expect(response.status).toBe(405);
			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'MethodNotAllowed',
				message: 'Only GET method is supported for this endpoint'
			});
		});

		it('should reject PUT requests', async () => {
			const response = await PUT();

			expect(response.status).toBe(405);
			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'MethodNotAllowed',
				message: 'Only GET method is supported for this endpoint'
			});
		});

		it('should reject DELETE requests', async () => {
			const response = await DELETE();

			expect(response.status).toBe(405);
			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'MethodNotAllowed',
				message: 'Only GET method is supported for this endpoint'
			});
		});
	});
});