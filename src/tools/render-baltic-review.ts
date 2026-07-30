/**
 * Erzeugt eine eigenstaendige Pruefkarte fuer die bereinigte Ostsee-Geometrie.
 *
 * Die Karte ist das Freigabe-Tor aus docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md,
 * Abschnitt 3.3: sie laeuft nach der Pipeline und vor jedem Schreibvorgang an
 * der Datenbank.
 *
 * Abweichung vom urspruenglichen Entwurf: Die Marker-Abfrage filtert NICHT
 * mehr auf die gespeicherte `ostsee`-Flag (Altsystem-Wert, widerspricht dem
 * heutigen Polygon in rund 8.900 von 19.491 Zeilen). Stattdessen werden alle
 * Koordinaten aus der Box geladen und in TypeScript gegen das alte
 * IHO-Polygon (rbush-Index, 5 Teilflaechen) geprueft. Nur was das alte
 * Polygon ablehnt, sind die eigentlichen Falsch-Negativen.
 *
 * Zweite Abweichung (Korrektur 4, 2026-07-30): die violetten Marker waren
 * bisher ausnahmslos alle Falsch-Negativen gegen das alte IHO-Polygon,
 * unabhaengig davon, ob die neue Wasserflaeche sie tatsaechlich aufnimmt.
 * Jeder Marker wird deshalb zusaetzlich gegen die neue Flaeche aus
 * baltic-water.geojson getestet (Bounding-Box-Vorfilter je Teilflaeche vor
 * `booleanPointInPolygon`, da die Datei rund 1.567 Teilflaechen hat) und in
 * zwei Gruppen eingefaerbt: violett = jetzt innerhalb ("durch die
 * Bereinigung gewonnen"), orange = weiterhin ausserhalb.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const ROOT = join(HERE, '..', '..');

interface Extent {
	minLongitude: number;
	maxLongitude: number;
	minLatitude: number;
	maxLatitude: number;
}

/** Ein Blatt des rbush-Index: eine der fuenf alten IHO-Teilflaechen. */
interface RBushLeaf {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	id: string;
	geometry: Polygon | MultiPolygon;
}

interface RBushIndex {
	tree: {
		children: RBushLeaf[];
	};
}

/** Eine Teilflaeche aus baltic-water.geojson mit vorab berechneter Bounding Box. */
interface WaterPart {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	feature: Feature<Polygon | MultiPolygon>;
}

