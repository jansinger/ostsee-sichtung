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
import { mapLegacyToCurrentSchema, mapCurrentToLegacySchema, validateLegacyRequest, convertSeparateToCombinedDateTime } from './index';
import type { LegacySightingRequest, LegacySightingRequestSeparateDateTime } from './types';
import type { SightingFormData } from '$lib/types';

describe('Legacy API Field Mapping', () => {
	describe('mapLegacyToCurrentSchema', () => {
		it('should map required fields correctly', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 5
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.sightingDate).toBe('2024-03-15T14:30:00.000Z');
			expect(result.firstName).toBe('Max');
			expect(result.lastName).toBe('Mustermann');
			expect(result.email).toBe('max@example.com');
			expect(result.totalCount).toBe(5);
		});

		it('should handle death finding (anzahl_gesamt = 0)', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 12:00',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 0,
				totfund_groesse: 150,
				totfund_zustand: 2,
				totfund_geschlecht: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.isDead).toBe(true);
			expect(result.totalCount).toBe(0);
			expect(result.deadSize).toBe(150);
			expect(result.deadCondition).toBe(2);
			expect(result.deadSex).toBe(1);
		});

		it('should handle coordinates correctly', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 1,
				gps_breite: 54.3233,
				gps_laenge: 13.0814
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.latitude).toBe(54.3233);
			expect(result.longitude).toBe(13.0814);
			expect(result.hasPosition).toBe(true);
		});

		it('should handle optional fields', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 2,
				fahrwasser: 'Greifswalder Bodden',
				seezeichen: 'Leuchtturm Arkona',
				vonwo: 1,
				entfernung: 3,
				anzahl_jung: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.waterway).toBe('Greifswalder Bodden');
			expect(result.seaMark).toBe('Leuchtturm Arkona');
			expect(result.sightingFrom).toBe(1);
			expect(result.distance).toBe(3);
			expect(result.juvenileCount).toBe(1);
		});

		it('should handle environmental conditions', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 1,
				seegang: 2,
				windrichtung: 'SW',
				windstaerke: '3',
				sichtweite: 2
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.seaState).toBe(2);
			expect(result.windDirection).toBe('SW');
			expect(result.windForce).toBe(3);
			expect(result.visibility).toBe(2);
		});

		it('should handle consent flags', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 1,
				namensnennung: 1,
				schiffnamensnennung: 0
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.nameConsent).toBe(true);
			expect(result.shipNameConsent).toBe(false);
		});

		it('should set default values for system fields', () => {
			const legacyData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Test',
				name: 'User',
				email: 'test@example.com',
				anzahl_gesamt: 1
			};

			const result = mapLegacyToCurrentSchema(legacyData);

			expect(result.entryChannel).toBe(4); // APP
			expect(result.verified).toBe(false);
			expect(result.persistentDataConsent).toBe(true);
			expect(result.mediaConsent).toBe(true);
		});
	});

	describe('mapCurrentToLegacySchema', () => {
		const createMinimalSightingData = (overrides: Partial<SightingFormData> = {}): SightingFormData & { id: number } => ({
			// Required fields
			id: 1840,
			sightingDate: '2024-03-15T14:30:00.000Z',
			latitude: 54.3233,
			longitude: 13.0814,
			totalCount: 3,
			juvenileCount: 1,
			species: 0,
			isDead: false,
			firstName: 'Max',
			lastName: 'Mustermann',
			email: 'max@example.com',
			
			// System fields
			sightingFrom: 1,
			distance: 3,
			mediaUpload: false,
			boatDrive: 0,
			entryChannel: 4,
			verified: false,
			nameConsent: true,
			shipNameConsent: false,
			privacyConsent: true,
			persistentDataConsent: true,
			mediaConsent: true,
			hasPosition: true,
			uploadedFiles: [],
			referenceId: 'TEST-123',
			informedAuthorities: false,
			
			// Optional fields with defaults
			waterway: '',
			seaMark: '',
			sightingFromText: '',
			phone: '',
			street: '',
			zipCode: '',
			city: '',
			distribution: 0,
			distributionText: '',
			behavior: 0,
			behaviorText: '',
			reaction: '',
			seaState: 0,
			windDirection: '',
			windForce: undefined,
			visibility: 0,
			shipName: '',
			homePort: '',
			boatType: '',
			boatDriveText: '',
			mediaFile: '',
			otherObservations: '',
			notes: '',
			shipCount: null,
			deadSize: undefined,
			deadCondition: 0,
			deadSex: 0,
			deadPhoneContact: false,
			
			...overrides
		});

		it('should map basic fields correctly', () => {
			const currentData = createMinimalSightingData({
				waterway: 'Greifswalder Bodden',
				shipName: 'MS Baltic',
			});

			const result = mapCurrentToLegacySchema(currentData);

			expect(result.id).toBe(1840);
			expect(result.datum).toBe('15.03.2024');
			expect(result.uhrzeit).toBe('14:30');
			expect(result.breitengrad).toBe(54.3233);
			expect(result.laengengrad).toBe(13.0814);
			expect(result.anzahlGesamt).toBe(3);
			expect(result.anzahlJung).toBe(1);
			expect(result.tierart).toBe(0);
			expect(result.gebiet).toBe('Greifswalder Bodden');
		});

		it('should handle name consent correctly', () => {
			const withConsent = createMinimalSightingData({ nameConsent: true });
			const withoutConsent = createMinimalSightingData({ nameConsent: false });

			const resultWithConsent = mapCurrentToLegacySchema(withConsent);
			const resultWithoutConsent = mapCurrentToLegacySchema(withoutConsent);

			expect(resultWithConsent.beobachterName).toBe('Max Mustermann');
			expect(resultWithoutConsent.beobachterName).toBe('');
		});

		it('should handle ship name consent correctly', () => {
			const withConsent = createMinimalSightingData({ 
				shipName: 'MS Baltic',
				shipNameConsent: true 
			});
			const withoutConsent = createMinimalSightingData({ 
				shipName: 'MS Baltic',
				shipNameConsent: false 
			});

			const resultWithConsent = mapCurrentToLegacySchema(withConsent);
			const resultWithoutConsent = mapCurrentToLegacySchema(withoutConsent);

			expect(resultWithConsent.schiffsname).toBe('MS Baltic');
			expect(resultWithoutConsent.schiffsname).toBeUndefined();
		});

		it('should handle missing coordinates', () => {
			const dataWithoutCoords = createMinimalSightingData({
				latitude: 0,
				longitude: 0
			});

			const result = mapCurrentToLegacySchema(dataWithoutCoords);

			expect(result.breitengrad).toBeUndefined();
			expect(result.laengengrad).toBeUndefined();
		});
	});

	describe('convertSeparateToCombinedDateTime', () => {
		it('should convert separate date and time to combined format', () => {
			const separateData: LegacySightingRequestSeparateDateTime = {
				datum: '2024-03-15',
				uhrzeit: '14:30',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 1
			};

			const result = convertSeparateToCombinedDateTime(separateData);

			expect(result.sichtungsdatum).toBe('2024-03-15 14:30');
			expect(result.vorname).toBe('Max');
			expect(result.name).toBe('Mustermann');
		});

		it('should use default time when uhrzeit is missing', () => {
			const separateData: LegacySightingRequestSeparateDateTime = {
				datum: '2024-03-15',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 1
			};

			const result = convertSeparateToCombinedDateTime(separateData);

			expect(result.sichtungsdatum).toBe('2024-03-15 12:00');
		});
	});

	describe('validateLegacyRequest', () => {
		it('should validate required fields', () => {
			const validData: LegacySightingRequest = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 1
			};

			expect(() => validateLegacyRequest(validData)).not.toThrow();
		});

		it('should reject missing required fields', () => {
			const invalidData = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Max'
				// missing name, email, anzahl_gesamt
			};

			expect(() => validateLegacyRequest(invalidData)).toThrow('Field "name" is required');
		});

		it('should validate datetime format', () => {
			const invalidDatetimeData = {
				sichtungsdatum: '2024/03/15 14:30', // wrong format
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 1
			};

			expect(() => validateLegacyRequest(invalidDatetimeData)).toThrow('must be in "YYYY-MM-DD HH:MI" format');
		});

		it('should validate coordinate ranges', () => {
			const invalidCoordData = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'max@example.com',
				anzahl_gesamt: 1,
				gps_breite: 91 // invalid latitude
			};

			expect(() => validateLegacyRequest(invalidCoordData)).toThrow('must be a number between -90 and 90');
		});

		it('should validate email format', () => {
			const invalidEmailData = {
				sichtungsdatum: '2024-03-15 14:30',
				vorname: 'Max',
				name: 'Mustermann',
				email: 'invalid-email', // invalid format
				anzahl_gesamt: 1
			};

			expect(() => validateLegacyRequest(invalidEmailData)).toThrow('must be a valid email address');
		});
	});
});