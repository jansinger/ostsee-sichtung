/**
 * Gemeinsamer Schalter für Etappe 0 der Mehrsprachigkeit
 * (`docs/DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md`).
 *
 * `/en` ist technisch erreichbar, aber noch KEIN einziger Text ist übersetzt.
 * Drei voneinander unabhängige Stellen im Code behelfen sich deshalb
 * vorübergehend, bis die Übersetzung (Etappen 1–3) ausgeliefert ist:
 *
 *  1. Der Sprachumschalter bleibt aus der Navigation entfernt
 *     (`PublicNavbar.svelte`) — ein Umschalter auf eine Seite, die genauso
 *     deutsch ist wie die, von der man kommt, bewirkt sichtbar nichts.
 *  2. `/en`-Antworten tragen `X-Robots-Tag: noindex, follow`
 *     (`noindexEnglishPages.ts`) — sonst indexieren Suchmaschinen deutsche
 *     Inhalte unter englischen URLs (Duplicate Content in falscher Sprache).
 *  3. Es gibt bewusst noch KEIN `hreflang` auf den Seiten selbst — das wird
 *     erst mit Schritt 2 unten sinnvoll (Etappe 2 laut Designdokument).
 *
 * **Alle drei hängen an derselben Bedingung** — „ist die Übersetzung fertig?" —,
 * liefen bisher aber als zwei unabhängig verstreute Riegel ohne gemeinsame
 * Quelle auseinander. Diese Konstante bündelt sie: Wer sie anfasst, sieht über
 * die Doku hier zwangsläufig alle drei Stellen.
 *
 * WICHTIG BEIM ABSCHLUSS DER ÜBERSETZUNG — alle drei Schritte gemeinsam, nicht
 * einzeln:
 *  1. Diese Konstante auf `false` setzen (schaltet den Sprachumschalter wieder
 *     sichtbar UND entfernt den `noindex`-Header, s.u.).
 *  2. `hreflang` ergänzen (z. B. Alternate-Links in `app.html`/`+layout.svelte`).
 *  3. Die dazugehörigen Tests auf die neue Erwartung ziehen — u. a.
 *     `e2e/submit-offline.spec.ts` (Navbar-Item-Zählung) und
 *     `PublicNavbar.svelte.test.ts`/vergleichbare Guards.
 *
 * Nur den Riegel zu entfernen, ohne `hreflang` zu ergänzen, kippt das Problem
 * nur in die andere Richtung: Google indexiert dann die englische Fassung
 * zwar, aber ohne Sprachzuordnung zur deutschen — wieder Duplicate-Content-
 * Risiko, nur andersherum.
 */
export const TRANSLATION_ROLLOUT_COMPLETE = false;
