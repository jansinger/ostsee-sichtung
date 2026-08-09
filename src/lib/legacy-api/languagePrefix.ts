/**
 * Sprachkürzel der abgelösten CakePHP-Anwendung.
 *
 * Deren Router akzeptierte vor **jedem** Pfad ein `/de/` oder `/en/`:
 *
 * ```php
 * Router::connect('/:language/:controller/:action/*', array(), array('language' => 'de|en'));
 * ```
 *
 * Es gab also nicht nur `/en/rest_sichtungen/antworten.json`, sondern genauso
 * `/de/rest_sichtungen/antworten.json`, `/en/rest_sichtungen` oder
 * `/en/sichtungen/showreports.json`. Das Präfix war dabei nie eine Übersetzung:
 * der Übergangsdienst auf hawking liefert unter `/en/rest_sichtungen/antworten.json`
 * byte-identisch dieselbe deutsche Liste. Reine Routenkosmetik.
 *
 * Ob ein Client das Präfix tatsächlich nutzt, ist offen — das Zugriffsprotokoll
 * von hawking reicht nur einen Tag zurück (Plesk rotiert ohne Archiv) und zeigte
 * am 2026-08-09 keinen Abruf. Die Regel kostet nichts und schließt eine Lücke,
 * die von hier aus nicht mehr reparierbar wäre.
 */
const SPRACHKUERZEL = ['de', 'en'] as const;

/**
 * Pfade, für die das Sprachkürzel weiterhin gilt — die vier Legacy-Endpunkte
 * aus `docs/LEGACY_API_SPECIFICATION.md` und sonst nichts.
 *
 * Bewusst **nicht** generisch über alle Routen: Die Anwendung ist einsprachig
 * deutsch, ein `/en/` vor der Startseite wäre ein Sprachversprechen, das sie
 * nicht einlöst. Und `/en/admin/...` wäre ein zweiter Pfad auf geschützte
 * Routen, deren Schutz in `hooks.server.ts` an `event.url.pathname` hängt —
 * die URL bleibt bei `reroute` die vom Client gesendete.
 *
 * Bewusst auch **nicht** als Verzeichnis-Präfix (`/sichtungen/**`): Sonst bekäme
 * jeder künftige Pfad unter `/sichtungen/` oder `/rest_sichtungen/` das
 * Sprachkürzel stillschweigend mit, auch ein nicht-Legacy-Pfad. Ein neuer
 * Legacy-Endpunkt gehört hier eingetragen — das ist genau die bewusste
 * Entscheidung, die der Legacy-Vertrag verlangt.
 */
const LEGACY_PFADE = [
	'/rest_sichtungen',
	'/rest_sichtungen/antworten.json',
	'/rest_sichtungen/inBaltic.json',
	'/sichtungen/showreports.json'
] as const;

const PRAEFIX_MUSTER = new RegExp(`^/(?:${SPRACHKUERZEL.join('|')})(/.*)?$`);

/** Trailing Slash zählt mit; über dessen Behandlung entscheidet SvelteKit. */
function istLegacyPfad(pfad: string): boolean {
	return LEGACY_PFADE.some((legacy) => pfad === legacy || pfad === `${legacy}/`);
}

/**
 * Entfernt ein führendes `/de/` oder `/en/` vor einem Legacy-API-Pfad.
 *
 * @param pathname Pfad der Anfrage (ohne Query-String)
 * @returns den Pfad ohne Sprachkürzel, oder `undefined` wenn nichts zu tun ist
 */
export function stripLegacyLanguagePrefix(pathname: string): string | undefined {
	const treffer = PRAEFIX_MUSTER.exec(pathname);
	if (!treffer) return undefined;

	const rest = treffer[1];
	// `/en` ohne weiteren Pfad zeigte in CakePHP auf das Meldeformular. Das ist
	// eine Seitenroute, keine API — siehe LEGACY_PFADE oben.
	if (!rest || !istLegacyPfad(rest)) return undefined;

	return rest;
}
