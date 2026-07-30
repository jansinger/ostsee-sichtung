/**
 * @fileoverview Vertragstest für die Fehler-Response-Form der Legacy REST API
 *
 * Verbindlich ist die **flache** Struktur aus dem Originaldokument
 * (`docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`, Abschnitt „Bei
 * Validierungsfehlern") und `docs/LEGACY_API_SPECIFICATION.md`:
 *
 *     {"message": "Validation failed.", "errors": {"anzahl_gesamt": ["…"]}}
 *
 * Die frühere geschachtelte Form (`{"message":{"message":…}}`) liefert einem
 * Client, der `message` als Text liest, ein Objekt — deshalb sichern diese
 * Tests den Typ von `message` explizit ab, nicht nur die Feldnamen.
 */

import { describe, expect, it } from 'vitest';
import { createOriginalApiErrorResponse, createSimpleErrorResponse } from './error-messages';

describe('createOriginalApiErrorResponse', () => {
	it('liefert message als String, nicht als verschachteltes Objekt', () => {
		const response = createOriginalApiErrorResponse('Validation failed.');

		expect(typeof response.message).toBe('string');
		expect(response.message).toBe('Validation failed.');
	});

	it('legt Feldfehler flach neben message unter errors ab', () => {
		const response = createOriginalApiErrorResponse('Validation failed.', {
			anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.']
		});

		expect(response).toEqual({
			message: 'Validation failed.',
			errors: {
				anzahl_gesamt: ['Dieses Feld kann nicht leer gelassen werden.']
			}
		});
	});

	it('lässt errors weg, wenn keine Feldfehler vorliegen', () => {
		expect(createOriginalApiErrorResponse('Internal server error')).toEqual({
			message: 'Internal server error'
		});
		expect(createOriginalApiErrorResponse('Internal server error', {})).toEqual({
			message: 'Internal server error'
		});
	});
});

describe('createSimpleErrorResponse', () => {
	it('liefert message als String', () => {
		const response = createSimpleErrorResponse('No data send.');

		expect(typeof response.message).toBe('string');
		expect(response).toEqual({ message: 'No data send.' });
	});
});
