import { createLogger } from '$lib/logger';
import { Feature, Geolocation, Map, Overlay, View } from 'ol';
import type { Control } from 'ol/control';
import { defaults as defaultControls } from 'ol/control';
import * as olExtent from 'ol/extent';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry } from 'ol/geom';
import { Point as OlPoint } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { OSM, XYZ } from 'ol/source';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { LocationControl } from './controls/LocationControl.js';
import { ZoomAllControl } from './controls/ZoomAllControl.js';
import { getDefaultSightingYear } from '$lib/utils/date/defaultYear';
import type { MapTranslations } from './mapUtils';
import { createFeatureStyle, getFeatureColorGroup } from './styleUtils';
import { sanitizeText } from '$lib/utils/sanitize';

const logger = createLogger('map:optimized-controller');

/**
 * Interface für die Eigenschaften einer Sichtung
 */
interface SightingProperties {
	ta: string | number; // Tierart
	ct: number; // Anzahl
	jt?: number; // Jungtiere
	ts?: number; // Timestamp
	tf?: boolean; // Totfund
	shipname?: string;
	waterway?: string;
	name?: string;
	firstname?: string;
}

/**
 * Optionen für die Map-Klasse
 */
export interface MapOptions {
	translations: MapTranslations;
	target: string;
	yearSelectorId?: string;
	filterInputId?: string;
	sliderRangeId?: string;
	timeStartId?: string;
	timeEndId?: string;
	enableLocationControl?: boolean;
}

/**
 * Interface für Custom Controls, um zirkuläre Type-Dependencies zu vermeiden.
 * Controls nutzen dieses Interface statt des konkreten SichtungenMap-Typs.
 */
export interface MapController {
	toggleGeolocation(): boolean;
	zoomAllFeatures(): void;
}

/**
 * Optimierte Hauptklasse für die Sichtungen-Karte
 */
export class SichtungenMap {
	private map: Map;
	private options: MapOptions;
	private reportsSource: VectorSource<Feature<Geometry>>;
	private clusterSource: Cluster;
	private reportsLayer: VectorLayer<Cluster>;
	private translations: MapTranslations;
	private timeFilter: { lower: number; upper: number };
	private hiddenSpecies: Record<string, boolean> = {};
	private hiddenColors: Record<string, boolean> = {};
	private displayedYear: number;
	private searchTerm: string = '';
	private legendUpdateCallback?: () => void;
	private yearChangeCallback?: (year: number) => void;
	private clusterDistance: number = 40; // Reduziert für bessere Performance

	// Popup-related
	private popup!: Overlay;
	private popupElement!: HTMLDivElement;

	// Geolocation-related properties
	private geolocation!: Geolocation;
	private locationSource!: VectorSource<Feature<Geometry>>;
	private locationLayer!: VectorLayer<VectorSource<Feature<Geometry>>>;
	private isTracking: boolean = false;

