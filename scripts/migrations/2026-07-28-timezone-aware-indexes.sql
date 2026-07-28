-- Zeitzonenbewusste Ausdrucksindizes für `sichtungen`
--
-- WARUM MANUELL: `drizzle-kit push` erkennt Änderungen an Ausdrucksindizes nicht.
-- Verifiziert am 2026-07-28 — der Push-Plan gegen die Entwicklungs-DB enthielt
-- keine der beiden Anweisungen unten, obwohl `schema.ts` bereits geändert war.
-- Ohne dieses Skript bleiben die alten, naiven Indizes bestehen und die Abfragen
-- fallen still auf Seq Scans zurück.
--
-- HINTERGRUND: Postgres nutzt einen Ausdrucksindex nur bei exakter
-- Übereinstimmung von Index- und Abfrageausdruck. Seit der UTC-Vereinheitlichung
-- (#572) fragen die Abfragen den Kalendertag bzw. das Jahr in deutscher Ortszeit
-- ab; die Indizes trugen weiterhin die naive Auslegung.
--
-- LAUFZEIT: Bei ~20.000 Zeilen (Stand 2026-07-28) im Millisekundenbereich.
-- DROP/CREATE nimmt kurzzeitig einen ACCESS EXCLUSIVE Lock auf `sichtungen`.
-- Bei deutlich größerem Datenbestand stattdessen CREATE INDEX CONCURRENTLY
-- unter neuem Namen, dann den alten Index droppen (nicht in einer Transaktion).
--
-- ANWENDEN:
--   psql "$DATABASE_POSTGRES_URL" -v ON_ERROR_STOP=1 \
--     -f scripts/migrations/2026-07-28-timezone-aware-indexes.sql
--
-- Die Ausdrücke müssen zeichengleich mit `berlinCalendarDate()` /
-- `berlinDatePart()` aus src/lib/server/db/sqlTimeZone.ts bleiben.
-- Abgesichert durch src/lib/server/db/sqlTimeZone.test.ts.

BEGIN;

-- Dedup-Index: Position + Kalendertag in deutscher Ortszeit.
-- Passend zu checkExistingWeatherData() in weatherDeduplication.ts.
DROP INDEX IF EXISTS idx_position_date_weather;

CREATE INDEX idx_position_date_weather ON sichtungen (
	ROUND(gps_breite::numeric, 2),
	ROUND(gps_laenge::numeric, 2),
	DATE(sichtungsdatum AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')
)
WHERE weather_data IS NOT NULL;

-- Jahres-Index in deutscher Ortszeit.
-- Passend zur Jahres-Gruppierung in admin/statistics/+page.server.ts.
-- Hinweis: EXTRACT und date_part sind seit PG14 verschiedene Funktionen —
-- der alte Index hätte selbst bei gleicher Zeitzonen-Auslegung nicht gegriffen.
DROP INDEX IF EXISTS idx_year_sichtungen;

CREATE INDEX idx_year_sichtungen ON sichtungen USING btree (
	EXTRACT(year FROM sichtungsdatum AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')
);

COMMIT;

ANALYZE sichtungen;
