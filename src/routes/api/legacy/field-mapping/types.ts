/**
 * @fileoverview Type definitions for Legacy REST API
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
 * Alternative legacy request format with separate date/time fields (for some tests)
 * Used in some legacy endpoints that expect date and time as separate fields
 */
export interface LegacySightingRequestSeparateDateTime {
	// Required fields
	datum: string; // Date "YYYY-MM-DD" format (REQUIRED)
	uhrzeit?: string; // Time "HH:MM" format (optional)
	anzahl_gesamt: number; // Total count (0 = death finding) (REQUIRED)
	vorname: string; // First name (REQUIRED)
	name: string; // Last name (REQUIRED) - Note: "name" not "nachname"!
	email: string; // Email address (REQUIRED)

	// Location data
	gps_breite?: number; // Latitude decimal, -90 to 90
	gps_laenge?: number; // Longitude decimal, -180 to 180
	fahrwasser?: string; // Waterway or area
	seezeichen?: string; // Sea mark or beach section

	// All other fields same as LegacySightingRequest
	vonwo?: number;
	vonwo_text?: string;
	entfernung?: number;
	anzahl_schiffe?: number;
	anzahl_jung?: number;
	verteilung?: number;
	verteilung_text?: string;
	aufnahme?: string;
	aufnahmeHochladen?: number;
	verhalten?: number;
	verhalten_text?: string;
	reaktion?: string;
	sonstige_auffälligkeiten?: string;
	seegang?: number;
	windrichtung?: string;
	windstaerke?: string;
	sichtweite?: number;
	schiffsname?: string;
	heimathafen?: string;
	bootstyp?: string;
	bootsantrieb?: number;
	bootsantrieb_text?: string;
	strasse?: string;
	plz?: string;
	ort?: string;
	telefon?: string;
	fax?: string;
	namensnennung?: number;
	schiffnamensnennung?: number;
	datenschutzEinverstaendnis?: number;
	bemerkungen?: string;
	eingangskanal?: number;
	tierart?: number;
	totfund?: number;
	totfund_zustand?: number;
	totfund_geschlecht?: number;
	totfund_groesse?: number;
	totfund_telefon?: number;
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
 * Legacy API response format for dropdown options
 * Field names must match the original antworten.json response
 */
export interface LegacyResponseOptions {
	tierart: Array<{ value: number; label: string }>;
	vonwo: Array<{ value: number; label: string }>; // Note: vonwo not beobachtungsort!
	entfernung: Array<{ value: number; label: string }>;
	verteilung: Array<{ value: number; label: string }>;
	verhalten: Array<{ value: number; label: string }>;
	seegang: Array<{ value: number; label: string }>;
	windrichtung: Array<{ value: string; label: string }>;
	windstaerke: Array<{ value: string; label: string }>;
	sichtweite: Array<{ value: number; label: string }>;
	bootsantrieb: Array<{ value: number; label: string }>;
	eingangskanal: Array<{ value: number; label: string }>;
	totfund_zustand: Array<{ value: number; label: string }>;
	totfund_geschlecht: Array<{ value: number; label: string }>;
}

/**
 * Legacy API response format for retrieving sightings
 * Field names must match showreports.json specification exactly
 */
export interface LegacySightingResponse {
	id: number; // Sighting ID
	datum: string; // Date DD.MM.YYYY format
	uhrzeit: string; // Time HH:MM format
	breitengrad?: number | undefined; // Latitude 
	laengengrad?: number | undefined; // Longitude
	anzahlGesamt: number; // Total count
	anzahlJung: number; // Juvenile count
	tierart: number; // Species
	totfund: number; // Death finding flag (0/1)
	beobachterName?: string; // Observer name (only if consent)
	gebiet?: string | undefined; // Area/waterway
	schiffsname?: string | undefined; // Ship name (only if consent)
}

/**
 * Legacy API error response format
 */
export interface LegacyErrorResponse {
	error: string;
	message: string;
	details?: Record<string, string[]>; // Field validation errors
}

/**
 * Legacy API success response for sighting creation
 */
export interface LegacyCreateResponse {
	message: string; // Should be "Saved"
}