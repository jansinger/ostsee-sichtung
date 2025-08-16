import type { Feature } from 'ol';
import type { FeatureLike } from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';

export interface SightingProperties {
	ta: number; // species
	ct: number; // count
	tf?: boolean; // dead
}

// Colors for different species
const SPECIES_COLORS: Record<number, string> = {
	0: '#3b82f6', // Schweinswal - Blue
	1: '#ef4444', // Kegelrobbe - Red
	2: '#10b981', // Seehund - Green
	999: '#6b7280' // Other/Unknown - Gray
};

// Get color for species
function getSpeciesColor(species: number): string {
	return SPECIES_COLORS[species] || SPECIES_COLORS[999] || '#6b7280';
}

// Create style for individual sighting
export function createSightingStyle(feature: Feature<Geometry>): Style {
	const props = feature.getProperties() as SightingProperties;
	const color = getSpeciesColor(props.ta);
	const isDead = props.tf === true;

	return new Style({
		image: new Circle({
			radius: 8,
			fill: new Fill({
				color: isDead ? '#dc2626' : color // Red for dead animals
			}),
			stroke: new Stroke({
				color: '#ffffff',
				width: 2
			})
		})
	});
}

// Create style for cluster
export function createClusterStyle(feature: Feature<Geometry>): Style {
	const features = feature.get('features') as Feature<Geometry>[];
	const size = features.length;
	
	let radius: number;
	let fontSize: string;
	
	if (size < 10) {
		radius = 15;
		fontSize = '12px';
	} else if (size < 50) {
		radius = 20;
		fontSize = '14px';
	} else {
		radius = 25;
		fontSize = '16px';
	}

	return new Style({
		image: new Circle({
			radius: radius,
			fill: new Fill({
				color: '#3b82f6'
			}),
			stroke: new Stroke({
				color: '#ffffff',
				width: 2
			})
		}),
		text: new Text({
			text: size.toString(),
			fill: new Fill({
				color: '#ffffff'
			}),
			font: `bold ${fontSize} sans-serif`
		})
	});
}

// Style function for the layer
export function styleFunction(feature: FeatureLike): Style {
	const features = feature.get('features');
	
	if (features && features.length > 1) {
		// Cluster
		return createClusterStyle(feature as Feature<Geometry>);
	} else {
		// Single feature (either directly or from cluster with 1 feature)
		const singleFeature = features ? features[0] : feature;
		return createSightingStyle(singleFeature as Feature<Geometry>);
	}
}