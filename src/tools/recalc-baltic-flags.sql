-- Neuberechnung von ostsee und ostsee_geo aus der bereinigten Geometrie.
-- Aufgerufen von recalc-baltic-flags.sh. REIN LESEND — der schreibende Teil
-- steht in recalc-baltic-flags-write.sql.
--
-- Die Rechnung laeuft in PostGIS und nicht in JavaScript: ein Skript unter
-- src/tools/ kann checkBalticSeaFile nicht importieren, weil tsx den
-- $lib-Alias dort nicht aufloest. Die bereinigte Geometrie liegt nach
-- npm run geo:build ohnehin als geo_build.ostsee bereit.
--
-- Spec: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md

\set ON_ERROR_STOP on
SET search_path TO geo_build, public;

CREATE INDEX IF NOT EXISTS ostsee_geom_gix ON geo_build.ostsee USING GIST (geom);

\echo ''
\echo '== Konsistenzpruefung: PostGIS gegen die Referenzpunkte aus balticGeometry.test.ts'
\echo '   Erwartung: KEINE Zeile. Jede Zeile heisst, dass geo_build.ostsee und'
\echo '   rbush-index.json nicht denselben Stand haben.'

-- Die Punkte stehen an EINER Stelle. Anzeige und harter Abbruch lesen dieselbe
-- Tabelle — zwei Kopien derselben Liste wuerden auseinanderlaufen.
DROP TABLE IF EXISTS geo_build.referenzpunkte;
CREATE TABLE geo_build.referenzpunkte (name text, lon float8, lat float8, erwartet boolean);
INSERT INTO geo_build.referenzpunkte VALUES
  -- Fehler A: Binnenwasser, muss aussen sein
  ('Ladogasee',                31.5,      60.8,      false),
  ('Onegasee',                 35.5,      61.8,      false),
  ('Weichsel Wloclawek',       19.0,      52.7,      false),
  ('Torne-Flusslauf',          24.0,      66.5,      false),
  ('Oder Gryfino',             14.606,    53.399,    false),
  ('Nord-Ostsee-Kanal',         9.650,    54.330,    false),
  -- Limfjord: die Maske schliesst den WESTLICHEN Arm und damit die
  -- Nordsee-Passage. Der oestliche Arm zum Kattegat bleibt bewusst drin.
  ('Limfjord Loegstoer (West)',  9.35,    56.97,     false),
  ('Thyboroen (Nordsee-Seite)',  8.22,    56.70,     false),
  ('Limfjord Hals (Kattegat)',  10.30,    56.99,     true),
  -- Fehler B: innere Kuestengewaesser, muss innen sein
  ('Flensburger Foerde',         9.589748, 54.850426, true),
  ('Eckernfoerder Bucht',        9.838145, 54.475078, true),
  ('Strelasund',                13.098357, 54.314608, true),
  ('Greifswalder Bodden',       13.66281,  54.28838,  true),
  -- Einschlussmaske
  ('Schlei Schleimuende',       10.030,    54.676,    true),
  ('Schlei Missunde',            9.755,    54.545,    true),
  ('Schlei Schleswig',           9.585,    54.518,    true),
  ('Trave Travemuende',         10.875,    53.960,    true),
  ('Warnow Warnemuende',        12.098,    54.180,    true),
  ('Stettiner Haff',            14.100,    53.780,    true),
  -- Muss aussen bleiben
  ('Helgoland',                  7.89,     54.18,     false),
  ('Hamburg',                   10.0,      53.55,     false),
  ('Hannover',                   9.73,     52.37,     false),
  ('Doggerbank',                 2.02,     54.87,     false),
  -- Kerngebiet, Regressionsschutz
  ('Fehmarnbelt',               11.3,      54.6,      true),
  ('Arkonabecken',              13.5,      55.0,      true),
  ('Bornholmbecken',            15.0,      55.2,      true),
  ('Newa-Bucht',                30.05,     59.93,     true),
  -- Uferstreifen
  ('Prerow 100 m landein',      12.5427,   54.459,    true),
  ('Prerow 5 km landein',       12.5427,   54.411,    false);

CREATE OR REPLACE VIEW geo_build.referenz_abweichungen AS
SELECT r.name, r.erwartet,
       ST_Intersects(o.geom, ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326)) AS postgis
FROM geo_build.referenzpunkte r, geo_build.ostsee o
WHERE ST_Intersects(o.geom, ST_SetSRID(ST_MakePoint(r.lon, r.lat), 4326))
      IS DISTINCT FROM r.erwartet;

SELECT * FROM geo_build.referenz_abweichungen;

-- Harter Abbruch, nicht nur eine Ausgabe: bei --migrate laeuft der
-- Schreibvorgang unmittelbar danach. Eine Abweichung heisst, dass die Migration
-- Werte schreiben wuerde, die die Laufzeit anders berechnet — und kein Test kann
-- das sehen, weil die Tests den Index nur gegen sich selbst pruefen. Typischer
-- Ausloeser: geo:build lief erneut, create-rbush-index.js nicht.
DO $$
DECLARE abweichungen bigint;
BEGIN
  SELECT count(*) INTO abweichungen FROM geo_build.referenz_abweichungen;
  IF abweichungen > 0 THEN
    RAISE EXCEPTION
      'Konsistenzpruefung fehlgeschlagen: % Referenzpunkte weichen ab. Erst "cd src/tools && node create-rbush-index.js" laufen lassen. Es wurde nichts geschrieben.',
      abweichungen;
  END IF;
