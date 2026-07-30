# Ostsee-Geometrie bereinigen — Implementierungsplan

> **Für agentische Bearbeiter:** ERFORDERLICHES SUB-SKILL: `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen. Die Schritte nutzen Checkbox-Syntax (`- [ ]`) zur Nachverfolgung.

**Ziel:** Die Ostsee-Geometrie an der Quelle bereinigen — vier Binnenwasser-Artefakte entfernen, die fehlenden Küstengewässer aufnehmen — und `BALTIC_SEA_BBOX` daraus ableiten statt von Hand zu pflegen.

**Architektur:** Eine manuell ausgeführte PostGIS-Pipeline erzeugt aus `src/tools/iho.json`, einer handgezeichneten Artefakt-Maske und der OSM-Küstenlinie eine bereinigte Wasserfläche. Daraus entstehen der RBush-Index für die Laufzeitprüfung und der Extent für die Bounding Box. Ein Migrationsskript rechnet die Spalten `ostsee` und `ostsee_geo` im Bestand neu.

**Tech-Stack:** PostgreSQL 17 + PostGIS 3.6, GDAL (`ogr2ogr`), `shp2pgsql`, RBush, Turf.js (`@turf/boolean-point-in-polygon`), Vitest, Leaflet (nur für die Prüfkarte).

**Spec:** `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md` — verbindliche Referenz für alle Zahlen und Entscheidungen.

## Globale Randbedingungen

- **Startvoraussetzung:** PR #639 muss gemerged sein. Erst danach von aktualisiertem `main` abzweigen. `docs/OSTSEE_FLAGS.md` kommt von dort.
- **Hartes Tor:** Vor Aufgabe 8 (Trockenlauf) muss die visuelle Kartenprüfung aus Aufgabe 4 durch den Auftraggeber freigegeben sein. Kein Schreibvorgang an der Datenbank vorher.
- **Test-First ist Pflicht** (`.claude/rules/testing.md`). Jede Aufgabe beginnt mit einem fehlschlagenden Test.
- **`npm run test:quick` muss am Ende jeder Aufgabe grün sein.**
- **Kein `npm install` im Worktree** — Node löst `node_modules` aus dem Haupt-Repo auf. Ausnahme nur, wenn `package-lock.json` geändert wird.
- **Die Dev-Datenbank ist zwischen allen Worktrees geteilt.** Lesen und Trockenläufe sind harmlos, Schreibvorgänge wirken überall.
- **Keine `any`-Typen, explizite Return-Types** (`.claude/rules/architecture.md`).
- **Commit-Format:** `<type>(<scope>): <beschreibung>`, Englisch, Subject lowercase. Erlaubter Scope hier: `map`, `db`, `docs`, `test`, `build`. **`geo` ist kein erlaubter Scope** — `commitlint` lehnt ihn ab.
- **Zielgröße des neuen Index: unter 10 MB.** Stellhebel ist die Simplify-Toleranz (Startwert 20 m).
- **Puffer:** 20 km Regionserweiterung, 200 m Uferstreifen. Beide Werte stehen an genau einer Stelle im Pipeline-Skript.

---

## Dateistruktur

**Neu**

| Datei                                       | Verantwortung                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/tools/baltic-artifact-mask.geojson`    | Die vier Ausschlussflächen (Ladoga/Onega, Torne/Kalix, Weichsel, Limfjord). Reine Daten, im Diff nachlesbar. |
| `src/tools/build-baltic-geometry.sh`        | Orchestrierung: Daten laden, SQL ausführen, Ergebnis exportieren.                                            |
| `src/tools/build-baltic-geometry.sql`       | Die zehn Pipeline-Schritte. Einzige Stelle mit Geometrie-Logik.                                              |
| `src/tools/render-baltic-review.ts`         | Erzeugt die Prüfkarte aus den Pipeline-Ausgaben.                                                             |
| `src/tools/recalc-baltic-flags.ts`          | Trockenlauf-Report und Migration, über ein Flag unterschieden.                                               |
| `src/lib/server/geo/baltic-extent.json`     | Ungerundeter Extent aus der Pipeline. Quelle der Wahrheit für den Box-Test.                                  |
| `src/lib/server/geo/balticGeometry.test.ts` | Fachliche Referenzpunkte (Fehler A, Fehler B, Uferstreifen, Außenpunkte).                                    |

**Geändert**

| Datei                                                         | Änderung                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/utils/geo/checkBalticSea.ts`                         | `BALTIC_SEA_BBOX` aus abgeleiteten Werten, Kommentar „Skagerrak" → „Kattegat". |
| `src/lib/server/geo/checkBalticSeaFile.ts`                    | Statischer JSON-Import wird dynamisch (Zeile 59).                              |
| `src/lib/server/geo/rbush-index.json`                         | Neu erzeugt, ohne Einrückung, subdividiert.                                    |
| `src/tools/create-rbush-index.js`                             | Einrückung raus, nimmt die subdividierte FeatureCollection.                    |
| `src/lib/server/geo/checkBalticSeaFile.comprehensive.test.ts` | Erwartungen an die neue Geometrie angepasst.                                   |
| `src/lib/map/extentUtils.test.ts`                             | Erwartete Extent-Werte.                                                        |
| `src/routes/api/map/sightings/coordinateFilter.test.ts`       | Zeile 104 prüft die Box-Werte hart.                                            |
| `docs/OSTSEE_FLAGS.md`                                        | „Fehler 3" durch die Messung ersetzen.                                         |
| `.claude/rules/geo.md`, `.claude/rules/maps.md`               | Box-Zahlen, Simplify-Toleranz, Datenquelle.                                    |
| `.gitignore`                                                  | `src/tools/out/` aufnehmen.                                                    |
| `package.json`                                                | Skripte `geo:build`, `geo:review`, `geo:report`, `geo:migrate`.                |

**Entfällt**

| Datei                        | Grund                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/tools/rbush-index.json` | Prüfsummengleiche Kopie von `src/lib/server/geo/rbush-index.json`. |

---

## Aufgabe 1: Referenzpunkt-Tests (RED)

Legt die fachliche Messlatte fest, bevor Geometrie angefasst wird. Alle Tests müssen zunächst fehlschlagen.

**Dateien:**

- Erstellen: `src/lib/server/geo/balticGeometry.test.ts`

**Schnittstellen:**

- Nutzt: `checkBalticSeaFile(longitude: number, latitude: number): BalticSeaFileResult` aus `$lib/server/geo/checkBalticSeaFile` — vorhanden, liefert `{ inBaltic: boolean; inChartArea: boolean; longitude: number; latitude: number }`.
- Liefert: nichts an spätere Aufgaben. Die Tests sind das Abnahmekriterium für Aufgabe 5.

- [ ] **Schritt 1: Testdatei schreiben**

