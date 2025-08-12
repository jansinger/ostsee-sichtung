/**
 * Modern whale sighting form configuration
 * Based on form-design.md recommendations for optimal user experience
 */

import { sightingSchema } from '$lib/form/validation/sightingSchema';
import type { FormStep, SightingFormData } from './types';

export const sightingSchemaDescription = sightingSchema.describe();

export const initialFormState: SightingFormData =
	sightingSchemaDescription.default as SightingFormData;
export const sightingSchemaFields = sightingSchemaDescription.fields;

/**
 * Multi-step form structure following UX best practices
 * Step 1: Location & Time (position and temporal data)
 * Step 2: Sighting Details (species, count, circumstances)
 * Step 3: Behavioral observations (optional details)
 * Step 4: Observer information (contact data)
 */
export const formStepsConfig: FormStep[] = [
	{
		id: 'location-time',
		title: 'Position & Zeit',
		description: 'Wo und wann haben Sie die Sichtung gemacht?',
		fields: [
			'hasPosition',
			'latitude',
			'longitude',
			'waterway',
			'seaMark',
			'sightingDate',
			'sightingTime'
		]
	},
	{
		id: 'sighting-details',
		title: 'Sichtungsdetails',
		description: 'Was haben Sie genau beobachtet?',
		fields: [
			'species',
			'totalCount',
			'juvenileCount',
			'distance',
			'sightingFrom',
			'sightingFromText',
			'boatDrive',
			'boatDriveText',
			'isDead',
			'deadCondition',
			'deadSex',
			'deadSize',
			'informedAuthorities'
		]
	},
	{
		id: 'observations',
		title: 'Beobachtungen',
		description: 'Details zu Verhalten und Umweltbedingungen',
		fields: [
			'distribution',
			'distributionText',
			'behavior',
			'behaviorText',
			'otherObservations',
			'reaction',
			'shipCount',
			'seaState',
			'visibility',
			'windForce',
			'windDirection',
			'mediaFile',
			'mediaUpload',
			'mediaConsent'
		],
		isOptional: true
	},
	{
		id: 'contact',
		title: 'Kontaktdaten',
		description: 'Ihre Informationen für Rückfragen',
		fields: [
			'firstName',
			'lastName',
			'email',
			'phone',
			'street',
			'zipCode',
			'city',
			'shipName',
			'homePort',
			'boatType',
			'nameConsent',
			'shipNameConsent',
			'notes',
			'privacyConsent',
			'persistentDataConsent'
		]
	}
];