	constructor(options: MapOptions) {
		this.translations = options.translations;
		this.options = options;

		// Initialisiere die Karten-Komponenten
		this.reportsSource = new VectorSource({
			attributions: 'Reports © <a href="http://www.meeresmuseum.de/">Deutsches Meeresmuseum</a>'
		});

		// Initialisiere Location Layer
		this.locationSource = new VectorSource();
		this.locationLayer = new VectorLayer({
			source: this.locationSource,
			style: (feature) => {
				const type = feature.get('type');
				if (type === 'location') {
					return new Style({
						image: new Circle({
							radius: 8,
							fill: new Fill({ color: '#3b82f6' }),
							stroke: new Stroke({ color: '#ffffff', width: 2 })
						})
					});
				} else if (type === 'accuracy') {
					return new Style({
						stroke: new Stroke({
							color: '#3b82f6',
							width: 2
						}),
						fill: new Fill({
							color: 'rgba(59, 130, 246, 0.1)'
						})
					});
				}
				return undefined;
			}
		});

		// Optimierte Cluster-Konfiguration
		this.clusterSource = new Cluster({
			distance: this.clusterDistance,
			minDistance: 10, // Mindestabstand zwischen Features
			source: this.reportsSource
		});

		// Vereinfachter Layer nur mit Clustering
		this.reportsLayer = new VectorLayer({
			source: this.clusterSource,
			style: (feature) => {
				const features = feature.get('features');
				if (features && features.length > 1) {
					const clusterStyle = this.createFilteredClusterStyle(
						feature as Feature<Geometry>,
						features
					);
					return clusterStyle || [];
				} else {
					const singleFeature = features ? features[0] : feature;
					// Verwende die originale Style-Funktion mit den aktuellen Filtern
					const style = createFeatureStyle(
						singleFeature as Feature<Geometry>,
						this.hiddenSpecies,
						this.hiddenColors,
						this.timeFilter
					);
					// Return empty array if style is null to make feature invisible
					return style ? [style] : [];
				}
			}
		});

		// Erstelle Popup
		this.createPopup();

		// Standard-Koordinaten und Extent für die Ostsee
		const defaultLat = 54.5;
		const defaultLon = 12.0;
		const defaultZoom = 7;
		const balticExtent = olExtent.boundingExtent([
			fromLonLat([9.4, 53.0]),
			fromLonLat([30.2, 66.0])
		]);

		// Initialize the timeFilter with sensible defaults (zeige das ganze Jahr)
		this.displayedYear = getDefaultSightingYear();
		const yearStart = new Date(this.displayedYear, 0, 1).getTime();
		const yearEnd = new Date(this.displayedYear, 11, 31, 23, 59, 59).getTime();
		this.timeFilter = {
			lower: yearStart,
			upper: yearEnd
		};

		// Erstelle die Karte mit optimierter Konfiguration
		this.map = new Map({
			target: options.target,
			layers: [
				// Basis-Karte (OSM) mit Error-Handling
				new TileLayer({
					source: new OSM({
						attributions:
							'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
						tileLoadFunction: (tile, src) => {
							const img = (tile as unknown as { getImage(): HTMLImageElement }).getImage();
							img.onerror = () => {
								logger.warn({ tileUrl: src }, 'OSM tile failed to load');
							};
							img.src = src;
						}
					})
				}),
				// OpenSeaMap-Layer für maritime Informationen
				new TileLayer({
					source: new XYZ({
						url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
						attributions: '© <a href="http://www.openseamap.org/">OpenSeaMap</a> contributors',
						maxZoom: 18,
						minZoom: 1,
						crossOrigin: 'anonymous',
						// Handle tile loading errors gracefully
						tileLoadFunction: (tile, src) => {
							const img = (tile as unknown as { getImage(): HTMLImageElement }).getImage();
							img.onerror = () => {
								// If tile fails to load, log for debugging and hide it
								logger.warn({ tileUrl: src }, 'OpenSeaMap tile failed to load');
								img.style.display = 'none';
							};
							img.src = src;
						}
					}),
					opacity: 0.8 // Slightly transparent to blend well with base map
				}),
				// Sichtungen-Layer (nur einer!)
				this.reportsLayer,
				// GPS-Position Layer
				this.locationLayer
			],
			view: new View({
				center: fromLonLat([defaultLon, defaultLat]),
				zoom: defaultZoom,
				projection: 'EPSG:3857',
				extent: balticExtent,
				minZoom: 5,
				maxZoom: 18
			}),
			controls: defaultControls({ rotate: false }).extend(this.createCustomControls())
		});

		// Popup hinzufügen
		this.map.addOverlay(this.popup);

		// Initialisiere Filter-Elemente
		this.initializeControls(options);

		// Initialisiere Geolocation nach Map-Erstellung
		this.initializeGeolocation();

		// Optimierte Event-Handler
		this.initializeOptimizedEvents();

		// Lade Daten für das aktuelle Jahr
		this.setYear(this.displayedYear);

		// Initialisiere Zeitraum-Anzeige
		this.updateTimeRange();
	}

