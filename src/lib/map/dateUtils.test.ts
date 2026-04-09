import { describe, expect, it } from 'vitest';
import { getDaysInYear, isLeapYear } from './dateUtils';

describe('isLeapYear', () => {
	it('erkennt normales Jahr als kein Schaltjahr', () => {
		expect(isLeapYear(2023)).toBe(false);
	});

	it('erkennt durch 4 teilbares Jahr als Schaltjahr', () => {
		expect(isLeapYear(2024)).toBe(true);
	});

	it('erkennt durch 100 teilbares Jahr als kein Schaltjahr', () => {
		expect(isLeapYear(1900)).toBe(false);
	});

	it('erkennt durch 400 teilbares Jahr als Schaltjahr', () => {
		expect(isLeapYear(2000)).toBe(true);
	});

	it('erkennt 2028 als Schaltjahr', () => {
		expect(isLeapYear(2028)).toBe(true);
	});
});

describe('getDaysInYear', () => {
	it('gibt 365 für normales Jahr zurück', () => {
		expect(getDaysInYear(2023)).toBe(365);
	});

	it('gibt 366 für Schaltjahr zurück', () => {
		expect(getDaysInYear(2024)).toBe(366);
	});

	it('gibt 365 für durch 100 teilbares Jahr zurück', () => {
		expect(getDaysInYear(1900)).toBe(365);
	});

	it('gibt 366 für durch 400 teilbares Jahr zurück', () => {
		expect(getDaysInYear(2000)).toBe(366);
	});
});
