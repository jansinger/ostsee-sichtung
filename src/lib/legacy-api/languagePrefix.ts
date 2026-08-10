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
 * Bewusst **nicht** generisch über alle Routen: Seitenrouten haben ihre eigene
 * Lokalisierung über Paraglide (`/en` liefert die Startseite auf Englisch),
 * getrennt von diesem Legacy-Sprachpräfix. `/en/admin/...` bleibt trotzdem
 * ausgeschlossen (siehe `NICHT_LOKALISIERT` unten) — nicht aus Sicherheitsgründen,
 * der Zugriffsschutz auf `/admin` ist route-basiert und unabhängig davon.
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

/**
 * Pfade, die **nie** ein Sprachpräfix bekommen.
 *
 * Bewusst eine Ausschluss- und keine Positivliste: Eine vergessene Positivliste
 * liefert bei einer neuen öffentlichen Seite still Deutsch aus.
 *
 * **Exportiert**, damit `e2e/i18n-routing.spec.ts` seine Schleife über genau
 * diese Konstante fährt statt über eine eigene, separat gepflegte Literalliste.
 * Bis 2026-08-10 gab es zwei Listen — diese hier mit acht Einträgen und eine
 * hartkodierte im Test mit fünf —, die stillschweigend auseinanderliefen; drei
 * Einträge waren dort ungetestet. Ein Import behebt genau diese Fehlerklasse:
 * jeder Eintrag hier bekommt automatisch einen 404-Test, ohne dass ihn jemand
 * im Testfile nachträgt.
 *
 * Das behebt **nicht** jede Lücke: Ein Pfad, der hier fehlt, obwohl er stehen
 * sollte, bleibt für diese Schleife unsichtbar — sie kennt nur, was in der
 * Konstante steht, nicht, was fehlen dürfte. Diese Lücke lässt sich nur durch
 * eine von der Konstante unabhängige Prüfung schließen (z. B. eine feste
 * Erwartung „`/en/admin` bleibt 404", wie sie unten als eigener Test steht) —
 * nicht durch die Schleife selbst.
 *
 * `/admin` steht hier, weil der Bereich einsprachig deutsch bleibt: Ein `/en/`
 * davor wäre ein Sprachversprechen, das die Oberfläche nicht einlöst — ein
 * zweiter kanonischer Pfad auf dieselbe Ansicht, nur ohne Übersetzung.
 * (Kein Sicherheitsargument: Der Zugriffsschutz auf `/admin` ist route-basiert
 * — `requireUserRole(url, locals.user, ['admin', 'superadmin'])` in
 * `src/routes/admin/+layout.server.ts` — und griffe unverändert auch unter
 * `/en/admin`. `event.url.pathname` in `hooks.server.ts` dient dort nur dem
 * `/rest_sichtungen`-CSRF-Hinweis und dem Error-Logging, nicht der Autorisierung.)
 *
 * Bewusst **ohne** `/sichtungen`: Unter `src/routes/sichtungen/` liegt zwar eine
 * reale Route, aber nur der Legacy-API-Endpunkt `showreports.json` (bereits über
 * `/rest_sichtungen` und `LEGACY_PFADE` oben abgedeckt) — keine Seitenroute.
 * Ein Präfix hier hätte `istAusgeschlossen('/sichtungen')` fälschlich
 * ausgeschlossen; der bloße Pfad `/sichtungen` existiert als Seite nicht und
 * muss lokalisierbar bleiben.
 */
export const NICHT_LOKALISIERT = [
	'/api',
	'/admin',
	'/uploads',
	'/health',
	'/maintenance',
	'/docs',
	'/styleguide',
	'/rest_sichtungen'
] as const;

/**
 * Ob ein Pfad von der Sprachlokalisierung ausgenommen ist.
 *
 * Vergleicht auf **ganze Segmente**: `/apidoku` beginnt zwar mit `/api`, ist
 * aber ein anderer Pfad und wird lokalisiert.
 *
 * @param pfad Pfad ohne Sprachpräfix und ohne Query-String
 */
export function istAusgeschlossen(pfad: string): boolean {
	return NICHT_LOKALISIERT.some((praefix) => pfad === praefix || pfad.startsWith(`${praefix}/`));
}
