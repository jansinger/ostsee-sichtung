# Zeitzonen-Konsistenz-Review vor Inbetriebnahme (2026-07-28)

Vier unabhängige Audits (SQL-/DB-Schicht, Schreibpfad, Lesepfad/Anzeige, Dokumentation)
über den Stand nach der UTC-Migration und den Commits #572–#577. Alle Aussagen zur
laufenden Datenbank wurden gegen die lokale Entwicklungs-DB verifiziert
(PostgreSQL 18.4, 19.872 Sichtungen — die einzige DB mit Datenbestand).

**Gesamturteil: Die Regeln sind richtig definiert und im Kern sauber umgesetzt,
aber noch nicht überall angewandt.** Vor der Inbetriebnahme sind 3 kritische und
5 hohe Befunde zu beheben; die zentrale Infrastruktur (sqlTimeZone.ts,
date-utils.ts, correctCestOffsetUTC, formatLocalDateTime) ist verifiziert korrekt.

---

## Die geltenden Regeln (Ist-Semantik)

1. **Speicherung:** Alle naiven `timestamp without time zone`-Spalten
   (`sichtungsdatum`, `created`, `freigegeben_am`, …) halten **echte
   UTC-Zeitpunkte** (seit der Einmal-Migration `migrate-timestamps-to-utc.js`
   am 2026-07-28). `auditLogs.timestamp` ist `timestamptz` — dort stellt sich
   die Frage nicht.
2. **Eingabe-Interpretation:** Nutzereingaben (Datum + Uhrzeit) sind **deutsche
   Wanduhrzeit** und werden **serverseitig** via `combineToDate` +
   `correctCestOffsetUTC` nach UTC umgerechnet.
3. **Anzeige/Export/Legacy-API:** Immer **Europe/Berlin**, immer über `Intl`
   mit explizitem `timeZone` (`formatLocalDateTime`, `legacy-api/date-utils.ts`) —
   nie über die Prozess-Zeitzone.
4. **SQL-Kalenderfragen** (Tag/Monat/Jahr): ausschließlich über
   `berlinCalendarDate`/`berlinDatePart` aus `src/lib/server/db/sqlTimeZone.ts`
   (`AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'`), zeichengleich mit den
   Ausdrucksindizes in `schema.ts`; Index-DDL zusätzlich manuell über
   `scripts/migrations/` (weil `db:push` Ausdrucksindex-Änderungen nicht erkennt).
5. **Prozess-Zeitzone:** `TZ=UTC` gepinnt (Dockerfile:118,
   docker-compose.production.yml:34); Code soll unabhängig von `TZ` korrekt sein.

Referenzdokumentation: `docs/ENVIRONMENT.md` (Abschnitt `TZ`) — inhaltlich
vorbildlich, aber schwer auffindbar (siehe Doku-Befunde).

---

## KRITISCH — Blocker vor Inbetriebnahme

### K1 — Web-Formular speichert die Sichtungszeit in der Browser-Zeitzone