```typescript
import { describe, expect, it } from 'vitest';
import { checkBalticSeaFile } from '$lib/server/geo/checkBalticSeaFile';

/**
 * Fachliche Referenzpunkte für die bereinigte Ostsee-Geometrie.
 * Herkunft und Begründung: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md
 */

/** Fehler A — Binnenwasser-Artefakte der IHO-Geometrie. Müssen draußen sein. */
const FEHLER_A: ReadonlyArray<[string, number, number]> = [
	['Ladogasee', 31.5, 60.8],
	['Onegasee', 35.5, 61.8],
	['Weichsel bei Włocławek', 19.0, 52.7],
	['Torne-Flusslauf', 24.0, 66.5],
	['Limfjord bei Aalborg', 9.38, 57.02]
];

/** Fehler B — innere Küstengewässer, die die grobe IHO-Küstenlinie weglässt. */
const FEHLER_B: ReadonlyArray<[string, number, number]> = [
	['Flensburger Förde', 9.6, 54.83],
	['Eckernförder Bucht', 9.95, 54.5],
	['Greifswalder Bodden', 13.45, 54.2],
	['Strelasund bei Stralsund', 13.1, 54.31]
];

/** Muss auch nach der Bereinigung draußen bleiben. */
const AUSSEN: ReadonlyArray<[string, number, number]> = [
	['Helgoland (Nordsee)', 7.89, 54.18],
	['Hamburg', 10.0, 53.55],
	['Hannover', 9.73, 52.37],
	['Doggerbank', 2.02, 54.87]
];

/** Offene Ostsee — war vorher drin und muss drin bleiben (Regressionsschutz). */
const KERNGEBIET: ReadonlyArray<[string, number, number]> = [
	['Fehmarnbelt', 11.3, 54.6],
	['Arkonabecken', 13.5, 55.0],
	['Bornholmbecken', 15.0, 55.2],
	['Newa-Bucht', 30.05, 59.93]
];

describe('Ostsee-Geometrie: Fehler A — Binnenwasser ausgeschlossen', () => {
	it.each(FEHLER_A)('%s (%f/%f) liegt nicht in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(false);
	});
});

describe('Ostsee-Geometrie: Fehler B — Küstengewässer eingeschlossen', () => {
	it.each(FEHLER_B)('%s (%f/%f) liegt in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(true);
	});
});

describe('Ostsee-Geometrie: Außenpunkte bleiben außen', () => {
	it.each(AUSSEN)('%s (%f/%f) liegt nicht in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(false);
	});
});

describe('Ostsee-Geometrie: Kerngebiet unverändert', () => {
	it.each(KERNGEBIET)('%s (%f/%f) liegt in der Ostsee', (_name, lon, lat) => {
		expect(checkBalticSeaFile(lon, lat).inBaltic).toBe(true);
	});
});

describe('Ostsee-Geometrie: Uferstreifen für Strandfunde', () => {
	// Strandabschnitt Prerow, Nordseite Darß. Küstenlinie verläuft hier bei ~54.4560 N.
	it('nimmt einen Punkt rund 100 m landeinwärts noch auf', () => {
		expect(checkBalticSeaFile(12.5427, 54.4551).inBaltic).toBe(true);
	});

	it('schließt einen Punkt 5 km landeinwärts aus', () => {
		expect(checkBalticSeaFile(12.5427, 54.411).inBaltic).toBe(false);
	});
});
```

- [ ] **Schritt 2: Tests laufen lassen und Fehlschlag bestätigen**

```bash
npm run test:unit -- src/lib/server/geo/balticGeometry.test.ts
```

Erwartung: Die Blöcke „Fehler A", „Fehler B" und „Uferstreifen" schlagen fehl. „Außenpunkte" und „Kerngebiet" laufen bereits durch — das ist gewollt, sie sind Regressionsschutz.

Falls „Fehler A" wider Erwarten grün ist, wurde die Geometrie schon getauscht — dann stimmt etwas mit dem Arbeitsstand nicht, klären statt weitermachen.

- [ ] **Schritt 3: Die zwei Uferstreifen-Koordinaten gegen die Realität prüfen**

Die beiden Prerow-Punkte sind aus der Karte abgelesen. Vor dem Commit einmal verifizieren, dass `12.5427/54.4551` tatsächlich rund 100 m landeinwärts und `12.5427/54.4110` rund 5 km landeinwärts liegt:

```bash
cd /Users/jansinger/Documents/Code/ostsee-sichtung && set -a && . ./.env && set +a && \
psql "$DATABASE_POSTGRES_URL" -t -A -c "
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint(12.5427, 54.4551), 4326)::geography,
  ST_SetSRID(ST_MakePoint(12.5427, 54.4560), 4326)::geography
) AS meter_zur_kueste;"
```

Erwartung: rund 100. Weicht der Wert stark ab, die Koordinaten in der Testdatei korrigieren und den korrigierten Wert im Kommentar festhalten.

- [ ] **Schritt 4: Commit**

```bash
git add src/lib/server/geo/balticGeometry.test.ts
git commit -m "test(map): add reference points for the cleaned baltic geometry"
```

---

## Aufgabe 2: Artefakt-Maske zeichnen

Die vier Ausschlussflächen als eigene, im Diff lesbare Datei.

**Dateien:**

- Erstellen: `src/tools/baltic-artifact-mask.geojson`

**Schnittstellen:**

- Liefert: eine `FeatureCollection` mit vier `Polygon`-Features in EPSG:4326. Aufgabe 3 lädt sie als Tabelle `geo_build.artifact_mask`.

- [ ] **Schritt 1: Maske schreiben**

Die Grenzen sind so gewählt, dass sie die Artefakte vollständig erfassen und echtes Ostseewasser nicht berühren. Die Newa-Bucht endet bei 30,35° E; die Maske beginnt bei 30,40° E und lässt sie damit unberührt.

```json
{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"properties": {
				"name": "Ladogasee und Onegasee",
				"grund": "Die IHO-Flaeche Gulf of Finland (mrgid 2407) reicht bis 37,47 E und schliesst beide Binnenseen ein. Die Newa-Bucht endet bei 30,35 E und bleibt westlich der Maske."
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[30.4, 59.5],
						[38.0, 59.5],
						[38.0, 63.5],
						[30.4, 63.5],
						[30.4, 59.5]
					]
				]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"name": "Torne- und Kalix-Flusslaeufe",
				"grund": "Die IHO-Flaeche Gulf of Bothnia (mrgid 2402) folgt den Fluessen bis 67,08 N. Das offene Meer endet bei Tornio auf rund 65,85 N."
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[16.0, 65.95],
						[27.0, 65.95],
						[27.0, 67.5],
						[16.0, 67.5],
						[16.0, 65.95]
					]
				]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"name": "Weichsel binnenlands",
				"grund": "Die IHO-Flaeche Baltic Sea (mrgid 2401) folgt der Weichsel bis Wloclawek auf 52,65 N, rund 200 km landeinwaerts."
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[17.5, 52.5],
						[20.0, 52.5],
						[20.0, 53.55],
						[17.5, 53.55],
						[17.5, 52.5]
					]
				]
			}
		},
		{
			"type": "Feature",
			"properties": {
				"name": "Limfjord",
				"grund": "Die IHO-Flaeche Kattegat (mrgid 2374) reicht mit fuenf Stuetzpunkten bis 9,366 E in den Limfjord. Der Limfjord ist zugleich die einzige durchverbundene Nordsee-Ostsee-Passage und muss deshalb auch den 20-km-Puffer blockieren."
			},
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[8.0, 56.7],
						[9.45, 56.7],
						[9.45, 57.35],
						[8.0, 57.35],
						[8.0, 56.7]
					]
				]
			}
		}
	]
}
```

- [ ] **Schritt 2: Maske gegen die Referenzpunkte prüfen**

Kein Punkt aus `KERNGEBIET` oder `FEHLER_B` (Aufgabe 1) darf in der Maske liegen, jeder aus `FEHLER_A` muss darin liegen.

```bash
cd /Users/jansinger/Documents/Code/ostsee-sichtung && node --input-type=module -e "
import fs from 'fs';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {point} from '@turf/helpers';
const W='.claude/worktrees/<worktree>/';
const m=JSON.parse(fs.readFileSync(W+'src/tools/baltic-artifact-mask.geojson','utf8'));
const inMask=(lo,la)=>m.features.some(f=>booleanPointInPolygon(point([lo,la]),f.geometry));
const A=[['Ladoga',31.5,60.8],['Onega',35.5,61.8],['Weichsel',19.0,52.7],['Torne',24.0,66.5],['Limfjord',9.38,57.02]];
const KEEP=[['Fehmarnbelt',11.3,54.6],['Arkona',13.5,55.0],['Bornholm',15.0,55.2],['Newa-Bucht',30.05,59.93],['Flensb. Foerde',9.6,54.83],['Eckernfoerder',9.95,54.5],['Greifsw. Bodden',13.45,54.2],['Strelasund',13.1,54.31]];
let ok=true;
for(const [n,lo,la] of A){const r=inMask(lo,la); if(!r)ok=false; console.log('A',n.padEnd(18),r?'maskiert OK':'FEHLT >>>');}
for(const [n,lo,la] of KEEP){const r=inMask(lo,la); if(r)ok=false; console.log('K',n.padEnd(18),r?'FAELSCHLICH MASKIERT >>>':'frei OK');}
process.exit(ok?0:1);
"
```

