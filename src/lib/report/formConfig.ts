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
			// `seaMark` steht hier bewusst NICHT mehr: Die Ortsbeschreibung ist seit
			// A2.4 ein einziges Freitextfeld (`waterway`). Schema-Eintrag und
			// DB-Spalte `seezeichen` bleiben — die Admin-Maske und die Legacy-API
			// schreiben es weiter.
			'waterway',
			'sightingDate',
			'sightingTime'
		]
	},
	{
		id: 'sighting-details',
		title: 'Angaben zum Tier',
		description: 'Was haben Sie genau beobachtet?',
		fields: [
			// Die Medien-Felder stehen seit dem 2026-08-04 hier und VOR den
			// Tierangaben (Wunsch des Museums: „Foto hochladen als erste Abfrage noch
			// vor Tierinformation"). Der Grund wiegt schwerer als die Reihenfolge: Auf
			// Schritt 3 stand der Upload unter dem prominenten „Schritt
			// überspringen"-Knopf und blieb damit für jeden unsichtbar, der ihn
			// benutzte — obwohl Aufnahmen die wertvollste Einzelangabe der Meldung
			// sind. Schritt 2 ist Pflichtschritt.
			//
			// Die Reihenfolge in dieser Liste ist nicht kosmetisch: `findStepForErrors`
			// läuft sie ab, um zum ersten fehlerhaften Feld zu springen.
			'mediaFile',
			'mediaUpload',
			'mediaConsent',
			'species',
			'totalCount',
			'juvenileCount',
			'distance',
			'sightingFrom',
			'sightingFromText',
			'boatDrive',
			// `boatDriveText` steht hier bewusst NICHT mehr: Es hängt an
			// `BoatDriveEnum.OTHER`, und das Meldeformular bietet seit dem 2026-08-04
			// nur noch "Motor lief"/"Motor lief nicht" an (PR 4). Schema-Eintrag und
			// DB-Spalte `bootsantrieb_text` bleiben — die Admin-Maske schreibt es weiter.
			'isDead',
			'deadCondition',
			// `deadSex` steht hier bewusst NICHT mehr: Das Museum hat das Geschlecht
			// beim Totfund am 2026-08-04 aus dem Meldeformular abbestellt (C4) —
			// Laien können es am Strand kaum bestimmen. Schema-Eintrag und DB-Spalte
			// `totfund_geschlecht` bleiben — die Admin-Maske schreibt es weiter.
			'deadSize',
			'deadPhoneContact'
		]
	},
	{
		id: 'observations',
		title: 'Weitere Informationen',
		description: 'Details zu Verhalten und Umweltbedingungen',
		fields: [
			// `distribution`/`distributionText` stehen hier bewusst NICHT mehr: Das
			// Museum hat das Feld am 2026-08-04 aus dem Meldeformular abbestellt —
			// es lässt sich aus der Anzahl der Tiere erschließen. Schema-Eintrag und
			// DB-Spalte `verteilung` bleiben — die Admin-Maske schreibt es weiter.
			'behavior',
			'behaviorText',
			'reaction',
			'shipCount',
			'seaState',
			'visibility',
			'windForce',
			'shipName',
			'homePort',
			'boatType'
			// `mediaFile`/`mediaUpload`/`mediaConsent` stehen seit dem 2026-08-04 im
			// Schritt „sighting-details" — Begründung dort.
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
