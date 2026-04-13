import { Stroke, Fill, Style, Circle, RegularShape, Text } from 'ol/style';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';

/**
 * Prüft ob ein Wert zwischen zwei Grenzen liegt (inklusiv).
 * Ersetzt die vorherige Number.prototype.between Prototype-Extension.
 */
export function isBetween(value: number, lower: number, upper: number): boolean {
	return lower < upper ? value >= lower && value <= upper : value >= upper && value <= lower;
}

/**
 * Eigenschaften einer Sichtung für die Stildarstellung
 */
export interface SightingProperties {
	ta: number; // Tierart (species)
	ct: number; // Count
	tf: boolean; // Totfund (dead)
	ts: number; // Timestamp
	[key: string]: unknown; // Weitere Eigenschaften
}

/**
 * Definition einer Legendengruppe
 */
export interface LegendGroup {
	name: string;
	fill: Fill;
	match: (properties: SightingProperties) => boolean;
}

/**
 * Stil-Cache für schnelleren Zugriff
 */
const styleCache: Record<string, Style> = {};

/**
 * Leert den Style-Cache (für dispose/cleanup)
 */
export function clearStyleCache(): void {
	Object.keys(styleCache).forEach((k) => delete styleCache[k]);
}

/**
 * Grundeinstellungen für alle Stile
 */
const defaultStroke = new Stroke({ color: 'black', width: 2 });
const defaultRadius = 8;

/**
 * Verbesserte Symbol-Definitionen für Tierarten
 */
export interface SpeciesSymbol {
	symbol: string; // Unicode-Symbol
	baseColor: string; // Grundfarbe der Tiergruppe
	size: number; // Relative Größe
	category: 'kleinwal' | 'grosswal' | 'robbe';
}

/**
 * Mapping von Tierarten zu verbesserten Symbolen
 */
export const speciesSymbols: Record<string, SpeciesSymbol> = {
	'0': {
		// Schweinswal
		symbol: '🐋',
		baseColor: '#4A90E2', // Blau für Kleinwale
		size: 1.0,
		category: 'kleinwal'
	},
	'1': {
		// Kegelrobbe
		symbol: '🦭',
		baseColor: '#8B4513', // Braun für Robben
		size: 1.1,
		category: 'robbe'
	},
	'2': {
		// Seehund
		symbol: '🦭',
		baseColor: '#CD853F', // Helles Braun für Seehunde
		size: 1.0,
		category: 'robbe'
	},
	'3': {
		// Delphin
		symbol: '🐬',
		baseColor: '#00CED1', // Türkis für Delphine
		size: 1.0,
		category: 'kleinwal'
	},
	'4': {
		// Beluga
		symbol: '🐋',
		baseColor: '#F0F8FF', // Weiß für Beluga
		size: 1.2,
		category: 'kleinwal'
	},
	'5': {
		// Zwergwal
		symbol: '🐳',
		baseColor: '#2F4F4F', // Dunkelgrau für Großwale
		size: 1.3,
		category: 'grosswal'
	},
	'6': {
		// Finnwal
		symbol: '🐋',
		baseColor: '#1C1C1C', // Schwarz für Finnwal
		size: 1.5,
		category: 'grosswal'
	},
	'7': {
		// Buckelwal
		symbol: '🐳',
		baseColor: '#36454F', // Charcoal für Buckelwal
		size: 1.4,
		category: 'grosswal'
	},
	'8': {
		// Unbekannte Walart
		symbol: '❓',
		baseColor: '#696969', // Grau für unbekannt
		size: 1.2,
		category: 'grosswal'
	},
	'9': {
		// Ringelrobbe
		symbol: '🦭',
		baseColor: '#A0522D', // Sienna für Ringelrobbe
		size: 0.9,
		category: 'robbe'
	},
	'10': {
		// Unbekannte Robbenart
		symbol: '❓',
		baseColor: '#8B4513', // Braun für unbekannte Robbe
		size: 1.0,
		category: 'robbe'
	}
};

/**
 * Hintergrundfarben für bessere Sichtbarkeit der Symbole
 */
export const backgroundColors: Record<string, string> = {
	kleinwal: '#E6F3FF', // Helles Blau
	grosswal: '#F0F0F0', // Hellgrau
	robbe: '#F5E6D3' // Beige
};

/**
 * Barrierefreie Farbgruppen für die Anzahl der Tiere
 * Farben wurden für Farbenblindheit (Deuteranopie/Protanopie) optimiert
 */
