import { stripLegacyLanguagePrefix } from '$lib/legacy-api/languagePrefix';
import type { Reroute } from '@sveltejs/kit';

/**
 * Bildet die Sprachpräfixe der abgelösten CakePHP-Anwendung auf die bestehenden
 * Routen ab: `/en/rest_sichtungen/antworten.json` wird von
 * `src/routes/rest_sichtungen/antworten.json` bedient.
 *
 * Additiv — die Pfade ohne Präfix ändern sich nicht. `reroute` betrifft nur die
 * Routenauflösung; `event.url` bleibt in `hooks.server.ts` und in den Endpunkten
 * die vom Client gesendete URL.
 *
 * Welche Pfade das Präfix bekommen, steht in `stripLegacyLanguagePrefix`.
 */
export const reroute: Reroute = ({ url }) => stripLegacyLanguagePrefix(url.pathname);
