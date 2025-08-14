/**
 * Frontend sighting interface
 */

import type { AnimalBehavior } from '$lib/report/formOptions/animalBehavior.js';
import type { SeaState } from '$lib/report/formOptions/seaState.js';
import type { Visibility } from '$lib/report/formOptions/visibility.js';
import type { BoatDrive } from '$lib/report/formOptions/boatDrive.js';
import type { Distance } from '$lib/report/formOptions/distance.js';
import type { Distribution } from '$lib/report/formOptions/distribution.js';
import type { SightingFrom } from '$lib/report/formOptions/sightingFrom.js';
import type { Species } from '$lib/report/formOptions/species.js';
import type { SightingModel } from './sighting.js';
import type { UploadedFileInfo } from './UploadedFile.js';

/**
 * Frontend-Repräsentation einer Sichtung.
 * Erweitert die Datenbank-Sichtung um typsichere Konstanten und gruppiert die Felder logisch.
 */
export interface FrontendSighting extends Omit<SightingModel, 'location'> {
	// Hier können zusätzliche Frontend-spezifische Eigenschaften definiert werden

	// Typisierte Versionen der numerischen DB-Felder
	species: Species;
	distribution: Distribution;
	distance: Distance;
	sightingFrom: SightingFrom;
	boatDrive: BoatDrive;
	seaState: SeaState;
	visibility?: Visibility;
	behavior?: AnimalBehavior;

	// Datei-Referenzen für Admin-Bearbeitung
	files?: UploadedFileInfo[];
}