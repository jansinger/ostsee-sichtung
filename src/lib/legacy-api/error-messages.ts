/**
 * @fileoverview Error message literals and response builders for the Legacy REST API
 *
 * Provides the wording used by the original schweinswalsichtung.de API, verbatim,
 * for 100% compatibility. The strings are NOT all German — the original API mixes
 * languages, and its top-level messages ("Validation failed.", "No data send.")
 * are English. Only the field-level messages are German; those live in
 * `yup-validation.ts`.
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import type { LegacyErrorResponse, LegacySimpleErrorResponse } from './types.js';

/**
 * Message literals taken verbatim from the original API — English wording
 * included, see the file header. Do not translate: the exact string is part
 * of the contract.
 */
export const LEGACY_API_MESSAGES = {
	// General validation
	NO_DATA_SEND: 'No data send.'
} as const;

/**
 * Creates the exact error response format from the original API
 *
 * Die Struktur ist **flach** — `message` ist ein String, `errors` liegt
 * daneben, genau wie im Originaldokument
 * (`docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`, Abschnitt „Bei
 * Validierungsfehlern") und in `docs/LEGACY_API_SPECIFICATION.md`:
 *
 * ```json
 * { "message": "Validation failed.", "errors": { "anzahl_gesamt": ["…"] } }
 * ```
 *
 * Bis 2026-07-30 wurde `message` hier als Objekt (`message.message`)
 * geschachtelt. Ein Client, der `message` vertragsgemäß als Text liest, bekam
 * dadurch ein Objekt.
 */
export function createOriginalApiErrorResponse(
	mainMessage: string,
	fieldErrors?: Record<string, string[]>
): LegacyErrorResponse {
	const response: LegacyErrorResponse = {
		message: mainMessage
	};

	if (fieldErrors && Object.keys(fieldErrors).length > 0) {
		response.errors = fieldErrors;
	}

	return response;
}

/**
 * Creates simple error response for cases like "No data send"
 */
export function createSimpleErrorResponse(message: string): LegacySimpleErrorResponse {
	return { message };
}
