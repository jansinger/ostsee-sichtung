import { Feature } from 'ol';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';

export interface LoadDataOptions {
	year?: number;
	search?: string;
}

export class MapDataLoader {
	private baseUrl = '/api/map/sightings';

	async loadSightings(options: LoadDataOptions = {}): Promise<Feature<Geometry>[]> {
		try {
			const params = new URLSearchParams();
			
			if (options.year) {
				params.append('year', options.year.toString());
			}
			
			if (options.search) {
				params.append('search', options.search);
			}

			const url = `${this.baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const geoJsonData = await response.json();
			
			// Parse GeoJSON and return features
			const format = new GeoJSON();
			const features = format.readFeatures(geoJsonData, {
				featureProjection: 'EPSG:3857' // Web Mercator
			});

			return features;
		} catch (error) {
			console.error('Error loading sightings:', error);
			throw error;
		}
	}

	async loadSightingsForYear(year: number): Promise<Feature<Geometry>[]> {
		return this.loadSightings({ year });
	}
}