export const legendGroups: Record<string, LegendGroup> = {
	ct1: {
		name: '1',
		fill: new Fill({ color: '#FFD700' }), // Goldgelb - gut sichtbar
		match: (val) => !val.tf && val.ct === 1
	},
	ct2: {
		name: '2-5',
		fill: new Fill({ color: '#FF8C00' }), // Dunkles Orange - unterscheidbar
		match: (val) => !val.tf && val.ct >= 2 && val.ct <= 5
	},
	ct6: {
		name: '6-10',
		fill: new Fill({ color: '#DC143C' }), // Crimson Rot - hoher Kontrast
		match: (val) => !val.tf && val.ct >= 6 && val.ct <= 10
	},
	ct11: {
		name: '11-15',
		fill: new Fill({ color: '#8B008B' }), // Dunkles Magenta - unterscheidbar
		match: (val) => !val.tf && val.ct >= 11 && val.ct <= 15
	},
	ct15: {
		name: '> 15',
		fill: new Fill({ color: '#0066CC' }), // Starkes Blau - farbenblind-freundlich
		match: (val) => !val.tf && val.ct > 15
	},
	ct0: {
		name: 'Totfund',
		fill: new Fill({ color: '#000000' }), // Schwarz für maximalen Kontrast
		match: (val) => val.tf || val.ct === 0
	}
};

/**
 * Bestimmt die Farbgruppe eines Features basierend auf seinen Eigenschaften
 */
export function getFeatureColorGroup(properties: SightingProperties): string {
	for (const [key, group] of Object.entries(legendGroups)) {
		if (group.match(properties)) {
			return key;
		}
	}

	// Standardwert, wenn keine Übereinstimmung gefunden wurde
	return 'ct1';
}

/**
 * Erstellt einen verbesserten Unicode-basierten Style für ein Feature
 */
function createUnicodeSymbolStyle(speciesId: string, colorGroup: string): Style {
	const speciesSymbol = speciesSymbols[speciesId];
	if (!speciesSymbol) {
		// Fallback für unbekannte Arten
		return createFallbackGeometricStyle(speciesId, colorGroup);
	}

	// Berechne die finale Größe basierend auf der Tierart
	const fontSize = Math.round(defaultRadius * 2.5 * speciesSymbol.size);

	// Bestimme die Farbe basierend auf der Count-Gruppe
	const countColor = (legendGroups[colorGroup]?.fill.getColor() as string) || '#333333';

	// Erstelle Hintergrund-Style für bessere Sichtbarkeit
	const backgroundColor = backgroundColors[speciesSymbol.category] || '#FFFFFF';

	return new Style({
		// Hintergrundkreis für bessere Sichtbarkeit
		image: new Circle({
			radius: fontSize / 2 + 4,
			fill: new Fill({ color: backgroundColor + 'CC' }), // 80% Transparenz
			stroke: new Stroke({
				color: countColor,
				width: 2
			})
		}),
		// Unicode-Text-Symbol
		text: new Text({
			text: speciesSymbol.symbol,
			font: `${fontSize}px Arial, sans-serif`,
			fill: new Fill({ color: countColor }),
			stroke: new Stroke({
				color: '#FFFFFF',
				width: 1
			}),
			offsetY: 0,
			textAlign: 'center',
			textBaseline: 'middle'
		})
	});
}

/**
 * Fallback: Erstellt geometrische Formen für Browser ohne Unicode-Support
 */