function bboxOf(geometry: Polygon | MultiPolygon): [number, number, number, number] {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	const rings: number[][][] =
		geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
	for (const ring of rings) {
		for (const pos of ring) {
			const x = pos[0];
			const y = pos[1];
			if (x === undefined || y === undefined) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}
	return [minX, minY, maxX, maxY];
}

/**
 * Baut die Bounding-Box-Vorfilterung fuer die ~1.567 Teilflaechen der neuen
 * Wasserflaeche auf, damit `booleanPointInPolygon` nicht bei jedem der 1.901
 * Marker ueber alle Teilflaechen laufen muss.
 */
function loadWaterParts(): WaterPart[] {
	const water: FeatureCollection<Polygon | MultiPolygon> = JSON.parse(
		readFileSync(join(OUT, 'baltic-water.geojson'), 'utf8')
	);
	return water.features.map((feature) => {
		const [minX, minY, maxX, maxY] = bboxOf(feature.geometry);
		return { minX, minY, maxX, maxY, feature };
	});
}

/** Prueft einen Punkt gegen die neue Wasserflaeche (Bounding-Box-Vorfilter je Teilflaeche). */
function isInNewWater(lon: number, lat: number, parts: ReadonlyArray<WaterPart>): boolean {
	const candidate = point([lon, lat]);
	return parts.some((part) => {
		if (lon < part.minX || lon > part.maxX || lat < part.minY || lat > part.maxY) {
			return false;
		}
		return booleanPointInPolygon(candidate, part.feature.geometry);
	});
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
 * Laedt alle Sichtungs-Koordinaten aus der Box. Bewusst OHNE Filter auf die
 * gespeicherte `ostsee`-Flag — siehe Kommentar am Dateikopf.
 */
function loadBoxCoordinates(): Array<[number, number]> {
	const sql = `
		SELECT gps_laenge::float8, gps_breite::float8 FROM sichtungen
		WHERE gps_laenge IS NOT NULL AND gps_breite IS NOT NULL
		  AND gps_laenge BETWEEN 9.4 AND 30.4 AND gps_breite BETWEEN 53.0 AND 66.0`;
	const url = process.env.DATABASE_POSTGRES_URL;
	if (!url) throw new Error('DATABASE_POSTGRES_URL fehlt — .env laden');
	const raw = execFileSync('psql', [url, '-tA', '-F', ',', '-c', sql], { encoding: 'utf8' });
	return raw
		.trim()
		.split('\n')
		.filter(Boolean)
		.map((line): [number, number] => {
			const [lonRaw, latRaw] = line.split(',');
			return [Number(lonRaw), Number(latRaw)];
		});
}

/**
 * Filtert auf Punkte, die das alte IHO-Polygon ablehnt (Bounding-Box-Vorfilter
 * je Teilflaeche, dann booleanPointInPolygon). Das sind die bisherigen
 * Falsch-Negativen — sie muessen jetzt innerhalb der neuen Wasserflaeche
 * liegen.
 */
function filterRejectedByOldPolygon(
	coordinates: ReadonlyArray<[number, number]>
): Array<[number, number]> {
	const index: RBushIndex = JSON.parse(
		readFileSync(join(ROOT, 'src', 'lib', 'server', 'geo', 'rbush-index.json'), 'utf8')
	);
	const leaves = index.tree.children;

	return coordinates.filter(([lon, lat]) => {
		const candidate = point([lon, lat]);
		const acceptedByOldPolygon = leaves.some((leaf) => {
			if (lon < leaf.minX || lon > leaf.maxX || lat < leaf.minY || lat > leaf.maxY) {
				return false;
			}
			return booleanPointInPolygon(candidate, leaf.geometry);
		});
		return !acceptedByOldPolygon;
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

	const boxCoordinates = loadBoxCoordinates();
	const falseNegatives = filterRejectedByOldPolygon(boxCoordinates);

	const waterParts = loadWaterParts();
	const gewonnen: Array<[number, number]> = [];
	const bleibtAussen: Array<[number, number]> = [];
	for (const [lon, lat] of falseNegatives) {
		if (isInNewWater(lon, lat, waterParts)) {
			gewonnen.push([lon, lat]);
		} else {
			bleibtAussen.push([lon, lat]);
		}
	}

	const payload = {
		water,
		iho,
		mask,
		extent,
		fehlerA: FEHLER_A,
		gewonnen,
		bleibtAussen
	};

	writeFileSync(join(OUT, 'review-data.js'), `window.REVIEW = ${JSON.stringify(payload)};`);
	writeFileSync(join(OUT, 'baltic-review.html'), HTML);
	console.log('Geschrieben:', join(OUT, 'baltic-review.html'));
	console.log('Marker gesamt (bisherige Falsch-Negative):', falseNegatives.length);
	console.log('  davon jetzt innerhalb (gewonnen):', gewonnen.length);
	console.log('  davon weiterhin ausserhalb:', bleibtAussen.length);
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

// Bisherige Falsch-Negative, jetzt in zwei Gruppen:
// violett = durch die Bereinigung gewonnen (jetzt innerhalb der neuen Flaeche)
// orange  = bleibt ausserhalb (auch nach der Bereinigung kein Wasser)
const gewonnen = L.layerGroup(R.gewonnen.map(function (p) {
  return L.circleMarker([p[1], p[0]], { radius: 3, color: '#7c3aed', weight: 1, fillOpacity: 0.8 });
})).addTo(map);
const bleibtAussen = L.layerGroup(R.bleibtAussen.map(function (p) {
  return L.circleMarker([p[1], p[0]], { radius: 3, color: '#c2410c', fillColor: '#f97316', weight: 1, fillOpacity: 0.9 });
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
    '<span class="sw" style="background:#7c3aed;border-radius:50%"></span>' + R.gewonnen.length +
      ' durch die Bereinigung gewonnen <i>(jetzt innerhalb)</i><br>' +
    '<span class="sw" style="background:#f97316;border-radius:50%"></span>' + R.bleibtAussen.length +
      ' bleiben ausserhalb <i>(auch nach der Bereinigung kein Wasser)</i><br>' +
    '<span class="sw" style="background:#ef4444;border-radius:50%"></span>Fehler-A-Punkte <i>(muessen draussen liegen)</i>';
  return d;
};
legend.addTo(map);
L.control.scale({ imperial: false }).addTo(map);
</script>
</body>
</html>`;

main();
