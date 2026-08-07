import { describe, it, expect } from 'vitest';

import { issueFormToken, verifyFormToken } from './formToken';

describe('formToken', () => {
	describe('Roundtrip', () => {
		it('verifiziert ein ausgestelltes Token mit korrektem Alter', () => {
			const token = issueFormToken({ now: 1_000_000, secret: 's3cret' });
			const result = verifyFormToken(token, { now: 1_007_000, secret: 's3cret' });
			expect(result).toEqual({ status: 'valid', ageSeconds: 7 });
		});

		it('verifiziert mit prozessweitem Default-Secret ohne Optionen', () => {
			const token = issueFormToken();
			const result = verifyFormToken(token);
			expect(result.status).toBe('valid');
		});
	});

	describe('Fehlendes Token', () => {
		it('gibt missing bei undefined zurück', () => {
			expect(verifyFormToken(undefined)).toEqual({ status: 'missing' });
		});

		it('gibt missing bei null zurück', () => {
			expect(verifyFormToken(null)).toEqual({ status: 'missing' });
		});

		it('gibt missing bei leerem String zurück', () => {
			expect(verifyFormToken('')).toEqual({ status: 'missing' });
		});
	});

	describe('Ungültiges Token', () => {
		it('gibt invalid bei Nicht-String (Zahl) zurück', () => {
			expect(verifyFormToken(42)).toEqual({ status: 'invalid' });
		});

		it('gibt invalid bei Nicht-String (Objekt) zurück', () => {
			expect(verifyFormToken({})).toEqual({ status: 'invalid' });
		});

		it('gibt invalid bei manipuliertem Token zurück (letztes Zeichen getauscht)', () => {
			const token = issueFormToken({ now: 1_000_000, secret: 's3cret' });
			const lastChar = token.at(-1);
			const swapped = lastChar === 'a' ? 'b' : 'a';
			const tampered = token.slice(0, -1) + swapped;
			expect(verifyFormToken(tampered, { now: 1_007_000, secret: 's3cret' })).toEqual({
				status: 'invalid'
			});
		});

		it('gibt invalid bei falschem Secret zurück', () => {
			const token = issueFormToken({ now: 1_000_000, secret: 's3cret' });
			expect(verifyFormToken(token, { now: 1_007_000, secret: 'anderes-secret' })).toEqual({
				status: 'invalid'
			});
		});

		it('gibt invalid bei Müll-String "abc" zurück', () => {
			expect(verifyFormToken('abc')).toEqual({ status: 'invalid' });
		});

		it('gibt invalid bei Müll-String "123." zurück', () => {
			expect(verifyFormToken('123.')).toEqual({ status: 'invalid' });
		});
	});

	describe('Zeitverhalten', () => {
		it('gibt invalid bei Token weit aus der Zukunft zurück (> 60 s)', () => {
			const token = issueFormToken({ now: 2_000_000, secret: 's3cret' });
			const result = verifyFormToken(token, { now: 1_000_000, secret: 's3cret' });
			expect(result).toEqual({ status: 'invalid' });
		});

		it('toleriert leichten Clock-Skew (30 s Zukunft) und klemmt Alter auf 0', () => {
			const token = issueFormToken({ now: 1_030_000, secret: 's3cret' });
			const result = verifyFormToken(token, { now: 1_000_000, secret: 's3cret' });
			expect(result).toEqual({ status: 'valid', ageSeconds: 0 });
		});
	});
});
