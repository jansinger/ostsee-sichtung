# Mehrsprachigkeit DE/EN — Arbeitsstand

Alles zur i18n-Umstellung liegt hier. Etappe 0 (Paraglide, Routing) ist umgesetzt und
archiviert (`docs/archive/PLAN_MEHRSPRACHIGKEIT_ETAPPE0_2026-08-10.md`); **Etappen 1 und 2
sind umgesetzt und gemerged** (#861, #864, #867).

**Stand 2026-08-20 (nachgemessen):** 95,3 % der 1327 Botschaften sind übersetzt (63
identisch mit dem Deutschen, überwiegend legitim — `Offline`, `MB`, `HELCOM`, `Filter`).
`/en` ist ausgeliefert und indexierbar, aber **für Besucher nicht erreichbar**: der
Sprachumschalter ist über `showLanguageSwitcher` in `src/routes/+layout.server.ts:50` auf
Superadmins beschränkt. Offen bleiben der Datenschutz-Abschnitt auf `/en/about` sowie die
fachlichen Abnahmen für Artnamen und Einwilligungstexte. Details im Nachtrag am Ende von
`ARBEITSPROTOKOLL_ETAPPE1.md`.

| Datei                                                     | Inhalt                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md`                   | Abgestimmter Entwurf: was gebaut wird und warum — steht vor den Umsetzungsplänen             |
| `ENTWURF_ETAPPE1.md`                                      | Entwurf Etappe 1 (Formular-Texte)                                                            |
| `PLAN_ETAPPE1_AUFGABE1_EXTRAKTOR.md` … `AUFGABE5_SCAN.md` | Umsetzungspläne der fünf Etappe-1-Aufgaben                                                   |
| `PLAN_ETAPPE2.md`                                         | Plan Etappe 2 (restliche öffentliche Seiten)                                                 |
| `ARBEITSPROTOKOLL_ETAPPE0.md` / `_ETAPPE1.md`             | Protokolle der Umsetzung, nicht nachgepflegt                                                 |
| `i18n-inventory.md` / `.json`                             | Generierter Inventar-Bericht (`npm run i18n:inventory`), Entscheidungsgrundlage              |
| `i18n-inventory-unklar.md`                                | Handgeprüfte Liste der 44 „unklar"-Fälle                                                     |
| `I18N_UNKLARE_FAELLE_EMPFEHLUNG.md`                       | Unabhängiger Zweitabgleich dazu                                                              |
| `I18N_ARTNAMEN_VORSCHLAG.md`                              | Englische Artnamen — **Vorschlag, fachliche Abnahme durch das Museum steht aus**             |
| `I18N_EINWILLIGUNGEN_VORSCHLAG.md`                        | Englische Einwilligungstexte — **Vorschlag, Datenschutz-Abnahme steht aus, nicht einsetzen** |
