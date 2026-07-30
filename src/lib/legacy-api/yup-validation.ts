/**
 * @fileoverview Yup-based validation for Legacy REST API
 *
 * Uses the existing Yup schema with German error messages for consistent
 * validation across frontend forms and legacy API endpoints.
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import * as yup from 'yup';
import type { LegacySightingRequest } from './types.js';
import { createOriginalApiErrorResponse } from './error-messages.js';

/**
 * Legacy API validation schema using Yup
 * Maps legacy field names to validation rules with German error messages
 */
export const legacyApiSchema = yup.object().shape({
	// Required fields matching legacy API
	sichtungsdatum: yup
		.string()
		.required('Bitte geben Sie ein gültiges Datum an.')
		.matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, 'Bitte geben Sie ein gültiges Datum an.'),

	vorname: yup
		.string()
		.required('Der Vorname darf nicht länger als 64 Zeichen sein.')
		.max(64, 'Der Vorname darf nicht länger als 64 Zeichen sein.'),

	name: yup
		.string()
		.required('Der Name darf nicht länger als 64 Zeichen sein.')
		.max(64, 'Der Name darf nicht länger als 64 Zeichen sein.'),

	email: yup
		.string()
		.required('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.email('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
		.max(64, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.'),

	anzahl_gesamt: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.required('Dieses Feld kann nicht leer gelassen werden.')
		.min(0, 'Dieses Feld kann nicht leer gelassen werden.')
		.integer('Dieses Feld kann nicht leer gelassen werden.'),

	// Optional coordinate fields
	gps_breite: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(-90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.max(90, 'Der Breitengrad muss zwischen -90 und 90 liegen.')
		.nullable()
		.optional(),

	gps_laenge: yup
		.number()
		.transform((value) => (isNaN(value) ? undefined : value))
		.min(-180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.max(180, 'Der Längengrad muss zwischen -180 und 180 liegen.')
		.nullable()
		.optional(),

	// Optional fields - allow any values for flexibility
	anzahl_jung: yup.number().nullable().optional(),
	fahrwasser: yup.string().nullable().optional(),
	seezeichen: yup.string().nullable().optional(),
	vonwo: yup.number().nullable().optional(),
	vonwo_text: yup.string().nullable().optional(),
	entfernung: yup.number().nullable().optional(),
	anzahl_schiffe: yup.number().nullable().optional(),
	verteilung: yup.number().nullable().optional(),
	verteilung_text: yup.string().nullable().optional(),
	aufnahme: yup.string().nullable().optional(),
	aufnahmeHochladen: yup.number().nullable().optional(),
	verhalten: yup.number().nullable().optional(),
	verhalten_text: yup.string().nullable().optional(),
	reaktion: yup.string().nullable().optional(),
	// Vertragsname (mit `ae`) plus die historische Umlaut-Schreibweise dieser
	// Implementierung — beide bleiben gültig, siehe field-mapping.ts.
	sonstige_auffaelligkeiten: yup.string().nullable().optional(),
	sonstige_auffälligkeiten: yup.string().nullable().optional(),
	seegang: yup.number().nullable().optional(),
	windrichtung: yup.string().nullable().optional(),
	windstaerke: yup.string().nullable().optional(),
	sichtweite: yup.number().nullable().optional(),
	schiffsname: yup.string().nullable().optional(),
	heimathafen: yup.string().nullable().optional(),
	bootstyp: yup.string().nullable().optional(),
	bootsantrieb: yup.number().nullable().optional(),
	bootsantrieb_text: yup.string().nullable().optional(),
	strasse: yup.string().nullable().optional(),
	plz: yup.string().nullable().optional(),
	ort: yup.string().nullable().optional(),
	telefon: yup.string().nullable().optional(),
	fax: yup.string().nullable().optional(),
	namensnennung: yup.number().nullable().optional(),
	schiffnamensnennung: yup.number().nullable().optional(),
	datenschutzEinverstaendnis: yup.number().nullable().optional(),
	bemerkungen: yup.string().nullable().optional(),
	eingangskanal: yup.number().nullable().optional(),
	tierart: yup.number().nullable().optional(),
	totfund: yup.number().nullable().optional(),
	totfund_zustand: yup.number().nullable().optional(),
	totfund_geschlecht: yup.number().nullable().optional(),
	totfund_groesse: yup.number().nullable().optional(),
	totfund_telefon: yup.number().nullable().optional()
});

/**
 * Validates legacy sighting data using Yup schema with German error messages
 */
export async function validateLegacySightingWithYup(
	data: LegacySightingRequest
): Promise<{ isValid: boolean; errors: Record<string, string[]> }> {
	try {
		await legacyApiSchema.validate(data, { abortEarly: false });
		return { isValid: true, errors: {} };
	} catch (error) {
		if (error instanceof yup.ValidationError) {
			const errors: Record<string, string[]> = {};

			error.inner.forEach((err) => {
				if (err.path) {
					if (!errors[err.path]) {
						errors[err.path] = [];
					}
					errors[err.path]!.push(err.message);
				}
			});

			return { isValid: false, errors };
		}

		// Unknown error
		return {
			isValid: false,
			errors: { _general: ['Ein unbekannter Validierungsfehler ist aufgetreten.'] }
		};
	}
}

/**
 * Creates a legacy error response using Yup validation results
 */
export function createLegacyErrorFromYup(validationResult: {
	isValid: boolean;
	errors: Record<string, string[]>;
}): ReturnType<typeof createOriginalApiErrorResponse> {
	return createOriginalApiErrorResponse('Validation failed.', validationResult.errors);
}
