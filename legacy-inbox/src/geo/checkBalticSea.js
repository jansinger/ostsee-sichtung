// @ts-nocheck — reines JavaScript ohne Typdeklarationen (siehe CLAUDE.md, Legacy REST API);
// erst seit Aufgabe 9 von src/tests/contract importiert und damit von tsc erreichbar.
import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { multiPolygon, point, polygon } from '@turf/helpers';
import RBush from 'rbush';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { protokolliere } from '../logger.js';

/**
 * Portiert aus src/lib/server/geo/checkBalticSeaFile.ts.
 *
 * Zwei Stufen wie im Original: eine schnelle Bounding-Box-Prüfung für den
 * Kartenbereich, danach ein Punkt-in-Polygon-Test über den vorkompilierten
 * RBush-Index für die eigentliche Ostsee-Geometrie.
 *
 * @throws Gibt niemals Exceptions — jeder Fehler beim Laden des Index oder
 * bei der Geometrie-Prüfung degradiert zu `inBaltic: false`. Die schnelle
 * Bounding-Box-Prüfung (`inChartArea`) braucht keinen Index und liefert
 * unabhängig davon ihr echtes Ergebnis.
 */

/**
 * Kopie von BALTIC_SEA_BBOX aus src/lib/utils/geo/checkBalticSea.ts.
 *
 * Nicht von Hand pflegen: die Werte sind dort der Extent der bereinigten
 * Ostsee-Geometrie (`src/lib/server/geo/baltic-extent.json`, nach außen auf
 * 0,05° gerundet, erzeugt von `npm run geo:build`). Ändert sich die Geometrie,
 * ändert sich die Box — dieser Dienst muss dann nachgezogen werden.
 * `src/tests/contract/legacy-inbox.sync.contract.test.ts` in der Hauptanwendung
 * schlägt fehl, solange das nicht passiert ist.
 *
 * - West: 9,40°E — innere Flensburger Förde (das Skagerrak gehört nicht dazu)
 * - Ost: 30,25°E — Kopf der Newa-Bucht
 * - Süd: 53,55°N — Oder bei Police
 * - Nord: 65,95°N — Bottenwiek bei Tornio
 */
export const BBOX = { minLon: 9.4, maxLon: 30.25, minLat: 53.55, maxLat: 65.95 };

/**
 * Kopie von GEO_LIMITS aus src/lib/utils/geo/checkBalticSea.ts — die globalen
 * WGS84-Grenzen für die Plausibilitätsprüfung vor der Bounding-Box.
 */
export const GRENZEN = { minLon: -180, maxLon: 180, minLat: -90, maxLat: 90 };

const HIER = path.dirname(fileURLToPath(import.meta.url));

let index = null;
// Merkt sich einen fehlgeschlagenen Ladeversuch, damit nicht bei jeder
// Anfrage erneut versucht (und protokolliert) wird, dieselbe kaputte
// Index-Datei zu parsen.
let indexLadenFehlgeschlagen = false;

function ladeIndex() {
	if (index === null && !indexLadenFehlgeschlagen) {
		try {
			const roh = JSON.parse(readFileSync(path.join(HIER, 'rbush-index.json'), 'utf8'));
			const baum = new RBush();
			baum.fromJSON(roh.tree);
			index = baum;
		} catch (fehler) {
			indexLadenFehlgeschlagen = true;
			protokolliere('fehler', 'baltic_index_laden_fehlgeschlagen', {
				meldung: fehler instanceof Error ? fehler.message : String(fehler)
			});
		}
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
	try {
		const baum = ladeIndex();
		if (!baum) return false;

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
	} catch {
		// Jeder unerwartete Fehler bei Index-Zugriff oder Geometrie-Prüfung
		// degradiert zu false, statt die Anfrage scheitern zu lassen.
		return false;
	}
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