function createFallbackGeometricStyle(speciesId: string, colorGroup: string): Style {
	// Verwende die ursprüngliche geometrische Form-Logik als Fallback
	let points = 4;
	let angle = Math.PI / 4;
	let radius2: number | undefined = undefined;

	switch (speciesId) {
		case '0': // Schweinswal (Kreis)
			return new Style({
				image: new Circle({
					radius: defaultRadius,
					fill: legendGroups[colorGroup]?.fill || new Fill({ color: '#333333' }),
					stroke: defaultStroke
				})
			});
		case '1': // Kegelrobbe (Quadrat)
			points = 4;
			angle = Math.PI / 4;
			break;
		case '2': // Seehund (Dreieck)
			points = 3;
			angle = 0;
			break;
		case '3': // Delphin (Dreieck links)
			points = 3;
			angle = Math.PI / 6;
			break;
		case '4': // Beluga (Dreieck rechts)
			points = 3;
			angle = Math.PI / 2;
			break;
		case '5': // Zwergwal (Stern)
			points = 5;
			angle = 0;
			radius2 = 2;
			break;
		case '6': // Finnwal (Kreuz)
			points = 4;
			angle = 0;
			radius2 = 2;
			break;
		case '7': // Buckelwal (X)
			points = 4;
			angle = Math.PI / 4;
			radius2 = 2;
			break;
		case '8': // Unbekannte Walart (Fünfeck)
			points = 5;
			angle = 0;
			break;
		case '9': // Ringelrobbe (Sechseck)
			points = 6;
			angle = 0;
			break;
		case '10': // Unbekannte Robbenart (Achteck)
			points = 8;
			angle = 0;
			break;
		default:
			points = 4;
			angle = Math.PI / 4;
	}

	const shapeOptions = {
		points: points,
		radius: defaultRadius,
		fill: legendGroups[colorGroup]?.fill || new Fill({ color: '#333333' }),
		stroke: defaultStroke,
		angle: angle
	};

	if (radius2 !== undefined) {
		Object.assign(shapeOptions, { radius2 });
	}

	return new Style({
		image: new RegularShape(shapeOptions)
	});
}

/**
 * Erzeugt einen verbesserten Style für ein Feature basierend auf seiner Art und Anzahl
 */
export function createFeatureStyle(
	feature: Feature<Geometry>,
	hiddenSpecies: Record<string, boolean>,
	hiddenColors: Record<string, boolean>,
	timeFilter: { lower: number; upper: number }
): Style | null {
	const properties = feature.getProperties() as SightingProperties;
	const speciesId = (properties.speciesKey as string) || properties.ta.toString();
	const colorGroup = getFeatureColorGroup(properties);

	// Prüfen, ob das Feature ausgeblendet werden soll
	if (
		hiddenSpecies[speciesId] ||
		hiddenColors[colorGroup] ||
		!isBetween(properties.ts * 1000, timeFilter.lower, timeFilter.upper)
	) {
		feature.set('stcVisibility', false);
		return null;
	}

	feature.set('stcVisibility', true);
	feature.set('stcGroup', colorGroup);

	// Cache-Key aus Art und Farbgruppe
	const key = `unicode_${speciesId}#${colorGroup}`;

	// Aus dem Cache zurückgeben, falls vorhanden
	if (styleCache[key]) {
		return styleCache[key];
	}

	// Versuche zuerst Unicode-Symbole zu verwenden
	let style: Style;

	try {
		style = createUnicodeSymbolStyle(speciesId, colorGroup);
	} catch (error) {
		// Fallback auf geometrische Formen bei Fehlern
		console.warn('Unicode-Symbole nicht verfügbar, verwende geometrische Formen:', error);
		style = createFallbackGeometricStyle(speciesId, colorGroup);
	}

	// Style im Cache speichern
	styleCache[key] = style;

	return style;
}

/**
 * Erstellt einen Style für geclusterte Features
 */
export function createClusterStyle(feature: Feature<Geometry>): Style {
	const features = feature.get('features');
	const size = features ? features.length : 0;

	// Cache-Key für Cluster-Styles
	const clusterKey = `cluster_${size}`;

	if (styleCache[clusterKey]) {
		return styleCache[clusterKey];
	}

	// Bestimme Cluster-Größe und Farbe basierend auf Anzahl der Features
	let radius = 15;
	let fontSize = 12;
	let color = '#3399CC';

	if (size < 5) {
		radius = 18;
		fontSize = 12;
		color = '#51C2D5';
	} else if (size < 10) {
		radius = 22;
		fontSize = 13;
		color = '#3399CC';
	} else if (size < 25) {
		radius = 26;
		fontSize = 14;
		color = '#2E7D99';
	} else if (size < 50) {
		radius = 30;
		fontSize = 15;
		color = '#1E5266';
	} else {
		radius = 35;
		fontSize = 16;
		color = '#0F2933';
	}

	const style = new Style({
		image: new Circle({
			radius: radius,
			fill: new Fill({
				color: color + 'E6' // 90% Transparenz
			}),
			stroke: new Stroke({
				color: color,
				width: 2
			})
		}),
		text: new Text({
			text: size.toString(),
			font: `bold ${fontSize}px Arial, sans-serif`,
			fill: new Fill({
				color: '#FFFFFF'
			}),
			stroke: new Stroke({
				color: color,
				width: 1
			}),
			textAlign: 'center',
			textBaseline: 'middle'
		})
	});

	// Style im Cache speichern
	styleCache[clusterKey] = style;

	return style;
}
