/**
 * @fileoverview Tests for Legacy REST API sighting creation endpoint
 * 
 * Tests the POST /api/legacy/rest_sichtungen endpoint for creating sightings
 * in legacy format, validating request handling, field mapping, and responses.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { LegacySightingRequest } from '../field-mapping/types';

// Mock dependencies
vi.mock('$lib/server/db/sightingRepository', () => ({
	sightingRepository: {
		save: vi.fn()
	}
}));

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
function createMockRequestEvent(body: LegacySightingRequest): RequestEvent {
	return {
		request: {
			json: () => Promise.resolve(body)
		},
		getClientAddress: () => '127.0.0.1'
	} as any;
}

// Get mocked functions
let mockSave: any;
let mockCheckBalticSea: any;
let _mockLogger: any;

describe('Legacy REST API - POST /rest_sichtungen', () => {
	beforeEach(async () => {
		// Get the mocked functions
		const sightingRepository = await import('$lib/server/db/sightingRepository');
		const geoModule = await import('$lib/server/geo/checkBalticSeaFile');
		const loggerModule = await import('$lib/logger');
		
		mockSave = vi.mocked(sightingRepository.saveSighting);
		mockCheckBalticSea = vi.mocked(geoModule.checkBalticSeaFile);
		_mockLogger = vi.mocked(loggerModule.createLogger).mock.results[0]?.value;
		
		vi.clearAllMocks();
		// Default geo validation to return valid Baltic Sea location
		mockCheckBalticSea.mockReturnValue({
			inBaltic: true,
			inChartArea: true
		});
		// Default save to return successful result
		mockSave.mockResolvedValue({
			id: 12345,
			sightingDate: new Date('2024-03-15T14:30:00.000Z'),
			latitude: '54.3233',
			longitude: '10.1367'
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Valid Sighting Creation', () => {
		it('should create sighting with required fields only', async () => {
			const validRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				uhrzeit: '14:30',
				vorname: 'Max',
				nachname: 'Mustermann',
				email: 'max@example.com',
				anzahlGesamt: 3
			};

			const event = createMockRequestEvent(validRequest);
			const response = await POST(event);

			expect(response.status).toBe(201);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				success: true,
				id: 12345,
				datum: '15.03.2024',
				uhrzeit: '14:30'
			});

			expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
				sightingDate: '2024-03-15T14:30:00.000Z',
				firstName: 'Max',
				lastName: 'Mustermann',
				email: 'max@example.com',
				totalCount: 3,
				entryChannel: 4 // APP
			}));
		});

		it('should create sighting with all optional fields', async () => {
			const fullRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				uhrzeit: '09:15',
				vorname: 'Anna',
				nachname: 'Schmidt',
				email: 'anna@example.com',
				telefon: '+49 123 456789',
				anzahlGesamt: 8,
				anzahlJung: 2,
				tierart: 0, // Harbor porpoise
				breitengrad: 54.5,
				laengengrad: 11.2,
				beobachtungsort: 1,
				entfernung: 2,
				verteilung: 1,
				verhalten: 3,
				gebiet: 'Kieler Bucht',
				schiffsname: 'MS Baltic',
				seegang: 2,
				windrichtung: 'N',
				windstaerke: '3',
				sichtweite: 3,
				bootsantrieb: 1,
				namensnennung: 1,
				schiffnamensnennung: 0,
				datenschutzEinverstaendnis: 1,
				aufnahme: 'photo123.jpg',
				notizen: 'Beautiful sighting',
				reaktion: 'Animals approached boat',
				sonstiges: 'Perfect weather conditions'
			};

			const event = createMockRequestEvent(fullRequest);
			const response = await POST(event);

			expect(response.status).toBe(201);
			expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
				phone: '+49 123 456789',
				juvenileCount: 2,
				species: 0,
				latitude: 54.5,
				longitude: 11.2,
				nameConsent: 1,
				shipNameConsent: 0,
				privacyConsent: 1,
				mediaUpload: 1,
				mediaFile: 'photo123.jpg'
			}));
		});

		it('should handle death finding (anzahlGesamt = 0)', async () => {
			const deathRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 0,
				totfundGroesse: 180,
				totfundZustand: 2,
				totfundGeschlecht: 1
			};

			const event = createMockRequestEvent(deathRequest);
			const response = await POST(event);

			expect(response.status).toBe(201);
			expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
				totalCount: 0,
				isDead: 1,
				deadSize: 180,
				deadCondition: 2,
				deadSex: 1
			}));
		});
	});

	describe('Validation Errors', () => {
		it('should reject missing required fields', async () => {
			const invalidRequest = {
				datum: '2024-03-15',
				// Missing vorname, nachname, email, anzahlGesamt
			} as LegacySightingRequest;

			const event = createMockRequestEvent(invalidRequest);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('ValidationError');
			expect(responseData.message).toContain('Field "vorname" is required');
			expect(mockSave).not.toHaveBeenCalled();
		});

		it('should reject invalid date format', async () => {
			const invalidRequest: LegacySightingRequest = {
				datum: '15.03.2024', // Wrong format
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(invalidRequest);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('ValidationError');
			expect(responseData.message).toContain('Field "datum" must be in YYYY-MM-DD format');
		});

		it('should reject invalid time format', async () => {
			const invalidRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				uhrzeit: '25:70', // Invalid time
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(invalidRequest);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.message).toContain('Field "uhrzeit" must be in HH:MM format');
		});

		it('should reject invalid coordinates', async () => {
			const invalidRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				breitengrad: 95, // Invalid latitude
				laengengrad: 200 // Invalid longitude
			};

			const event = createMockRequestEvent(invalidRequest);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.message).toContain('Field "breitengrad" must be a number between -90 and 90');
		});

		it('should reject invalid email format', async () => {
			const invalidRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'invalid-email', // Invalid email
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(invalidRequest);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.message).toContain('Field "email" must be a valid email address');
		});
	});

	describe('Geographic Validation', () => {
		it('should reject coordinates outside Baltic Sea', async () => {
			mockCheckBalticSea.mockReturnValue({
				inBaltic: false,
				inChartArea: false
			});

			const requestOutsideBaltic: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				breitengrad: 40.0, // Mediterranean coordinates
				laengengrad: 9.0
			};

			const event = createMockRequestEvent(requestOutsideBaltic);
			const response = await POST(event);

			expect(response.status).toBe(400);
			const responseData = await response.json();
			expect(responseData.error).toBe('GeoValidationError');
			expect(responseData.message).toContain('not in Baltic Sea area');
			expect(mockSave).not.toHaveBeenCalled();
		});

		it('should accept coordinates inside Baltic Sea', async () => {
			const requestInsideBaltic: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				breitengrad: 54.5, // Baltic Sea coordinates
				laengengrad: 11.2
			};

			const event = createMockRequestEvent(requestInsideBaltic);
			const response = await POST(event);

			expect(response.status).toBe(201);
			expect(mockCheckBalticSea).toHaveBeenCalledWith(11.2, 54.5);
			expect(mockSave).toHaveBeenCalled();
		});

		it('should skip geo validation when coordinates are not provided', async () => {
			const requestWithoutCoords: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
				// No breitengrad/laengengrad
			};

			const event = createMockRequestEvent(requestWithoutCoords);
			const response = await POST(event);

			expect(response.status).toBe(201);
			expect(mockCheckBalticSea).not.toHaveBeenCalled();
			expect(mockSave).toHaveBeenCalled();
		});
	});

	describe('Database Error Handling', () => {
		it('should handle database save errors gracefully', async () => {
			mockSave.mockRejectedValue(new Error('Database connection failed'));

			const validRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(validRequest);
			const response = await POST(event);

			expect(response.status).toBe(500);
			const responseData = await response.json();
			expect(responseData.error).toBe('DatabaseError');
			expect(responseData.message).toContain('Failed to save sighting');
		});
	});

	describe('Default Value Handling', () => {
		it('should apply correct default values', async () => {
			const minimalRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(minimalRequest);
			const response = await POST(event);

			expect(response.status).toBe(201);
			expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({
				sightingDate: '2024-03-15T12:00:00.000Z', // Default time
				juvenileCount: 0,
				species: 0,
				latitude: null,
				longitude: null,
				isDead: 0,
				mediaUpload: 0,
				entryChannel: 4 // APP
			}));
		});
	});

	describe('Response Format', () => {
		it('should return correct success response format', async () => {
			const validRequest: LegacySightingRequest = {
				datum: '2024-03-15',
				uhrzeit: '14:30',
				vorname: 'Test',
				nachname: 'User', 
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const event = createMockRequestEvent(validRequest);
			const response = await POST(event);

			expect(response.status).toBe(201);
			const responseData = await response.json();

			expect(responseData).toMatchObject({
				success: true,
				id: expect.any(Number),
				datum: '15.03.2024', // DD.MM.YYYY format
				uhrzeit: '14:30'
			});

			// Verify response headers
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});
	});
});