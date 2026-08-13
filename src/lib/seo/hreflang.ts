/**
 * hreflang-Alternates und `og:locale` für die vier lokalisierten öffentlichen
 * Seiten (Aufgabe 2.5, `docs/i18n/PLAN_ETAPPE2.md`).
 *
 * Baut auf `localizeHref` auf — derselben Funktion, die `LanguageSwitcher.svelte`
 * für den Umschalter-Link nutzt. Eine zweite, eigene URL-Berechnung hier hätte
 * mit der dortigen auseinanderlaufen können (z. B. bei Kampagnen-Query-Parametern
 * aus Museums-Links); stattdessen teilen sich Umschalter und Suchmaschinen-Hinweis
 * dieselbe Quelle.
 *
 * ACHTUNG — Zwischenzustand (Entscheidung 2026-08-13, siehe
 * `$lib/i18n/translationRolloutStage.ts`): Diese Links zeigen auch auf die
 * `/en`-Fassung, obwohl die weiterhin `X-Robots-Tag: noindex, follow` trägt
 * (`noindexEnglishPages.ts`) — die Mechanik ist fertig, wird aber erst mit dem
 * Rollout-Abschluss (Museumstexte für `about/+page.svelte`, dann
 * `TRANSLATION_ROLLOUT_COMPLETE = true`) für Suchmaschinen wirksam.
 */
import { locales, baseLocale, localizeHref, type Locale } from '$lib/paraglide/runtime';

export interface HreflangLink {
	/** Sprachkürzel (`de`, `en`) oder `x-default`. */
	hreflang: string;
	/** Absolute URL — hreflang verlangt absolute, keine relativen Pfade. */
	href: string;
}

/**
 * Eine `<link rel="alternate" hreflang="…">`-Angabe je unterstützter Locale,
 * plus `x-default` auf die Standard-Locale (Deutsch, `baseLocale`).
 *
 * `pathAndQuery` darf mit oder ohne Locale-Präfix übergeben werden —
 * `localizeHref` de-lokalisiert intern, bevor es neu lokalisiert (siehe
 * dessen Doku in `runtime.js`).
 *
 * @param origin Schema + Host ohne Pfad, z. B. `https://ostsee-tiere.example.com`
 *   (`PUBLIC_SITE_URL`) — hreflang-Werte müssen absolut sein, ein relativer
 *   Pfad würde von Suchmaschinen verworfen.
 * @param pathAndQuery Pfad der aktuellen Seite, inklusive Query-String.
 */
export function buildHreflangLinks(origin: string, pathAndQuery: string): HreflangLink[] {
	const links: HreflangLink[] = locales.map((locale) => ({
		hreflang: locale,
		href: origin + localizeHref(pathAndQuery, { locale })
	}));

	links.push({
		hreflang: 'x-default',
		href: origin + localizeHref(pathAndQuery, { locale: baseLocale })
	});

	return links;
}

/**
 * `og:locale`-Wert einer Locale. `en_GB`, nicht `en_US` — konsistent mit der
 * in Aufgabe 2.1 getroffenen Entscheidung für britisches Englisch
 * (`src/lib/utils/format/dateTime.ts`).
 */
const OG_LOCALE: Record<Locale, string> = {
	de: 'de_DE',
	en: 'en_GB'
};

export function ogLocale(locale: Locale): string {
	return OG_LOCALE[locale];
}

/** Die `og:locale:alternate`-Werte für eine Locale — alle anderen unterstützten. */
export function ogLocaleAlternates(locale: Locale): string[] {
	return locales
		.filter((candidate) => candidate !== locale)
		.map((candidate) => OG_LOCALE[candidate]);
}
