/**
 * @fileoverview Adapter DB-Zeile → `FrontendSighting` für die Export-Routen.
 *
 * Die Exporter in `$lib/server/export/*` arbeiten auf `FrontendSighting`. Eine
 * Select-Zeile aus `sichtungen` ist feldgleich; nur die numerischen Codes sind
 * dort als Enum typisiert und die PostGIS-Geometrie gehört nicht zum Export.
 */

import type { AnimalBehavior } from '$lib/report/formOptions/animalBehavior';
import type { BoatDrive } from '$lib/report/formOptions/boatDrive';
import type { Distance } from '$lib/report/formOptions/distance';
import type { Distribution } from '$lib/report/formOptions/distribution';
import type { SeaState } from '$lib/report/formOptions/seaState';
import type { SightingFrom } from '$lib/report/formOptions/sightingFrom';
import type { Species } from '$lib/report/formOptions/species';
import type { Visibility } from '$lib/report/formOptions/visibility';
import type { sightings } from '$lib/server/db/schema';
import type { FrontendSighting } from '$lib/types/index';
import type { InferSelectModel } from 'drizzle-orm';

type SightingRow = InferSelectModel<typeof sightings>;

export function toFrontendSighting(row: SightingRow): FrontendSighting {
	const { location: _location, ...rest } = row;

	return {
		...rest,
		species: rest.species as Species,
		distribution: rest.distribution as Distribution,
		distance: rest.distance as Distance,
		sightingFrom: rest.sightingFrom as SightingFrom,
		boatDrive: rest.boatDrive as BoatDrive,
		seaState: rest.seaState as SeaState,
		visibility: rest.visibility as Visibility,
		behavior: rest.behavior as AnimalBehavior
	};
}
