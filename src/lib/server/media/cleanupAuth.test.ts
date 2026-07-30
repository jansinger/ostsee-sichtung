/**
 * Prüfung des M2M-Tokens für den Aufräum-Endpunkt.
 * Siehe docs/archive/AUFRAEUM_ENDPUNKT_ENTWURF_2026-07-28.md, § 5.
 */
import { describe, expect, it } from 'vitest';
import { MIN_TOKEN_LENGTH, isValidCleanupToken } from './cleanupAuth';

const VALID = 'a'.repeat(MIN_TOKEN_LENGTH);

describe('isValidCleanupToken', () => {
	it('akzeptiert das erwartete Token', () => {
		expect(isValidCleanupToken(`Bearer ${VALID}`, VALID)).toBe(true);
	});

	it('weist ein abweichendes Token gleicher Länge zurück', () => {
		expect(isValidCleanupToken(`Bearer ${'b'.repeat(MIN_TOKEN_LENGTH)}`, VALID)).toBe(false);
	});

	it('weist ab, wenn kein Token konfiguriert ist', () => {
		// Ohne gesetzte Variable ist der externe Weg abgeschaltet, nicht offen.
		expect(isValidCleanupToken(`Bearer ${VALID}`, undefined)).toBe(false);
		expect(isValidCleanupToken(`Bearer ${VALID}`, '')).toBe(false);
	});

	it('behandelt ein zu kurzes konfiguriertes Token wie keins', () => {
		const short = 'a'.repeat(MIN_TOKEN_LENGTH - 1);
		expect(isValidCleanupToken(`Bearer ${short}`, short)).toBe(false);
	});

	it.each([null, VALID, `Basic ${VALID}`, 'Bearer ', 'bearer ' + VALID])(
		'weist einen falsch aufgebauten Header %j ab',
		(header) => {
			expect(isValidCleanupToken(header, VALID)).toBe(false);
		}
	);

	it('weist ein Token ab, das nur ein Präfix des erwarteten ist', () => {
		expect(isValidCleanupToken(`Bearer ${VALID.slice(0, -1)}`, VALID)).toBe(false);
	});
});
