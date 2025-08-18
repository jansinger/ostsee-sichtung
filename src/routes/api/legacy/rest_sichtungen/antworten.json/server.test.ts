/**
 * @fileoverview Tests for Legacy REST API response options endpoint
 * 
 * Tests the GET /api/legacy/rest_sichtungen/antworten.json endpoint for
 * retrieving dropdown options in legacy format for mobile app compatibility.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from './+server';
import type { RequestEvent } from '@sveltejs/kit';
import type { LegacyResponseOptions } from '../../field-mapping/types';

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
function createMockRequestEvent(): RequestEvent {
	return {
		url: new URL('https://example.com/api/legacy/rest_sichtungen/antworten.json'),
		getClientAddress: () => '127.0.0.1'
	} as any;
}

// Get mocked functions
let mockLogger: any;

describe('Legacy REST API - GET /rest_sichtungen/antworten.json', () => {
	beforeEach(async () => {
		// Get the mocked logger
		const loggerModule = await import('$lib/logger');
		mockLogger = vi.mocked(loggerModule.createLogger).mock.results[0]?.value;
		
		vi.clearAllMocks();
	});

	describe('GET Method', () => {
		it('should return all response options in legacy format', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);

			const responseData: LegacyResponseOptions = await response.json();

			// Verify all expected option categories are present
			expect(responseData).toHaveProperty('tierart');
			expect(responseData).toHaveProperty('beobachtungsort');
			expect(responseData).toHaveProperty('entfernung');
			expect(responseData).toHaveProperty('verteilung');
			expect(responseData).toHaveProperty('verhalten');
			expect(responseData).toHaveProperty('seegang');
			expect(responseData).toHaveProperty('windrichtung');
			expect(responseData).toHaveProperty('windstaerke');
			expect(responseData).toHaveProperty('sichtweite');
			expect(responseData).toHaveProperty('bootsantrieb');
			expect(responseData).toHaveProperty('totfundZustand');
			expect(responseData).toHaveProperty('totfundGeschlecht');

			// Verify each category is an array with proper structure
			expect(Array.isArray(responseData.tierart)).toBe(true);
			expect(responseData.tierart.length).toBeGreaterThan(0);
			expect(responseData.tierart[0]).toHaveProperty('value');
			expect(responseData.tierart[0]).toHaveProperty('label');
		});

		it('should include specific species options with correct values', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			const tierart = responseData.tierart;

			// Check for harbor porpoise (Schweinswal)
			const harboPorpoise = tierart.find(t => t.value === 0);
			expect(harboPorpoise).toBeDefined();
			expect(harboPorpoise!.label).toBe('Schweinswal');

			// Check for grey seal (Kegelrobbe)
			const greySeal = tierart.find(t => t.value === 1);
			expect(greySeal).toBeDefined();
			expect(greySeal!.label).toBe('Kegelrobbe');

			// Check for harbor seal (Seehund)
			const harborSeal = tierart.find(t => t.value === 2);
			expect(harborSeal).toBeDefined();
			expect(harborSeal!.label).toBe('Seehund');

			// Verify options are sorted by value
			const sortedValues = tierart.map(t => t.value).sort((a, b) => a - b);
			const actualValues = tierart.map(t => t.value);
			expect(actualValues).toEqual(sortedValues);
		});

		it('should include distance options with correct legacy values', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			const entfernung = responseData.entfernung;
			expect(entfernung.length).toBeGreaterThan(0);

			// Verify structure
			entfernung.forEach(option => {
				expect(typeof option.value).toBe('number');
				expect(typeof option.label).toBe('string');
				expect(option.label.length).toBeGreaterThan(0);
			});

			// Verify sorting by value
			const values = entfernung.map(e => e.value);
			const sortedValues = [...values].sort((a, b) => a - b);
			expect(values).toEqual(sortedValues);
		});

		it('should include wind direction options with string values', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			const windrichtung = responseData.windrichtung;
			expect(windrichtung.length).toBeGreaterThan(0);

			// Wind direction should use string values (compass directions)
			windrichtung.forEach(option => {
				expect(typeof option.value).toBe('string');
				expect(typeof option.label).toBe('string');
				// Note: wind direction can include empty string for "no wind"
			});

			// Should include common directions and empty string for "no wind" 
			const values = windrichtung.map(w => w.value);
			expect(values).toContain('');  // No wind
			expect(values).toContain('N'); // North
			expect(values).toContain('S'); // South
			expect(values).toContain('O'); // East (German: Ost)
			expect(values).toContain('W'); // West
		});

		it('should include wind strength options with string values sorted numerically', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			const windstaerke = responseData.windstaerke;
			expect(windstaerke.length).toBeGreaterThan(0);

			// Wind strength should use string values (Beaufort scale)
			windstaerke.forEach(option => {
				expect(typeof option.value).toBe('string');
				expect(typeof option.label).toBe('string');
				// Value should be numeric string
				expect(/^\d+$/.test(option.value)).toBe(true);
			});

			// Verify numeric sorting (not alphabetical)
			const numericValues = windstaerke.map(w => parseInt(w.value));
			const sortedNumericValues = [...numericValues].sort((a, b) => a - b);
			expect(numericValues).toEqual(sortedNumericValues);
		});

		it('should include dead animal condition and sex options', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			// Verify dead animal condition options
			const totfundZustand = responseData.totfundZustand;
			expect(totfundZustand.length).toBeGreaterThan(0);
			totfundZustand.forEach(option => {
				expect(typeof option.value).toBe('number');
				expect(typeof option.label).toBe('string');
			});

			// Verify dead animal sex options
			const totfundGeschlecht = responseData.totfundGeschlecht;
			expect(totfundGeschlecht.length).toBeGreaterThan(0);
			totfundGeschlecht.forEach(option => {
				expect(typeof option.value).toBe('number');
				expect(typeof option.label).toBe('string');
			});
		});

		it('should set proper cache headers', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);

			expect(response.status).toBe(200);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
			expect(response.headers.get('Content-Type')).toBe('application/json');
		});

		it('should log successful option generation', async () => {
			const event = createMockRequestEvent();
			await GET(event);

			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					optionCounts: expect.objectContaining({
						tierart: expect.any(Number),
						beobachtungsort: expect.any(Number),
						entfernung: expect.any(Number)
					}),
					ip: '127.0.0.1'
				}),
				'Legacy response options generated successfully'
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle errors during option generation', async () => {
			// Mock a failure in the options generation by causing an error
			vi.doMock('$lib/report/formOptions/species', () => {
				throw new Error('Failed to load species options');
			});

			// Create a new instance that will use the mocked module
			const { GET: FailingGET } = await import('./+server');

			const event = createMockRequestEvent();
			const response = await FailingGET(event);

			expect(response.status).toBe(500);

			const responseData = await response.json();
			expect(responseData).toMatchObject({
				error: 'InternalServerError',
				message: 'Failed to retrieve response options'
			});

			vi.doUnmock('$lib/report/formOptions/species');
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

	describe('Data Integrity', () => {
		it('should ensure all option categories have valid structure', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			// Define expected categories
			const expectedCategories = [
				'tierart', 'beobachtungsort', 'entfernung', 'verteilung',
				'verhalten', 'seegang', 'windrichtung', 'windstaerke',
				'sichtweite', 'bootsantrieb', 'totfundZustand', 'totfundGeschlecht'
			];

			expectedCategories.forEach(category => {
				expect(responseData[category]).toBeDefined();
				expect(Array.isArray(responseData[category])).toBe(true);
				expect(responseData[category].length).toBeGreaterThan(0);

				// Verify each option has required properties
				responseData[category].forEach(option => {
					expect(option).toHaveProperty('value');
					expect(option).toHaveProperty('label');
					expect(option.label).toBeTruthy();
				});
			});
		});

		it('should maintain consistency with form options', async () => {
			const event = createMockRequestEvent();
			const response = await GET(event);
			const responseData: LegacyResponseOptions = await response.json();

			// Test that species enum values are consistent
			const tierart = responseData.tierart;
			const harboPorpoise = tierart.find(t => t.value === 0);
			expect(harboPorpoise?.label).toBe('Schweinswal');

			// Test distance options consistency
			const entfernung = responseData.entfernung;
			expect(entfernung.length).toBeGreaterThan(3); // Should have multiple distance options

			// Test that all values are unique within each category
			const tierartValues = tierart.map(t => t.value);
			const uniqueTierartValues = [...new Set(tierartValues)];
			expect(tierartValues.length).toBe(uniqueTierartValues.length);
		});
	});
});