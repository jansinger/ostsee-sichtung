import { describe, it, expect, vi } from 'vitest';
import { isStepValid, validateStep } from './stepValidation';
import type { SightingFormData } from '$lib/report/types';

// Mock logger to suppress debug output in tests
vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

// Mock formStepsConfig to decouple from runtime config
// (sightingSchema itself is NOT mocked — real validation logic is tested)
vi.mock('$lib/report/formConfig', () => ({
	formStepsConfig: [
		{
			id: 'location-time',
			title: 'Position & Zeit',
			fields: ['hasPosition', 'latitude', 'longitude', 'sightingDate']
		},
		{
			id: 'sighting-details',
			title: 'Sichtungsdetails',
			fields: ['species', 'totalCount', 'distance']
		},
		{
			id: 'observations',
			title: 'Beobachtungen',
			fields: ['behavior'],
			isOptional: true
		},
		{
			id: 'contact',
			title: 'Kontaktdaten',
			fields: ['firstName', 'lastName', 'email', 'privacyConsent']
		}
	]
}));

// ── Test data ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().substring(0, 10);

const validLocationData: Partial<SightingFormData> = {
	hasPosition: true,
	latitude: 54.5,
	longitude: 13.5,
	sightingDate: today
};

const validSightingData: Partial<SightingFormData> = {
	species: 0, // Schweinswal
	totalCount: 2,
	distance: 1
};

const validContactData: Partial<SightingFormData> = {
	firstName: 'Jane',
	lastName: 'Doe',
	email: 'jane@example.com',
	privacyConsent: true
};

// ── isStepValid ──────────────────────────────────────────────────────────────

describe('isStepValid', () => {
	describe('Step 0 — Position & Zeit', () => {
		it('returns true for fully valid location data', () => {
			expect(isStepValid(0, validLocationData)).toBe(true);
		});

		it('returns true when hasPosition is false (position is optional, defaults fill coords)', () => {
			// latitude/longitude have defaults (54.5 / 13.5) and are only required when hasPosition=true
			// sightingDate has a default (today)
			expect(isStepValid(0, { hasPosition: false })).toBe(true);
		});

		it('returns true when hasPosition is true and coords use schema defaults', () => {
			// Schema defaults: latitude=54.5, longitude=13.5, sightingDate=today
			// Yup applies defaults during validation, so missing fields get filled
			expect(isStepValid(0, { hasPosition: true })).toBe(true);
		});

		it('returns false for latitude out of Baltic Sea bounds', () => {
			expect(
				isStepValid(0, {
					hasPosition: true,
					latitude: 200, // Invalid: >90°
					longitude: 13.5,
					sightingDate: today
				})
			).toBe(false);
		});

		it('returns false for longitude out of Baltic Sea bounds', () => {
			expect(
				isStepValid(0, {
					hasPosition: true,
					latitude: 54.5,
					longitude: 400, // Invalid: >180°
					sightingDate: today
				})
			).toBe(false);
		});

		it('returns false for a future sightingDate', () => {
			const future = new Date();
			future.setFullYear(future.getFullYear() + 1);
			expect(
				isStepValid(0, {
					hasPosition: false,
					sightingDate: future.toISOString().substring(0, 10)
				})
			).toBe(false);
		});
	});

	describe('Step 1 — Sichtungsdetails', () => {
		it('returns true for fully valid sighting data', () => {
			expect(isStepValid(1, validSightingData)).toBe(true);
		});

		it('returns true when species is missing (schema default is 0 = Schweinswal)', () => {
			// species has .default(0) in sightingSchema — omitting it is valid
			expect(isStepValid(1, { totalCount: 2, distance: 1 })).toBe(true);
		});

		it('returns false for species value -1 (below valid range)', () => {
			expect(isStepValid(1, { species: -1, totalCount: 1, distance: 1 })).toBe(false);
		});

		it('returns false for totalCount above maximum (15)', () => {
			expect(isStepValid(1, { species: 0, totalCount: 999, distance: 1 })).toBe(false);
		});

		it('returns false for totalCount below minimum (0)', () => {
			expect(isStepValid(1, { species: 0, totalCount: -1, distance: 1 })).toBe(false);
		});
	});

	describe('Step 3 — Kontaktdaten', () => {
		it('returns true for fully valid contact data', () => {
			expect(isStepValid(3, validContactData)).toBe(true);
		});

		it('returns false when privacyConsent is missing', () => {
			expect(
				isStepValid(3, {
					firstName: 'Jane',
					lastName: 'Doe',
					email: 'jane@example.com'
					// privacyConsent missing
				})
			).toBe(false);
		});

		it('returns false for invalid email format', () => {
			expect(
				isStepValid(3, {
					...validContactData,
					email: 'not-an-email'
				})
			).toBe(false);
		});
	});

	describe('Edge cases', () => {
		it('returns true for a non-existent step index', () => {
			expect(isStepValid(99, {})).toBe(true);
		});
	});
});

// ── validateStep ─────────────────────────────────────────────────────────────

describe('validateStep', () => {
	describe('Step 0 — Position & Zeit', () => {
		it('returns isValid=true with no errors for fully valid data', () => {
			const result = validateStep(0, validLocationData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it('returns isValid=true when hasPosition=true and coords use schema defaults', () => {
			// Schema defaults fill in latitude, longitude and sightingDate
			const result = validateStep(0, { hasPosition: true });
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it('returns errors for both out-of-bounds coordinates', () => {
			const result = validateStep(0, {
				hasPosition: true,
				latitude: -100, // Invalid
				longitude: 400, // Invalid
				sightingDate: today
			});
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('latitude');
			expect(result.errors).toHaveProperty('longitude');
		});

		it('returns error for future sightingDate', () => {
			const future = new Date();
			future.setFullYear(future.getFullYear() + 1);
			const result = validateStep(0, {
				hasPosition: false,
				sightingDate: future.toISOString().substring(0, 10)
			});
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('sightingDate');
		});
	});

	describe('Step 1 — Sichtungsdetails', () => {
		it('returns isValid=true with no errors for valid data', () => {
			const result = validateStep(1, validSightingData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it('returns isValid=false for empty data (distance is required without default)', () => {
			// species defaults to 0 (Schweinswal), totalCount defaults to 1,
			// but distance has no default and is required — validation fails
			const result = validateStep(1, {});
			expect(result.isValid).toBe(false);
		});

		it('returns error for invalid species value', () => {
			const result = validateStep(1, { species: -1, totalCount: 1, distance: 1 });
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('species');
		});

		it('returns error for totalCount above 15', () => {
			const result = validateStep(1, { species: 0, totalCount: 999, distance: 1 });
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('totalCount');
		});
	});

	describe('Step 3 — Kontaktdaten', () => {
		it('returns isValid=true with no errors for valid data', () => {
			const result = validateStep(3, validContactData);
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});

		it('returns error for invalid email', () => {
			const result = validateStep(3, { ...validContactData, email: 'not-an-email' });
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('email');
		});

		it('returns error when privacyConsent is missing', () => {
			const result = validateStep(3, {
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane@example.com'
			});
			expect(result.isValid).toBe(false);
			expect(result.errors).toHaveProperty('privacyConsent');
		});
	});

	describe('Edge cases', () => {
		it('returns isValid=true with empty errors for non-existent step', () => {
			const result = validateStep(99, {});
			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual({});
		});
	});
});
