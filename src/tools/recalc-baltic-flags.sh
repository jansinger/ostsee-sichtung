#!/usr/bin/env bash
# Trockenlauf und Migration fuer ostsee / ostsee_geo.
#   ohne Argument  -> nur Report, schreibt nichts
#   --migrate      -> sichert Altwerte und schreibt neue Werte
#
# Voraussetzung: npm run geo:build lief, geo_build.ostsee existiert.
# Der Report laeuft bei --migrate zuerst, damit View und Schreibvorgang
# denselben Stand sehen.
#
# Spec: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
OUT="$HERE/out"

[[ -f "$ROOT/.env" ]] || { echo "Es fehlt $ROOT/.env — ohne DATABASE_POSTGRES_URL geht nichts." >&2; exit 1; }
set -a; . "$ROOT/.env"; set +a
DB="${DATABASE_POSTGRES_URL:-}"
[[ -n "$DB" ]] || { echo "DATABASE_POSTGRES_URL ist in $ROOT/.env nicht gesetzt." >&2; exit 1; }

if ! psql "$DB" -tAc "SELECT to_regclass('geo_build.ostsee') IS NOT NULL;" | grep -q '^t$'; then
  echo "geo_build.ostsee fehlt. Zuerst 'npm run geo:build' laufen lassen." >&2
  exit 1
fi

# Die Box kommt aus derselben Quelle wie BALTIC_SEA_BBOX, damit Report und
# Laufzeitcode nicht auseinanderlaufen koennen.
read -r BOX_W BOX_O BOX_S BOX_N < <(node -e "
const e=require('$ROOT/src/lib/server/geo/baltic-extent.json');
const f=(v,up)=>((up?Math.ceil(v/0.05):Math.floor(v/0.05))*0.05).toFixed(2);
console.log(f(e.minLongitude,false),f(e.maxLongitude,true),f(e.minLatitude,false),f(e.maxLatitude,true));
")
echo "Bounding Box aus baltic-extent.json: $BOX_W .. $BOX_O E / $BOX_S .. $BOX_N N"

mkdir -p "$OUT"
psql "$DB" -v ON_ERROR_STOP=1 -P pager=off \
  -v box_w="$BOX_W" -v box_o="$BOX_O" -v box_s="$BOX_S" -v box_n="$BOX_N" \
  -f "$HERE/recalc-baltic-flags.sql" | tee "$OUT/baltic-flags-report.txt"

if [[ "${1:-}" != "--migrate" ]]; then
  echo
  echo "Trockenlauf. Report: $OUT/baltic-flags-report.txt"
  echo "Es wurde NICHTS geschrieben. Nach Freigabe: npm run geo:migrate"
  exit 0
fi

echo
echo "== Migration: schreibe nach sichtungen"
psql "$DB" -v ON_ERROR_STOP=1 -P pager=off -f "$HERE/recalc-baltic-flags-write.sql"