Erwartung: alle fünf A-Punkte „maskiert OK", alle acht K-Punkte „frei OK", Exit-Code 0. `<worktree>` durch den tatsächlichen Verzeichnisnamen ersetzen.

- [ ] **Schritt 3: Commit**

```bash
git add src/tools/baltic-artifact-mask.geojson
git commit -m "feat(map): add exclusion mask for the four IHO inland-water artefacts"
```

---

## Aufgabe 3: PostGIS-Pipeline

Erzeugt aus IHO-Geometrie, Maske und OSM-Küstenlinie die bereinigte Wasserfläche.

**Dateien:**

- Erstellen: `src/tools/build-baltic-geometry.sh`
- Erstellen: `src/tools/build-baltic-geometry.sql`
- Ändern: `.gitignore`
- Ändern: `package.json`

**Schnittstellen:**

- Nutzt: `src/tools/iho.json`, `src/tools/baltic-artifact-mask.geojson` (Aufgabe 2), OSM `land_polygons.shp`.
- Liefert: `src/tools/out/baltic-water.geojson` (subdividierte `FeatureCollection`, EPSG:4326) und `src/lib/server/geo/baltic-extent.json` mit den Schlüsseln `minLongitude`, `maxLongitude`, `minLatitude`, `maxLatitude` (alle `number`, ungerundet). Aufgabe 4, 5 und 6 lesen diese beiden Dateien.

- [ ] **Schritt 1: `.gitignore` erweitern**

Am Dateiende anhängen:

```gitignore

# Zwischenergebnisse der Ostsee-Geometrie-Pipeline (src/tools/build-baltic-geometry.sh)
src/tools/out/
```

- [ ] **Schritt 2: SQL-Pipeline schreiben**

`src/tools/build-baltic-geometry.sql`:

```sql
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
```

- [ ] **Schritt 3: Orchestrierungs-Skript schreiben**

`src/tools/build-baltic-geometry.sh`:

```bash
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
```

- [ ] **Schritt 4: Ausführbar machen und `package.json` ergänzen**

```bash
chmod +x src/tools/build-baltic-geometry.sh
```

In `package.json` unter `"scripts"` aufnehmen:

```json
"geo:build": "bash src/tools/build-baltic-geometry.sh",
```

- [ ] **Schritt 5: Pipeline ausführen**

```bash
npm run geo:build
```

Erwartung: Die Kennzahlen-Abfrage nennt Teilflächen, Stützpunkte und Fläche. Die Ostsee hat rund **415.000 km²**; inklusive Kattegat und Uferstreifen sollte die Zahl zwischen 400.000 und 480.000 liegen.

**Liegt sie deutlich darüber, ist die Nordsee-Leckage aus Schritt 6 nicht vollständig entfernt worden.** Dann nicht weitermachen, sondern in Aufgabe 4 auf der Karte nachsehen, wo die Fläche herkommt.

- [ ] **Schritt 6: Extent gegen die Erwartung prüfen**

```bash
cat src/lib/server/geo/baltic-extent.json
```

Erwartung, grob: `minLongitude` um 9,2–9,5, `maxLongitude` um 30,3–30,6, `minLatitude` um 53,0–53,3, `maxLatitude` um 65,8–66,1. Die Spec nennt als Rechenwert vor dem 200-m-Puffer 9,420–30,349 / 53,142–65,950.

Weicht ein Wert um mehr als 0,5° ab, ist die Geometrie nicht plausibel — Ursache klären, bevor es weitergeht.

- [ ] **Schritt 7: Commit**

```bash
git add .gitignore package.json src/tools/build-baltic-geometry.sh \
        src/tools/build-baltic-geometry.sql src/lib/server/geo/baltic-extent.json
git commit -m "feat(map): add postgis pipeline for the cleaned baltic water polygon"
```

---

## Aufgabe 4: Prüfkarte und Freigabe

**Hartes Tor.** Ohne Freigabe des Auftraggebers geht es nicht weiter.

**Dateien:**

- Erstellen: `src/tools/render-baltic-review.ts`
- Ändern: `package.json`

**Schnittstellen:**

- Nutzt: `src/tools/out/baltic-water.geojson` und `src/lib/server/geo/baltic-extent.json` (Aufgabe 3), `src/tools/iho.json`, `src/tools/baltic-artifact-mask.geojson`.
- Liefert: `src/tools/out/baltic-review.html` und `src/tools/out/review-data.js`. Keine spätere Aufgabe liest diese Dateien; sie dienen allein der menschlichen Prüfung.

- [ ] **Schritt 1: Renderer schreiben**

`src/tools/render-baltic-review.ts`:

