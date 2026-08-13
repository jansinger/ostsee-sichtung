/**
 * `sitemap.xml` für die öffentlichen, lokalisierten Seiten.
 *
 * Fällig geworden mit dem Abschluss der Übersetzung
 * (`TRANSLATION_ROLLOUT_COMPLETE`, 2026-08-13): Seither existiert jede dieser
 * Seiten unter zwei URLs, und der eigentliche Zweck dieser Datei ist nicht die
 * Auffindbarkeit — fünf Seiten findet ein Crawler auch über die Navigation —,
 * sondern das Sprachpaar. Die `xhtml:link`-Alternates sagen einer Suchmaschine,
 * dass `/about` und `/en/about` dieselbe Seite in zwei Sprachen sind, statt
 * zwei konkurrierende Treffer.
 *
 * Die URLs kommen aus `buildHreflangLinks` — derselben Funktion, die
 * `HreflangHead.svelte` in den Seitenkopf schreibt. Eine zweite eigene
 * Berechnung hier hätte mit der dortigen auseinanderlaufen können, und
 * widersprechende hreflang-Angaben in Sitemap und Seitenkopf sind schlimmer als
 * gar keine: Google verwirft dann beide.
 *
 * Kein `lastmod`, kein `changefreq`, keine `priority`. `lastmod` müsste den
 * tatsächlichen Änderungszeitpunkt des Seiteninhalts kennen — den weiß hier
 * niemand, und ein gestempeltes „heute" bei jedem Abruf ist eine Falschangabe,
 * die Crawler abwerten. `changefreq` und `priority` wertet Google seit Jahren
 * nicht mehr aus.
 */
import { buildHreflangLinks } from './hreflang';

/**
 * Die öffentlichen Seiten, die es in beiden Sprachen gibt — dieselben vier, die
 * `HreflangHead.svelte` einbinden (`+page.svelte` in `/`, `/about`, `/map`,
 * `/bestimmungshilfe`).
 *
 * Nicht dabei: `/docs` und `/docs/api`. Das ist die Schnittstellen-Dokumentation
 * der Legacy-API für Entwickler von Mobile-Clients, nicht lokalisiert und ohne
 * Publikum in einer Websuche. `/styleguide` existiert außerhalb der Entwicklung
 * gar nicht (404 laut `+page.server.ts`), `/maintenance` trägt selbst ein
 * `noindex`.
 */
export const SITEMAP_PFADE = ['/', '/about', '/map', '/bestimmungshilfe'] as const;

/**
 * Entfernt einen abschließenden Schrägstrich — außer bei der Wurzel.
 *
 * `localizeHref('/', { locale: 'en' })` liefert `/en/`, und SvelteKit steht auf
 * seiner Voreinstellung `trailingSlash: 'never'`: Ein Abruf von `/en/` endet in
 * einer Umleitung auf `/en`. In einer Sitemap ist das ein vermeidbarer Fehler —
 * sie soll die endgültige URL nennen, nicht eine, die weiterleitet.
 *
 * Betrifft nur die Schreibweise, nicht das Ziel; die Seitenmenge bleibt exakt
 * die von `buildHreflangLinks`. Dieselbe Schreibweise steht derzeit auch in den
 * `hreflang`-Angaben im Seitenkopf (`HreflangHead.svelte`) — dort ist sie
 * genauso unschön, aber wirkungsgleich, und eine Änderung daran gehört in einen
 * eigenen Vorgang zusammen mit der i18n-Arbeit.
 */
function ohneEndSchraegstrich(href: string): string {
	// Über URL statt über String-Ende: `https://ostsee-tiere.de/` ist die
	// Startseite und behält ihren Schrägstrich — sie wird nicht umgeleitet, und
	// ein Origin ohne Pfad wäre die untypische Schreibweise.
	const url = new URL(href);
	if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
		url.pathname = url.pathname.slice(0, -1);
	}
	return url.toString();
}

/** XML-Textinhalte maskieren. Reicht für Pfade und URLs. */
function xmlEscape(wert: string): string {
	return wert
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * @param origin Schema + Host ohne Pfad, z. B. `https://ostsee-tiere.de`.
 *   Sitemap-Einträge müssen absolut sein und laut Standard denselben Host
 *   tragen wie die Sitemap selbst.
 */
export function buildSitemapXml(origin: string): string {
	const eintraege = SITEMAP_PFADE.flatMap((pfad) => {
		const alternates = buildHreflangLinks(origin, pfad);

		// Ein `<url>`-Eintrag je Sprachfassung, jeder mit der vollständigen
		// Alternates-Liste — so verlangt es der Standard: Die Verweise müssen
		// wechselseitig sein, sonst ignoriert Google sie.
		return alternates
			.filter((link) => link.hreflang !== 'x-default')
			.map((self) =>
				[
					'\t<url>',
					`\t\t<loc>${xmlEscape(ohneEndSchraegstrich(self.href))}</loc>`,
					...alternates.map(
						(alt) =>
							`\t\t<xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${xmlEscape(ohneEndSchraegstrich(alt.href))}" />`
					),
					'\t</url>'
				].join('\n')
			);
	});

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
		'\txmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...eintraege,
		'</urlset>',
		''
	].join('\n');
}
