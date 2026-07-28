import { describe, it, expect } from 'vitest';
import { validateSightingFormData, checkForbiddenAdminFields } from './requestValidation';

describe('requestValidation', () => {
	describe('validateSightingFormData', () => {
		it('should accept valid sighting form data', () => {
			const validData = {
				referenceId: 'test-123',
				species: 0,
				totalCount: 1,
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				sightingDate: '2024-01-15',
				hasPosition: true,
				latitude: 54.5,
				longitude: 13.5,
				privacyConsent: true,
				entryChannel: 0,
				boatDrive: 1,
				sightingFrom: 1,
				distance: 1
			};

			const result = validateSightingFormData(validData);

			expect(result.isValid).toBe(true);
			expect(result.data).toEqual(validData);
			expect(result.error).toBeUndefined();
			expect(result.rejectedFields).toBeUndefined();
		});

		it('should reject requests with admin fields', () => {
			const dataWithAdminFields = {
				referenceId: 'test-123',
				species: 0,
				totalCount: 1,
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				verified: true, // Admin field
				internalComment: 'This is internal', // Admin field
				privacyConsent: true
			};

			const result = validateSightingFormData(dataWithAdminFields);

			expect(result.isValid).toBe(false);
			expect(result.rejectedFields).toContain('verified');
			expect(result.rejectedFields).toContain('internalComment');
			expect(result.error).toContain('Unerlaubte Felder');
		});

		it('lehnt ein clientseitig berechnetes sightingDatetime ab', () => {
			// Der Instant wird ausschließlich serverseitig aus sightingDate/sightingTime
			// gebildet — ein mitgeschickter Zeitstempel trüge die Browser-Zeitzone.
			const dataWithClientDatetime = {
				referenceId: 'test-123',
				species: 0,
				totalCount: 1,
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				sightingDate: '2024-01-15',
				sightingDatetime: '2024-01-15T14:30:00.000Z',
				privacyConsent: true
			};

			const result = validateSightingFormData(dataWithClientDatetime);

			expect(result.isValid).toBe(false);
			expect(result.rejectedFields).toContain('sightingDatetime');
		});

		it('should reject requests with unknown fields', () => {
			const dataWithUnknownFields = {
				referenceId: 'test-123',
				species: 0,
				totalCount: 1,
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				unknownField: 'should not be allowed',
				anotherBadField: 123,
				privacyConsent: true
			};

			const result = validateSightingFormData(dataWithUnknownFields);

			expect(result.isValid).toBe(false);
			expect(result.rejectedFields).toContain('unknownField');
			expect(result.rejectedFields).toContain('anotherBadField');
			expect(result.error).toContain('Unerlaubte Felder');
		});

		it('should filter out bad fields and keep good ones', () => {
			const mixedData = {
				referenceId: 'test-123',
				species: 0,
				totalCount: 1,
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				badField: 'should be removed',
				privacyConsent: true
			};

			const result = validateSightingFormData(mixedData);

			expect(result.isValid).toBe(false);
			expect(result.rejectedFields).toEqual(['badField']);
			// result.data should be undefined when validation fails
			expect(result.data).toBeUndefined();
		});

		it('should reject non-object request bodies', () => {
			expect(validateSightingFormData(null).isValid).toBe(false);
			expect(validateSightingFormData('string').isValid).toBe(false);
			expect(validateSightingFormData(123).isValid).toBe(false);
			expect(validateSightingFormData([]).isValid).toBe(false);
		});

		it('should handle empty object', () => {
			const result = validateSightingFormData({});

			expect(result.isValid).toBe(true);
			expect(result.data).toEqual({});
		});
	});

	describe('checkForbiddenAdminFields', () => {
		it('should detect forbidden admin fields', () => {
			const dataWithAdminFields = {
				firstName: 'John',
				verified: true,
				internalComment: 'admin comment',
				id: 123
			};

			const result = checkForbiddenAdminFields(dataWithAdminFields);

			expect(result.hasForbiddenFields).toBe(true);
			expect(result.forbiddenFields).toContain('verified');
			expect(result.forbiddenFields).toContain('internalComment');
			expect(result.forbiddenFields).toContain('id');
		});

		it('should pass when no admin fields present', () => {
			const cleanData = {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				species: 0
			};

			const result = checkForbiddenAdminFields(cleanData);

			expect(result.hasForbiddenFields).toBe(false);
			expect(result.forbiddenFields).toEqual([]);
		});

		it('should handle empty object', () => {
			const result = checkForbiddenAdminFields({});

			expect(result.hasForbiddenFields).toBe(false);
			expect(result.forbiddenFields).toEqual([]);
		});
	});
});
