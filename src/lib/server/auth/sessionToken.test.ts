import { describe, expect, it } from 'vitest';
import { createSessionToken, hashSessionToken, SESSION_TOKEN_BYTES } from './sessionToken';

describe('sessionToken', () => {
	describe('createSessionToken', () => {
		it('erzeugt bei zwei Aufrufen verschiedene Token', () => {
			expect(createSessionToken()).not.toBe(createSessionToken());
		});

		it('erzeugt base64url-Token ohne Padding und ohne +/ aus Standard-base64', () => {
			// base64url ist Pflicht: Der Wert landet unverändert in einem Cookie, und
			// '+' bzw. '/' wären dort auslegungsbedürftig.
			for (let i = 0; i < 50; i++) {
				expect(createSessionToken()).toMatch(/^[A-Za-z0-9_-]+$/);
			}
		});

		it('trägt mindestens 32 Byte Entropie', () => {
			expect(SESSION_TOKEN_BYTES).toBeGreaterThanOrEqual(32);
			// base64url von 32 Byte ohne Padding = 43 Zeichen
			const expectedLength = Math.ceil((SESSION_TOKEN_BYTES * 8) / 6);
			expect(createSessionToken()).toHaveLength(expectedLength);
		});
	});

	describe('hashSessionToken', () => {
		it('liefert für denselben Token denselben Hash', () => {
			const token = createSessionToken();
			expect(hashSessionToken(token)).toBe(hashSessionToken(token));
		});

		it('liefert für verschiedene Token verschiedene Hashes', () => {
			expect(hashSessionToken(createSessionToken())).not.toBe(
				hashSessionToken(createSessionToken())
			);
		});

		it('gibt nicht den Token selbst zurück', () => {
			const token = createSessionToken();
			const hash = hashSessionToken(token);
			expect(hash).not.toBe(token);
			expect(hash).not.toContain(token);
		});

		it('liefert 64 Hex-Zeichen (SHA-256), passend zu varchar(64) im Schema', () => {
			expect(hashSessionToken(createSessionToken())).toMatch(/^[0-9a-f]{64}$/);
		});

		it('ist ungesalzen und damit über Prozessgrenzen hinweg stabil', () => {
			// Bekannter SHA-256 von 'test' — belegt, dass kein zufälliges Salz einfließt.
			expect(hashSessionToken('test')).toBe(
				'9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
			);
		});
	});
});
