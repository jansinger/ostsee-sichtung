import { describe, expect, it } from 'vitest';
import { reroute } from './hooks';

/**
 * Reihenfolge der drei Schritte, nicht ihre Einzelteile — die sind in
 * `languagePrefix.test.ts` und bei Paraglide geprüft. Hier geht es darum, dass
 * der Legacy-Vertrag vor der Lokalisierung greift: `/en/rest_sichtungen` muss
 * die deutsche Route treffen, nicht eine englische Oberfläche.
 */
const pfadNach = (url: string): string | undefined => {
	const ergebnis = reroute({ url: new URL(url, 'https://example.test') } as never);
	return typeof ergebnis === 'string' ? ergebnis : undefined;
};

describe('reroute', () => {
	it('schneidet das Legacy-Präfix ab und trifft die deutsche Route', () => {
		expect(pfadNach('/en/rest_sichtungen/antworten.json')).toBe('/rest_sichtungen/antworten.json');
	});

	it('schreibt ausgeschlossene Pfade nicht um', () => {
		expect(pfadNach('/en/api/sightings')).toBeUndefined();
		expect(pfadNach('/en/admin/sichtungen')).toBeUndefined();
	});

	it('lokalisiert eine Seitenroute', () => {
		expect(pfadNach('/en/map')).toBe('/map');
	});

	it('lässt einen präfixlosen Pfad unverändert', () => {
		expect(pfadNach('/map')).toBe('/map');
	});

	it('schreibt /de/ nicht um — Deutsch ist präfixlos', () => {
		// Ohne ausdrückliche Ablehnung räumt deLocalizeUrl das Präfix ab und
		// liefert die deutsche Seite unter einer zweiten URL aus.
		expect(pfadNach('/de/sichtungen')).toBeUndefined();
		expect(pfadNach('/de')).toBeUndefined();
	});

	it('behandelt /en/sichtungen/showreports.json als Legacy-Pfad, nicht als lokalisierbare Seite', () => {
		// Auflage aus dem Review: istAusgeschlossen behandelt /rest_sichtungen und
		// /sichtungen/showreports.json ungleich (true vs. false). Liefe die
		// Ausschlusslogik vor stripLegacyLanguagePrefix, würde dieser Pfad
		// fälschlich lokalisiert statt als Legacy-Endpunkt erkannt.
		expect(pfadNach('/en/sichtungen/showreports.json')).toBe('/sichtungen/showreports.json');
	});
});
