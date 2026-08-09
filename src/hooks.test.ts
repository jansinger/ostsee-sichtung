import { describe, expect, it } from 'vitest';
import { reroute } from './hooks';

/**
 * `reroute` ist der einzige Ort, an dem das Sprachkürzel der CakePHP-Vorgänger-App
 * abgeschnitten wird. Die Regel selbst ist in `stripLegacyLanguagePrefix` getestet;
 * hier steht nur die Verdrahtung — inklusive der Zusage, dass `undefined` (also
 * „unverändert routen") zurückkommt, wenn nichts zutrifft.
 */
describe('reroute', () => {
	// `fetch` gehört zum Reroute-Event, wird hier aber nicht gebraucht: Die Regel ist
	// eine reine Pfad-Umschreibung ohne Netzzugriff. Ein Aufruf wäre ein Fehler und
	// soll sich als solcher zeigen.
	const fetchStub: typeof fetch = () => {
		throw new Error('reroute darf nicht fetchen');
	};

	const rerouteUrl = (pfad: string) =>
		reroute({ url: new URL(`https://example.org${pfad}`), fetch: fetchStub });

	it('routet /en/rest_sichtungen/antworten.json auf die deutsche Route', () => {
		expect(rerouteUrl('/en/rest_sichtungen/antworten.json')).toBe(
			'/rest_sichtungen/antworten.json'
		);
	});

	it('routet /de/sichtungen/showreports.json auf die bestehende Route', () => {
		expect(rerouteUrl('/de/sichtungen/showreports.json')).toBe('/sichtungen/showreports.json');
	});

	it('lässt den Query-String unberührt (reroute betrifft nur den Pfad)', () => {
		const url = new URL('https://example.org/en/sichtungen/showreports.json?year=2024');
		expect(reroute({ url, fetch: fetchStub })).toBe('/sichtungen/showreports.json');
		expect(url.search).toBe('?year=2024');
	});

	it('lässt bestehende Pfade unverändert', () => {
		expect(rerouteUrl('/rest_sichtungen/antworten.json')).toBeUndefined();
		expect(rerouteUrl('/')).toBeUndefined();
		expect(rerouteUrl('/admin/sightings')).toBeUndefined();
	});

	it('legt keinen zweiten Pfad auf geschützte Routen', () => {
		expect(rerouteUrl('/en/admin/sightings')).toBeUndefined();
		expect(rerouteUrl('/en/api/sightings')).toBeUndefined();
	});
});
