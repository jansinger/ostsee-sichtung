#!/usr/bin/env bash
# Baut die bereinigte Ostsee-Wasserflaeche.
# Laeuft NICHT im Build und nicht zur Laufzeit — nur manuell.
# Voraussetzungen: ogr2ogr, shp2pgsql, psql, PostGIS 3.x
# Spec: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$HERE/out"
LAND_SHP="${BALTIC_LAND_SHP:-$HOME/geodata/land-polygons-complete-4326/land_polygons.shp}"

set -a; . "$ROOT/.env"; set +a
DB="$DATABASE_POSTGRES_URL"

if [[ ! -f "$LAND_SHP" ]]; then
  cat >&2 <<MSG
Die OSM-Kuestenlinie fehlt: $LAND_SHP

Bezugsquelle: https://osmdata.openstreetmap.de/data/land-polygons.html
Zwingend die Variante "land-polygons-complete-4326" (rund 800 MB).

  NICHT die -split-Variante: sie hat Kachelkanten mitten auf dem Festland.
  NICHT Natural Earth 10m: zu grob, stuft den Flensburger Hafen als
  binnenlands ein.

Entpacken und den Pfad ueber BALTIC_LAND_SHP setzen.
MSG
  exit 1
fi

mkdir -p "$OUT"
psql "$DB" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS geo_build;"

echo "== IHO-Seegebiete laden"
ogr2ogr -f PostgreSQL "PG:$DB" "$HERE/iho.json" \
  -nln geo_build.iho_raw -lco GEOMETRY_NAME=geom -overwrite -t_srs EPSG:4326

echo "== Artefakt-Maske laden"
ogr2ogr -f PostgreSQL "PG:$DB" "$HERE/baltic-artifact-mask.geojson" \
  -nln geo_build.artifact_mask -lco GEOMETRY_NAME=geom -overwrite -t_srs EPSG:4326

if psql "$DB" -tAc "SELECT to_regclass('geo_build.osm_land') IS NOT NULL;" | grep -q '^t$'; then
  echo "== OSM-Kuestenlinie bereits geladen, uebersprungen"
else
  echo "== OSM-Kuestenlinie laden (dauert einige Minuten)"
  shp2pgsql -s 4326 -I -D -g geom "$LAND_SHP" geo_build.osm_land | psql "$DB" -q
fi

echo "== Pipeline"
psql "$DB" -v ON_ERROR_STOP=1 -f "$HERE/build-baltic-geometry.sql"

echo "== Wasserflaeche exportieren"
rm -f "$OUT/baltic-water.geojson"
ogr2ogr -f GeoJSON "$OUT/baltic-water.geojson" "PG:$DB" \
  -sql "SELECT id, geom FROM geo_build.ostsee_parts ORDER BY id" -lco RFC7946=YES

echo "== Extent exportieren"
psql "$DB" -tA -o "$ROOT/src/lib/server/geo/baltic-extent.json" -c "
SELECT json_build_object(
  'minLongitude', ST_XMin(e), 'maxLongitude', ST_XMax(e),
  'minLatitude',  ST_YMin(e), 'maxLatitude',  ST_YMax(e),
  'bufferRegionMeters', 20000, 'bufferShoreMeters', 200, 'simplifyMeters', 20,
  'source', 'MarineRegions IHO Sea Areas + OSM land-polygons-complete-4326'
)::text FROM (SELECT ST_Extent(geom) AS e FROM geo_build.ostsee) x;"

echo
echo "Fertig."
ls -la "$OUT/baltic-water.geojson" "$ROOT/src/lib/server/geo/baltic-extent.json"
echo
echo "Naechster Schritt: npm run geo:review — die Karte MUSS freigegeben werden,"
echo "bevor irgendetwas an der Datenbank geschrieben wird."
