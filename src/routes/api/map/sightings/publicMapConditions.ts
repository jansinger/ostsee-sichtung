/**
 * @fileoverview Geteilte Grundmenge für die öffentliche Sichtungskarte.
 *
 * Der Feature-Endpoint (`GET /api/map/sightings`) und der Jahres-Endpoint
 * (`GET /api/map/sightings/years`) müssen exakt dieselben Sichtungen zählen —
 * sonst zeigt das Jahres-Dropdown Zahlen, die auf der Karte nicht auftauchen.
 * Die Bedingungsliste liegt deshalb hier einmal statt doppelt in beiden Routen.
 *
 * Zusätzlich zur öffentlichen Freigabe (`approvedOnly()`, siehe
 * `.claude/rules/api.md`) werden NULL- und unplausible Koordinaten
 * herausgefiltert: `sightingsToGeoJSON` (`$lib/map/mapUtils`) fällt bei
 * NULL-Koordinaten auf `[0, 0]` zurück ("Null Island"). Dieser Serverfilter
 * macht den Fallback für die Karte unerreichbar, ohne die Funktion selbst
 * anzufassen — andere Aufrufer von `sightingsToGeoJSON` bleiben unverändert.
 */

import { approvedOnly } from '$lib/server/db/approvalFilter';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { BALTIC_SEA_BBOX } from '$lib/utils/geo/checkBalticSea';
import { gte, isNotNull, lte, type SQL } from 'drizzle-orm';

/**
 * Bedingungen für die öffentliche Grundmenge der Sichtungskarte: freigegeben
 * und mit plausiblen Ostsee-Koordinaten (Bounding Box aus `checkBalticSea.ts`,
 * nicht dupliziert).
 *
 * Wird per `...publicMapSightingConditions()` in ein `and(...)` gespreizt.
 */
export function publicMapSightingConditions(): SQL[] {
	return [
		approvedOnly(),
		isNotNull(sightingsTable.latitude),
		isNotNull(sightingsTable.longitude),
		gte(sightingsTable.latitude, BALTIC_SEA_BBOX.minLatitude.toString()),
		lte(sightingsTable.latitude, BALTIC_SEA_BBOX.maxLatitude.toString()),
		gte(sightingsTable.longitude, BALTIC_SEA_BBOX.minLongitude.toString()),
		lte(sightingsTable.longitude, BALTIC_SEA_BBOX.maxLongitude.toString())
	];
}
