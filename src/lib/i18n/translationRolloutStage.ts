/**
 * Gemeinsamer Schalter für Etappe 0 der Mehrsprachigkeit
 * (`docs/DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md`).
 *
 * **Auf `true` seit 2026-08-13 (Entscheidung Jan).** Die drei Riegel, die
 * diese Konstante bündelt, sind damit gelöst:
 *
 *  1. Der Sprachumschalter ist wieder eingebunden — allerdings nicht mehr in
 *     `PublicNavbar.svelte`, sondern im Profilmenü (`UserMenu.svelte` und
 *     `UserMenuMobile.svelte`). In der Navbar konkurrierte er bei 320px mit
 *     dem Offline-Abzeichen um den Platz; im Profilmenü ist diese Konkurrenz
 *     strukturell aufgelöst (`e2e/submit-offline.spec.ts` hält beides fest).
 *     Sichtbar ist er zusätzlich nur für Superadmins — das entscheidet
 *     serverseitig `showLanguageSwitcher` in `+layout.server.ts`, nicht diese
 *     Konstante. Wer den Umschalter allgemein freigeben will, ändert dort das
 *     Prädikat; diese Konstante hier bleibt davon unberührt.
 *  2. `/en`-Antworten tragen den `X-Robots-Tag: noindex, follow`-Header aus
 *     `noindexEnglishPages.ts` nicht mehr — die Bedingung dort greift nur
 *     bei `false`.
 *  3. `hreflang`/`og:locale` (`HreflangHead.svelte`, Aufgabe 2.5) zeigen
 *     jetzt auf eine tatsächlich indexierbare `/en`-Fassung — der
 *     Zwischenzustand „hreflang auf eine noindex-Seite" aus der vorherigen
 *     Fassung dieser Datei ist damit aufgelöst.
 *
 * **Eine bekannte Ausnahme bleibt:** Der Abschnitt „Datenschutz &
 * Sicherheit" in `about/+page.svelte` zeigt unter `/en` weiterhin deutschen
 * Text — bewusst, nicht vergessen (Begründung im Code-Kommentar dort). Diese
 * Formulierungen wurden mehrfach gegen die offizielle Datenschutzerklärung
 * des Deutschen Meeresmuseums korrigiert
 * (`docs/DATENSCHUTZ_ABGLEICH_DMM_2026-08-02.md`), und eine unabhängig
 * übersetzte englische Fassung ohne denselben Abgleich auszuliefern hätte
 * dasselbe Fehlermuster auf Englisch wiederholt. Das ist eine bewusst
 * akzeptierte Lücke, keine vollständige Übersetzung — sobald das Museum eine
 * geprüfte englische Fassung liefert, gehört sie dort eingepflegt.
 *
 * **Wenn diese Konstante je wieder auf `false` müsste** (z. B. ein
 * schwerwiegender, noch unentdeckter Übersetzungsfehler taucht großflächig
 * auf): alle drei Punkte oben händisch zurückdrehen — es gibt keinen
 * automatischen Rückweg — und zusätzlich `e2e/noindex-english-pages.spec.ts`,
 * `e2e/navbar-structure.spec.ts` sowie die Navbar-Item-Zählung in
 * `e2e/submit-offline.spec.ts` wieder auf die alte Erwartung ziehen (siehe
 * deren Git-Historie für den vorherigen Wortlaut).
 */
export const TRANSLATION_ROLLOUT_COMPLETE = true;