	private createPopup(): void {
		this.popupElement = document.createElement('div');
		this.popupElement.className = 'ol-popup';
		this.popupElement.innerHTML = `
			<div class="ol-popup-content">
				<button class="ol-popup-closer" type="button">×</button>
				<div class="popup-body"></div>
			</div>
		`;

		// Style the popup
		this.popupElement.style.cssText = `
			position: absolute;
			background-color: white;
			box-shadow: 0 1px 4px rgba(0,0,0,0.2);
			padding: 15px;
			border-radius: 10px;
			border: 1px solid #cccccc;
			bottom: 12px;
			left: -50px;
			min-width: 280px;
			z-index: 1000;
		`;

		// Close button
		const closer = this.popupElement.querySelector('.ol-popup-closer') as HTMLButtonElement;
		closer.onclick = () => this.popup.setPosition(undefined);
		closer.style.cssText = `
			position: absolute;
			top: 2px;
			right: 8px;
			border: none;
			background: none;
			font-size: 18px;
			cursor: pointer;
			color: #999;
		`;

		this.popup = new Overlay({
			element: this.popupElement,
			autoPan: {
				animation: {
					duration: 250
				}
			}
		});
	}

	private initializeOptimizedEvents(): void {
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		// Hover-Event nur für Desktop (nicht Touch-Geräte)
		if (!isTouchDevice) {
			this.map.on('pointermove', (event) => {
				const infoElement = document.getElementById('info');
				const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => feature);

				if (feature && infoElement) {
					const coordinates = event.coordinate;
					let infoText = '';

					// Prüfe ob es ein Cluster-Feature ist
					const features = feature.get('features');
					if (features && features.length > 1) {
						// Cluster-Info erstellen
						infoText = this.createClusterInfoText(features);
					} else if (features && features.length === 1) {
						// Einzelnes Feature aus Cluster
						const singleFeature = features[0];
						const props = singleFeature.getProperties();
						infoText = this.createInfoText(props as SightingProperties);
					} else {
						// Normales einzelnes Feature
						const props = feature.getProperties();
						infoText = this.createInfoText(props as SightingProperties);
					}

					// Zeige Info-Element
					infoElement.innerHTML = infoText;
					infoElement.style.display = 'block';

					// Positioniere das Info-Element relativ zur Maus
					const pixel = this.map.getPixelFromCoordinate(coordinates);
					if (pixel && Array.isArray(pixel)) {
						const mapContainer = this.map.getTargetElement();
						this.positionInfoElement(mapContainer, pixel, infoElement);
					}

					// Ändere Cursor
					this.map.getTargetElement().style.cursor = 'pointer';
				} else {
					const infoElement = document.getElementById('info');
					if (infoElement) {
						// Verstecke Info-Element
						infoElement.style.display = 'none';
					}
					this.map.getTargetElement().style.cursor = '';
				}
			});
		}

