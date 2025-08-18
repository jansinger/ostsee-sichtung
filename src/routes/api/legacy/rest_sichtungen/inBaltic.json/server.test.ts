/**
 * @fileoverview Tests for Legacy REST API Baltic Sea location check endpoint
 * 
 * Tests the GET /api/legacy/rest_sichtungen/inBaltic.json endpoint for
 * checking if coordinates are within the Baltic Sea using legacy format.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { LegacyLocationResponse } from '../../field-mapping/types';

// Mock geo validation and logger
vi.mock('$lib/server/geo/checkBalticSeaFile', () => ({
	checkBalticSeaFile: vi.fn()
}));

vi.mock('$lib/logger', () => ({
	createLogger: vi.fn().mockReturnValue({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// Helper to create mock request event
function createMockRequestEvent(location?: string): RequestEvent {
	const url = new URL('https://example.com/api/legacy/rest_sichtungen/inBaltic.json');
	if (location) {
		url.searchParams.set('location', location);
	}

	return {
		url,
		getClientAddress: () => '127.0.0.1'
	} as any;
}

// Get mocked functions
let mockCheckBalticSea: any;
let mockLogger: any;

describe('Legacy REST API - GET /rest_sichtungen/inBaltic.json', () => {
	beforeEach(async () => {
		// Get the mocked functions
		const geoModule = await import('$lib/server/geo/checkBalticSeaFile');
		const loggerModule = await import('$lib/logger');
		
		mockCheckBalticSea = vi.mocked(geoModule.checkBalticSeaFile);
		mockLogger = vi.mocked(loggerModule.createLogger).mock.results[0]?.value;
		
		vi.clearAllMocks();
	});

	describe('Valid Location Checks', () => {
		it('should return true for coordinates inside Baltic Sea', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent('54.5,11.2');
			const response = await GET(event);

			expect(response.status).toBe(200);

			const responseData: LegacyLocationResponse = await response.json();
			expect(responseData).toMatchObject({
				inbaltic: true,
				inchartarea: true
			});

			expect(mockCheckBalticSea).toHaveBeenCalledWith(11.2, 54.5);
		});

		it('should return false for coordinates outside Baltic Sea', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: false,
				inChartArea: false
			});

			const event = createMockRequestEvent('40.0,9.0');
			const response = await GET(event);

			expect(response.status).toBe(200);

			const responseData: LegacyLocationResponse = await response.json();
			expect(responseData).toMatchObject({
				inbaltic: false,
				inchartarea: false
			});

			expect(mockCheckBalticSea).toHaveBeenCalledWith(9.0, 40.0);
		});

		it('should return mixed results for edge cases', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: false,
				inChartArea: true
			});

			const event = createMockRequestEvent('53.8,12.5');
			const response = await GET(event);

			expect(response.status).toBe(200);

			const responseData: LegacyLocationResponse = await response.json();
			expect(responseData).toMatchObject({
				inbaltic: false,
				inchartarea: true
			});
		});

		it('should handle coordinates with high precision', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent('54.123456789,11.987654321');
			const response = await GET(event);

			expect(response.status).toBe(200);

			// Verify coordinates are normalized to 6 decimal places
			expect(mockCheckBalticSea).toHaveBeenCalledWith(11.987654, 54.123457);
		});

		it('should handle coordinates with whitespace', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent(' 54.5 , 11.2 ');
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(mockCheckBalticSea).toHaveBeenCalledWith(11.2, 54.5);
		});
	});

	describe('Parameter Validation', () => {
		it('should return 400 error when location parameter is missing', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'MissingParameter',
				message: 'Parameter "location" is required in format "latitude,longitude"'
			});

			expect(mockCheckBalticSea).not.toHaveBeenCalled();
		});

		it('should return 400 error for invalid location format', async () => {
			const event = createMockRequestEvent('54.5'); // Missing longitude
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidFormat',
				message: 'Parameter "location" must be in format "latitude,longitude"'
			});
		});

		it('should return 400 error for too many coordinates', async () => {
			const event = createMockRequestEvent('54.5,11.2,10.0'); // Too many parts
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidFormat',
				message: 'Parameter "location" must be in format "latitude,longitude"'
			});
		});

		it('should return 400 error for non-numeric coordinates', async () => {
			const event = createMockRequestEvent('abc,def');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidCoordinates',
				message: 'Coordinates must be valid numbers'
			});
		});

		it('should return 400 error for partially invalid coordinates', async () => {
			const event = createMockRequestEvent('54.5,xyz');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData.error).toBe('InvalidCoordinates');
		});
	});

	describe('Coordinate Range Validation', () => {
		it('should return 400 error for latitude out of range (too high)', async () => {
			const event = createMockRequestEvent('95.0,11.2');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLatitude',
				message: 'Latitude must be between -90 and 90'
			});
		});

		it('should return 400 error for latitude out of range (too low)', async () => {
			const event = createMockRequestEvent('-95.0,11.2');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLatitude',
				message: 'Latitude must be between -90 and 90'
			});
		});

		it('should return 400 error for longitude out of range (too high)', async () => {
			const event = createMockRequestEvent('54.5,185.0');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLongitude',
				message: 'Longitude must be between -180 and 180'
			});
		});

		it('should return 400 error for longitude out of range (too low)', async () => {
			const event = createMockRequestEvent('54.5,-185.0');
			const response = await GET(event);

			expect(response.status).toBe(400);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InvalidLongitude',
				message: 'Longitude must be between -180 and 180'
			});
		});

		it('should accept boundary coordinate values', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: false,
				inChartArea: false
			});

			// Test boundary values
			const boundaryTests = [
				'90.0,180.0',   // Max latitude/longitude
				'-90.0,-180.0', // Min latitude/longitude
				'0.0,0.0'       // Zero coordinates
			];

			for (const location of boundaryTests) {
				const event = createMockRequestEvent(location);
				const response = await GET(event);
				expect(response.status).toBe(200);
			}
		});
	});

	describe('Geo Validation Error Handling', () => {
		it('should handle geo validation service errors', async () => {
			mockCheckBalticSea.mockImplementation(() => {
				throw new Error('Geo service unavailable');
			});

			const event = createMockRequestEvent('54.5,11.2');
			const response = await GET(event);

			expect(response.status).toBe(500);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'GeoValidationError',
				message: 'Failed to validate location coordinates'
			});

			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'Geo service unavailable',
					ip: '127.0.0.1'
				}),
				'Error during Baltic Sea geo validation'
			);
		});
	});

	describe('Response Format', () => {
		it('should set proper cache headers', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent('54.5,11.2');
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should use lowercase field names for legacy compatibility', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: false
			});

			const event = createMockRequestEvent('54.5,11.2');
			const response = await GET(event);
			const responseData = await response.json();

			// Verify lowercase field names (not inBaltic/inChartArea)
			expect(responseData).toHaveProperty('inbaltic');
			expect(responseData).toHaveProperty('inchartarea');
			expect(responseData).not.toHaveProperty('inBaltic');
			expect(responseData).not.toHaveProperty('inChartArea');
		});
	});

	describe('Logging', () => {
		it('should log successful location checks', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent('54.5,11.2');
			await GET(event);

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					latitude: 54.5,
					longitude: 11.2,
					inBaltic: true,
					inChartArea: true,
					ip: '127.0.0.1'
				}),
				'Legacy Baltic Sea location check completed'
			);
		});

		it('should log coordinate normalization', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: true,
				inChartArea: true
			});

			const event = createMockRequestEvent('54.123456789,11.987654321');
			await GET(event);

			expect(mockLogger.debug).toHaveBeenCalledWith(
				expect.objectContaining({
					originalLat: 54.123456789,
					originalLon: 11.987654321,
					normalizedLat: 54.123457,
					normalizedLon: 11.987654,
					ip: '127.0.0.1'
				}),
				'Coordinates normalized for validation'
			);
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