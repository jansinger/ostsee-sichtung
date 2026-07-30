/**
 * Kein `export const csr = false` mehr (2026-07-30).
 *
 * Die Option sah nach einer harmlosen Optimierung für eine statische Seite aus,
 * hat aber Navigation und Footer der ganzen Seite entfernt: `isNotIFrame`
 * (`src/lib/utils/client/isNotIFrame.ts`) ist eine Modulkonstante mit
 * `browser && window === window.top`. Ohne Client-JS bleibt sie auf ihrem
 * SSR-Wert `false`, das Layout rendert deshalb im `.iframe-mode` und lässt
 * `PublicNavbar` und `PublicFooter` komplett weg.
 *
 * Im Browser nachgemessen: auf `/about` waren `nav` und `footer` mit 0 Elementen
 * gar nicht im DOM (auf `/` dagegen 5 bzw. 1). Konkrete Folgen:
 * - Von `/about` führte kein Weg zurück in die Anwendung — es gab kein Menü.
 * - Die Pflichtangaben (Impressum nach § 5 DDG, Datenschutzhinweis) sitzen im
 *   Footer und waren damit ausgerechnet auf der „Über uns"-Seite unerreichbar.
 *
 * Die Alternative wäre, den Standard umzudrehen und die Chrome-Elemente erst
 * client-seitig auszublenden. Das trägt hier nicht: ohne Client-JS gibt es
 * niemanden, der das nachholt — eine iframe-Einbettung von `/about` würde dann
 * doppelte Navigation zeigen.
 *
 * Diese Datei bleibt als Träger der Begründung bestehen, damit `csr = false`
 * nicht als „fehlt noch" wieder ergänzt wird.
 */
export {};
