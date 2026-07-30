/**
 * Legacy-Clients erklären keine Einwilligung zur Veröffentlichung von Medien —
 * sie kennen das Feld nicht. Ein hartes `true` im Mapping würde einen
 * Einwilligungsnachweis erfinden, sobald der Wert persistiert wird.
 *
 * Siehe docs/archive/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Befund B8.
 */
import { describe, expect, it } from 'vitest';
import { mapLegacyToCurrentSchema } from './field-mapping';

describe('Legacy-API — Medien-Einwilligung', () => {
	it('behauptet keine Einwilligung zur Veröffentlichung', () => {
		const result = mapLegacyToCurrentSchema({
			sichtungsdatum: '2026-07-28 10:30'
		} as never);

		expect(result.mediaConsent).toBe(false);
	});
});
