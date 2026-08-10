import { deLocalizeUrl } from '$lib/paraglide/runtime';
import { istAusgeschlossen, stripLegacyLanguagePrefix } from '$lib/legacy-api/languagePrefix';
import type { Reroute } from '@sveltejs/kit';

/**
 * Drei Schritte, und die Reihenfolge ist nicht beliebig.
 *
 * 1. **Legacy-Präfix.** Für die vier Pfade aus `LEGACY_PFADE` ist `/en/` reine
 *    Routenkosmetik mit **deutscher** Antwort — so hat es CakePHP gemacht, und
 *    ein iOS-Client hängt live daran. Muss vor der Lokalisierung greifen: Sonst
 *    behandelt `istAusgeschlossen` `/rest_sichtungen` und
 *    `/sichtungen/showreports.json` ungleich, und `/en/sichtungen/showreports.json`
 *    würde fälschlich als lokalisierbare Seite statt als Legacy-Pfad gelten.
 * 2. **Ausschlussliste.** `undefined` heißt „nicht umschreiben": SvelteKit löst
 *    den Pfad wörtlich auf, findet keine Route `/en/api/...` und liefert 404.
 *    Genau das ist gewollt.
 * 3. **Lokalisierung** für alles Übrige.
 *
 * `reroute` betrifft nur die Routenauflösung. `event.url` bleibt in
 * `hooks.server.ts` und in den Endpunkten die vom Client gesendete URL — der
 * Auth-Schutz sieht weiterhin den echten Pfad.
 */
export const reroute: Reroute = ({ url }) => {
	const legacy = stripLegacyLanguagePrefix(url.pathname);
	if (legacy !== undefined) return legacy;

	// `/de/x` ist kein zweiter Weg auf `/x`: Deutsch ist bei `baseLocale: 'de'`
	// präfixlos. `deLocalizeUrl` räumt das Präfix bereitwillig ab und lieferte
	// damit zwei URLs für denselben Inhalt aus. Die vier Legacy-Pfade behalten
	// ihr `/de/` über Schritt 1 oben — sie sind hier schon durch.
	if (/^\/de(\/|$)/.test(url.pathname)) return undefined;

	const entlokalisiert = deLocalizeUrl(url).pathname;
	if (istAusgeschlossen(entlokalisiert)) return undefined;

	return entlokalisiert;
};
