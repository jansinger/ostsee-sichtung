import { describe, expect, it } from 'vitest';
import { buildRobotsTxt, istKanonischerHost } from './robotsTxt';

const KANONISCH = new URL('https://ostsee-tiere.de/robots.txt');
const STAGING = new URL('https://staging.ostsee-tiere.de/robots.txt');

describe('istKanonischerHost', () => {
	it('erkennt die Produktionsdomain mit und ohne www', () => {
		expect(istKanonischerHost('ostsee-tiere.de')).toBe(true);
		expect(istKanonischerHost('www.ostsee-tiere.de')).toBe(true);
	});

	it('vergleicht ohne Rücksicht auf Groß-/Kleinschreibung und Port', () => {
		expect(istKanonischerHost('Ostsee-Tiere.DE')).toBe(true);
		expect(istKanonischerHost('ostsee-tiere.de:443')).toBe(true);
	});

	it('weist Staging, Vorschau-Deployments, Rohhostnamen und IPs ab', () => {
		expect(istKanonischerHost('staging.ostsee-tiere.de')).toBe(false);
		expect(istKanonischerHost('dmm-prod-ostsee.ha.gecko.de')).toBe(false);
		expect(istKanonischerHost('localhost:4000')).toBe(false);
		expect(istKanonischerHost('192.0.2.10')).toBe(false);
	});

	it('lässt sich nicht durch einen Host täuschen, der die Domain nur enthält', () => {
		expect(istKanonischerHost('ostsee-tiere.de.angreifer.example')).toBe(false);
		expect(istKanonischerHost('nicht-ostsee-tiere.de')).toBe(false);
	});
});

describe('buildRobotsTxt auf einem nicht-kanonischen Host', () => {
	const txt = buildRobotsTxt(STAGING);

	it('sperrt alles', () => {
		expect(txt).toMatch(/^User-agent: \*$/m);
		expect(txt).toMatch(/^Disallow: \/$/m);
	});

	it('nennt keine Sitemap — die gehört nur zur kanonischen Fassung', () => {
		expect(txt).not.toMatch(/^Sitemap:/m);
	});
});

describe('buildRobotsTxt auf der kanonischen Domain', () => {
	const txt = buildRobotsTxt(KANONISCH);

	it('sperrt nicht pauschal alles', () => {
		expect(txt).not.toMatch(/^Disallow: \/$/m);
	});

	it('verweist mit absoluter URL auf die Sitemap', () => {
		expect(txt).toMatch(/^Sitemap: https:\/\/ostsee-tiere\.de\/sitemap\.xml$/m);
	});

	it.each([
		'/admin',
		'/api/',
		'/uploads/',
		'/maintenance',
		'/health',
		'/rest_sichtungen',
		'/sichtungen/showreports.json'
	])('sperrt %s', (pfad) => {
		expect(txt).toMatch(new RegExp(`^Disallow: ${pfad.replace(/[/.]/g, '\\$&')}$`, 'm'));
	});

	it('sperrt die Legacy-Endpunkte auch unter ihrem CakePHP-Sprachpräfix', () => {
		// `/de/` und `/en/` waren im Altsystem vor jedem Pfad gültig und sind es
		// für die vier Legacy-Endpunkte bis heute (`legacy-api/languagePrefix.ts`).
		// robots.txt vergleicht Präfixe wörtlich — `Disallow: /rest_sichtungen`
		// deckt `/en/rest_sichtungen` NICHT ab.
		expect(txt).toMatch(/^Disallow: \/en\/rest_sichtungen$/m);
		expect(txt).toMatch(/^Disallow: \/de\/rest_sichtungen$/m);
		expect(txt).toMatch(/^Disallow: \/en\/sichtungen\//m);
		expect(txt).toMatch(/^Disallow: \/de\/sichtungen\//m);
	});

	it('sperrt /en NICHT — sonst sieht kein Crawler die englischen Seiten', () => {
		// Eine gesperrte Seite wird nicht abgerufen; ein `X-Robots-Tag` oder
		// `hreflang` darauf bleibt damit ungelesen. `/en` ist seit Abschluss der
		// Übersetzung (TRANSLATION_ROLLOUT_COMPLETE) indexierbar gewollt.
		expect(txt).not.toMatch(/^Disallow: \/en\/?$/m);
	});

	it('lässt KI-Crawler zu, hält die Entscheidung aber sichtbar', () => {
		// Der Ist-Zustand vor dieser Datei war „alles erlaubt". Eine Sperre wäre
		// eine inhaltliche Entscheidung des Museums, keine technische — sie steht
		// deshalb als auskommentierter Block bereit, statt still zu greifen.
		expect(txt).not.toMatch(/^User-agent: GPTBot$/m);
		expect(txt).toContain('# User-agent: GPTBot');
	});
});
