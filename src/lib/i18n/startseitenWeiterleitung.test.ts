import { describe, expect, it } from 'vitest';
import { zielFuerStartseite } from './startseitenWeiterleitung';

describe('zielFuerStartseite', () => {
	it('leitet bei englischem Header auf /en', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', null)).toBe('/en');
	});

	it('leitet bei deutschem Header nicht', () => {
		expect(zielFuerStartseite('/', '', 'de-DE,de;q=0.9', null)).toBeNull();
	});

	it('Cookie "de" leitet nicht weiter — auch bei englischem Header', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', 'de')).toBeNull();
	});

	it('Cookie "en" leitet weiter — auch bei deutschem Header', () => {
		// Wer einmal ausdrücklich auf Englisch umgeschaltet hat, landet bei einem
		// erneuten Aufruf von "/" nicht wieder auf Deutsch. Paraglide fängt das
		// nicht ab: in strategy: ['url','cookie','baseLocale'] steht 'url' vorn,
		// und der präfixlose Pfad '/' trifft auf baseLocale — die cookie-Strategie
		// kommt nie zum Zug.
		expect(zielFuerStartseite('/', '', 'de-DE,de;q=0.9', 'en')).toBe('/en');
	});

	it('Cookie "en" leitet weiter — auch ganz ohne Accept-Language-Header', () => {
		expect(zielFuerStartseite('/', '', null, 'en')).toBe('/en');
	});

	it('ein unbekannter Cookie-Wert wird wie "kein Cookie" behandelt, nicht geraten', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', 'fr')).toBe('/en');
		expect(zielFuerStartseite('/', '', 'de-DE,de;q=0.9', 'fr')).toBeNull();
	});

	it('Cookie "en" erhält den Query-String wie der Header-Fall', () => {
		expect(zielFuerStartseite('/', '?meldung=totfund', 'de-DE,de;q=0.9', 'en')).toBe(
			'/en?meldung=totfund'
		);
	});

	it('wirkt nur auf der Startseite', () => {
		// Sonst wäre jede präfixlose URL je nach Browser zweierlei Inhalt — nicht
		// cachebar und für Suchmaschinen ein Duplikat.
		expect(zielFuerStartseite('/sichtungen', '', 'en-GB,en;q=0.9', null)).toBeNull();
	});

	it('leitet ohne Header nicht', () => {
		expect(zielFuerStartseite('/', '', null, null)).toBeNull();
	});

	it('erhält bestehende Query-Parameter (Kampagnen-Marker aus einem Museums-Link)', () => {
		// reportKindHref() in +page.svelte gibt dieselbe Zusage für Klicks nach
		// der Hydration — hier gilt sie für den allerersten, serverseitig
		// beantworteten Request.
		expect(zielFuerStartseite('/', '?meldung=totfund', 'en-GB,en;q=0.9', null)).toBe(
			'/en?meldung=totfund'
		);
	});

	it('hängt bei leerem Query-String kein "?" an', () => {
		expect(zielFuerStartseite('/', '', 'en-GB,en;q=0.9', null)).toBe('/en');
	});
});