```typescript
/**
 * Erzeugt eine eigenstaendige Pruefkarte fuer die bereinigte Ostsee-Geometrie.
 *
 * Die Karte ist das Freigabe-Tor aus docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md,
 * Abschnitt 3.3: sie laeuft nach der Pipeline und vor jedem Schreibvorgang an
 * der Datenbank.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const ROOT = join(HERE, '..', '..');

interface Extent {
	minLongitude: number;
	maxLongitude: number;
	minLatitude: number;
	maxLatitude: number;
}

/** Die fuenf Referenzpunkte aus Fehler A. Muessen ausserhalb der Flaeche liegen. */
const FEHLER_A: ReadonlyArray<[string, number, number]> = [
	['Ladogasee', 31.5, 60.8],
	['Onegasee', 35.5, 61.8],
	['Weichsel bei Włocławek', 19.0, 52.7],
	['Torne-Flusslauf', 24.0, 66.5],
	['Limfjord bei Aalborg', 9.38, 57.02]
];

/**
 * Die bisherigen Falsch-Negativen: in der Box, aber ausserhalb des alten
 * Polygons. Sie muessen jetzt innerhalb der Flaeche liegen.
 */
function loadFalseNegatives(): Array<[number, number]> {
	const sql = `
		SELECT gps_laenge::float8, gps_breite::float8
		FROM sichtungen
		WHERE gps_laenge IS NOT NULL AND gps_breite IS NOT NULL
		  AND gps_laenge BETWEEN 9.4 AND 30.2
		  AND gps_breite BETWEEN 53.0 AND 66.0
		  AND ostsee IS DISTINCT FROM 1`;
	const url = process.env.DATABASE_POSTGRES_URL;
	if (!url) throw new Error('DATABASE_POSTGRES_URL fehlt — .env laden');
	const raw = execFileSync('psql', [url, '-tA', '-F', ',', '-c', sql], { encoding: 'utf8' });
	return raw
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line): [number, number] => {
			const [lon, lat] = line.split(',');
			return [Number(lon), Number(lat)];
		});
}

function main(): void {
	const water: unknown = JSON.parse(readFileSync(join(OUT, 'baltic-water.geojson'), 'utf8'));
	const iho: unknown = JSON.parse(readFileSync(join(HERE, 'iho.json'), 'utf8'));
	const mask: unknown = JSON.parse(
		readFileSync(join(HERE, 'baltic-artifact-mask.geojson'), 'utf8')
	);
	const extent: Extent = JSON.parse(
		readFileSync(join(ROOT, 'src', 'lib', 'server', 'geo', 'baltic-extent.json'), 'utf8')
	);

	const payload = {
		water,
		iho,
		mask,
		extent,
		fehlerA: FEHLER_A,
		falseNegatives: loadFalseNegatives()
	};

	writeFileSync(join(OUT, 'review-data.js'), `window.REVIEW = ${JSON.stringify(payload)};`);
	writeFileSync(join(OUT, 'baltic-review.html'), HTML);
	console.log('Geschrieben:', join(OUT, 'baltic-review.html'));
	console.log('Marker (bisherige Falsch-Negative):', payload.falseNegatives.length);
}

const HTML = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Ostsee-Geometrie — visuelle Pruefung</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html,body{margin:0;height:100%;font:14px system-ui,sans-serif}
  #map{height:100%}
  .legend{background:#fff;padding:10px 12px;line-height:1.7;box-shadow:0 1px 5px rgba(0,0,0,.3);border-radius:4px}
  .legend b{display:block;margin-bottom:6px}
  .sw{display:inline-block;width:14px;height:14px;vertical-align:-2px;margin-right:6px;border:1px solid #555}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="./review-data.js"></script>
<script>
const R = window.REVIEW;
const map = L.map('map').setView([57.5, 19], 5);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18, attribution: '&copy; OpenStreetMap'
}).addTo(map);

// Altes IHO-Polygon als Kontur zum Vergleich
L.geoJSON(R.iho, { style: { color: '#b91c1c', weight: 1.5, fill: false, dashArray: '4 3' } }).addTo(map);

// Neue Wasserflaeche
L.geoJSON(R.water, { style: { color: '#0369a1', weight: 0.7, fillColor: '#0ea5e9', fillOpacity: 0.35 } }).addTo(map);

// Artefakt-Maske
L.geoJSON(R.mask, { style: { color: '#a16207', weight: 1, fillColor: '#facc15', fillOpacity: 0.15 } }).addTo(map);

// Abgeleitete Bounding Box
const e = R.extent;
L.rectangle([[e.minLatitude, e.minLongitude], [e.maxLatitude, e.maxLongitude]],
  { color: '#15803d', weight: 2, fill: false }).addTo(map);

// Bisherige Falsch-Negative — muessen jetzt INNERHALB der blauen Flaeche liegen
const fn = L.layerGroup(R.falseNegatives.map(function (p) {
  return L.circleMarker([p[1], p[0]], { radius: 3, color: '#7c3aed', weight: 1, fillOpacity: 0.8 });
})).addTo(map);

// Fehler-A-Referenzpunkte — muessen AUSSERHALB liegen
R.fehlerA.forEach(function (p) {
  L.circleMarker([p[2], p[1]], { radius: 7, color: '#000', fillColor: '#ef4444', fillOpacity: 1, weight: 2 })
    .bindTooltip(p[0] + ' — muss draussen sein', { permanent: false }).addTo(map);
});

const legend = L.control({ position: 'topright' });
legend.onAdd = function () {
  const d = L.DomUtil.create('div', 'legend');
  d.innerHTML =
    '<b>Ostsee-Geometrie, Pruefstand</b>' +
    '<span class="sw" style="background:#0ea5e9"></span>neue Wasserflaeche<br>' +
    '<span class="sw" style="background:transparent;border-color:#b91c1c;border-style:dashed"></span>altes IHO-Polygon<br>' +
    '<span class="sw" style="background:#facc15"></span>Artefakt-Maske<br>' +
    '<span class="sw" style="background:transparent;border-color:#15803d"></span>abgeleitete Bounding Box<br>' +
    '<span class="sw" style="background:#7c3aed;border-radius:50%"></span>' + R.falseNegatives.length +
      ' bisher Falsch-Negative <i>(muessen drin liegen)</i><br>' +
    '<span class="sw" style="background:#ef4444;border-radius:50%"></span>Fehler-A-Punkte <i>(muessen draussen liegen)</i>';
  return d;
};
legend.addTo(map);
L.control.scale({ imperial: false }).addTo(map);
</script>
</body>
</html>`;

main();
```

- [ ] **Schritt 2: `package.json` ergänzen**

```json
"geo:review": "tsx src/tools/render-baltic-review.ts",
```

- [ ] **Schritt 3: Karte erzeugen**

```bash
set -a && . ./.env && set +a && npm run geo:review
```

Erwartung: Meldet den Pfad und rund **1.900** Marker. Weicht die Markerzahl stark von 1.901 ab, wurde auf einem anderen Datenbestand gerechnet — im Report festhalten.

- [ ] **Schritt 4: Karte im Browser prüfen**

Nach `~/.claude/CLAUDE.md` läuft die visuelle Prüfung über die `Claude_in_Chrome`-MCP, nicht über `preview_*`:

1. `tabs_context_mcp(createIfEmpty: true)`
2. Steht der Tab auf `chrome://newtab`, zuerst eine echte URL laden — von `newtab` aus schlägt die Navigation still fehl.
3. `navigate` auf `file:///<absoluter Pfad>/src/tools/out/baltic-review.html`
4. `computer({ action: 'screenshot' })`

Screenshots von diesen fünf Ausschnitten anfertigen:

| Ausschnitt                         | Worauf zu achten ist                                      |
| ---------------------------------- | --------------------------------------------------------- |
| Gesamtübersicht                    | Keine blaue Fläche westlich von Jütland oder im Skagerrak |
| Dänische Meerengen und Limfjord    | Der Limfjord ist gelb maskiert und **nicht** blau         |
| Flensburger Förde bis Kieler Bucht | Alle violetten Marker liegen in Blau                      |
| Bodden zwischen Rügen und Darß     | Alle violetten Marker liegen in Blau                      |
| Newa-Bucht und Ladogasee           | Newa-Bucht blau, Ladoga gelb maskiert und nicht blau      |

- [ ] **Schritt 5: Karte und Screenshots übergeben**

Die HTML-Datei per `SendUserFile` übergeben, damit selbst gezoomt werden kann, zusammen mit den fünf Screenshots.

- [ ] **Schritt 6: Freigabe abwarten**

Explizit fragen, ob die Geometrie freigegeben ist. **Erst nach einem klaren Ja weitermachen.** Bei Beanstandungen: Artefakt-Maske oder Pufferwerte anpassen, Aufgabe 3 erneut laufen lassen, erneut vorlegen.

- [ ] **Schritt 7: Commit**

```bash
git add package.json src/tools/render-baltic-review.ts
git commit -m "feat(map): add review map for visual approval of the baltic geometry"
```

---

## Aufgabe 5: Index bauen und Laufzeit umstellen

Bringt die Tests aus Aufgabe 1 auf Grün.

**Dateien:**

- Ändern: `src/tools/create-rbush-index.js`
- Ändern: `src/lib/server/geo/checkBalticSeaFile.ts:59` und die Ladefunktion
- Ersetzen: `src/lib/server/geo/rbush-index.json`
- Löschen: `src/tools/rbush-index.json`
- Ändern: `package.json`

**Schnittstellen:**

- Nutzt: `src/tools/out/baltic-water.geojson` (Aufgabe 3).
- Liefert: `checkBalticSeaFile` verhält sich unverändert nach außen — gleiche Signatur, gleicher Rückgabetyp `BalticSeaFileResult`. Nur die zugrunde liegende Geometrie ändert sich.

- [ ] **Schritt 1: Generator anpassen**

In `src/tools/create-rbush-index.js` zwei Änderungen.

Zeile 151 — Einrückung entfernen, sie vervierfacht die Dateigröße:

```javascript
writeFileSync(outputFile, JSON.stringify(indexData));
```

Zeilen 173–177 — Standardpfade auf die Pipeline-Ausgabe umstellen:

