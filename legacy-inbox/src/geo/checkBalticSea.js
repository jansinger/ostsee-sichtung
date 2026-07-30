import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { multiPolygon, point, polygon } from '@turf/helpers';
import RBush from 'rbush';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Portiert aus src/lib/server/geo/checkBalticSeaFile.ts.
 *
 * Zwei Stufen wie im Original: eine schnelle Bounding-Box-Prüfung für den
 * Kartenbereich, danach ein Punkt-in-Polygon-Test über den vorkompilierten
 * RBush-Index für die eigentliche Ostsee-Geometrie.
 */

// Identisch mit CHART_AREA_ENVELOPE in PostGIS.
const BBOX = { minLon: 9.4, maxLon: 30.2, minLat: 53.0, maxLat: 66.0 };
const GRENZEN = { minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 };

const HIER = path.dirname(fileURLToPath(import.meta.url));

let index = null;

function ladeIndex() {
	if (index === null) {
		const roh = JSON.parse(readFileSync(path.join(HIER, 'rbush-index.json'), 'utf8'));
		index = new RBush();
		index.fromJSON(roh.tree);
	}
	return index;
}

function imKartenbereich(longitude, latitude) {
	return (
		longitude >= BBOX.minLon &&
		longitude <= BBOX.maxLon &&
		latitude >= BBOX.minLat &&
		latitude <= BBOX.maxLat
	);
}

function inOstseeGeometrie(longitude, latitude) {
	const baum = ladeIndex();
	const kandidaten = baum.search({
		minX: longitude,
		minY: latitude,
		maxX: longitude,
		maxY: latitude
	});

	if (!kandidaten || kandidaten.length === 0) return false;

	const punkt = point([longitude, latitude]);

	for (const kandidat of kandidaten) {
		const geometrie = kandidat.geometry;
		if (!geometrie || !Array.isArray(geometrie.coordinates)) continue;

		try {
			if (geometrie.type === 'Polygon') {
				if (booleanPointInPolygon(punkt, polygon(geometrie.coordinates))) return true;
			} else if (geometrie.type === 'MultiPolygon') {
				if (booleanPointInPolygon(punkt, multiPolygon(geometrie.coordinates))) return true;
			}
		} catch {
			// Beschädigte Einzelgeometrie überspringen, nicht die ganze Prüfung
			// aufgeben — das Original verhält sich ebenso.
			continue;
		}
	}

	return false;
}

export function checkBalticSea(longitude, latitude) {
	if (typeof longitude !== 'number' || typeof latitude !== 'number') {
		return { inBaltic: false, inChartArea: false };
	}
	if (Number.isNaN(longitude) || Number.isNaN(latitude)) {
		return { inBaltic: false, inChartArea: false };
	}
	if (
		longitude < GRENZEN.minLon ||
		longitude > GRENZEN.maxLon ||
		latitude < GRENZEN.minLat ||
		latitude > GRENZEN.maxLat
	) {
		return { inBaltic: false, inChartArea: false };
	}

	return {
		inChartArea: imKartenbereich(longitude, latitude),
		inBaltic: inOstseeGeometrie(longitude, latitude)
	};
}
