import { Map, View } from 'ol';
import { defaults as defaultControls } from 'ol/control';
import { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import type { MapTranslations } from './mapUtils';
import { MapDataLoader } from './dataLoader';
import { MapPopup } from './popup';
import { styleFunction } from './styles';

export interface SimpleMapOptions {
	target: string;
	translations: MapTranslations;
}

export class SimpleMapController {
	private map: Map;
	private vectorSource: VectorSource<Feature<Geometry>>;
	private clusterSource: Cluster;
	private clusterLayer: VectorLayer<Cluster>;
	private popup: MapPopup;
	private dataLoader: MapDataLoader;
	private translations: MapTranslations;

	constructor(options: SimpleMapOptions) {
		this.translations = options.translations;
		this.dataLoader = new MapDataLoader();
		this.popup = new MapPopup(this.translations);

		// Create vector source for sightings
		this.vectorSource = new VectorSource();

		// Create cluster source
		this.clusterSource = new Cluster({
			distance: 40, // Cluster distance in pixels
			minDistance: 20, // Minimum distance between features
			source: this.vectorSource
		});

		// Create cluster layer
		this.clusterLayer = new VectorLayer({
			source: this.clusterSource,
			style: styleFunction
		});

		// Create map
		this.map = new Map({
			target: options.target,
			layers: [
				// Base layer
				new TileLayer({
					source: new OSM()
				}),
				// Sightings layer
				this.clusterLayer
			],
			view: new View({
				center: fromLonLat([12.0, 54.5]), // Baltic Sea center
				zoom: 7,
				minZoom: 5,
				maxZoom: 18
			}),
			controls: defaultControls({
				attribution: true,
				zoom: true,
				rotate: false
			})
		});

		// Add popup overlay
		this.map.addOverlay(this.popup.getOverlay());

		// Add click handler
		this.map.on('click', (event) => {
			this.handleMapClick(event);
		});

		// Add pointer move handler for cursor change
		this.map.on('pointermove', (event) => {
			const hit = this.map.hasFeatureAtPixel(event.pixel);
			this.map.getTargetElement().style.cursor = hit ? 'pointer' : '';
		});

		// Handle zoom changes for clustering
		this.map.getView().on('change:resolution', () => {
			this.updateClusterDistance();
		});
	}

	private handleMapClick(event: { pixel: number[]; coordinate: number[] }): void {
		const features = this.map.getFeaturesAtPixel(event.pixel);
		
		if (features && features.length > 0) {
			const feature = features[0] as Feature<Geometry>;
			if (!feature) return;
			
			const clusterFeatures = feature.get('features');
			
			if (clusterFeatures) {
				// Cluster clicked
				const zoom = this.map.getView().getZoom() || 7;
				
				if (zoom < 12 && clusterFeatures.length > 1) {
					// Zoom to cluster if not too zoomed in and has multiple features
					this.zoomToFeatures(clusterFeatures);
				} else {
					// Show popup
					this.popup.show(event.coordinate, [feature]);
				}
			} else {
				// Single feature clicked
				this.popup.show(event.coordinate, [feature]);
			}
		} else {
			// Clicked on empty area - hide popup
			this.popup.hide();
		}
	}

	private updateClusterDistance(): void {
		const zoom = this.map.getView().getZoom() || 7;
		
		// Reduce cluster distance at higher zoom levels
		let distance: number;
		if (zoom < 8) {
			distance = 50;
		} else if (zoom < 10) {
			distance = 40;
		} else if (zoom < 12) {
			distance = 30;
		} else {
			distance = 20;
		}

		this.clusterSource.setDistance(distance);
	}

	private zoomToFeatures(features: Feature<Geometry>[]): void {
		if (features.length === 0) return;

		const view = this.map.getView();
		
		// Calculate extent of features
		let featureExtent: number[] | undefined;
		features.forEach(feature => {
			const geom = feature.getGeometry();
			if (geom) {
				const currentExtent = geom.getExtent();
				if (!featureExtent) {
					featureExtent = [...currentExtent];
				} else {
					featureExtent[0] = Math.min(featureExtent[0] || 0, currentExtent[0] || 0);
					featureExtent[1] = Math.min(featureExtent[1] || 0, currentExtent[1] || 0);
					featureExtent[2] = Math.max(featureExtent[2] || 0, currentExtent[2] || 0);
					featureExtent[3] = Math.max(featureExtent[3] || 0, currentExtent[3] || 0);
				}
			}
		});

		if (featureExtent && featureExtent.every(val => isFinite(val))) {
			view.fit(featureExtent, {
				duration: 500,
				padding: [20, 20, 20, 20],
				maxZoom: 14
			});
		}
	}

	async loadData(year?: number): Promise<void> {
		try {
			this.vectorSource.clear();
			
			const features = await this.dataLoader.loadSightingsForYear(year || new Date().getFullYear());
			this.vectorSource.addFeatures(features);

			// Fit to data if we have features
			if (features.length > 0) {
				this.fitToData();
			}
		} catch (error) {
			console.error('Error loading map data:', error);
		}
	}

	fitToData(): void {
		const extent = this.vectorSource.getExtent();
		if (extent && extent.some(val => isFinite(val))) {
			this.map.getView().fit(extent, {
				duration: 1000,
				padding: [50, 50, 50, 50],
				maxZoom: 12
			});
		}
	}

	getMap(): Map {
		return this.map;
	}

	destroy(): void {
		this.popup.hide();
		this.map.dispose();
	}
}