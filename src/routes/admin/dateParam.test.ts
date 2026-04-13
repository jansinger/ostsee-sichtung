import { describe, it, expect } from 'vitest';
import { isValidDateParam } from './dateParam';

describe('isValidDateParam', () => {
	it('akzeptiert gültiges ISO-Datum', () => {
		expect(isValidDateParam('2024-01-15')).toBe(true);
		expect(isValidDateParam('2024-12-31')).toBe(true);
	});

	it('lehnt leere Werte ab', () => {
		expect(isValidDateParam(null)).toBe(false);
		expect(isValidDateParam('')).toBe(false);
	});

	it('lehnt falsches Format ab', () => {
		expect(isValidDateParam('15.01.2024')).toBe(false);
		expect(isValidDateParam('2024/01/15')).toBe(false);
		expect(isValidDateParam('2024-1-5')).toBe(false);
	});

	it('lehnt SQL-Injection-Versuche ab', () => {
		expect(isValidDateParam('2024-01-01; DROP TABLE sichtungen')).toBe(false);
		expect(isValidDateParam("' OR '1'='1")).toBe(false);
	});
});