`src/lib/report/components/ModernReportForm.svelte:83-91` baut `sightingDatetime`
**im Browser** per `combineToDate`; `src/lib/server/db/mapFormToSighting.ts:74-75`
übernimmt diesen Wert **ungeprüft und bevorzugt** (die Feld-Allowlist
`requestValidation.ts:22` dokumentiert das sogar: „browser timezone!").

- Melder mit Browser-TZ ≠ Berlin (z. B. nachträgliche Meldung aus dem Urlaub,
  UTC+8): Eingabe „15.07. 14:30" → gespeichert `06:30Z` statt `12:30Z` →
  Anzeige/Export/Forschungsdaten 6 h daneben. `SubmissionSuccess.svelte:138`
  zeigt dem Melder sofort die verschobene Zeit.
- Zusätzlich: `combineToDate` (`dateTime.ts:195-209`) mischt UTC-Parse
  (`new Date("YYYY-MM-DD")` = UTC-Mitternacht) mit lokalem `setHours` — in
  West-Zeitzonen (America/*) kippt dadurch auch der **Kalendertag auf den Vortag**.
- Der parallel existierende Server-Pfad (Fallback aus `sightingDate`/`sightingTime`,
  genutzt von Legacy-API und Admin-Edit) ist **korrekt** — dieselbe Eingabe
  erzeugt je nach Pfad einen anderen Instant.
- Folgefehler: Der EXIF-Prefill (serverseitig korrekt via `correctCestOffsetUTC`)
  wird beim Absenden über diesen Client-Pfad wieder verfälscht
  (`DropzoneEnhanced.svelte:173-176,238-246`).

**Fix-Richtung:** `sightingDatetime` aus Client-Submit und Allowlist entfernen
bzw. serverseitig ignorieren — der getestete Berlin-Pfad existiert bereits.
`mapFormToSighting.test.ts` hat derzeit **keinen** `sightingDatetime`-Testfall.

### K2 — Live-Export-Routen geben rohes UTC aus; die korrekten Exporter sind toter Code

- `src/routes/api/sightings/export/csv/+server.ts:71-72`: `sighting.sightingDate`
  landet als unformatiertes `Date`-Objekt in der CSV-Zelle →
  `"Mon Jun 15 2024 18:30:00 GMT+0000 …"` (UTC-Wanduhrzeit statt 20:30 Berlin).
- `src/routes/api/sightings/export/kml/+server.ts:50,73`: identisch im
  KML-Template.
- Die getesteten, korrekten Berlin-Exporter `generateCsvData`/`generateKmlData`/
  `generateXmlData` (`src/lib/server/export/*.ts`, inkl. eigener
  Timezone-Tests) werden **von keiner Route aufgerufen** — die Admin-UI
  (`ExportModal.svelte:113,155`) ruft die Inline-Implementierungen auf.

**Fix-Richtung:** Routen auf die vorhandenen `generate*Data`-Funktionen
umstellen — nicht beide Implementierungen parallel lassen.

### K3 — Export-Datumsfilter verliert den letzten Tag und filtert in UTC

`src/routes/api/sightings/export/exportFilterParams.ts:52`:
`between(sightingDate, new Date(fromDate), new Date(toDate))` — die Obergrenze
ist `toDate` **00:00 UTC**, alles am letzten Tag nach 01:00/02:00 Berlin fehlt.
Beide Grenzen sind UTC- statt Berlin-Mitternacht (Sichtung 01.01. 00:30 Berlin
= 31.12. 23:30Z fällt aus `fromDate=01.01.` heraus). Betrifft CSV, JSON, XML,
KML und den Vorschau-Count → **stiller Datenverlust in wissenschaftlichen
Exporten**.

**Fix-Richtung:** Helper analog `getYearRange` (Berlin-Mitternacht, halboffenes
Intervall `[from, to+1 Tag)`), gemeinsam mit H1 nutzen.

---

## HOCH

### H1 — Öffentliche Karte: 31.12. fehlt komplett, Jahresgrenzen in UTC

`src/routes/api/map/sightings/+server.ts:27-29`: `yearEnd = new Date("YYYY-12-31")`
= 31.12. **00:00** UTC als inklusive Obergrenze. **Verifiziert am Ist-Bestand:
alle 10 freigegebenen 31.12.-Sichtungen verschwinden bei gesetztem Jahresfilter.**
Zudem UTC- statt Berlin-Jahresgrenzen (Silvester-Off-by-one). Die Legacy-API
(`getYearRange`, halboffenes Intervall) macht es korrekt vor — zwei öffentliche
Flächen, zwei Jahresauslegungen.

### H2 — `GET /api/sightings`: `dt`/`ti` in UTC unter Legacy-Feldnamen

`src/routes/api/sightings/+server.ts:51-52`: `to_char(sichtungsdatum, …)` ohne
`AT TIME ZONE` → UTC-Wanduhrzeit. Die Feldnamen (`dt`, `ti`, …) sind exakt die
von `showreports.json` — dort korrekt Berlin. **Dieselben Felder liefern je nach
Endpunkt 1–2 h abweichende Werte**; um Mitternacht auch den falschen Kalendertag
(29.06. statt 30.06.). Zusätzlich Zeilen 38-42: Jahresgrenzen über lokale
`Date`-Konstruktoren (prozess-TZ-abhängig) statt `getYearRange`.

### H3 — Admin-Wetter-Refresh holt Wetter für die falsche Stunde (persistiert)

`src/routes/api/admin/weather/[id]/refresh/+server.ts:44-46`: Datum + Uhrzeit
per `toISOString()` (UTC) geschnitten, aber `fetchWeatherData`
(`weatherRefreshService.ts:200-212`) matcht gegen das Open-Meteo-Stundenraster
in **Europe/Berlin**. Sommer: Wetter 2 h daneben; Sichtungen 00:00–02:00 Berlin:
**falscher Kalendertag**. Der Refresh überschreibt korrekt erfasste Wetterdaten
mit falschen. Betroffene Grundmenge im Bestand: 375 Datensätze mit abweichendem
UTC-/Berlin-Kalendertag. (Der öffentliche Pfad `/api/weather/historical` +
`hourIndexFromLocalTime` ist korrekt.)

### H4 — Zeitzonen-Indizes sind in der laufenden DB nicht ausgerollt

`scripts/migrations/2026-07-28-timezone-aware-indexes.sql` ist auf der
Entwicklungs-DB (der einzigen mit Daten) **nicht angewandt** — `pg_indexes`
zeigt noch die naiven Ausdrücke (`date_part('year', sichtungsdatum)`,
`date(sichtungsdatum)`). Die Abfragen sind dadurch nicht falsch, laufen aber
ohne Index (EXPLAIN verifiziert: Prädikat nur als Filter; nach Anwendung des
Skripts in einer Test-Transaktion: `Index Cond` greift). **Vor/beim Go-Live das
Skript auf jeder Zielumgebung ausführen**; es gibt keinen automatisierten
Abgleich Schema ↔ Ist-DB.

### H5 — OpenAPI behauptet UTC, wo Berlin geliefert wird

`static/openapi.yml:2757`: `ti`-Feld als „HH:MI (24h, **UTC**)" beschrieben —
tatsächlich liefert `showreports.json` Berlin. Ein Mobile-Client, der der Spec
folgt, zeigt 1–2 h falsch an. `docs/LEGACY_API_SPECIFICATION.md` (verbindliche
Referenz) erwähnt Zeitzonen **gar nicht** — weder für das Eingabefeld
`sichtungsdatum` noch für `dt`/`ti`.

---

## MITTEL

| #   | Stelle                                                                                 | Problem                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | `admin/statistics/+page.server.ts:175-176`                                             | `MIN/MAX(created)::date` naiv (UTC-Tag) — dieselbe Datei rechnet 60 Zeilen darüber korrekt mit `berlinCalendarDate`                                           |
| M2  | `emailService.ts:176`                                                                  | Benachrichtigungsmail: `sightingDate` als UTC-ISO-Datum → um Mitternacht Vortag; wird aktuell vom Berlin-Formatter überschrieben, bleibt aber eine Falle      |
| M3  | `sightingSchema.ts:299-310`                                                            | „Zukunft"-Validierung + „heute"-Default in UTC: Nutzer östlich von UTC (bzw. Berlin 00:00–02:00) bekommen für heutige Sichtungen „Datum liegt in der Zukunft" |
| M4  | `weatherService.ts:185` + `WeatherDisplay.svelte:111`, `WeatherDataDisplay.svelte:135` | `observation_time` ist zonenloser Berlin-String, wird per `formatLocalDateTime` **erneut** konvertiert → bei SSR (UTC) oder Nicht-DE-Browser +2 h             |
| M5  | `optimizedMapController.ts:457,545,991,998,1009`                                       | Karten-Popups/Zeitslider: `toLocaleDateString('de-DE')` ohne `timeZone` → Browser-Zone, bis zu ±1 Tag                                                         |
| M6  | `dateTime.ts:257-270`                                                                  | `formatISOLikeDatetime` ohne `timeZone`-Option — aktuell nur „zufällig richtig" (Identitäts-Roundtrip unter Prozess-TZ), fragil bei jedem neuen Aufrufer      |
| M7  | `admin/+page.server.ts:36-38`                                                          | Datumsfilter semantisch korrekt (`berlinCalendarDate`), aber ohne Ausdrucksindex → Seq Scan pro Listenaufruf (2×: Daten + Count)                              |

## NIEDRIG (Auswahl)

- „Heute"-Checks in UTC (Fenster 00:00–02:00 Berlin): `api/weather/historical/+server.ts:32-36` (heute → Archiv statt Forecast → 404), `weatherRefreshService.ts:59`, `Environment.svelte:33`
- Admin-Re-Save trunkiert Sekunden (`splitDateTime` HH:MM + `combineToDate` nullt Sekunden)
- DST-Doppelstunde (letzter Oktobersonntag 02:00–03:00): Re-Save verschiebt −1 h — inhärente Wanduhr-Mehrdeutigkeit, 1-h-Fenster/Jahr
- `admin/statistics/+page.svelte:557-558`: Heatmap-Raster aus UTC-Tagen gegen Berlin-Daten-Keys; `:458-459` `getFullYear()` in Browser-Zone
- `ExportModal.svelte:72,77`, `DropzoneEnhanced.svelte:469,543,610`, `fileAnalysis.ts:41-44`: Anzeige/Client-EXIF in Browser-Zone statt Berlin
- `correctCestOffsetUTC.ts:29`: Eintrittsbedingung `getTimezoneOffset() !== 0` — unter `TZ=Europe/London` im Sommer 1 h falsch (unter UTC/Berlin irrelevant; `TZ` ist aber per Compose überschreibbar)
- `showreports.json/+server.ts:95`: Jahres-Obergrenze aus Server-Jahr (nur Silvester relevant)

---

## Dokumentations-Befunde

**Gut:** `docs/ENVIRONMENT.md` (TZ-Abschnitt, vorbildlich), Docblocks in
`sqlTimeZone.ts` / `date-utils.ts` / `correctCestOffsetUTC.ts` /
`migrate-timestamps-to-utc.js`, das DDL-Skript — alles korrekt, aktuell,
widerspruchsfrei zur Implementierung.

**Lücken/Fehler:**

1. `static/openapi.yml:2757` — „UTC" ist falsch (→ H5); `PublicSighting.dt/.ti`
   ohne Zonenangabe, obwohl `/api/sightings` und `showreports.json` identische
   Feldnamen derzeit unterschiedlich füllen (→ H2)
2. `docs/LEGACY_API_SPECIFICATION.md` — Zeitzonen-Semantik fehlt vollständig
3. `docs/DATABASE_MIGRATION.md` — beschreibt den Altsystem-Import (Ortszeit!),
   erwähnt `migrate-timestamps-to-utc.js` aber nicht; wer dem Leitfaden folgt,
   importiert Ortszeit in eine UTC-Spalte
4. `src/tools/README.md` — Migrationstool fehlt im Katalog
5. `.claude/rules/database.md` — verweist nicht auf `sqlTimeZone.ts`/
   `docs/ENVIRONMENT.md` (Zeichengleichheits-Regel ohne Begründung)
6. Auffindbarkeit: Die zentrale Zeitzonen-Referenz „versteckt" sich unter der
   Env-Var `TZ`; weder CLAUDE.md noch die DB-/API-Regeln verlinken dorthin

---

## Testlage

- 152 zeitzonenbezogene Tests in 58 Suites: **alle grün** (sqlTimeZone,
  dateTime, Legacy-Date-Utils inkl. DST-Grenzen 2023–2026 millisekundengenau,
  CSV-Timezone, mapFormToSighting, Wetter-Dedup, hourIndex)
- Lücken: kein Test für den `sightingDatetime`-Zweig (K1); `vitest.config.ts:84`
  pinnt `TZ=UTC` und versteckt damit TZ-abhängige Fehler (nur
  `correctCestOffsetUTC.test.ts` bricht das gezielt auf); `sqlTimeZone.test.ts`
  prüft SQL-Text, nicht Postgres-Semantik oder den Ist-Zustand der DB (→ H4
  blieb dadurch unbemerkt); kein Abgleich `scripts/migrations/*.sql` ↔
  `sqlTimeZone.ts`; keine DST-Tests für die Leseseite gegen echtes Postgres

## Verifiziert korrekt (Positivliste, Kurzfassung)

`sqlTimeZone.ts` (Doppel-`AT TIME ZONE` in PG 18.4 semantisch verifiziert,
IMMUTABLE belegt), beide Ausdrucksindizes in `schema.ts` + Zeichengleichheits-Test,
DDL-Skript (parse-tree-gleich, `Index Cond` greift nach Anwendung),
`weatherDeduplication`, `admin/statistics`-Aggregation (bis auf M1),
`showreports.json` (Filter + Format in derselben Jahresauslegung),
`legacy-api/date-utils.ts` komplett, Legacy-POST-Roundtrip
(`field-mapping.ts:143` Mittags-UTC-Anker), Admin-Edit-Roundtrip
(browser-TZ-unabhängig, bis auf Sekunden/DST-Doppelstunde), Verify-Endpunkt,
alle Server-Timestamps (`created`, `uploadedAt`, …), `hourIndex.ts`,
`/api/weather/historical`-Stundenmatching, `formatLocalDateTime`-Familie,
E-Mail-Anzeigeformatter, `rateLimit.ts`, Epoch-Ausschluss, `TZ=UTC`-Pinning
in Dockerfile/Compose.

## Empfohlene Reihenfolge vor Inbetriebnahme

1. **K1** — `sightingDatetime` serverseitig ignorieren (+ Regressionstest)
2. **K2** — Export-Routen auf `generate*Data` umstellen
3. **K3 + H1** — gemeinsamer Berlin-Datumsgrenzen-Helper (halboffenes Intervall)
4. **H3** — Refresh-Route auf Berlin-Wanduhrzeit (`splitDateTime`-Äquivalent)
5. **H2** — `to_char(… AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin', …)` + `getYearRange`
6. **H4** — DDL-Skript auf allen Zielumgebungen ausführen, ins Deployment-Runbook
7. **H5 + Doku** — openapi.yml korrigieren, Zeitzonen-Absatz in
   LEGACY_API_SPECIFICATION.md und DATABASE_MIGRATION.md ergänzen
8. M-Befunde nach Gelegenheit; M4 (Wetteranzeige) und M3 (Validierung) zuerst
