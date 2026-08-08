/**
 * @fileoverview X4 — `formatNumber`/`formatPercentage` waren bis 2026-08-08 inline
 * in `+page.svelte` definiert und damit nicht isoliert testbar. `formatPercentage`
 * baute den String selbst (`${numValue.toFixed(1)}%`) mit einem Dezimalpunkt, direkt
 * neben den deutsch formatierten Zahlen aus `formatNumber` (`19.284`) — auf einer
 * Seite, die sonst durchgängig deutsches Zahlenformat zeigt, ein Bruch.
 *
 * Diese Tests belegen das gewählte Format: Komma statt Punkt, ein geschütztes
 * Leerzeichen vor dem Prozentzeichen (`Intl.NumberFormat('de-DE', { style: 'percent' })`
 * liefert das so). Aufrufer übergeben weiterhin Prozentpunkte (9.2 statt 0.092) —
 * das entspricht dem, was `+page.svelte` bisher an `formatPercentage` reichte
 * (z. B. `deadPercentage`, `repeatUserPercentage`), deshalb teilt die Funktion
 * intern durch 100, bevor sie an `style: 'percent'` übergibt.
 */

import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercentage } from './statisticsFormat';

describe('formatPercentage', () => {
	it('formatiert 0 als „0 %"', () => {
		expect(formatPercentage(0)).toBe('0 %');
	});

	it('formatiert 9.2 mit Komma statt Punkt als „9,2 %"', () => {
		expect(formatPercentage(9.2)).toBe('9,2 %');
	});

	it('formatiert 100 als „100 %"', () => {
		expect(formatPercentage(100)).toBe('100 %');
	});

	it('parst einen String-Eingabewert wie die bisherige Implementierung', () => {
		expect(formatPercentage('9.2')).toBe('9,2 %');
	});

	it('behandelt null wie 0', () => {
		expect(formatPercentage(null)).toBe('0 %');
	});

	it('behandelt undefined wie 0', () => {
		expect(formatPercentage(undefined)).toBe('0 %');
	});

	it('behandelt einen nicht-numerischen String wie 0 statt „NaN" zu rendern', () => {
		expect(formatPercentage('abc')).toBe(formatPercentage(0));
	});

	it('rundet auf maximal eine Nachkommastelle', () => {
		expect(formatPercentage(9.26)).toBe('9,3 %');
	});
});

describe('formatNumber', () => {
	it('formatiert eine Zahl im deutschen Tausendertrennzeichen', () => {
		expect(formatNumber(19284)).toBe('19.284');
	});

	it('parst einen String-Eingabewert', () => {
		expect(formatNumber('1.5')).toBe('1,5');
	});

	it('behandelt null wie 0', () => {
		expect(formatNumber(null)).toBe('0');
	});

	it('behandelt undefined wie 0', () => {
		expect(formatNumber(undefined)).toBe('0');
	});

	it('behandelt einen nicht-numerischen String wie 0 statt „NaN" zu rendern', () => {
		expect(formatNumber('abc')).toBe('0');
	});
});
