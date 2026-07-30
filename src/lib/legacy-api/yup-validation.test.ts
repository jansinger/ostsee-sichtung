/**
 * @fileoverview Vertragstests für die Yup-Validierung der Legacy REST API
 *
 * Zwei Zusicherungen aus `docs/LEGACY_API_SPECIFICATION.md` bzw. dem
 * Originaldokument `docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`:
 *
 * 1. Das Freitextfeld heißt im Vertrag `sonstige_auffaelligkeiten` (mit `ae`).
 * 2. Die Fehlerantwort ist flach: `{"message": "…", "errors": {…}}`.
 */

import { describe, expect, it } from 'vitest';
import type { LegacySightingRequest } from './types';
import {
	createLegacyErrorFromYup,
	legacyApiSchema,
	validateLegacySightingWithYup
} from './yup-validation';

const minimalRequest = (): LegacySightingRequest =>
	({
		sichtungsdatum: '2024-01-15 14:30',
		anzahl_gesamt: 1,
		vorname: 'Test',
		name: 'User',
		email: 'test@example.com'
	}) as LegacySightingRequest;

describe('legacyApiSchema — sonstige_auffaelligkeiten', () => {
	it('kennt die Vertragsschreibweise mit ae als eigenes Feld', () => {
		// `describe()` listet nur explizit deklarierte Felder — ein unbekannter
		// Schlüssel würde die Validierung passieren, aber stillschweigend
		// durchfallen.
		expect(Object.keys(legacyApiSchema.fields)).toContain('sonstige_auffaelligkeiten');
	});

	it('validiert die Vertragsschreibweise als Freitext', async () => {
		const result = await validateLegacySightingWithYup({
			...minimalRequest(),
			sonstige_auffaelligkeiten: 'Tier war deutlich verletzt'
		} as LegacySightingRequest);

		expect(result).toEqual({ isValid: true, errors: {} });
	});

	it('validiert die bestehende Umlaut-Schreibweise weiterhin', async () => {
		const result = await validateLegacySightingWithYup({
			...minimalRequest(),
			sonstige_auffälligkeiten: 'Tier war deutlich verletzt'
		} as LegacySightingRequest);

		expect(result).toEqual({ isValid: true, errors: {} });
	});
});

describe('createLegacyErrorFromYup', () => {
	it('erzeugt die flache Fehlerform aus dem Originaldokument', () => {
		const response = createLegacyErrorFromYup({
			isValid: false,
			errors: { anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.'] }
		});

		expect(response).toEqual({
			message: 'Validation failed.',
			errors: {
				anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.']
			}
		});
	});
});