```javascript
// Usage: node create-rbush-index.js input.geojson rbush-index.json
if (import.meta.url === `file://${process.argv[1]}`) {
	const inputFile = process.argv[2] || 'out/baltic-water.geojson';
	const outputFile = process.argv[3] || '../lib/server/geo/rbush-index.json';
	createRBushIndex(inputFile, outputFile);
}
```

Die bestehende `getBoundingBox`-Logik verarbeitet `Polygon` und `MultiPolygon` bereits korrekt und braucht keine Änderung — `ST_Subdivide` liefert `Polygon`.

- [ ] **Schritt 2: Index bauen**

```bash
cd src/tools && node create-rbush-index.js && cd ../..
ls -la src/lib/server/geo/rbush-index.json
```

Erwartung: Datei existiert und ist **unter 10 MB**. Ist sie größer, in `src/tools/build-baltic-geometry.sql` die Zeile `\set simplify_m 20` auf `50` erhöhen, `npm run geo:build` und diesen Schritt wiederholen. Den letztlich verwendeten Wert für Aufgabe 10 notieren.

- [ ] **Schritt 3: Doppelte Kopie entfernen**

```bash
git rm src/tools/rbush-index.json
```

- [ ] **Schritt 4: Statischen Import auflösen**

In `src/lib/server/geo/checkBalticSeaFile.ts` die Zeile 59 löschen:

```typescript
import rbushIndex from './rbush-index.json';
```

Und die Zeile 70 ersetzen:

```typescript
const rbushIndexTyped = rbushIndex as RBushIndexJson;
```

durch eine Variable, die die Ladefunktion füllt:

```typescript
/**
 * Der Index wird bewusst NICHT statisch importiert: er ist mehrere MB gross und
 * gehoert nicht ins Bundle (.claude/rules/geo.md). Der dynamische Import laeuft
 * einmalig in der bestehenden Lazy-Initialisierung.
 */
let rbushIndexTyped: RBushIndexJson | null = null;
```

In der Ladefunktion (um Zeile 140, direkt vor `spatialIndex = new RBush<SpatialIndexItem>();`) den Index nachladen. Die Funktion muss dafür `async` werden — dieselbe Umstellung gilt für ihre Aufrufer:

```typescript
if (!rbushIndexTyped) {
	const mod = (await import('./rbush-index.json')) as { default: RBushIndexJson };
	rbushIndexTyped = mod.default;
}
```

Danach bleiben die vorhandenen Zeilen unverändert nutzbar, weil `rbushIndexTyped` an dieser Stelle garantiert gesetzt ist:

```typescript
spatialIndex = new RBush<SpatialIndexItem>();
spatialIndex.fromJSON(rbushIndexTyped.tree);
```

Im `catch`-Zweig zusätzlich `rbushIndexTyped = null;` setzen, damit ein fehlgeschlagener Ladevorgang beim nächsten Aufruf erneut versucht wird statt dauerhaft `false` zu liefern.

**Achtung:** `checkBalticSeaFile` ist heute synchron und wird an vier Stellen synchron aufgerufen (`mapFormToSighting.ts:188`, `routes/api/geo/inBaltic/+server.ts`, `routes/rest_sichtungen/inBaltic.json/+server.ts`, `report/components/form/VerifyLocation.svelte` über die API). Wird die Ladefunktion `async`, muss `checkBalticSeaFile` ebenfalls `async` werden und alle vier Aufrufstellen brauchen ein `await`. `mapFormToSighting` ist bereits `async`.

Ebenfalls betroffen: **die Tests aus Aufgabe 1 und die aus Aufgabe 8** rufen `checkBalticSeaFile` synchron auf. Wird die Funktion `async`, müssen dort alle Aufrufe ein `await` bekommen und die Testfunktionen `async` werden — auch die `it.each`-Rückrufe. `computeFlags` aus Aufgabe 8 müsste dann ebenfalls `async` werden und `Promise<FlagChange[]>` liefern.

**Empfehlung: Schritt 4 überspringen.** Der statische Import ist ein Bundling-Problem, kein Geometrie-Problem; die Bereinigung hängt nicht davon ab, und der Umbau berührt vier Produktionsaufrufer plus zwei Testdateien. Ihn hier mitzunehmen vermischt zwei Vorgänge und macht das Review schwerer. Stattdessen: Schritt 4 auslassen, in Aufgabe 10 als offenen Punkt festhalten und `.claude/rules/geo.md` auf den Ist-Zustand korrigieren, damit dort keine Regel steht, die der Code nicht einhält.

Wird der Umbau trotzdem gewünscht, gehört er hinter Aufgabe 9 als eigene Aufgabe mit eigenem Commit — dann sind die Tests bereits stabil und der Diff ist sauber trennbar.

- [ ] **Schritt 5: Referenzpunkt-Tests laufen lassen**

```bash
npm run test:unit -- src/lib/server/geo/balticGeometry.test.ts
```

Erwartung: **alle** Blöcke grün — Fehler A, Fehler B, Uferstreifen, Außenpunkte, Kerngebiet.

Schlägt ein Fehler-B-Punkt fehl, ist der 20-km-Puffer an dieser Stelle zu klein oder OSM stuft das Gewässer als Binnenwasser ein. Schlägt ein Außenpunkt fehl, ist Nordseewasser durchgekommen — zurück zu Aufgabe 3, Schritt 6.

- [ ] **Schritt 6: Commit**

```bash
git add -A src/tools/create-rbush-index.js src/lib/server/geo/ src/tools/rbush-index.json package.json
git commit -m "feat(map): rebuild the spatial index from the cleaned baltic geometry"
```

---

## Aufgabe 6: Bounding Box ableiten

**Dateien:**

- Ändern: `src/lib/utils/geo/checkBalticSea.ts:18-32`
- Erstellen: `src/lib/utils/geo/checkBalticSea.test.ts`

**Schnittstellen:**

- Nutzt: `src/lib/server/geo/baltic-extent.json` (Aufgabe 3).
- Liefert: `BALTIC_SEA_BBOX: BoundingBox` mit unveränderter Form — `{ minLongitude, maxLongitude, minLatitude, maxLatitude }`, alle `number`. Die vier bestehenden Verwendungsstellen bleiben unverändert.

- [ ] **Schritt 1: Invarianten- und Ableitungstest schreiben**

`src/lib/utils/geo/checkBalticSea.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BALTIC_SEA_BBOX, isInBalticArea } from './checkBalticSea';
import rbushIndex from '$lib/server/geo/rbush-index.json';

interface ExtentFile {
	minLongitude: number;
	maxLongitude: number;
	minLatitude: number;
	maxLatitude: number;
}

const extent: ExtentFile = JSON.parse(
	readFileSync('src/lib/server/geo/baltic-extent.json', 'utf8')
);

/** Auf 0,05 Grad nach aussen runden — siehe Spec, Abschnitt 3.4. */
const outward = (value: number, up: boolean): number =>
	Number(((up ? Math.ceil(value / 0.05) : Math.floor(value / 0.05)) * 0.05).toFixed(2));

describe('BALTIC_SEA_BBOX ist aus der Geometrie abgeleitet', () => {
	it('entspricht dem nach aussen gerundeten Extent der Pipeline', () => {
		expect(BALTIC_SEA_BBOX).toEqual({
			minLongitude: outward(extent.minLongitude, false),
			maxLongitude: outward(extent.maxLongitude, true),
			minLatitude: outward(extent.minLatitude, false),
			maxLatitude: outward(extent.maxLatitude, true)
		});
	});
});

