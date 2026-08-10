import { describe, expect, it } from 'vitest';
import { zielFuerStartseite } from './startseitenWeiterleitung';

describe('zielFuerStartseite', () => {
	it('leitet bei englischem Header auf /en', () => {
		expect(zielFuerStartseite('/', 'en-GB,en;q=0.9', null)).toBe('/en');
	});

	it('leitet bei deutschem Header nicht', () => {
		expect(zielFuerStartseite('/', 'de-DE,de;q=0.9', null)).toBeNull();
	});

	it('respektiert eine ausdrückliche Wahl im Cookie', () => {
		expect(zielFuerStartseite('/', 'en-GB,en;q=0.9', 'de')).toBeNull();
	});

	it('wirkt nur auf der Startseite', () => {
		// Sonst wäre jede präfixlose URL je nach Browser zweierlei Inhalt — nicht
		// cachebar und für Suchmaschinen ein Duplikat.
		expect(zielFuerStartseite('/sichtungen', 'en-GB,en;q=0.9', null)).toBeNull();
	});

	it('leitet ohne Header nicht', () => {
		expect(zielFuerStartseite('/', null, null)).toBeNull();
	});
});
