import { describe, expect, it } from 'vitest';
import { buildSiteStructuredData, serializeJsonLd } from './structuredData';

const ORIGIN = 'https://ostsee-tiere.de';

describe('buildSiteStructuredData', () => {
	const graph = buildSiteStructuredData(ORIGIN, 'de');
	const knoten = (typ: string) => graph['@graph'].find((eintrag) => eintrag['@type'] === typ);

	it('liefert einen @graph mit Organization und WebSite', () => {
		expect(graph['@context']).toBe('https://schema.org');
		expect(graph['@graph'].map((e) => e['@type'])).toEqual(['Organization', 'WebSite']);
	});

	it('verknüpft WebSite und Organization über @id statt sie zu verdoppeln', () => {
		// Zwei eingebettete Organization-Objekte wären für eine Suchmaschine zwei
		// Organisationen. Der Verweis über @id macht daraus eine.
		const website = knoten('WebSite');
		const organisation = knoten('Organization');
		expect(website?.publisher).toEqual({ '@id': organisation?.['@id'] });
	});

	it('nennt als Herausgeber das Museum, nicht die Anwendung', () => {
		const organisation = knoten('Organization');
		expect(organisation?.name).toBe('Deutsches Meeresmuseum');
		expect(organisation?.url).toBe('https://www.deutsches-meeresmuseum.de');
	});

	it('verwendet absolute URLs für Logo und Website', () => {
		expect(knoten('WebSite')?.url).toBe(ORIGIN);
		expect(String(knoten('Organization')?.logo)).toMatch(/^https:\/\/ostsee-tiere\.de\//);
	});

	it('gibt die Sprache der aktuellen Fassung an', () => {
		expect(knoten('WebSite')?.inLanguage).toBe('de');
		expect(buildSiteStructuredData(ORIGIN, 'en')['@graph'][1]?.inLanguage).toBe('en');
	});

	it('behauptet keine Lizenz für die Sichtungsdaten', () => {
		// Die MIT-Lizenz deckt den Quellcode, nicht den Datenbestand des Museums.
		// Eine Lizenzangabe hier wäre eine Rechtsaussage, die dieses Repository
		// nicht treffen darf — siehe Modulkommentar zum fehlenden Dataset-Knoten.
		expect(JSON.stringify(graph)).not.toContain('license');
	});
});

describe('serializeJsonLd', () => {
	it('maskiert < und > — sonst schließt ein Wert das script-Element', () => {
		// Ohne Maskierung beendet ein Wert, der `</script>` enthält, das Element,
		// und alles danach wird zu Markup. Die Werte sind hier zwar konstant, aber
		// die Funktion ist die Stelle, an der das abgesichert gehört.
		const json = serializeJsonLd({ name: '</script><img src=x onerror=alert(1)>' });
		expect(json).not.toContain('</script>');
		expect(json).not.toContain('<img');
		expect(json).toContain('\\u003c');
	});

	it('bleibt gültiges JSON mit unverändertem Inhalt', () => {
		const wert = { name: 'Fisch & <Wal>', tief: { zahl: 42 } };
		expect(JSON.parse(serializeJsonLd(wert))).toEqual(wert);
	});

	it('maskiert das Zeilentrennzeichen U+2028', () => {
		// U+2028 ist in JSON gültig, in einem script-Element aber ein Zeilenumbruch
		// und macht das Dokument dort ungültig.
		expect(serializeJsonLd({ a: '\u2028' })).toContain('\\u2028');
	});
});
