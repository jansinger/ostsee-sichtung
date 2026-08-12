import { describe, expect, it } from 'vitest';
import { memoizePerLocale } from './localeMemo';

describe('memoizePerLocale', () => {
	it('baut je Locale genau einmal', () => {
		let calls = 0;
		const get = memoizePerLocale((locale) => {
			calls++;
			return `gebaut für ${locale}`;
		});
		expect(get('de')).toBe('gebaut für de');
		expect(get('de')).toBe('gebaut für de');
		expect(calls).toBe(1);
		expect(get('en')).toBe('gebaut für en');
		expect(calls).toBe(2);
	});

	it('hält die Locales auseinander', () => {
		const get = memoizePerLocale((locale) => ({ locale }));
		expect(get('de')).not.toBe(get('en'));
		expect(get('de')).toBe(get('de'));
	});

	// Ohne Argument gilt die aktive Locale. Das ist der Normalfall im Betrieb;
	// die Tests und der Schnappschuss geben sie dagegen ausdrücklich an.
	it('fällt ohne Argument auf die aktive Locale zurück', () => {
		const get = memoizePerLocale((locale) => locale);
		expect(get()).toBe('de');
	});
});
