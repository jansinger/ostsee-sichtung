-- Bereinigte Ostsee-Wasserflaeche aus IHO-Seegebieten und OSM-Kuestenlinie.
-- Aufgerufen von build-baltic-geometry.sh. Erwartet die Tabellen
-- geo_build.iho_raw, geo_build.artifact_mask und geo_build.osm_land.
-- Begruendung aller Schritte: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md

\set ON_ERROR_STOP on
SET search_path TO geo_build, public;

-- Stellhebel. Aenderungen hier in .claude/rules/geo.md nachziehen.
\set buffer_region_m 20000
\set buffer_shore_m 200
\set simplify_m 20

\echo '== 1+2: Region aus IHO-Flaechen, Artefakte abziehen'
DROP TABLE IF EXISTS mask_all;
CREATE TABLE mask_all AS
SELECT ST_Union(ST_MakeValid(geom)) AS geom FROM artifact_mask;

DROP TABLE IF EXISTS region;
CREATE TABLE region AS
SELECT ST_Difference(
         (SELECT ST_Union(ST_MakeValid(geom)) FROM iho_raw),
         (SELECT geom FROM mask_all)
       ) AS geom;
CREATE INDEX ON region USING GIST (geom);

\echo '== 3+4: 20 km Puffer in EPSG:3035, Artefakte erneut abziehen'
DROP TABLE IF EXISTS expanded;
CREATE TABLE expanded AS
SELECT ST_Difference(
         ST_Transform(
           ST_Buffer(ST_Transform(geom, 3035), :buffer_region_m),
           4326
         ),
         (SELECT geom FROM mask_all)
       ) AS geom
FROM region;

-- Grosse Flaechen zerlegen, sonst wird die Differenz gegen das Land unbezahlbar.
DROP TABLE IF EXISTS expanded_sub;
CREATE TABLE expanded_sub AS
SELECT ST_Subdivide(geom, 512) AS geom FROM expanded;
CREATE INDEX ON expanded_sub USING GIST (geom);

\echo '== 5: Land abziehen'
DROP TABLE IF EXISTS land_sub;
CREATE TABLE land_sub AS
SELECT ST_Subdivide(ST_MakeValid(geom), 512) AS geom
FROM osm_land
WHERE geom && ST_MakeEnvelope(7.0, 51.5, 39.0, 68.5, 4326);
CREATE INDEX ON land_sub USING GIST (geom);

DROP TABLE IF EXISTS water_parts;
CREATE TABLE water_parts AS
SELECT ST_Difference(
         e.geom,
         COALESCE(
           (SELECT ST_Union(l.geom) FROM land_sub l WHERE ST_Intersects(l.geom, e.geom)),
           ST_GeomFromText('POLYGON EMPTY', 4326)
         )
       ) AS geom
FROM expanded_sub e;

\echo '== 6: Nur Teilflaechen behalten, die die Ausgangsregion beruehren'
-- Der Puffer greift ueber Juetland und die daenischen Inseln. Nach Abzug des
-- Landes bleiben dort Nordsee-Streifen uebrig, die durch Land von der Ostsee
-- getrennt sind und deshalb eigene Teilflaechen bilden.
DROP TABLE IF EXISTS water;
CREATE TABLE water AS
WITH merged AS (
  SELECT ST_Union(geom) AS geom FROM water_parts WHERE NOT ST_IsEmpty(geom)
), parts AS (
  SELECT (ST_Dump(geom)).geom AS geom FROM merged
)
SELECT ST_Union(p.geom) AS geom
FROM parts p
WHERE ST_Intersects(p.geom, (SELECT geom FROM region));

\echo '== 7+8: Uferstreifen und Vereinfachung, beides metrisch in EPSG:3035'
DROP TABLE IF EXISTS ostsee;
CREATE TABLE ostsee AS
SELECT ST_Transform(
         ST_SimplifyPreserveTopology(
           ST_Buffer(ST_Transform(geom, 3035), :buffer_shore_m),
           :simplify_m
         ),
         4326
       ) AS geom
FROM water;

\echo '== 9: Subdivide fuer den RBush-Index'
DROP TABLE IF EXISTS ostsee_parts;
CREATE TABLE ostsee_parts AS
SELECT row_number() OVER () AS id, geom
FROM (SELECT ST_Subdivide(geom, 256) AS geom FROM ostsee) s
WHERE NOT ST_IsEmpty(geom);

\echo '== Kennzahlen'
SELECT
  (SELECT count(*) FROM ostsee_parts)                       AS teilflaechen,
  (SELECT sum(ST_NPoints(geom)) FROM ostsee_parts)          AS stuetzpunkte,
  round((SELECT ST_Area(geom::geography) FROM ostsee) / 1e6) AS flaeche_km2;

\echo '== 10: Extent'
SELECT ST_XMin(e) AS min_longitude, ST_XMax(e) AS max_longitude,
       ST_YMin(e) AS min_latitude,  ST_YMax(e) AS max_latitude
FROM (SELECT ST_Extent(geom) AS e FROM ostsee) x;
