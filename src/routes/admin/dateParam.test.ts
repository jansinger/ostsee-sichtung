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

	it('lehnt nicht-existente Kalenderdaten ab', () => {
		expect(isValidDateParam('2024-02-31')).toBe(false); // Feb hat max 29 Tage
		expect(isValidDateParam('2024-02-30')).toBe(false);
		expect(isValidDateParam('2024-04-31')).toBe(false); // April hat 30 Tage
		expect(isValidDateParam('2024-13-01')).toBe(false); // Monat 13 existiert nicht
		expect(isValidDateParam('2024-00-01')).toBe(false); // Monat 0 existiert nicht
		expect(isValidDateParam('2024-01-00')).toBe(false); // Tag 0 existiert nicht
	});

	it('akzeptiert Schaltjahr-Datum korrekt', () => {
		expect(isValidDateParam('2024-02-29')).toBe(true); // 2024 ist Schaltjahr
		expect(isValidDateParam('2023-02-29')).toBe(false); // 2023 ist kein Schaltjahr
	});
});