END $$;

\echo ''
\echo '== Aenderungen ermitteln'
DROP VIEW IF EXISTS flag_changes;
CREATE VIEW flag_changes AS
WITH neu AS (
  SELECT
    s.id,
    s.gps_laenge::float8 AS lon,
    s.gps_breite::float8 AS lat,
    s.ostsee     AS alt_ostsee,
    s.ostsee_geo AS alt_geo,
    CASE WHEN EXISTS (
      SELECT 1 FROM geo_build.ostsee o
      WHERE ST_Intersects(o.geom, ST_SetSRID(ST_MakePoint(s.gps_laenge, s.gps_breite), 4326))
    ) THEN 1 ELSE 0 END AS neu_ostsee,
    CASE WHEN s.gps_laenge BETWEEN :box_w AND :box_o
          AND s.gps_breite BETWEEN :box_s AND :box_n
         THEN 1 ELSE 0 END AS neu_geo_roh
  FROM sichtungen s
  WHERE s.gps_laenge IS NOT NULL AND s.gps_breite IS NOT NULL
)
SELECT
  id, lon, lat, alt_ostsee, neu_ostsee, alt_geo,
  -- ostsee_geo = 2 stammt aus dem Altsystem und bedeutet dasselbe wie 1.
  -- Der Altwert bleibt stehen, solange sich die Aussage nicht aendert.
  CASE WHEN (alt_geo > 0)::int = neu_geo_roh THEN alt_geo ELSE neu_geo_roh END AS neu_geo,
  CASE
    WHEN lon < :box_w OR lon > :box_o OR lat < :box_s OR lat > :box_n THEN 'ausserhalb der Box'
    WHEN lon < 10.5 THEN 'Flensburger Foerde / Kieler Bucht'
    WHEN lon < 12.5 THEN 'Luebecker und Wismarbucht'
    WHEN lon < 14.5 THEN 'Bodden, Ruegen, Darss'
    WHEN lon < 20.0 THEN 'zentrale Ostsee'
    WHEN lat > 60.0 THEN 'Bottnischer und Finnischer Meerbusen'
    ELSE 'oestliche Ostsee'
  END AS region
FROM neu
WHERE alt_ostsee IS DISTINCT FROM neu_ostsee
   OR (alt_geo > 0)::int IS DISTINCT FROM neu_geo_roh

UNION ALL

-- Zeilen ohne verwertbare Position: eine Meldung ohne Koordinaten kann nicht
-- "in der Ostsee" liegen. mapFormToSighting.ts setzt fuer neue Meldungen in
-- genau diesem Fall beide Werte auf 0; im Altbestand tragen 378 Zeilen
-- trotzdem ostsee = 1 bei ostsee_geo = 0 und verletzen damit die Invariante
-- "Polygon liegt in der Bounding Box". ostsee_geo bleibt unberuehrt — es ist
-- dort bereits durchgaengig 0.
SELECT
  s.id,
  NULL::float8 AS lon,
  NULL::float8 AS lat,
  s.ostsee     AS alt_ostsee,
  0            AS neu_ostsee,
  s.ostsee_geo AS alt_geo,
  s.ostsee_geo AS neu_geo,
  'ohne Position' AS region
FROM sichtungen s
WHERE (s.gps_laenge IS NULL OR s.gps_breite IS NULL)
  AND s.ostsee IS DISTINCT FROM 0;

\echo ''
\echo '== Zusammenfassung'
SELECT
  (SELECT count(*) FROM sichtungen WHERE gps_laenge IS NOT NULL AND gps_breite IS NOT NULL) AS zeilen_mit_koordinaten,
  (SELECT count(*) FROM flag_changes)                                                        AS aenderungen,
  (SELECT count(*) FROM flag_changes WHERE alt_ostsee IS DISTINCT FROM 1 AND neu_ostsee = 1) AS ostsee_hoch,
  (SELECT count(*) FROM flag_changes WHERE alt_ostsee = 1 AND neu_ostsee = 0)                AS ostsee_runter,
  (SELECT count(*) FROM flag_changes WHERE (alt_geo > 0)::int <> (neu_geo > 0)::int)          AS geo_aendert_aussage;

\echo ''
\echo '== Nach Region'
SELECT region, count(*),
       count(*) FILTER (WHERE alt_ostsee IS DISTINCT FROM 1 AND neu_ostsee = 1) AS hoch,
       count(*) FILTER (WHERE alt_ostsee = 1 AND neu_ostsee = 0)                AS runter
FROM flag_changes GROUP BY region ORDER BY 2 DESC;

\echo ''
\echo '== Beispiele 0 -> 1 (die Bereinigung holt sie herein)'
SELECT id, round(lon::numeric,4) lon, round(lat::numeric,4) lat, region
FROM flag_changes
WHERE alt_ostsee IS DISTINCT FROM 1 AND neu_ostsee = 1 ORDER BY id LIMIT 20;

\echo ''
\echo '== ALLE 1 -> 0 (kritisch: jede Zeile muss erklaerbar sein)'
SELECT id, round(lon::numeric,4) lon, round(lat::numeric,4) lat, alt_geo, region
FROM flag_changes
WHERE alt_ostsee = 1 AND neu_ostsee = 0 ORDER BY id;
