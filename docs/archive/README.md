# Archiv

Abgeschlossene Analysen, Reviews und Pläne zu einem bestimmten Zeitpunkt (Dateiname
trägt das Datum). Kein lebendiger Stand — für aktuelle Regeln und den Ist-Zustand
gelten `.claude/rules/` und die Referenzdokumente in `docs/`. Nichts hier wird bei
Code-Änderungen automatisch geladen oder aktuell gehalten.

| Datei                                              | Inhalt                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `LAUNCH_REVIEW_2026-07-24.md`                      | Pre-Launch-Review (Security/UX/Produktion/Deps) — Status je Befund nachgetragen 2026-08-20  |
| `UX_DESIGN_REVIEW_SICHTUNGSFORMULAR_2026-07-24.md` | UX- & Design-System-Review Sichtungsformular, mit Status je Befund                          |
| `CODE_REVIEW_SICHTUNGSFORMULAR.md`                 | Code-Review Sichtungsformular (2026-04)                                                     |
| `FACHREVIEW_BESTIMMUNGSHILFE_2026-07-27.md`        | Fachreview der Bestimmungshilfe für Meerestiere                                             |
| `FAKTENCHECK_FORMULARTEXTE_2026-07-27.md`          | Faktencheck der Zahlen-/Institutionsangaben im Formular                                     |
| `TIMEZONE_REVIEW_2026-07-28.md`                    | Zeitzonen-Konsistenz-Review nach der UTC-Migration (Befunde behoben)                        |
| `UX_REVIEW_SICHTUNGSKARTE_2026-07-28.md`           | UX- und Funktionsreview der Sichtungskarte (`/map`)                                         |
| `SICHTUNGSKARTE_QUICKWINS_SPEC_2026-07-28.md`      | Spec für die Quick Wins aus obigem Review                                                   |
| `UX_POSITIONSANGABE_SCHRITT1_2026-07-28.md`        | Design Positionsangabe Schritt 1 — umgesetzt in #590                                        |
| `MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md`         | Analyse Einwilligung zur Mediennutzung (Upload)                                             |
| `AUFRAEUM_ENDPUNKT_ENTWURF_2026-07-28.md`          | Entwurf tokengesicherter Aufräum-Endpunkt für verwaiste Uploads                             |
| `AUFRAEUM_ENDPUNKT_PLAN_2026-07-28.md`             | Implementierungsplan dazu — umgesetzt (`/api/admin/cleanup-orphans`)                        |
| `LEGACY_INBOX_ENTWURF_2026-07-30.md`               | Entwurf eigenständiger Node-Posteingang auf dem Plesk-Server (Legacy-API ohne DB)           |
| `LEGACY_INBOX_PLAN_2026-07-30.md`                  | Implementierungsplan dazu — 11 Aufgaben, testgetrieben                                      |
| `Sichtungsdb-Web-Schnittstelle.pdf`                | Ursprüngliches PDF-Schnittstellendokument, Grundlage von `docs/LEGACY_API_SPECIFICATION.md` |
| `OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`              | Spec Ostsee-Geometrie (Polygon/Bounding-Box)                                                |
| `OSTSEE_GEOMETRIE_PLAN_2026-07-30.md`              | Implementierungsplan dazu — umgesetzt in #647                                               |
| `PLAN_SESSION_SECRET_GUARD_2026-07-31.md`          | Startup-Guard für Produktions-Secrets — umgesetzt (`src/lib/server/config/secretGuard.ts`)  |
| `SESSION_STORE_SPEC_2026-07-31.md`                 | Session-Store statt signiertem Cookie — umgesetzt (#668 u. a.)                              |
| `VIDEO_UPLOAD_KONZEPT_2026-07-31.md`               | Konzept Video-Upload für Melder — umgesetzt; GPS aus Video blieb bewusst offen              |
| `DATENSCHUTZ_ABGLEICH_DMM_2026-08-02.md`           | Abgleich DMM-Datenschutzerklärung ↔ App-Verhalten (Fundliste fürs Museum)                   |
| `PLAN_EINSTIEGSSEITE_MELDEFORMULAR_2026-08-05.md`  | Konzept/Spec Einstiegsseite Meldeformular — umgesetzt, Abschlussreview 2026-08-06           |
| `PLAN_EINSTIEGSSEITE_UMSETZUNG_2026-08-05.md`      | Implementierungsplan dazu — 15 Tasks + 8b                                                   |
| `ADMIN_IMPROVEMENTS_SPEC_2026-08-08.md`            | Spec Admin-Verbesserungen aus dem Review 2026-08-08 — abgearbeitet                          |
| `PLAN_MEHRSPRACHIGKEIT_ETAPPE0_2026-08-10.md`      | i18n Etappe 0 (Paraglide, Routing) — umgesetzt; laufende Etappen in `docs/i18n/`            |