		// Click-Event für Popup
		this.map.on('click', (event) => {
			const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => feature);

			if (feature) {
				const features = feature.get('features');
				const zoom = this.map.getView().getZoom() || 7;

				if (features && features.length > 1 && zoom < 12) {
					// Zoom zu Cluster bei niedrigem Zoom
					this.zoomToCluster(features);
				} else {
					// Zeige Popup
					this.showPopup(event.coordinate, feature as Feature<Geometry>);
				}
			} else {
				this.popup.setPosition(undefined);
			}
		});

		// Zoom-optimierte Cluster-Distanz
		this.map.getView().on('change:resolution', () => {
			this.updateClusterDistance();
		});
	}

	private showPopup(coordinate: number[], feature: Feature<Geometry>): void {
		const contentDiv = this.popupElement.querySelector('.popup-body') as HTMLDivElement;
		const features = feature.get('features');

		if (features && features.length > 1) {
			// Cluster
			contentDiv.innerHTML = this.createClusterPopupContent(features);
		} else {
			// Einzelfeature
			const singleFeature = features ? features[0] : feature;
			const props = singleFeature.getProperties() as SightingProperties;
			contentDiv.innerHTML = this.createSightingPopupContent(props);
		}

		this.popup.setPosition(coordinate);
	}

	private createSightingPopupContent(props: SightingProperties): string {
		const speciesMap = this.translations.speciesMap;
		const speciesName = sanitizeText(
			speciesMap[props.ta.toString()] || `Unbekannte Art (${props.ta})`
		);
		const date = props.ts ? new Date(props.ts * 1000).toLocaleDateString('de-DE') : 'Unbekannt';

		let content = `
			<div class="sighting-popup">
				<h3 style="margin: 0 0 10px 0; color: #333;">${speciesName}</h3>
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.count)}:</strong> ${props.ct} Tier${props.ct > 1 ? 'e' : ''}
				</div>
		`;

		if (props.jt && props.jt > 0) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.young)}:</strong> ${props.jt}
				</div>
			`;
		}

		if (props.tf) {
			content += `
				<div style="margin-bottom: 8px; color: #dc2626;">
					<strong>${sanitizeText(this.translations.found_dead)}:</strong> Ja
				</div>
			`;
		}

		content += `
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.report_date)}:</strong> ${date}
				</div>
		`;

		if (props.waterway) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.area)}:</strong> ${sanitizeText(props.waterway)}
				</div>
			`;
		}

		if (props.name || props.firstname) {
			const fullName = [props.firstname, props.name]
				.filter(Boolean)
				.map((v) => sanitizeText(v!))
				.join(' ');
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.name)}:</strong> ${fullName}
				</div>
			`;
		}

		if (props.shipname) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${sanitizeText(this.translations.ship)}:</strong> ${sanitizeText(props.shipname)}
				</div>
			`;
		}

		content += '</div>';
		return content;
	}

	private createClusterPopupContent(features: Feature<Geometry>[]): string {
		const count = features.length;
		const speciesCount: Record<string, number> = {};

		features.forEach((feature) => {
			const props = feature.getProperties() as SightingProperties;
			const species = props.ta.toString();
			speciesCount[species] = (speciesCount[species] || 0) + 1;
		});

		let content = `
			<div class="cluster-popup">
				<h3 style="margin: 0 0 10px 0; color: #333;">${count} Sichtungen</h3>
		`;

		Object.entries(speciesCount).forEach(([species, count]) => {
			const speciesName = sanitizeText(this.translations.speciesMap[species] || `Art ${species}`);
			content += `
				<div style="margin-bottom: 4px;">
					${speciesName}: ${count}
				</div>
			`;
		});

		content += `
				<div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
					Zoomen Sie hinein für Details
				</div>
			</div>
		`;

		return content;
	}

	private zoomToCluster(features: Feature<Geometry>[]): void {
		const view = this.map.getView();
		const extent = olExtent.createEmpty();

		features.forEach((feature) => {
			const geom = feature.getGeometry();
			if (geom) {
				olExtent.extend(extent, geom.getExtent());
			}
		});

		view.fit(extent, {
			duration: 500,
			padding: [20, 20, 20, 20],
			maxZoom: 14
		});
	}

	private updateClusterDistance(): void {
		const zoom = this.map.getView().getZoom() || 7;

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

	public setYearChangeCallback(callback: (year: number) => void): void {
		this.yearChangeCallback = callback;
	}

	// Behalte alle bestehenden Public-Methoden für Kompatibilität
	public async setYear(year: number): Promise<void> {
		this.displayedYear = year;
		this.yearChangeCallback?.(year);

		try {
			await this.loadSightings(year, this.searchTerm);

			// timeFilter erst nach erfolgreichem Fetch setzen, damit während des Ladens
			// keine alten Features mit dem neuen Jahres-Zeitraum gefiltert werden
			const yearStart = new Date(year, 0, 1).getTime();
			const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
			this.timeFilter = {
				lower: yearStart,
				upper: yearEnd
			};
			// Redraw und Zeitraum-Anzeige aktualisieren nachdem timeFilter gesetzt wurde
			this.reportsLayer.changed();
			this.updateTimeRange();
		} catch (error) {
			console.error('Error loading sightings:', error);
			throw error;
		}
	}

	private async loadSightings(year: number, searchTerm?: string): Promise<void> {
		const params = new URLSearchParams({ year: year.toString() });
		if (searchTerm) params.set('search', searchTerm);

		const response = await fetch(`/api/map/sightings?${params}`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: Fehler beim Laden der Sichtungen`);
		}
		const geoJsonData = await response.json();

		const format = new GeoJSON();
		const features = format.readFeatures(geoJsonData, {
			featureProjection: 'EPSG:3857'
		});

		this.reportsSource.clear();
		this.reportsSource.addFeatures(features);

		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
	}

	public setHiddenSpecies(species: Record<string, boolean>): void {
		this.hiddenSpecies = species;
		this.reportsLayer.changed();
	}

	public setHiddenColors(colors: Record<string, boolean>): void {
		this.hiddenColors = colors;
		this.reportsLayer.changed();
	}

	public getMap(): Map {
		return this.map;
	}

	private createCustomControls(): Control[] {
		const controls: Control[] = [];

		if (this.options.enableLocationControl) {
			controls.push(new LocationControl(this));
		}

		controls.push(new ZoomAllControl(this));
		return controls;
	}

	private initializeControls(options: MapOptions): void {
		// Jahr-Selector
		if (options.yearSelectorId) {
			const yearSelect = document.getElementById(options.yearSelectorId) as HTMLSelectElement;
			if (yearSelect) {
				// Setze das Default-Jahr im Dropdown
				yearSelect.value = this.displayedYear.toString();

				yearSelect.addEventListener('change', (event) => {
					const target = event.target as HTMLSelectElement;
					this.setYear(parseInt(target.value));
				});
			}
		}

		// Filter-Input
		if (options.filterInputId) {
			const filterInput = document.getElementById(options.filterInputId) as HTMLInputElement;
			if (filterInput) {
				let timeout: number;
				filterInput.addEventListener('input', () => {
					clearTimeout(timeout);
					timeout = window.setTimeout(() => {
						this.applyFilter(filterInput.value);
					}, 300);
				});
			}
		}
	}

	private initializeGeolocation(): void {
		this.geolocation = new Geolocation({
			trackingOptions: {
				enableHighAccuracy: true
			},
			projection: this.map.getView().getProjection()
		});

		this.geolocation.on('change:position', () => {
			const coordinates = this.geolocation.getPosition();
			if (coordinates) {
				this.locationSource.clear();
				const positionFeature = new Feature({
					geometry: new OlPoint(coordinates),
					type: 'location'
				});
				this.locationSource.addFeature(positionFeature);
			}
		});

		this.geolocation.on('change:accuracyGeometry', () => {
			const accuracy = this.geolocation.getAccuracyGeometry();
			if (accuracy) {
				this.locationSource.clear();
				const accuracyFeature = new Feature({
					geometry: accuracy,
					type: 'accuracy'
				});
				this.locationSource.addFeature(accuracyFeature);
			}
		});
	}

	private applyFilter(searchTerm: string): void {
		this.searchTerm = searchTerm;
		// fire-and-forget: unhandled rejection propagiert als window.unhandledrejection
		// und wird vom Error-Handler in SightingsMapView aufgefangen
		void this.loadSightings(this.displayedYear, searchTerm);
	}

	private updateTimeFilter(): void {
		// Time filter implementation
		this.reportsLayer.changed();
		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
	}

	public startTracking(): void {
		this.isTracking = true;
		this.geolocation.setTracking(true);
	}

	public stopTracking(): void {
		this.isTracking = false;
		this.geolocation.setTracking(false);
		this.locationSource.clear();
	}

	public isCurrentlyTracking(): boolean {
		return this.isTracking;
	}

	public addFeatureFromCoordinate(coordinate: number[]): void {
		const feature = new Feature({
			geometry: new OlPoint(coordinate)
		});
		this.reportsSource.addFeature(feature);
	}

	public getExtent(): number[] | null {
		const extent = this.reportsSource.getExtent();
		return extent && extent.some((val) => isFinite(val)) ? extent : null;
	}

	public zoomAllFeatures(): void {
		const extent = this.reportsSource.getExtent();
		if (extent && extent.every((val) => isFinite(val))) {
			this.map.getView().fit(extent, {
				padding: [50, 50, 50, 50],
				duration: 1000,
				maxZoom: 12
			});
		}
	}

	public toggleGeolocation(): boolean {
		if (this.isTracking) {
			this.stopTracking();
			return false;
		} else {
			this.startTracking();
			return true;
		}
	}

	/**
	 * Räumt alle Map-Ressourcen auf: Geolocation, Overlay, Event-Listener, Map.
	 * MUSS beim Unmount der Komponente aufgerufen werden.
	 */
	public dispose(): void {
		// Geolocation stoppen
		this.geolocation.setTracking(false);

		// Popup entfernen
		this.popup.setPosition(undefined);
		this.map.removeOverlay(this.popup);

		// Map disposen (entfernt alle Layer, Controls, Event-Listener)
		this.map.dispose();
	}

	public getHidden(): { species: Record<string, boolean>; colors: Record<string, boolean> } {
		return {
			species: this.hiddenSpecies,
			colors: this.hiddenColors
		};
	}

	public getTimeFilter(): { lower: number; upper: number } {
		return this.timeFilter;
	}

	public getFeatures(): Feature<Geometry>[] {
		return this.reportsSource.getFeatures();
	}

	public setLegendUpdateCallback(callback: () => void): void {
		this.legendUpdateCallback = callback;
	}

	public setSpeciesVisibility(speciesId: string, visible: boolean): void {
		this.hiddenSpecies[speciesId] = !visible;
		this.reportsLayer.changed();
		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
	}

	public setColorVisibility(colorGroup: string, visible: boolean): void {
		this.hiddenColors[colorGroup] = !visible;
		this.reportsLayer.changed();
		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
	}

	public setFilter(start?: number, end?: number): void {
		if (start) this.timeFilter.lower = start;
		if (end) this.timeFilter.upper = end;
		this.reportsLayer.changed();
		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
		this.updateTimeRange();
	}

	public getDisplayedYear(): number {
		return this.displayedYear;
	}

	private updateTimeRange(): void {
		const timeStartElement = document.getElementById('time-start');
		const timeEndElement = document.getElementById('time-end');

		if (timeStartElement) {
			timeStartElement.innerText = new Date(this.timeFilter.lower).toLocaleDateString('de-DE', {
				day: '2-digit',
				month: '2-digit'
			});
		}

		if (timeEndElement) {
			timeEndElement.innerText = new Date(this.timeFilter.upper).toLocaleDateString('de-DE', {
				day: '2-digit',
				month: '2-digit'
			});
		}
	}

	private createInfoText(properties: SightingProperties): string {
		const species = sanitizeText(this.translations.speciesMap[properties.ta] || 'Unbekannte Art');
		const count = properties.ct || 0;
		const date = properties.ts
			? new Date(properties.ts * 1000).toLocaleDateString('de-DE')
			: 'Unbekanntes Datum';
		const isDead = properties.tf ? ` (${sanitizeText(this.translations.found_dead)})` : '';
		return `
			<div class="p-2 text-sm">
				<strong>${species}</strong><br>
				${sanitizeText(this.translations.count)}: ${count}${isDead}<br>
				${sanitizeText(this.translations.report_date)}${date}
			</div>
		`;
	}

	private createClusterInfoText(features: Feature<Geometry>[]): string {
		const count = features.length;
		const speciesCount: Record<string, number> = {};

		// Zähle die verschiedenen Arten im Cluster
		features.forEach((feature) => {
			const properties = feature.getProperties() as SightingProperties;
			const speciesKey = properties.ta.toString();
			speciesCount[speciesKey] = (speciesCount[speciesKey] || 0) + 1;
		});

		// Erstelle eine Zusammenfassung der häufigsten Arten
		const sortedSpecies = Object.entries(speciesCount)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3) // Zeige nur die 3 häufigsten Arten
			.map(([speciesId, count]) => {
				const speciesName = sanitizeText(
					this.translations.speciesMap[speciesId] || 'Unbekannte Art'
				);
				return `${speciesName}: ${count}`;
			});

		return `
			<div class="p-2 text-sm">
				<strong>${count} Sichtungen</strong><br>
				${sortedSpecies.join('<br>')}
			</div>
		`;
	}

	private positionInfoElement(
		mapContainer: HTMLElement,
		pixel: number[],
		infoElement: HTMLElement
	): void {
		const mapRect = mapContainer.getBoundingClientRect();
		const infoRect = infoElement.getBoundingClientRect();

		if (!mapRect || !infoRect || !pixel || pixel.length < 2) return;

		// Use destructuring to satisfy TypeScript's null checks
		const [pixelX, pixelY] = pixel;
		if (pixelX === undefined || pixelY === undefined) return;

		let left = pixelX + 10;
		let top = pixelY - infoRect.height - 10;

		// Prüfe ob das Element über den rechten Rand hinausragt
		if (left + infoRect.width > mapRect.width) {
			left = pixelX - infoRect.width - 10;
		}

		// Prüfe ob das Element über den oberen Rand hinausragt
		if (top < 0) {
			top = pixelY + 10;
		}

		infoElement.style.left = Math.max(0, left) + 'px';
		infoElement.style.top = Math.max(0, top) + 'px';
	}

	private createFilteredClusterStyle(
		_clusterFeature: Feature<Geometry>,
		features: Feature<Geometry>[]
	): Style | null {
		// Zähle nur die sichtbaren Features im Cluster
		let visibleCount = 0;

		features.forEach((feature) => {
			const properties = feature.getProperties() as SightingProperties;
			const speciesId = properties.ta?.toString() || '0';
			// Convert ta to number for getFeatureColorGroup
			const colorGroupProperties = {
				...properties,
				ta: typeof properties.ta === 'string' ? parseInt(properties.ta) : properties.ta || 0,
				tf: properties.tf || false, // Provide default value for required tf property
				ts: properties.ts || 0 // Provide default value for required ts property
			};
			const colorGroup = getFeatureColorGroup(colorGroupProperties);
			const timestamp = (properties.ts || 0) * 1000;

			// Prüfe Sichtbarkeit basierend auf aktuellen Filtern
			const isHiddenBySpecies = this.hiddenSpecies[speciesId];
			const isHiddenByColor = this.hiddenColors[colorGroup];
			const isHiddenByTime = timestamp < this.timeFilter.lower || timestamp > this.timeFilter.upper;

			if (!isHiddenBySpecies && !isHiddenByColor && !isHiddenByTime) {
				visibleCount++;
			}
		});

		// Wenn keine Features sichtbar sind, zeige den Cluster nicht an
		if (visibleCount === 0) {
			return null;
		}

		// Erstelle Cluster-Style basierend auf der Anzahl sichtbarer Features
		const size = visibleCount;

		// Bestimme Cluster-Größe und Farbe basierend auf Anzahl der sichtbaren Features
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

		return new Style({
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
	}
}
