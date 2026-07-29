import { AnimalBehaviorEnum } from '$lib/report/formOptions/animalBehavior';
import { BoatDriveEnum } from '$lib/report/formOptions/boatDrive';
import { DistributionEnum } from '$lib/report/formOptions/distribution';
import { SightingFromEnum } from '$lib/report/formOptions/sightingFrom';
import { SpeciesEnum } from '$lib/report/formOptions/species';
/**
 * @fileoverview Field mapping adapter for PDF-compliant Legacy REST API
 *
 * Provides bidirectional field mapping between legacy API format and current schema.
 * Handles data transformation, validation, and format conversion for backwards compatibility.
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import type { SightingFormData } from '$lib/types';
import { createId } from '@paralleldrive/cuid2';
import type { LegacySightingRequest } from './types.js';

/**
 * Maps legacy API request to current SightingFormData format
 *
 * @param legacyData - Legacy API request data
 * @returns Transformed data in current schema format
 */
export function mapLegacyToCurrentSchema(legacyData: LegacySightingRequest): SightingFormData {
	// Parse the single datetime field (YYYY-MM-DD HH:MI) into separate date and time
	const { sightingDate, sightingTime } = parseLegacyDateTimeToFields(legacyData.sichtungsdatum);

	return {
		// Date and location
		sightingDate,
		sightingTime,
		latitude: legacyData.gps_breite || 0,
		longitude: legacyData.gps_laenge || 0,
		waterway: legacyData.fahrwasser || '',
		seaMark: legacyData.seezeichen || '',

		// Observer information
		firstName: legacyData.vorname,
		lastName: legacyData.name, // Note: "name" in legacy API, not "nachname"
		email: legacyData.email,
		phone: legacyData.telefon || '',
		street: legacyData.strasse || '',
		zipCode: legacyData.plz || '',
		city: legacyData.ort || '',

		// Sighting details
		totalCount: legacyData.anzahl_gesamt,
		juvenileCount: legacyData.anzahl_jung || 0,
		// Bleibt bei 0: Die Spec dokumentiert für `tierart` ausdrücklich
		// "Default = 0" (= Schweinswal). Das ist ein zugesagter Vertrag,
		// kein Versehen — anders als bei den Feldern darunter.
		species: legacyData.tierart ?? SpeciesEnum.HARBOR_PORPOISE,

		// Observation context
		// `??` statt `||`: Eine übermittelte 0 ist die aktive Auswahl "Sonstiges"
		// und darf nicht zum Sentinel werden. Die Spec sagt für dieses Feld
		// keinen Default zu — "nicht übermittelt" ist deshalb "keine Angabe",
		// nicht "Sonstiges".
		sightingFrom: legacyData.vonwo ?? SightingFromEnum.UNKNOWN, // vonwo maps to sightingFrom
		sightingFromText: legacyData.vonwo_text || '',
		distance: legacyData.entfernung || 0,
		distribution: legacyData.verteilung ?? DistributionEnum.UNKNOWN,
		distributionText: legacyData.verteilung_text, // Legacy API doesn't separate this
		behavior: legacyData.verhalten ?? AnimalBehaviorEnum.UNKNOWN,
		behaviorText: legacyData.verhalten_text, // Legacy API doesn't separate this
		reaction: legacyData.reaktion || '',

		// Environmental conditions
		seaState: legacyData.seegang || 0,
		windDirection:
			legacyData.windrichtung &&
			['', 'N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'].includes(legacyData.windrichtung as string)
				? (legacyData.windrichtung as '' | 'N' | 'NW' | 'W' | 'SW' | 'S' | 'SO' | 'O' | 'NO')
				: '',
		windForce: legacyData.windstaerke ? Number(legacyData.windstaerke) : undefined,
		visibility: legacyData.sichtweite || 0,

		// Vessel information
		shipName: legacyData.schiffsname || '',
		homePort: legacyData.heimathafen || '',
		boatType: legacyData.bootstyp || '',
		boatDrive: legacyData.bootsantrieb ?? BoatDriveEnum.NONE,
		boatDriveText: legacyData.bootsantrieb_text, // Legacy API doesn't separate this

		// Media and observations
		mediaFile: legacyData.aufnahme || '',
		mediaUpload: legacyData.aufnahmeHochladen ? true : false,
		otherObservations: legacyData.sonstige_auffälligkeiten || '',
		notes: legacyData.bemerkungen || '',

		// Consent flags (convert 0/1 to boolean)
		nameConsent: legacyData.namensnennung ? true : false,
		shipNameConsent: legacyData.schiffnamensnennung ? true : false,
		privacyConsent: legacyData.datenschutzEinverstaendnis ? true : false,

		// Death finding detection and fields
		isDead: legacyData.anzahl_gesamt === 0 ? true : false,
		deadSize: legacyData.totfund_groesse || undefined,
		deadCondition: legacyData.totfund_zustand || 0,
		deadSex: legacyData.totfund_geschlecht || 0,
		deadPhoneContact: legacyData.totfund_telefon ? true : false,

		// System fields
		entryChannel: legacyData.eingangskanal || EntryChannelEnum.APP,
		shipCount: legacyData.anzahl_schiffe || undefined, // Legacy API doesn't track ship count separately

		// Required fields that legacy API doesn't provide
		verified: false,
		referenceId: createId(), // Generate a reference ID for legacy imports
		uploadedFiles: [], // Legacy API handles media differently
		hasPosition: !!(legacyData.gps_breite && legacyData.gps_laenge), // True if coordinates provided

		// Additional required fields
		persistentDataConsent: false, // Legacy API users implicitly consent to data storage
		// Legacy-Clients kennen das Feld nicht und können die Veröffentlichung
		// von Aufnahmen daher nicht erklären. Ein `true` würde einen
		// Einwilligungsnachweis erfinden (siehe mediaConsent.test.ts).
		mediaConsent: false
	};
}

/**
 * Parses legacy datetime string (YYYY-MM-DD HH:MI) into separate date and time fields
 *
 * @param datetime - DateTime in "YYYY-MM-DD HH:MI" format
 * @returns Object with separate sightingDate and sightingTime fields
 */
function parseLegacyDateTimeToFields(datetime: string): {
	sightingDate: string;
	sightingTime: string;
} {
	// Split datetime into date and time parts
	const parts = datetime.trim().split(' ');
	if (parts.length !== 2) {
		throw new Error(`Invalid datetime format: ${datetime}. Expected "YYYY-MM-DD HH:MI"`);
	}

	const date = parts[0]!;
	const time = parts[1]!;

	// Validate date format (YYYY-MM-DD)
	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(date)) {
		throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
	}

	// Validate time format (HH:MM)
	const timeRegex = /^\d{2}:\d{2}$/;
	if (!timeRegex.test(time)) {
		throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
	}

	// Return ISO date string and time string
	return {
		sightingDate: new Date(date + 'T12:00:00.000Z').toISOString(), // Use date at noon UTC to prevent timezone issues
		sightingTime: time
	};
}
