/**
 * @fileoverview Type definitions for Legacy REST API
 * 
 * Defines the interface contracts for the legacy mobile app API compatibility layer.
 * These types match the original schweinswalsichtung.de API specification.
 * 
 * @author Ostsee-Tiere Team  
 * @since 1.10.0
 */

/**
 * Legacy API request format for creating sightings
 * Field names match the original mobile app expectations
 */
export interface LegacySightingRequest {
	// Date and time fields
	datum: string; // YYYY-MM-DD format
	uhrzeit?: string; // HH:MM format

	// Location fields
	breitengrad?: number; // Decimal degrees, -90 to 90
	laengengrad?: number; // Decimal degrees, -180 to 180
	gebiet?: string; // Waterway/area description
	seezeichen?: string; // Sea mark description

	// Observer details
	vorname: string; // First name (required)
	nachname: string; // Last name (required)  
	email: string; // Email address (required)
	telefon?: string;
	fax?: string;
	strasse?: string;
	plz?: string;
	ort?: string;

	// Sighting details
	anzahlGesamt: number; // Total count (0 = death finding)
	anzahlJung?: number; // Juvenile count
	tierart?: number; // Species (enum 0-6)

	// Observation context
	beobachtungsort?: number; // Observation location type (0-3)
	entfernung?: number; // Distance category (1-5)
	verteilung?: number; // Distribution pattern
	verhalten?: number; // Animal behavior
	reaktion?: string; // Reaction to boat

	// Environmental conditions
	seegang?: number; // Sea state (0-9)
	windrichtung?: string; // Wind direction (N, NE, E, SE, S, SW, W, NW)
	windstaerke?: string; // Wind force (0-12)
	sichtweite?: number; // Visibility category

	// Vessel information
	schiffsname?: string;
	heimathafen?: string;
	bootstyp?: string;
	bootsantrieb?: number;

	// Additional fields
	aufnahme?: string; // Media file reference
	sonstigeAuffaelligkeiten?: string; // Other observations
	bemerkungen?: string; // Additional comments

	// Consent flags (0/1 instead of true/false)
	namensnennung?: number; // Name publication consent
	schiffnamensnennung?: number; // Ship name publication consent
	datenschutzEinverstaendnis?: number; // Privacy consent

	// Death finding specific fields (when anzahlGesamt = 0)
	totfundGroesse?: number; // Size of dead animal
	totfundZustand?: number; // Condition of dead animal
	totfundGeschlecht?: number; // Sex of dead animal
	totfundTelefon?: number; // Phone contact for death finding
}

/**
 * Legacy API response format for location checking
 */
export interface LegacyLocationResponse {
	inbaltic: boolean; // Note: lowercase 'b' to match legacy API
	inchartarea: boolean; // Note: lowercase to match legacy API
}

/**
 * Legacy API response format for dropdown options
 */
export interface LegacyResponseOptions {
	tierart: Array<{ value: number; label: string }>;
	beobachtungsort: Array<{ value: number; label: string }>;
	entfernung: Array<{ value: number; label: string }>;
	verteilung: Array<{ value: number; label: string }>;
	verhalten: Array<{ value: number; label: string }>;
	seegang: Array<{ value: number; label: string }>;
	windrichtung: Array<{ value: string; label: string }>;
	windstaerke: Array<{ value: string; label: string }>;
	sichtweite: Array<{ value: number; label: string }>;
	bootsantrieb: Array<{ value: number; label: string }>;
	totfundZustand: Array<{ value: number; label: string }>;
	totfundGeschlecht: Array<{ value: number; label: string }>;
}

/**
 * Legacy API response format for retrieving sightings
 */
export interface LegacySightingResponse {
	id: number;
	datum: string; // DD.MM.YYYY format
	uhrzeit: string; // HH:MM format
	breitengrad?: number;
	laengengrad?: number;
	anzahlGesamt: number;
	anzahlJung: number;
	tierart: number;
	totfund: number; // 0/1 boolean
	beobachterName?: string; // Only if consent given
	gebiet?: string;
	schiffsname?: string; // Only if consent given
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
	id: number;
	status: 'success';
	message: string;
}