describe('Invariante: das Polygon liegt vollstaendig in der Bounding Box', () => {
	it('haelt fuer jeden Stuetzpunkt der Geometrie', () => {
		const outside: Array<[number, number]> = [];
		const walk = (node: unknown): void => {
			if (Array.isArray(node) && typeof node[0] === 'number') {
				const [lon, lat] = node as [number, number];
				if (!isInBalticArea(lon, lat)) outside.push([lon, lat]);
				return;
			}
			if (Array.isArray(node)) node.forEach(walk);
		};
		for (const item of rbushIndex.tree.children) walk(item.geometry.coordinates);

		expect(outside.slice(0, 5)).toEqual([]);
		expect(outside).toHaveLength(0);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
npm run test:unit -- src/lib/utils/geo/checkBalticSea.test.ts
```

Erwartung: Der Ableitungstest schlägt fehl, weil `BALTIC_SEA_BBOX` noch die handgepflegten Werte trägt.

- [ ] **Schritt 3: Konstante nachziehen**

Die gerundeten Werte ausrechnen:

```bash
node -e "
const e=require('./src/lib/server/geo/baltic-extent.json');
const f=(v,up)=>((up?Math.ceil(v/0.05):Math.floor(v/0.05))*0.05).toFixed(2);
console.log('minLongitude:',f(e.minLongitude,false));
console.log('maxLongitude:',f(e.maxLongitude,true));
console.log('minLatitude: ',f(e.minLatitude,false));
console.log('maxLatitude: ',f(e.maxLatitude,true));
"
```

In `src/lib/utils/geo/checkBalticSea.ts` den Block ab Zeile 18 ersetzen. Die vier Zahlen aus der Ausgabe oben einsetzen:

```typescript
/**
 * Ostsee-Bounding-Box — Hülle der bereinigten Ostsee-Geometrie
 *
 * **Nicht von Hand pflegen.** Die Werte sind der Extent aus
 * `src/lib/server/geo/baltic-extent.json`, nach außen auf 0,05° gerundet.
 * Erzeugt von `npm run geo:build`. `checkBalticSea.test.ts` schlägt fehl,
 * wenn Konstante und Extent auseinanderlaufen.
 *
 * Die Geometrie umfasst die IHO-Seegebiete Baltic Sea, Gulf of Bothnia,
 * Gulf of Finland, Gulf of Riga und **Kattegat** — das Skagerrak gehört
 * nicht dazu. Binnenwasser (Ladogasee, Onegasee, Weichsel- und
 * Torne-Flussläufe, Limfjord) ist ausgeschlossen.
 *
 * Hintergrund: `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`
 *
 * @constant
 */
export const BALTIC_SEA_BBOX: BoundingBox = {
	minLongitude: 9.4, // Westgrenze — Kattegat vor Nordjütland
	maxLongitude: 30.4, // Ostgrenze — Kopf der Newa-Bucht
	minLatitude: 53.1, // Südgrenze — Oderhaff
	maxLatitude: 66.0 // Nordgrenze — Bottenwiek bei Tornio
};
```

Die vier Zahlenwerte durch die tatsächliche Ausgabe aus dem Befehl oben ersetzen; die Kommentare beschreiben die geografische Bedeutung und bleiben.

Ebenso den Doku-Block ab Zeile 48 („Koordinaten-Referenz") auf die neuen Zahlen bringen und „Skagerrak-Region" durch „Kattegat" ersetzen.

- [ ] **Schritt 4: Tests laufen lassen**

```bash
npm run test:unit -- src/lib/utils/geo/checkBalticSea.test.ts
```

Erwartung: beide Tests grün.

- [ ] **Schritt 5: Commit**

```bash
git add src/lib/utils/geo/checkBalticSea.ts src/lib/utils/geo/checkBalticSea.test.ts
git commit -m "feat(map): derive BALTIC_SEA_BBOX from the cleaned geometry"
```

---

## Aufgabe 7: Bestandstests nachziehen

**Dateien:**

- Ändern: `src/lib/server/geo/checkBalticSeaFile.comprehensive.test.ts`
- Ändern: `src/lib/map/extentUtils.test.ts`
- Ändern: `src/routes/api/map/sightings/coordinateFilter.test.ts:104`

**Schnittstellen:** keine neuen. Diese Aufgabe passt nur Erwartungswerte an.

- [ ] **Schritt 1: Gesamtlage aufnehmen**

```bash
npm run test:unit 2>&1 | tail -40
```

Alle fehlschlagenden Tests notieren.

- [ ] **Schritt 2: Box-Werte in `coordinateFilter.test.ts` anpassen**

Zeile 104 prüft die Konstante hart. Die vier Zahlen auf die aus Aufgabe 6 setzen:

```typescript
expect(BALTIC_SEA_BBOX).toEqual({
	minLongitude: 9.4,
	maxLongitude: 30.4,
	minLatitude: 53.1,
	maxLatitude: 66.0
});
```

- [ ] **Schritt 3: `extentUtils.test.ts` anpassen**

Die Datei berechnet ihre Erwartung in den Zeilen 9–12 selbst aus `BALTIC_SEA_BBOX` und zieht dadurch automatisch mit. Schlägt sie trotzdem fehl, liegt ein hart notierter Zahlenwert weiter unten in der Datei — diesen auf den neuen Wert bringen.

- [ ] **Schritt 4: `checkBalticSeaFile.comprehensive.test.ts` anpassen**

Jeden Fehlschlag einzeln bewerten. Zwei Fälle:

- **Erwartung war an der alten, defekten Geometrie ausgerichtet** — Wert korrigieren und einen Kommentar mit dem Grund setzen, zum Beispiel `// Greifswalder Bodden: seit der Kuestenlinien-Verfeinerung inBaltic (Spec 1.4)`.
- **Erwartung beschreibt echtes fachliches Verhalten** — dann ist die neue Geometrie falsch. Nicht den Test anpassen, sondern zurück zu Aufgabe 3.

Zeile 529 (`// Test boundary coordinates that should match PostGIS CHART_AREA_ENVELOPE`) und Zeile 313 (`expect(result.inChartArea).toBe(true); // Within bounding box`) sind die wahrscheinlichsten Kandidaten für Fall 1.

- [ ] **Schritt 5: Gesamtlauf**

```bash
npm run test:quick
```

Erwartung: grün.

- [ ] **Schritt 6: Commit**

```bash
git add src/lib/server/geo/checkBalticSeaFile.comprehensive.test.ts \
        src/lib/map/extentUtils.test.ts \
        src/routes/api/map/sightings/coordinateFilter.test.ts
git commit -m "test(map): align existing expectations with the cleaned geometry"
```

---

## Aufgabe 8: Trockenlauf-Report

**Setzt die Freigabe aus Aufgabe 4 voraus.** Ändert nichts an den Daten.

**Dateien:**

- Erstellen: `src/tools/recalc-baltic-flags.ts`
- Ändern: `package.json`

**Schnittstellen:**

- Nutzt: `checkBalticSeaFile` und `isInBalticArea`.
- Liefert: `computeFlags(rows: readonly SightingRow[]): FlagChange[]`, `region(lon: number, lat: number): string` und `renderReport(changes: readonly FlagChange[], gesamt: number): string` — `computeFlags` wird in Aufgabe 9 vom Migrationszweig derselben Datei genutzt. Typen siehe Code unten.

- [ ] **Schritt 1: Skript schreiben**

`src/tools/recalc-baltic-flags.ts`:

```typescript
/**
 * Rechnet ostsee und ostsee_geo aus der bereinigten Geometrie neu.
 *
 *   --report    nur auswerten und ausgeben, nichts schreiben (Vorgabe)
 *   --migrate   Altwerte sichern und neue Werte schreiben
 *
 * Voraussetzung: die visuelle Kartenfreigabe aus
 * docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md, Abschnitt 3.3.
 *
 * Die Datenbank-Verbindung folgt dem Muster aus
 * src/tools/fix-land-boat-drive.js — dort nachsehen und uebernehmen,
 * damit im Projekt nur ein Treiber verwendet wird.
 */
import { checkBalticSeaFile } from '../lib/server/geo/checkBalticSeaFile';

export interface SightingRow {
	id: number;
	longitude: number;
	latitude: number;
	inBalticSea: number | null;
	inBalticSeaGeo: number;
}

export interface FlagChange {
	id: number;
	longitude: number;
	latitude: number;
	altOstsee: number | null;
	neuOstsee: number;
	altGeo: number;
	neuGeo: number;
}

/** Reine Funktion — bewusst ohne Datenbankzugriff, damit sie testbar bleibt. */
export function computeFlags(rows: readonly SightingRow[]): FlagChange[] {
	const changes: FlagChange[] = [];
	for (const row of rows) {
		const { inBaltic, inChartArea } = checkBalticSeaFile(row.longitude, row.latitude);
		const neuOstsee = inBaltic ? 1 : 0;
		const neuGeo = inChartArea ? 1 : 0;
		// ostsee_geo = 2 stammt aus dem Altsystem und bedeutet dasselbe wie 1.
		// Es wird nur angefasst, wenn sich die Aussage "im Kartenbereich" aendert.
		const geoAendertSich = (row.inBalticSeaGeo > 0 ? 1 : 0) !== neuGeo;
		if (row.inBalticSea !== neuOstsee || geoAendertSich) {
			changes.push({
				id: row.id,
				longitude: row.longitude,
				latitude: row.latitude,
				altOstsee: row.inBalticSea,
				neuOstsee,
				altGeo: row.inBalticSeaGeo,
				neuGeo: geoAendertSich ? neuGeo : row.inBalticSeaGeo
			});
		}
	}
	return changes;
}

/** Grobe Regionszuordnung, nur fuer die Lesbarkeit des Reports. */
export function region(lon: number, lat: number): string {
	if (lon < 9.4 || lon > 30.4 || lat < 53.1 || lat > 66.0) return 'ausserhalb der Box';
	if (lon < 10.5) return 'Flensburger Foerde / Kieler Bucht';
	if (lon < 12.5) return 'Luebecker und Wismarbucht';
	if (lon < 14.5) return 'Bodden, Ruegen, Darss';
	if (lon < 20.0) return 'zentrale Ostsee';
	if (lat > 60.0) return 'Bottnischer und Finnischer Meerbusen';
	return 'oestliche Ostsee';
}

export function renderReport(changes: readonly FlagChange[], gesamt: number): string {
	const hoch = changes.filter((c) => c.altOstsee !== 1 && c.neuOstsee === 1);
	const runter = changes.filter((c) => c.altOstsee === 1 && c.neuOstsee === 0);

	const byRegion = new Map<string, number>();
	for (const c of changes) {
		const key = region(c.longitude, c.latitude);
		byRegion.set(key, (byRegion.get(key) ?? 0) + 1);
	}

	const lines: string[] = [
		'# Trockenlauf: Neuberechnung von ostsee und ostsee_geo',
		'',
		`Zeilen mit Koordinaten: ${gesamt}`,
		`Zeilen mit Aenderung:   ${changes.length}`,
		`  ostsee 0 -> 1: ${hoch.length}`,
		`  ostsee 1 -> 0: ${runter.length}`,
		'',
		'## Nach Region',
		''
	];
	for (const [name, count] of [...byRegion].sort((a, b) => b[1] - a[1])) {
		lines.push(`${String(count).padStart(6)}  ${name}`);
	}
	lines.push('', '## Beispiele 0 -> 1', '');
	for (const c of hoch.slice(0, 20)) {
		lines.push(`  id ${c.id}  ${c.longitude}/${c.latitude}  ${region(c.longitude, c.latitude)}`);
	}
	lines.push('', '## Beispiele 1 -> 0 (kritischer, bitte einzeln pruefen)', '');
	for (const c of runter.slice(0, 40)) {
		lines.push(`  id ${c.id}  ${c.longitude}/${c.latitude}  ${region(c.longitude, c.latitude)}`);
	}
	return lines.join('\n');
}
```

Den Datenbank-Teil ergänzen: Zeilen laden per

```sql
SELECT id, gps_laenge::float8, gps_breite::float8, ostsee, ostsee_geo
FROM sichtungen
WHERE gps_laenge IS NOT NULL AND gps_breite IS NOT NULL
```

und bei `--report` das Ergebnis von `renderReport` nach `src/tools/out/baltic-flags-report.md` schreiben sowie auf der Konsole ausgeben. Verbindungsaufbau und `process.argv`-Auswertung genau wie in `src/tools/fix-land-boat-drive.js`.

- [ ] **Schritt 2: Test für die reine Funktion schreiben**

`src/tools/recalc-baltic-flags.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { computeFlags, region, type SightingRow } from './recalc-baltic-flags';

const row = (over: Partial<SightingRow>): SightingRow => ({
	id: 1,
	longitude: 13.45,
	latitude: 54.2,
	inBalticSea: 0,
	inBalticSeaGeo: 0,
	...over
});

describe('computeFlags', () => {
	it('meldet den Greifswalder Bodden als Aenderung 0 -> 1', () => {
		const [change] = computeFlags([row({ inBalticSea: 0 })]);
		expect(change.neuOstsee).toBe(1);
		expect(change.altOstsee).toBe(0);
	});

	it('laesst eine bereits korrekte Zeile unangetastet', () => {
		expect(computeFlags([row({ inBalticSea: 1, inBalticSeaGeo: 1 })])).toHaveLength(0);
	});

	it('behaelt den Altwert 2 in ostsee_geo, solange die Aussage gleich bleibt', () => {
		const [change] = computeFlags([row({ inBalticSea: 0, inBalticSeaGeo: 2 })]);
		expect(change.neuGeo).toBe(2);
	});

	it('setzt Ladoga auf 0', () => {
		const [change] = computeFlags([
			row({ longitude: 31.5, latitude: 60.8, inBalticSea: 1, inBalticSeaGeo: 1 })
		]);
		expect(change.neuOstsee).toBe(0);
	});
});

describe('region', () => {
	it('ordnet die Flensburger Foerde zu', () => {
		expect(region(9.6, 54.83)).toBe('Flensburger Foerde / Kieler Bucht');
	});
});
```

- [ ] **Schritt 3: Tests laufen lassen**

```bash
npm run test:unit -- src/tools/recalc-baltic-flags.test.ts
```

Erwartung: grün.

- [ ] **Schritt 4: `package.json` ergänzen**

```json
"geo:report": "tsx src/tools/recalc-baltic-flags.ts --report",
```

- [ ] **Schritt 5: Trockenlauf ausführen und vorlegen**

```bash
set -a && . ./.env && set +a && npm run geo:report
```

Den Report übergeben. Besonders auf den Block „1 → 0" achten: jede Zeile, die ihren Ostsee-Status verliert, muss erklärbar sein (Altsystem-Müll, Nordsee, Binnenwasser). Sind darunter plausible Ostsee-Positionen, ist die Geometrie noch nicht richtig — zurück zu Aufgabe 3.

- [ ] **Schritt 6: Commit**

```bash
git add package.json src/tools/recalc-baltic-flags.ts src/tools/recalc-baltic-flags.test.ts
git commit -m "feat(db): add dry-run report for recomputing the baltic flags"
```

---

## Aufgabe 9: Migration mit Rollback

**Setzt die Freigabe des Reports aus Aufgabe 8 voraus.** Schreibt Daten.

**Dateien:**

- Ändern: `src/tools/recalc-baltic-flags.ts`
- Ändern: `package.json`

**Schnittstellen:**

- Nutzt: `computeFlags` aus Aufgabe 8.
- Liefert: die Tabelle `sichtungen_ostsee_backup` als Rollback-Grundlage.

- [ ] **Schritt 1: Migrationszweig ergänzen**

In `src/tools/recalc-baltic-flags.ts` bei `--migrate` vor dem Schreiben sichern:

```sql
DROP TABLE IF EXISTS sichtungen_ostsee_backup;
CREATE TABLE sichtungen_ostsee_backup AS
SELECT id, ostsee, ostsee_geo, now() AS gesichert_am FROM sichtungen;
```

Dann in einer Transaktion und in Blöcken zu 500 Zeilen schreiben:

```sql
UPDATE sichtungen SET ostsee = $2, ostsee_geo = $3 WHERE id = $1;
```

Das Skript muss abbrechen, wenn `sichtungen_ostsee_backup` bereits existiert und Zeilen enthält, die nicht zum aktuellen Bestand passen — sonst überschreibt ein zweiter Lauf die einzige Rückfallebene. Prüfung vor dem `DROP`:

```sql
SELECT count(*) FROM sichtungen_ostsee_backup;
```

Ist die Tabelle vorhanden und nicht leer, mit einem Hinweis abbrechen und `--force` verlangen.

- [ ] **Schritt 2: Zeilenzahl vor der Migration festhalten**

```bash
cd /Users/jansinger/Documents/Code/ostsee-sichtung && set -a && . ./.env && set +a && \
psql "$DATABASE_POSTGRES_URL" -P pager=off -c "
SELECT count(*) gesamt,
       count(*) FILTER (WHERE ostsee = 1) ostsee_1,
       count(*) FILTER (WHERE ostsee_geo > 0) geo_gt0
FROM sichtungen;"
```

Die Zahlen notieren.

- [ ] **Schritt 3: `package.json` ergänzen**

```json
"geo:migrate": "tsx src/tools/recalc-baltic-flags.ts --migrate",
```

- [ ] **Schritt 4: Migration ausführen**

```bash
set -a && . ./.env && set +a && npm run geo:migrate
```

- [ ] **Schritt 5: Ergebnis prüfen**

```bash
cd /Users/jansinger/Documents/Code/ostsee-sichtung && set -a && . ./.env && set +a && \
psql "$DATABASE_POSTGRES_URL" -P pager=off -c "
SELECT count(*) gesamt,
       count(*) FILTER (WHERE ostsee = 1) ostsee_1,
       count(*) FILTER (WHERE ostsee_geo > 0) geo_gt0,
       count(*) FILTER (WHERE ostsee = 1 AND ostsee_geo = 0) invariante_verletzt
FROM sichtungen;
SELECT count(*) AS gesicherte_zeilen FROM sichtungen_ostsee_backup;"
```

Erwartung: `gesamt` unverändert, `ostsee_1` um rund die Zahl aus dem Report gestiegen, **`invariante_verletzt` = 0**, `gesicherte_zeilen` gleich `gesamt`.

Ist `invariante_verletzt` größer als 0, sofort zurückrollen (Schritt 6) und die Ursache klären.

- [ ] **Schritt 6: Rollback-Weg dokumentieren und einmal proben**

Den Weg in den Kopfkommentar des Skripts aufnehmen:

```sql
UPDATE sichtungen s
SET ostsee = b.ostsee, ostsee_geo = b.ostsee_geo
FROM sichtungen_ostsee_backup b
WHERE s.id = b.id;
```

Einmal auf einer einzelnen ID proben, damit der Weg belegt ist und nicht nur behauptet:

```bash
cd /Users/jansinger/Documents/Code/ostsee-sichtung && set -a && . ./.env && set +a && \
psql "$DATABASE_POSTGRES_URL" -P pager=off -c "
BEGIN;
SELECT id, ostsee FROM sichtungen WHERE id = (SELECT min(id) FROM sichtungen_ostsee_backup);
UPDATE sichtungen s SET ostsee = b.ostsee, ostsee_geo = b.ostsee_geo
FROM sichtungen_ostsee_backup b
WHERE s.id = b.id AND s.id = (SELECT min(id) FROM sichtungen_ostsee_backup);
SELECT id, ostsee FROM sichtungen WHERE id = (SELECT min(id) FROM sichtungen_ostsee_backup);
ROLLBACK;"
```

Erwartung: Der zweite `SELECT` zeigt den Altwert, das `ROLLBACK` macht auch das wieder rückgängig.

- [ ] **Schritt 7: Commit**

```bash
git add package.json src/tools/recalc-baltic-flags.ts
git commit -m "feat(db): recompute baltic flags with backup table and rollback path"
```

---

## Aufgabe 10: Dokumentation

**Dateien:**

- Ändern: `docs/OSTSEE_FLAGS.md`
- Ändern: `.claude/rules/geo.md`
- Ändern: `.claude/rules/maps.md:222-240`
- Ändern: `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`

- [ ] **Schritt 1: `docs/OSTSEE_FLAGS.md`, Abschnitt „Fehler 3" ersetzen**

Der Abschnitt behauptet, die Box schneide die Ostsee im Westen ab. Das ist widerlegt. Ersetzen durch:

```markdown
## Fehler 3: Das Polygon hatte zwei Fehler (behoben)

Die ursprüngliche Vermutung, die Bounding Box schneide die Ostsee im Westen ab,
hat die Nachmessung vom 2026-07-30 widerlegt: nur fünf von rund 330.000
Polygon-Stützpunkten lagen westlich von 9,4° E, und das war der Limfjord bei
Aalborg. Kein einziger Datensatz verletzte die Invariante.

Gefunden wurden stattdessen zwei Fehler in der IHO-Geometrie selbst — sie enthielt
Ladogasee, Onegasee und Flussläufe, und ihr fehlten die inneren Küstengewässer
(1.901 Zeilen, 9,8 %). Beide sind behoben; die Bounding Box wird seither aus der
bereinigten Geometrie abgeleitet.

Vollständige Messung, Entscheidungen und Umsetzung:
`docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`.
```

- [ ] **Schritt 2: `.claude/rules/geo.md` aktualisieren**

Die Box-Werte in Zeile 19–24 auf die neuen bringen. Den Abschnitt „Präzise Geometrie" ergänzen um Datenquelle, Pufferwerte, die tatsächlich verwendete Simplify-Toleranz aus Aufgabe 5 Schritt 2 sowie den Hinweis, dass `npm run geo:build` die Geometrie erzeugt und die Karte aus `npm run geo:review` freigegeben werden muss. Die Angabe „32 MB, 5 MultiPolygon Features" auf die tatsächliche neue Größe und Teilflächenzahl korrigieren.

Wurde Aufgabe 5, Schritt 4 übersprungen, den Satz „Index NICHT bundlen — Lazy Loading verwenden" auf den Ist-Zustand korrigieren und den offenen Punkt benennen, statt eine Regel stehenzulassen, die der Code nicht einhält.

- [ ] **Schritt 3: `.claude/rules/maps.md` aktualisieren**

Der Block ab Zeile 222 („Ostsee-Grenzen") wiederholt die Box-Werte im Klartext und in einem `View Constraint`-Beispiel mit `[9.4, 53.0]` und `[30.2, 66.0]`. Beide auf die neuen Werte bringen.

- [ ] **Schritt 4: Spec als erledigt kennzeichnen**

Im Kopf von `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md` vermerken, dass die Umsetzung erfolgt ist, mit Datum und den tatsächlich verwendeten Werten für Simplify-Toleranz und Indexgröße.

- [ ] **Schritt 5: Gesamtlauf**

```bash
npm run test:quick
```

Erwartung: grün.

- [ ] **Schritt 6: Commit**

```bash
git add docs/ .claude/rules/geo.md .claude/rules/maps.md
git commit -m "docs(map): update the baltic geometry documentation after the cleanup"
```

---

## Abschluss

Nach Aufgabe 10 sind Spec und Plan point-in-time-Dokumente. Nach dem Merge gehören
sie nach `docs/archive/` (Muster: Commit `b6b9bf8`).

Offen und bewusst nicht Teil dieses Plans, siehe Spec Abschnitt 7:

- Ursachenanalyse zu den Zeilen mit widersprüchlichem Altsystem-`ostsee`
- Bedeutung des Werts `2` in `ostsee_geo`
- Die Admin-Übersicht zeigt unter dem Label „Ostsee" die Spalte `inBalticSeaGeo`
- Aufnahme von Schlei, Trave, Elbe und Nord-Ostsee-Kanal
- Produktion: eigener Trockenlauf und eigene Freigabe
