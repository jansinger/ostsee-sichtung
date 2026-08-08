import { describe, expect, it } from 'vitest';
import { normalizeStatusParam } from './sightingStatusFilter';

describe('normalizeStatusParam', () => {
	it('nimmt die neuen Werte unverändert', () => {
		expect(normalizeStatusParam('open')).toBe('open');
		expect(normalizeStatusParam('approved')).toBe('approved');
		expect(normalizeStatusParam('rejected')).toBe('rejected');
	});

	/* Lesezeichen und verlinkte Filteransichten aus der Zeit des „Geprüft"-Toggles
	   dürfen nicht ins Leere laufen. */
	it('übersetzt die alten Werte', () => {
		expect(normalizeStatusParam('1')).toBe('approved');
		expect(normalizeStatusParam('0')).toBe('open');
	});

	it('meldet „kein Filter" für leer und unbekannt', () => {
		expect(normalizeStatusParam(null)).toBeUndefined();
		expect(normalizeStatusParam('')).toBeUndefined();
		expect(normalizeStatusParam('quatsch')).toBeUndefined();
	});
});
