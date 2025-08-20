/**
 * Export-related type definitions for data export functionality
 */

/**
 * KML Placemark structure for Google Earth exports
 */
export interface KmlPlacemark {
	name: string;
	description: string;
	coordinates: string;
	styleUrl: string;
	timestamp: string;
}

/**
 * XML sighting structure for legacy XML exports
 */
export interface XmlSighting {
	nr: number;
	datum: string;
	uhrzeit: string;
	tierart: number | string;
	fahrwasser?: string;
	dezigrad_n: number;
	dezigrad_e: number;
	totfund: boolean;
	media: string;
	anz_ber?: number;
	groessenklasse: string;
	jungtiere?: number;
	x: number;
	y: number;
	schiff?: string;
	person?: string;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'xml' | 'kml' | 'csv';

/**
 * Export options configuration
 */
export interface ExportOptions {
	format: ExportFormat;
	includeMedia?: boolean;
	includePersonalData?: boolean;
	dateFrom?: string;
	dateTo?: string;
	species?: number[];
}