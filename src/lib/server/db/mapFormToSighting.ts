import { EntryChannelEnum } from '$lib/report/formOptions/entryChannel';
import type { SightingFormData } from '$lib/report/types';
import type { NewSighting } from '$lib/types/sighting';
import { sql } from 'drizzle-orm';
import { correctCestOffsetUTC } from '../datetime/correctCestOffsetUTC';
import { checkBalticSeaFile } from '../geo/checkBalticSeaFile';

/**
 * Konvertiert Formulardaten in das Datenbankschema für Meeressäuger-Sichtungen.
 *
 * Diese zentrale Transformationsfunktion konvertiert die vom Frontend übermittelten
 * Formulardaten in die Struktur, die für die Datenbankpersistierung benötigt wird.
 * Sie führt dabei wichtige Validierungen und Datenverarbeitungen durch:
 *
 * - Erstellt PostGIS-Geometrie-Objekte für Koordinaten
 * - Validiert Koordinaten gegen Ostsee-Grenzen
 * - Kombiniert Datum und Zeit zu einem DateTime-Objekt
 * - Konvertiert String-IDs zu numerischen Werten
 * - Setzt Standard- und Berechnungswerte
 * - Behandelt optionale Felder sicher
 *
 * @param formData - Die vom Frontend übermittelten Formulardaten
 * @returns Ein strukturiertes Objekt entsprechend dem Datenbankschema
 *
 * @example
 * ```typescript
 * const formData: SightingFormData = {
 *   latitude: 54.5,
 *   longitude: 13.2,
 *   sightingDate: '2024-01-15',
 *   sightingTime: '14:30',
 *   species: '1',
 *   totalCount: '3',
 *   // ... weitere Felder
 * };
 *
 * const dbSighting = mapFormToSighting(formData);
 * // dbSighting enthält PostGIS-Geometrie, kombinierte DateTime, etc.
 * ```
 */
