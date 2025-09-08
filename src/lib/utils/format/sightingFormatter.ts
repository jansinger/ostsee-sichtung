import {
	getAnimalBehaviorLabel,
	type AnimalBehaviorEnum
} from '$lib/report/formOptions/animalBehavior';
import { getDistanceLabel, type DistanceEnum } from '$lib/report/formOptions/distance';
import { getSpeciesLabel, isValidSpecies, type SpeciesEnum } from '$lib/report/formOptions/species';
import type { SightingFormValues } from '$lib/types/Form';
import { formatLocalDateTime } from './dateTime';
import { formatLocation } from './formatLocation';

/**
 * Enhanced sighting data with translated enum values for display
 */
export interface FormattedSightingData
	extends Omit<SightingFormValues, 'species' | 'behavior' | 'distance'> {
	species: string;
	speciesRaw?: SpeciesEnum | number;
	behavior?: string;
	behaviorRaw?: AnimalBehaviorEnum | number;
	distance?: string;
	distanceRaw?: DistanceEnum | number;
	sightingDate: string;
	coordinatesFormatted: string | null;
}

/**
 * Formats sighting data for email templates and display
 * Translates enum values to human-readable German labels
 */
export function formatSightingForDisplay(sighting: SightingFormValues): FormattedSightingData {
	// Destructure and omit the properties we'll replace
	const { species, behavior, distance, ...restSighting } = sighting;

	const formatted: FormattedSightingData = {
		...restSighting,
		// Translate species enum to German label
		species: getSpeciesLabel(species as SpeciesEnum),
		speciesRaw: species as SpeciesEnum,

		// Format date for display
		sightingDate: sighting.sightingDatetime ? formatLocalDateTime(sighting.sightingDatetime) : '',

		// Format coordinates for display
		coordinatesFormatted:
			sighting.longitude && sighting.latitude
				? formatLocation(sighting.longitude, sighting.latitude)
				: null
	};

	// Translate behavior enum to German label if present
	if (behavior) {
		formatted.behavior = getAnimalBehaviorLabel(behavior as AnimalBehaviorEnum);
		formatted.behaviorRaw = behavior as AnimalBehaviorEnum;
	}

	// Translate distance enum to German label if present
	if (distance) {
		formatted.distance = getDistanceLabel(distance as DistanceEnum);
		formatted.distanceRaw = distance as DistanceEnum;
	}

	return formatted;
}

/**
 * Checks if species value indicates unknown or missing species for spam detection
 */
export function isUnknownOrMissingSpecies(species: unknown): boolean {
	if (!species && species !== 0) return true;

	const numericValue = typeof species === 'string' ? parseInt(species, 10) : species;

	// Check if it's a valid species enum
	if (!isValidSpecies(numericValue)) return true;

	// Check if it's one of the "unknown" species values
	const unknownSpeciesValues = [8, 10]; // UNKNOWN_WHALE, UNKNOWN_SEAL
	return unknownSpeciesValues.includes(numericValue as number);
}

/**
 * Gets the species label for spam detection (uses enum values correctly)
 */
export function getSpeciesForSpamCheck(species: unknown): string {
	if (!species && species !== 0) return '';

	const numericValue = typeof species === 'string' ? parseInt(species, 10) : species;
	return getSpeciesLabel(numericValue as SpeciesEnum);
}
