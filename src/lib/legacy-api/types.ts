/**
 * @fileoverview Type definitions for PDF-compliant Legacy REST API
 * 
 * Defines the interface contracts for the legacy mobile app API compatibility layer.
 * These types match EXACTLY the original schweinswalsichtung.de API specification 
 * from the PDF documentation. Field names MUST NOT be changed!
 * 
 * @author Ostsee-Tiere Team  
 * @since 1.10.0
 */

/**
 * Legacy API request format for creating sightings
 * Field names MUST match exactly with the PDF specification
 * NO CHANGES ALLOWED - mobile apps depend on exact field names!
 */
export interface LegacySightingRequest {
	// Required fields
	sichtungsdatum: string; // Datetime "YYYY-MM-DD HH:MI" format (REQUIRED)
	anzahl_gesamt: number; // Total count (0 = death finding) (REQUIRED)
	vorname: string; // First name (REQUIRED)
	name: string; // Last name (REQUIRED) - Note: "name" not "nachname"!
	email: string; // Email address (REQUIRED)

	// Location data
	gps_breite?: number; // Latitude decimal, -90 to 90
	gps_laenge?: number; // Longitude decimal, -180 to 180
	fahrwasser?: string; // Waterway or area
	seezeichen?: string; // Sea mark or beach section

	// Sighting context
	vonwo?: number; // Observation location (0-3)
	vonwo_text?: string; // Other observation location text (when vonwo = 0)
	entfernung?: number; // Distance (1-5)
	anzahl_schiffe?: number; // Number of ships in vicinity
	anzahl_jung?: number; // Juvenile count
	verteilung?: number; // Distribution (0-3)
	verteilung_text?: string; // Other distribution text (when verteilung = 0)

	// Media handling
	aufnahme?: string; // Media filename
	aufnahmeHochladen?: number; // Media uploaded flag (0/1)

	// Animal behavior
	verhalten?: number; // Behavior (0-3)
	verhalten_text?: string; // Other behavior text (when verhalten = 0)
	reaktion?: string; // Animal reaction
	sonstige_auffälligkeiten?: string; // Other observations

	// Environmental conditions
	seegang?: number; // Sea state (0-5)
	windrichtung?: string; // Wind direction 'N','NW','W','SW','S','SO','O','NO'
	windstaerke?: string; // Wind force 1-12
	sichtweite?: number; // Visibility (1-4)

	// Vessel information
	schiffsname?: string; // Ship name
	heimathafen?: string; // Home port
	bootstyp?: string; // Boat type
	bootsantrieb?: number; // Boat drive (0-4)
	bootsantrieb_text?: string; // Other boat drive text (when bootsantrieb = 0)

	// Contact information
	strasse?: string; // Street
	plz?: string; // ZIP code
	ort?: string; // City
	telefon?: string; // Phone number
	fax?: string; // Fax number

	// Consent and privacy
	namensnennung?: number; // Name consent (0/1)
	schiffnamensnennung?: number; // Ship name consent (0/1)
	datenschutzEinverstaendnis?: number; // Privacy consent (0/1)

	// Comments
	bemerkungen?: string; // Comments/notes

	// System fields
	eingangskanal?: number; // Entry channel (0-5)
	tierart?: number; // Species (0-10, default = 0)

	// Death finding indicator
	totfund?: number; // Death finding flag (0/1)

	// Death finding fields (when anzahl_gesamt = 0)
	totfund_zustand?: number; // Dead animal condition (0-5)
	totfund_geschlecht?: number; // Dead animal sex (0-2)
	totfund_groesse?: number; // Dead animal size in cm
	totfund_telefon?: number; // DMM informed by phone (0/1)
}

/**
 * Legacy API response format for location checking
 * Response field names must match exactly: inbaltic, inchartarea (lowercase!)
 */
export interface LegacyLocationResponse {
	inbaltic: boolean; // Note: lowercase 'b' to match legacy API
	inchartarea: boolean; // Note: lowercase to match legacy API
}

/**
 * Legacy API error response format - EXACT format from original API
 */
export interface LegacyErrorResponse {
	message: {
		message: string;
		errors?: Record<string, string[]>; // Field validation errors in German
	};
}

/**
 * Simple error response for specific cases like "No data send"
 */
export interface LegacySimpleErrorResponse {
	message: {
		message: string;
	};
}

/**
 * Legacy API success response for sighting creation
 */
export interface LegacyCreateResponse {
	message: string; // Should be "Saved"
}