export function mapFormToSighting(formData: SightingFormData): NewSighting {
	/**
	 * SCHRITT 1: Geografische Koordinaten verarbeiten
	 * Erstellt PostGIS-Geometrie und validiert Ostsee-Zugehörigkeit
	 */
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
		// ST_MakePoint(longitude, latitude) - Achtung: X=Longitude, Y=Latitude!
		location = sql`ST_SetSRID(ST_MakePoint(${formData.longitude}, ${formData.latitude}), 4326)`;

		// Geografische Validierung: Prüfe ob Koordinaten in der Ostsee liegen
		({ inBaltic, inChartArea } = checkBalticSeaFile(
			Number(formData.longitude),
			Number(formData.latitude)
		));
	}

	/**
	 * SCHRITT 2: Datum/Zeit-Verarbeitung
	 * Kombiniert Datum und Zeit zu einem vollständigen DateTime-Objekt
	 */
	const sightingDate = formData.sightingDate ? new Date(formData.sightingDate) : null;

	// Zeit verarbeiten und mit Datum kombinieren wenn vorhanden
	let fullDateTime = null;
	if (sightingDate && formData.sightingTime) {
		// Parst Zeit im Format "HH:MM" und kombiniert mit Datum
		const timeParts = formData.sightingTime.split(':').map(Number);
		const hours = timeParts[0] || 0;
		const minutes = timeParts[1] || 0;

		// Erstelle neues Date-Objekt um Original nicht zu mutieren
		fullDateTime = new Date(sightingDate);
		fullDateTime.setHours(hours, minutes, 0, 0); // Sekunden und MS auf 0
		// Wenn der Server UTC ist, muss das Datum angepasst werden
		fullDateTime = correctCestOffsetUTC(fullDateTime);
	}

	/**
	 * SCHRITT 3: Datenbankschema-Objekt erstellen
	 * Konvertiert alle Formularfelder in das erwartete Datenbankformat
	 */
	return {
		// === METADATEN ===
		// ID wird automatisch durch Datenbanksequenz generiert
		created: new Date(), // Erstellungszeitpunkt

		// === GEOGRAFISCHE DATEN ===
		// Koordinaten als Strings für Datenbankkompatibilität
		latitude: formData.latitude ? String(formData.latitude) : null,
		longitude: formData.longitude ? String(formData.longitude) : null,
		// PostGIS-Geometrie für räumliche Abfragen
		location,
		// Gewässer und Seezeichen
		waterway: formData.waterway,
		seaMark: formData.seaMark,

		// === ZEITANGABEN ===
		// Nutzt kombinierte DateTime oder fällt auf aktuellen Zeitpunkt zurück
		sightingDate: fullDateTime ?? new Date(),

		// === TIERBEOBACHTUNG ===
		// Tierart (numerische ID aus Dropdown)
		species: formData.species ? Number(formData.species) : 0,
		// Anzahl Tiere
		totalCount: formData.totalCount ? Number(formData.totalCount) : 0,
		juvenileCount: formData.juvenileCount ? Number(formData.juvenileCount) : 0,
		// Totfund-spezifische Felder (boolean zu int-Konvertierung für SQLite)
		isDead: formData.isDead ? 1 : 0,
		deadCondition: formData.deadCondition ? Number(formData.deadCondition) : 0,
		deadSex: formData.deadSex ? Number(formData.deadSex) : 0,
		deadSize: formData.deadSize ? Number(formData.deadSize) : null,

		// === BEOBACHTUNGSDETAILS ===
		// Beobachtungsplattform (Land, Boot, etc.)
		sightingFrom: formData.sightingFrom ? Number(formData.sightingFrom) : 0,
		sightingFromText: formData.sightingFromText, // Freitext-Ergänzung
		// Entfernung zur Sichtung
		distance: formData.distance ? Number(formData.distance) : 0,
		// Verteilung der Tiere
		distribution: formData.distribution ? Number(formData.distribution) : 0,
		distributionText: formData.distributionText,
		// Verhalten der Tiere
		behavior: formData.behavior ? Number(formData.behavior) : 0,
		behaviorText: formData.behaviorText,
		// Reaktion auf Beobachter
		reaction: formData.reaction,

		// === UMWELTBEDINGUNGEN ===
		// Seegang (Beaufort-Skala)
		seaState: formData.seaState ? Number(formData.seaState) : 0,
		// Sichtweite
		visibility: formData.visibility ? Number(formData.visibility) : 0,
		// Windstärke als String (kann Bereiche enthalten)
		windForce: formData.windForce ? String(formData.windForce) : null,
		// Windrichtung (N, NW, W, etc.)
		windDirection: formData.windDirection,

		// === MEDIEN-UPLOADS ===
		// Legacy-Feld für externe Medien-URLs
		mediaFile: formData.mediaFile ? String(formData.mediaFile) : null,
		// Flag: Wurden Dateien hochgeladen? (bestimmt ob Dateien-Tab angezeigt wird)
		mediaUpload: formData.uploadedFiles.length > 0 ? 1 : 0,

		// === FAHRZEUG-/SCHIFFSDATEN ===
		// Schiffsname (optional)
		shipName: formData.shipName,
		// Heimathafen
		homePort: formData.homePort,
		// Bootstyp (Segelboot, Motorboot, etc.)
		boatType: formData.boatType,
		// Anzahl Schiffe in der Umgebung
		shipCount: formData.shipCount ? Number(formData.shipCount) : null,
		// Antriebsart
		boatDrive: formData.boatDrive ? Number(formData.boatDrive) : 0,
		boatDriveText: formData.boatDriveText, // Freitext-Ergänzung

		// === KONTAKTINFORMATIONEN ===
		// Persönliche Daten des Melder*in
		firstName: formData.firstName,
		lastName: formData.lastName,
		email: formData.email,
		phone: formData.phone,
		// Adresse
		street: formData.street,
		zipCode: formData.zipCode,
		city: formData.city,

		// === DATENSCHUTZ-EINWILLIGUNGEN ===
		// DSGVO-konforme Einwilligungen (boolean zu int)
		shipNameConsent: formData.shipNameConsent ? 1 : 0,
		nameConsent: formData.nameConsent ? 1 : 0,
		privacyConsent: formData.privacyConsent ? 1 : 0,

		// === SYSTEM-FELDER UND VALIDIERUNGEN ===
		// Eingabekanal (Web, Mobile App, Admin-Interface, etc.)
		entryChannel: formData.entryChannel
			? Number(formData.entryChannel)
			: Number(EntryChannelEnum.WEB), // Standard: Web-Formular
		// Admin-Flags
		verified: formData.verified ? 1 : 0, // Initial nicht verifiziert
		// Geografische Validierungen (basierend auf checkBalticSeaFile)
		inBalticSea: inBaltic ? 1 : 0, // Liegt in der Ostsee?
		inBalticSeaGeo: inChartArea ? 1 : 0, // Liegt im Karten-Bereich?
		// Totfund-Kontakt
		deadPhoneContact: formData.deadPhoneContact ? 1 : 0,

		// === FREITEXT-FELDER ===
		// Admin-Notizen (nur im Admin-Bereich sichtbar)
		notes: formData.notes,
		// Weitere Beobachtungen durch Melder*in
		otherObservations: formData.otherObservations,

		// === EINDEUTIGE KENNZEICHNUNG ===
		// Referenz-ID für Zuordnung von Dateien und Nachverfolgung
		referenceId: formData.referenceId
	};
}
