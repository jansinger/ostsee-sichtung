/**
 * Modern whale sighting form configuration
 * Richtlinien: docs/DESIGN_GUIDE.md, verbindliche Regeln: .claude/rules/design-system.md
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
/**
 * Contact field names that are persisted/restored between sessions.
 * Used by FormActions and Step4Contact to clear saved contact data
 * without a page reload.
 */
/**
 * Straße, PLZ und Ort werden seit dem Wegfall der Adressabfrage NICHT mehr
 * gespeichert (`UserContactData`), stehen hier aber weiterhin: „Kontaktdaten
 * löschen" soll auch einen Wert aufräumen, den ein früherer Besuch noch in den
 * Formular-State gespiegelt hat.
 */
export const USER_CONTACT_FIELDS = [
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
	'persistentDataConsent'
] as const;

export const formStepsConfig: FormStep[] = [
	{
		id: 'location-time',
		title: 'Position & Zeitpunkt',
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
		title: 'Angaben zum Tier',
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
			'deadPhoneContact'
		]
	},
	{
		id: 'observations',
		title: 'Weitere Informationen',
		description: 'Details zu Verhalten und Umweltbedingungen',
		fields: [
			'distribution',
			'distributionText',
			'behavior',
			'behaviorText',
			'reaction',
			'shipCount',
			'seaState',
			'visibility',
			'windForce',
			'shipName',
			'homePort',
			'boatType',
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
			'nameConsent',
			'shipNameConsent',
			'notes',
			'privacyConsent',
			'persistentDataConsent'
		]
	}
];
