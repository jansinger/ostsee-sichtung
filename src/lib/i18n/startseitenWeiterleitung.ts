/**
 * Einmalige Sprachweiterleitung — ausschließlich auf `/`.
 *
 * `Accept-Language` steht bewusst **nicht** in der Paraglide-Strategie: Stünde
 * es dort, würde `/sichtungen` je nach Browser-Header zwei verschiedene Inhalte
 * unter derselben URL ausliefern. Nicht cachebar, für Suchmaschinen ein
 * Duplikat, und hinter der iframe-Einbettung auf meeresmuseum.de besonders
 * schwer zu durchschauen.
 *
 * Die Startseite ist der einzige Ort, an dem ein Nutzer „ankommt" — dort ist die
 * Vermutung nützlich und ihre Kosten sind auf eine Antwort begrenzt. Diese eine
 * Antwort trägt `Vary: Accept-Language, Cookie` (siehe `handleStartseitenSprache`
 * in `hooks.server.ts` — dort steht der tatsächliche Header-Wert, hier nur die
 * Begründung: `Cookie` ist Pflicht, weil dieselbe URL mit demselben
 * `Accept-Language` je nach `PARAGLIDE_LOCALE` eine 302 oder eine 200 liefert).
 *
 * `Vary: Cookie` macht `/` für geteilte Caches (CDN, Reverse Proxy) praktisch
 * unspeicherbar — jeder Cookie-Wert ist ein eigener Cache-Schlüssel. Das ist
 * eine bewusste Entscheidung, keine übersehene Nebenwirkung: Korrektheit vor
 * Trefferquote. Ein „Optimierung", die `Cookie` aus dem `Vary` wieder entfernt,
 * macht die Startseite wieder von einem Cookie-Wert abhängig cachebar UND
 * liefert dann falsch gecachte Sprachversionen aus.
 *
 * Nur die erste Präferenz zählt, `q`-Gewichte werden bewusst ignoriert:
 * `de;q=0.1,en;q=0.9` leitet NICHT weiter, obwohl Englisch höher gewichtet ist.
 * Das ist kein Bug, sondern der Brief — eine echte RFC-4647-Gewichtung wäre für
 * eine einmalige Vermutung auf der Startseite mehr Mechanik, als der Fall
 * hergibt.
 *
 * Die reine Verdrahtung (Cookie-Name, Reihenfolge in der `sequence`) prüft
 * diese Funktion nicht — sie ist isoliert testbar und bliebe grün, entfernte
 * man `handleStartseitenSprache` versehentlich aus `hooks.server.ts`. Diese
 * Lücke deckt `e2e/i18n-routing.spec.ts` (Task 6).
 *
 * @param pfad            Pfad der Anfrage, ohne Query-String
 * @param search          Query-String der Anfrage, inkl. führendem `?` oder leer
 * @param acceptLanguage  Header-Wert oder `null`
 * @param cookieLocale    Ausdrückliche frühere Wahl oder `null`
 * @returns Zielpfad (inkl. erhaltenem Query-String), oder `null` wenn nicht
 *          weitergeleitet wird
 */
export function zielFuerStartseite(
	pfad: string,
	search: string,
	acceptLanguage: string | null,
	cookieLocale: string | null
): string | null {
	if (pfad !== '/') return null;
	// Eine getroffene Wahl schlägt die Vermutung — immer, in beide Richtungen.
	if (cookieLocale) return null;
	if (!acceptLanguage) return null;

	const bevorzugt = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
	if (!bevorzugt.startsWith('en')) return null;

	// Kampagnen-Marker aus einem Museums-Link (siehe reportKindHref() in
	// +page.svelte) dürfen die Weiterleitung nicht wegwerfen — dieselbe Zusage
	// gilt hier für den allerersten Request wie dort für jeden Klick danach.
	return `/en${search}`;
}
