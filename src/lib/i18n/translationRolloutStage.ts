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
 *  3. `hreflang`/`og:locale` existieren seit Aufgabe 2.5 (`HreflangHead.svelte`,
 *     eingebunden auf `/`, `/map`, `/about`, `/bestimmungshilfe`), zeigen also
 *     schon auf die `/en`-Fassung — obwohl die weiterhin `noindex` trägt.
 *
 * **Entscheidung vom 2026-08-13:** Genau dieser dritte Punkt weicht bewusst von
 * der ursprünglichen Reihenfolge ab (siehe Git-Historie dieser Datei für den
 * vorherigen Wortlaut: „kein `hreflang`, bis die Übersetzung fertig ist"). Der
 * Grund für die Änderung: `about/+page.svelte` bleibt noch auf Museumstext
 * warten (Aufgabe 2.3b, 33 Fälle), während der Rest der Übersetzung fertig ist
 * — auf „Übersetzung komplett fertig" zu warten hätte die hreflang-Mechanik
 * unbestimmt lange blockiert, ohne dass die Bau-Arbeit selbst von den fehlenden
 * Museumstexten abhinge. `hreflang` auf eine `noindex`-Seite zu zeigen ist ein
 * bekannter Zwischenzustand (Google ignoriert die Annotation dort schlicht, bis
 * die Zielseite selbst indexierbar ist) — kein Fehler, aber auch keine
 * Zielarchitektur; er endet mit Schritt 1 unten.
 *
 * **Die verbleibenden zwei Riegel hängen weiter an derselben Bedingung** —
 * „ist die Übersetzung fertig?" — und laufen bewusst gemeinsam über diese
 * Konstante, nicht als zwei unabhängig verstreute Schalter.
 *
 * WICHTIG BEIM ABSCHLUSS DER ÜBERSETZUNG:
 *  1. Diese Konstante auf `false` setzen (schaltet den Sprachumschalter wieder
 *     sichtbar UND entfernt den `noindex`-Header, s.u.) — `hreflang` steht dann
 *     bereits und muss nicht mehr nachgezogen werden.
 *  2. Die dazugehörigen Tests auf die neue Erwartung ziehen — u. a.
 *     `e2e/submit-offline.spec.ts` (Navbar-Item-Zählung) und
 *     `PublicNavbar.svelte.test.ts`/vergleichbare Guards.
 *
 * Nur den Riegel zu entfernen, ohne dass `hreflang` bereits stimmt, kippt das
 * Problem in die andere Richtung: Google indexiert dann die englische Fassung
 * zwar, aber ohne verlässliche Sprachzuordnung zur deutschen — wieder
 * Duplicate-Content-Risiko, nur andersherum. Deshalb bleibt die Reihenfolge
 * bindend, auch wenn `hreflang` jetzt vorgezogen wurde: Erst prüfen, dass die
 * Ziel-URLs tatsächlich fertig übersetzt sind, dann den Riegel entfernen.
 */
export const TRANSLATION_ROLLOUT_COMPLETE = false;
