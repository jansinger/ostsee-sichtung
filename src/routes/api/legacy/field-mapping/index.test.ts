/**
 * @fileoverview Tests for Legacy API field mapping
 * 
 * Comprehensive test suite for bidirectional field mapping between legacy API
 * format and current schema. Validates data transformation and format conversion.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { describe, expect, it } from 'vitest';
import { mapLegacyToCurrentSchema, mapCurrentToLegacySchema, validateLegacyRequest } from './index';
import type { LegacySightingRequest } from './types';

describe('Legacy API Field Mapping', () => {
	describe('mapLegacyToCurrentSchema', () => {
		it('should map required fields correctly', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				uhrzeit: '14:30',
				vorname: 'Max',
				nachname: 'Mustermann',
				email: 'max@example.com',
				anzahlGesamt: 5
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.sightingDate).toBe('2024-03-15T14:30:00.000Z');
			expect(result.firstName).toBe('Max');
			expect(result.lastName).toBe('Mustermann');
			expect(result.email).toBe('max@example.com');
			expect(result.totalCount).toBe(5);
		});

		it('should handle death finding (anzahlGesamt = 0)', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 0,
				totfundGroesse: 150,
				totfundZustand: 2,
				totfundGeschlecht: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.isDead).toBe(1);
			expect(result.totalCount).toBe(0);
			expect(result.deadSize).toBe(150);
			expect(result.deadCondition).toBe(2);
			expect(result.deadSex).toBe(1);
		});

		it('should map coordinates correctly', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 3,
				breitengrad: 54.3233,
				laengengrad: 10.1367
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.latitude).toBe(54.3233);
			expect(result.longitude).toBe(10.1367);
		});

		it('should handle missing optional fields', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 2
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.latitude).toBeNull();
			expect(result.longitude).toBeNull();
			expect(result.juvenileCount).toBe(0);
			expect(result.species).toBe(0);
			expect(result.phone).toBe('');
		});

		it('should use default time when uhrzeit is missing', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.sightingDate).toBe('2024-03-15T12:00:00.000Z');
		});

		it('should set entry channel to MOBILE_APP', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.entryChannel).toBe(4); // APP enum value
		});

		it('should handle consent flags (0/1 to 0/1)', () => {
			const legacyData: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				namensnennung: 1,
				schiffnamensnennung: 0,
				datenschutzEinverstaendnis: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.nameConsent).toBe(1);
			expect(result.shipNameConsent).toBe(0);
			expect(result.privacyConsent).toBe(1);
		});

		it('should detect media upload flag from aufnahme field', () => {
			const legacyDataWithMedia: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				aufnahme: 'photo123.jpg'
			};

			const legacyDataWithoutMedia: LegacySightingRequest = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			const resultWithMedia = mapLegacyToCurrentSchema(legacyDataWithMedia);
			const resultWithoutMedia = mapLegacyToCurrentSchema(legacyDataWithoutMedia);

			expect(resultWithMedia.mediaUpload).toBe(1);
			expect(resultWithMedia.mediaFile).toBe('photo123.jpg');
			expect(resultWithoutMedia.mediaUpload).toBe(0);
			expect(resultWithoutMedia.mediaFile).toBe('');
		});
	});

	describe('mapCurrentToLegacySchema', () => {
		it('should map current schema to legacy response format', () => {
			const currentData = {
				id: 123,
				sightingDate: '2024-03-15T14:30:00.000Z',
				latitude: 54.3233,
				longitude: 10.1367,
				totalCount: 5,
				juvenileCount: 2,
				species: 0,
				isDead: 0,
				firstName: 'Max',
				lastName: 'Mustermann',
				nameConsent: 1,
				waterway: 'Kiel Bucht',
				shipName: 'Test Schiff',
				shipNameConsent: 1
			};

			const result = mapCurrentToLegacySchema(currentData);

			expect(result.id).toBe(123);
			expect(result.datum).toBe('15.03.2024'); // DD.MM.YYYY format
			expect(result.uhrzeit).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
			expect(result.breitengrad).toBe(54.3233);
			expect(result.laengengrad).toBe(10.1367);
			expect(result.anzahlGesamt).toBe(5);
			expect(result.anzahlJung).toBe(2);
			expect(result.tierart).toBe(0);
			expect(result.totfund).toBe(0);
			expect(result.beobachterName).toBe('Max Mustermann');
			expect(result.gebiet).toBe('Kiel Bucht');
			expect(result.schiffsname).toBe('Test Schiff');
		});

		it('should respect name consent', () => {
			const currentDataWithConsent = {
				id: 123,
				sightingDate: '2024-03-15T14:30:00.000Z',
				firstName: 'Max',
				lastName: 'Mustermann',
				nameConsent: 1,
				totalCount: 1,
				juvenileCount: 0,
				species: 0,
				isDead: 0
			};

			const currentDataWithoutConsent = {
				...currentDataWithConsent,
				nameConsent: 0
			};

			const resultWithConsent = mapCurrentToLegacySchema(currentDataWithConsent);
			const resultWithoutConsent = mapCurrentToLegacySchema(currentDataWithoutConsent);

			expect(resultWithConsent.beobachterName).toBe('Max Mustermann');
			expect(resultWithoutConsent.beobachterName).toBeUndefined();
		});

		it('should respect ship name consent', () => {
			const currentDataWithConsent = {
				id: 123,
				sightingDate: '2024-03-15T14:30:00.000Z',
				shipName: 'Test Schiff',
				shipNameConsent: 1,
				totalCount: 1,
				juvenileCount: 0,
				species: 0,
				isDead: 0
			};

			const currentDataWithoutConsent = {
				...currentDataWithConsent,
				shipNameConsent: 0
			};

			const resultWithConsent = mapCurrentToLegacySchema(currentDataWithConsent);
			const resultWithoutConsent = mapCurrentToLegacySchema(currentDataWithoutConsent);

			expect(resultWithConsent.schiffsname).toBe('Test Schiff');
			expect(resultWithoutConsent.schiffsname).toBeUndefined();
		});

		it('should handle missing optional fields', () => {
			const currentData = {
				id: 123,
				sightingDate: '2024-03-15T14:30:00.000Z',
				totalCount: 1,
				juvenileCount: 0,
				species: 0,
				isDead: 0
			};

			const result = mapCurrentToLegacySchema(currentData);

			expect(result.breitengrad).toBeUndefined();
			expect(result.laengengrad).toBeUndefined();
			expect(result.beobachterName).toBeUndefined();
			expect(result.gebiet).toBeUndefined();
			expect(result.schiffsname).toBeUndefined();
		});
	});

	describe('validateLegacyRequest', () => {
		it('should validate required fields', () => {
			const validData = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			expect(() => validateLegacyRequest(validData)).not.toThrow();
		});

		it('should throw error for missing required fields', () => {
			const invalidData = {
				datum: '2024-03-15',
				// Missing vorname, nachname, email, anzahlGesamt
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "vorname" is required');
		});

		it('should validate date format', () => {
			const invalidData = {
				datum: '15.03.2024', // Wrong format
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "datum" must be in YYYY-MM-DD format');
		});

		it('should validate time format', () => {
			const invalidData = {
				datum: '2024-03-15',
				uhrzeit: '25:70', // Invalid time
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "uhrzeit" must be in HH:MM format');
		});

		it('should validate coordinate ranges', () => {
			const invalidLatData = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				breitengrad: 95 // Invalid latitude
			};

			const invalidLonData = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: 1,
				laengengrad: 185 // Invalid longitude
			};

			expect(() => validateLegacyRequest(invalidLatData)).toThrow('Field "breitengrad" must be a number between -90 and 90');
			expect(() => validateLegacyRequest(invalidLonData)).toThrow('Field "laengengrad" must be a number between -180 and 180');
		});

		it('should validate email format', () => {
			const invalidData = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'invalid-email',
				anzahlGesamt: 1
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "email" must be a valid email address');
		});

		it('should validate count values', () => {
			const invalidData = {
				datum: '2024-03-15',
				vorname: 'Test',
				nachname: 'User',
				email: 'test@example.com',
				anzahlGesamt: -1 // Negative count
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "anzahlGesamt" must be a non-negative number');
		});
	});

	describe('Date and Time Handling', () => {
		it('should handle various valid date formats', () => {
			const testCases = [
				{ input: { datum: '2024-01-01', uhrzeit: '00:00' }, expected: '2024-01-01T00:00:00.000Z' },
				{ input: { datum: '2024-12-31', uhrzeit: '23:59' }, expected: '2024-12-31T23:59:00.000Z' },
				{ input: { datum: '2024-06-15', uhrzeit: '12:30' }, expected: '2024-06-15T12:30:00.000Z' }
			];

			testCases.forEach(({ input, expected }) => {
				const legacyData: LegacySightingRequest = {
					...input,
					vorname: 'Test',
					nachname: 'User',
					email: 'test@example.com',
					anzahlGesamt: 1
				};

				const result = mapLegacyToCurrentSchema(legacyData);
				expect(result.sightingDate).toBe(expected);
			});
		});

		it('should throw error for invalid date formats', () => {
			const invalidDates = [
				'2024/03/15',
				'15-03-2024',
				'March 15, 2024',
				'2024-13-45', // Invalid month/day
				'abcd-ef-gh'
			];

			invalidDates.forEach(datum => {
				expect(() => {
					mapLegacyToCurrentSchema({
						datum,
						vorname: 'Test',
						nachname: 'User',
						email: 'test@example.com',
						anzahlGesamt: 1
					});
				}).toThrow('Invalid date format');
			});
		});

		it('should throw error for invalid time formats', () => {
			const invalidTimes = [
				'24:00',
				'12:60',
				'1:30', // Should be 01:30
				'12:5', // Should be 12:05
				'12-30',
				'noon'
			];

			invalidTimes.forEach(uhrzeit => {
				expect(() => {
					mapLegacyToCurrentSchema({
						datum: '2024-03-15',
						uhrzeit,
						vorname: 'Test',
						nachname: 'User',
						email: 'test@example.com',
						anzahlGesamt: 1
					});
				}).toThrow('Invalid time format');
			});
		});
	});
});