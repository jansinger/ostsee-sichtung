import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import type { SightingFormData } from '$lib/report/types';
import type { NewSighting } from '$lib/types/sighting';
import { sql } from 'drizzle-orm';
import { checkBalticSea } from './checkBalticSea';

/**
 * Konvertiert die Formulardaten in das Datenbankschema
 *
 * @param formData - Die Rohdaten aus dem Formular
 * @returns Ein strukturiertes Objekt entsprechend dem Datenbankschema
 */

export async function mapFormToSighting(formData: SightingFormData): Promise<NewSighting> {
	// Erstelle ein Point-Objekt für PostGIS, wenn Koordinaten vorhanden sind
	let location = null;
	let inBaltic = false,
		inChartArea = false;
	if (
		formData.latitude &&
		formData.longitude &&
		!isNaN(formData.latitude) &&
		!isNaN(formData.longitude)
	) {
		// PostGIS erwartet SRID 4326 für WGS84 (GPS-Koordinaten)
		location = sql`ST_SetSRID(ST_MakePoint(${formData.longitude}, ${formData.latitude}), 4326)`;
		({ inBaltic, inChartArea } = await checkBalticSea(
			Number(formData.longitude),
			Number(formData.latitude)
		));
	}

	// Datumsverarbeitung
	const sightingDate = formData.sightingDate ? new Date(formData.sightingDate) : null;

	// Zeit verarbeiten und mit Datum kombinieren wenn vorhanden
	let fullDateTime = null;
	if (sightingDate && formData.sightingTime) {
		const timeParts = formData.sightingTime.split(':').map(Number);
		const hours = timeParts[0] || 0;
		const minutes = timeParts[1] || 0;
		fullDateTime = new Date(sightingDate);
		fullDateTime.setHours(hours, minutes, 0, 0);
	}

	// Erstelle das Sichtungs-Objekt entsprechend dem Datenbankschema
	return {
		// ID wird automatisch generiert, daher nicht hier setzen
		// Metadaten
		created: new Date().toISOString(),

		// Koordinaten direkt
		latitude: formData.latitude ? String(formData.latitude) : null,
		longitude: formData.longitude ? String(formData.longitude) : null,

		// Standort
		location,
		waterway: formData.waterway,
		seaMark: formData.seaMark,

		// Zeitpunkt
		sightingDate: fullDateTime ? fullDateTime.toISOString() : new Date().toISOString(),

		// Tierangaben
		species: formData.species ? Number(formData.species) : 0,
		totalCount: formData.totalCount ? Number(formData.totalCount) : 0,
		juvenileCount: formData.juvenileCount ? Number(formData.juvenileCount) : 0,
		isDead: formData.isDead ? 1 : 0,
		deadCondition: formData.deadCondition ? Number(formData.deadCondition) : 0,
		deadSex: formData.deadSex ? Number(formData.deadSex) : 0,
		deadSize: formData.deadSize ? Number(formData.deadSize) : null,

		// Zusatzinformationen
		sightingFrom: formData.sightingFrom ? Number(formData.sightingFrom) : 0,
		sightingFromText: formData.sightingFromText,
		distance: formData.distance ? Number(formData.distance) : 0,
		distribution: formData.distribution ? Number(formData.distribution) : 0,
		distributionText: formData.distributionText,
		behavior: formData.behavior ? Number(formData.behavior) : 0,
		behaviorText: formData.behaviorText,
		reaction: formData.reaction,

		// Umweltbedingungen
		seaState: formData.seaState ? Number(formData.seaState) : 0,
		visibility: formData.visibility ? Number(formData.visibility) : 0,
		windForce: formData.windForce ? String(formData.windForce) : null,
		windDirection: formData.windDirection,

		// Medienangaben
		mediaFile: formData.mediaFile ? String(formData.mediaFile) : null,
		// Falls Bilder hochgeladen wurden, mediaUpload auf true setzen
		mediaUpload: formData.uploadedFiles.length > 0 ? 1 : 0,

		// Schiffsangaben
		shipName: formData.shipName,
		homePort: formData.homePort,
		boatType: formData.boatType,
		shipCount: formData.shipCount ? Number(formData.shipCount) : null,
		boatDrive: formData.boatDrive ? Number(formData.boatDrive) : 0,
		boatDriveText: formData.boatDriveText,

		// Kontaktdaten
		firstName: formData.firstName,
		lastName: formData.lastName,
		email: formData.email,
		phone: formData.phone,
		street: formData.street,
		zipCode: formData.zipCode,
		city: formData.city,

		// Einwilligungen
		shipNameConsent: formData.shipNameConsent ? 1 : 0,
		nameConsent: formData.nameConsent ? 1 : 0,
		privacyConsent: formData.privacyConsent ? 1 : 0,

		// Weitere Felder mit Standardwerten
		entryChannel: Number(EntryChannelEnum.WEB), // Web-Formular
		verified: 0, // Initial nicht verifiziert
		inBalticSea: inBaltic ? 1 : 0, // Annahme, dass es nicht in der Ostsee ist
		inBalticSeaGeo: inChartArea ? 1 : 0, // Annahme, dass es nicht im Chart-Bereich ist,
		deadPhoneContact: formData.deadPhoneContact ? 1 : 0,

		// Sonstiges
		notes: formData.notes,
		otherObservations: formData.otherObservations,

		// Eindeutige Referenz-ID des Formulares
		referenceId: formData.referenceId
	};
}
