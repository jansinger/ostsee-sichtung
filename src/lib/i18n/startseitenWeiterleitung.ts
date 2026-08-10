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
 * Antwort trägt `Vary: Accept-Language`.
 *
 * @param pfad            Pfad der Anfrage, ohne Query-String
 * @param acceptLanguage  Header-Wert oder `null`
 * @param cookieLocale    Ausdrückliche frühere Wahl oder `null`
 * @returns Zielpfad, oder `null` wenn nicht weitergeleitet wird
 */
export function zielFuerStartseite(
	pfad: string,
	acceptLanguage: string | null,
	cookieLocale: string | null
): string | null {
	if (pfad !== '/') return null;
	// Eine getroffene Wahl schlägt die Vermutung — immer, in beide Richtungen.
	if (cookieLocale) return null;
	if (!acceptLanguage) return null;

	const bevorzugt = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? '';
	return bevorzugt.startsWith('en') ? '/en' : null;
}
