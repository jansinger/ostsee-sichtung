import { describe, expect, it } from 'vitest';
import { buildSitemapXml, SITEMAP_PFADE } from './sitemap';

const xml = buildSitemapXml('https://ostsee-tiere.de');

describe('buildSitemapXml', () => {
	it('ist wohlgeformtes XML mit dem korrekten Namensraum', () => {
		expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
		expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
		expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
	});

	it('listet jede öffentliche Seite in beiden Sprachen', () => {
		// Vier lokalisierte Seiten × zwei Sprachen. Dieselbe Menge, die
		// `HreflangHead.svelte` bedient — läuft sie auseinander, meldet der Test
		// unten zu den Alternates das mit.
		const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
		expect(urls).toHaveLength(SITEMAP_PFADE.length * 2);
		expect(urls).toContain('https://ostsee-tiere.de/');
		expect(urls).toContain('https://ostsee-tiere.de/en');
		expect(urls).toContain('https://ostsee-tiere.de/about');
		expect(urls).toContain('https://ostsee-tiere.de/en/about');
	});

	it('gibt zu jedem Eintrag die Alternates inklusive x-default an', () => {
		const eintraege = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => m[0] ?? '');
		expect(eintraege).toHaveLength(SITEMAP_PFADE.length * 2);
		for (const eintrag of eintraege) {
			expect(eintrag).toContain('hreflang="de"');
			expect(eintrag).toContain('hreflang="en"');
			expect(eintrag).toContain('hreflang="x-default"');
		}
	});

	it('nennt keine URL, die auf eine Umleitung zeigt', () => {
		// `localizeHref('/')` liefert für Englisch `/en/`; SvelteKit leitet das bei
		// `trailingSlash: 'never'` auf `/en` um. Die Startseite behält ihren
		// Schrägstrich — sie wird nicht umgeleitet.
		const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
		const mitSchraegstrich = urls.filter((url) => url.endsWith('/'));
		expect(mitSchraegstrich).toEqual(['https://ostsee-tiere.de/']);
	});

	it('nimmt nur absolute URLs auf', () => {
		const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
		for (const url of urls) {
			expect(url.startsWith('https://ostsee-tiere.de')).toBe(true);
		}
	});

	it('führt keine nicht-öffentlichen Bereiche', () => {
		for (const gesperrt of ['/admin', '/api', '/uploads', '/styleguide', '/maintenance']) {
			expect(xml).not.toContain(`<loc>https://ostsee-tiere.de${gesperrt}`);
		}
	});

	it('maskiert Sonderzeichen nicht doppelt', () => {
		expect(xml).not.toContain('&amp;amp;');
	});
});
