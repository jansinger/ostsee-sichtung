/**
 * Map-related type definitions for OpenLayers integration
 */

import type { Map } from 'ol';

/**
 * Translation interface for map labels
 * Defines all required translation keys for multilingual map display
 */
export interface MapTranslations {
	overview: string; // "Übersicht" - Map overview
	zoom_title: string; // Tooltip for zoom control
	zoom: string; // "Zoom" - Zoom label
	report_date: string; // "Meldedatum" - Sighting date
	language: string; // "Sprache" - Language selection
	species: string; // "Tierart" - Species label
	species_legend: string; // Legend for species
	position: string; // "Position" - Coordinates
	count: string; // "Anzahl" - Animal count
	young: string; // "Jungtiere" - Calves/young animals
	ship: string; // "Schiff" - Vessel
	name: string; // "Name" - Observer
	area: string; // "Gebiet" - Sea area
	latitude: string; // "Breitengrad" - Latitude
	longitude: string; // "Längengrad" - Longitude
	found_dead: string; // "Totfund" - Dead animals
	speciesMap: Record<string, string>; // Mapping of species IDs to names
}

/**
 * GeoJSON Feature for a single sighting
 * Conforms to GeoJSON specification for point features with sighting-specific properties
 */
export interface SightingFeature {
	type: 'Feature'; // GeoJSON type (always "Feature")
	id: number; // Unique sighting ID
	geometry: {
		type: 'Point'; // Geometry type (always "Point" for sightings)
		coordinates: [number, number]; // [longitude, latitude] - IMPORTANT: order!
	};
	properties: {
		id: number; // Sighting ID (duplicated for compatibility)
		ts: number; // Unix timestamp in seconds
		ta: number; // Species (Species enum value)
		ct: number; // Total animal count
		jt: number; // Juvenile count
		tf: boolean; // Dead find yes/no
		// Optional properties (only with consent/availability)
		name?: string; // Observer's last name
		firstname?: string; // Observer's first name
		shipname?: string; // Observation vessel name
		waterway?: string; // Water body name
		seaMark?: string; // Sea mark as reference
	};
}

/**
 * GeoJSON FeatureCollection for all sightings
 * Standard GeoJSON container for a collection of sighting features
 */
export interface GeoJSONResponse {
	type: 'FeatureCollection'; // GeoJSON type (always "FeatureCollection")
	features: SightingFeature[]; // Array of all sighting features
}

/**
 * Database sighting as read from DB
 * Represents a sighting in the format read from Drizzle database before GeoJSON conversion
 */
export interface DBSighting {
	id: number; // Primary key
	sightingDate: string; // ISO date string
	longitude: number | string; // Longitude (can be string in legacy data)
	latitude: number | string; // Latitude (can be string in legacy data)
	species: number; // Species enum value
	totalCount: number; // Total animal count
	juvenileCount: number; // Juvenile count
	isDead: boolean; // Dead find flag
	firstName?: string; // First name (optional)
	lastName?: string; // Last name (optional)
	nameConsent: boolean; // Consent for name disclosure
	shipName?: string; // Ship name (optional)
	waterway?: string; // Waterway (optional)
	seaMark?: string; // Sea mark (optional)
}

/**
 * Sighting properties for style rendering
 */
export interface SightingProperties {
	id?: number; // Sighting ID
	ta: number; // Species (tierart)
	ct: number; // Count
	jt?: number; // Juvenile count
	tf?: boolean; // Dead find (totfund)
	ts?: number; // Timestamp
	name?: string; // Observer name
	firstname?: string; // Observer first name
	shipname?: string; // Ship name
	waterway?: string; // Waterway
	seaMark?: string; // Sea mark
	[key: string]: unknown; // Additional properties
}

/**
 * Map initialization options
 */
export interface MapOptions {
	translations: MapTranslations;
	target: string;
	yearSelectorId?: string;
	filterInputId?: string;
	sliderRangeId?: string;
	speciesFilterId?: string;
	statusFilterId?: string;
	yearSlider?: boolean;
	popup?: boolean;
}

/**
 * Simple map initialization options
 */
export interface SimpleMapOptions {
	target: string;
	translations: MapTranslations;
}

/**
 * Data loading options for map
 */
export interface LoadDataOptions {
	year?: number;
	search?: string;
}

/**
 * Count data for species and colors
 */
export interface CountData {
	speciesCounts: Record<string, { visible: number; total: number }>;
	colorCounts: Record<string, number>;
}

/**
 * Count manager interface
 */
export interface CountManager {
	initialize(mapInstance: Map, translations: MapTranslations): void;
	updateCounts(): void;
	getCounts(): CountData;
	onCountsUpdated(callback: (counts: CountData) => void): void;
}

/**
 * Time slider manager interface
 */
export interface TimeSliderManager {
	initialize(mapInstance: Map): void;
}

/**
 * Panel manager interface
 */
export interface PanelManager {
	initializePanels(): void;
}

/**
 * Legend group definition (count filter groups — no color anymore, see styleUtils.ts)
 */
export interface LegendGroup {
	name: string;
	match: (properties: SightingProperties) => boolean;
}

/**
 * Species symbol definition
 */
export interface SpeciesSymbol {
	symbol: string; // Unicode symbol (identical to the group symbol)
	baseColor: string; // Group color (identical to speciesGroupStyles[category].color)
	size: number; // Relative size
	category: 'kleinwal' | 'grosswal' | 'robbe' | 'unbekannt';
}
