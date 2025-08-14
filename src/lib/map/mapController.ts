import { Feature } from 'ol';
import { Map, View } from 'ol';
import type { Control } from 'ol/control';
import { defaults as defaultControls } from 'ol/control';
import * as olExtent from 'ol/extent';
import GeoJSON from 'ol/format/GeoJSON';
import type { Geometry, Point } from 'ol/geom';
import { Point as OlPoint } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import type { Pixel } from 'ol/pixel';
import { fromLonLat } from 'ol/proj';
import { OSM, XYZ } from 'ol/source';
import Cluster from 'ol/source/Cluster';
import VectorSource from 'ol/source/Vector';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { Geolocation } from 'ol';
import type { MapTranslations } from './mapUtils';
import { createClusterStyle, createFeatureStyle } from './styleUtils';
import { ZoomAllControl } from './controls/ZoomAllControl.js';
import { LocationControl } from './controls/LocationControl.js';

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
 * Hauptklasse für die Sichtungen-Karte
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
	private featuresLoaded: number = 0;
	private legendUpdateCallback?: () => void;
	private clusterDistance: number = 50; // Pixel-Distanz für Clustering
	
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
					// Standort-Marker Style
					return new Style({
						image: new Circle({
							radius: 8,
							fill: new Fill({ color: '#3b82f6' }),
							stroke: new Stroke({ color: '#ffffff', width: 2 })
						})
					});
				} else if (type === 'accuracy') {
					// Genauigkeitskreis Style
					return new Style({
						fill: new Fill({ color: 'rgba(59, 130, 246, 0.1)' }),
						stroke: new Stroke({ color: '#3b82f6', width: 1 })
					});
				}
				return undefined;
			}
		});

		// Cluster-Source für Gruppierung der Marker
		this.clusterSource = new Cluster({
			distance: this.clusterDistance,
			minDistance: 10,
			source: this.reportsSource,
			// Nur sichtbare Features für Clustering verwenden
			geometryFunction: (feature) => {
				const properties = feature.getProperties();
				const timestamp = (properties.ts as number) * 1000;
				const speciesKey = properties.ta?.toString();
				const colorGroup = this.getColorKey(properties.ct as number);

				// Prüfe ob Feature durch Filter ausgeblendet wird
				const isHiddenBySpecies = this.hiddenSpecies[speciesKey];
				const isHiddenByColor = this.hiddenColors[colorGroup];
				const isHiddenByTime =
					timestamp < this.timeFilter.lower || timestamp > this.timeFilter.upper;

				// Nur sichtbare Features für Clustering verwenden
				if (!isHiddenBySpecies && !isHiddenByColor && !isHiddenByTime) {
					const geometry = feature.getGeometry();
					return geometry?.getType() === 'Point' ? (geometry as Point) : null;
				}

				// Versteckte Features nicht clustern
				return null;
			}
		});

		// Layer für die Sichtungen mit Clustering
		this.reportsLayer = new VectorLayer({
			source: this.clusterSource,
			style: (feature): Style | Style[] | void => {
				if (feature) {
					const features = feature.get('features');
					if (features && features.length > 1) {
						// Cluster-Style verwenden
						const style = createClusterStyle(feature as Feature<Geometry>);
						if (style) {
							return Array.isArray(style) ? style : [style];
						}
					} else if (features && features.length === 1) {
						// Einzelnes Feature - normalen Style verwenden
						const style = this.getStyle(features[0] as Feature<Geometry>);
						if (style) {
							return Array.isArray(style) ? style : [style];
						}
					}
				}
				// Explizit void zurückgeben für den Fall, dass kein Style gefunden wird
				return undefined;
			}
		});

		// Standardkoordinaten für die Ostsee
		const defaultLon = 12.18683691406284;
		const defaultLat = 55.08861442949681;
		const defaultZoom = 8;

		// Aktuelles Jahr und Zeitfilter
		const curDate = new Date();
		this.displayedYear = curDate.getMonth() > 2 ? curDate.getFullYear() : curDate.getFullYear() - 1;
		const lowerDate = new Date(this.displayedYear, 0, 1).getTime();
		this.timeFilter = {
			lower: lowerDate,
			upper: lowerDate + 86400000 * 365
		};

		// Erstelle die Karte
		this.map = new Map({
			target: options.target,
			layers: [
				// OSM-Basiskarte
				new TileLayer({
					source: new OSM()
				}),
				// OpenSeaMap-Layer für maritime Informationen
				new TileLayer({
					source: new XYZ({
						url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
					})
				}),
				// Sichtungen-Layer
				this.reportsLayer,
				// GPS-Position Layer
				this.locationLayer
			],
			view: new View({
				center: fromLonLat([defaultLon, defaultLat]),
				zoom: defaultZoom,
				projection: 'EPSG:3857'
			}),
			controls: defaultControls().extend(
				this.createCustomControls()
			),
			// Canvas-Optimierung für häufige getImageData-Aufrufe
			pixelRatio: window.devicePixelRatio
		});

		// Optimiere Canvas für häufige Lesevorgänge
		this.optimizeCanvas();

		// Initialisiere Filter-Elemente
		this.initializeControls(options);

		// Initialisiere Geolocation nach Map-Erstellung
		this.initializeGeolocation();

		// Lade Daten für das aktuelle Jahr
		this.setYear(this.displayedYear);

		// Initialisiere Event-Handler für Hover und Click (verzögert nach dem Laden)
		setTimeout(() => {
			this.initializeMapEvents();
		}, 500);
	}

	/**
	 * Initialisiert die Event-Handler für Maus-Hover und Click auf Features
	 */
	private initializeMapEvents(): void {
		const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		// Hover-Event nur für Desktop (nicht Touch-Geräte)
		if (!isTouchDevice) {
			this.map.on('pointermove', (event) => {
				// Info-Element bei jedem Event neu suchen für mehr Robustheit
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
						positionInfoElement(mapContainer, pixel, infoElement);
					}

					// Ändere Cursor
					this.map.getTargetElement()!.style.cursor = 'pointer';
				} else {
					const infoElement = document.getElementById('info');
					if (infoElement) {
						// Verstecke Info-Element
						infoElement.style.display = 'none';
					}
					this.map.getTargetElement()!.style.cursor = '';
				}
			});
		}

		// Click-Event für Mobile und zusätzliche Info
		this.map.on('singleclick', (event) => {
			const infoElement = document.getElementById('info');
			const feature = this.map.forEachFeatureAtPixel(event.pixel, (feature) => feature);

			if (feature) {
				// Prüfe ob es ein Cluster-Feature ist
				const features = feature.get('features');
				if (features && features.length > 1) {
					// Für Cluster: Zoome auf das Cluster-Extent
					this.zoomToCluster(features);
					// Verstecke eventuell angezeigte Info-Box
					if (infoElement) {
						infoElement.style.display = 'none';
					}
				} else if (features && features.length === 1) {
					// Einzelnes Feature aus Cluster
					const singleFeature = features[0];
					const props = singleFeature.getProperties();
					const detailedInfo = this.createDetailedInfoText(props as SightingProperties);

					if (infoElement) {
						infoElement.innerHTML = detailedInfo;
						infoElement.style.display = 'block';

						// Positioniere das Info-Element
						const pixel = this.map.getPixelFromCoordinate(event.coordinate);
						if (pixel) {
							const mapContainer = this.map.getTargetElement();
							positionInfoElement(mapContainer, pixel, infoElement);
						}
					}
				} else {
					// Normales einzelnes Feature
					const props = feature.getProperties();
					const detailedInfo = this.createDetailedInfoText(props as SightingProperties);

					if (infoElement) {
						infoElement.innerHTML = detailedInfo;
						infoElement.style.display = 'block';

						// Positioniere das Info-Element
						const pixel = this.map.getPixelFromCoordinate(event.coordinate);
						if (pixel) {
							const mapContainer = this.map.getTargetElement();
							positionInfoElement(mapContainer, pixel, infoElement);
						}
					}
				}
			} else if (infoElement) {
				// Verstecke Info beim Klick außerhalb von Features
				infoElement.style.display = 'none';
			}
		});

		// Verstecke Info-Element bei Zoom oder Pan
		this.map.getView().on('change:center', () => {
			const infoElement = document.getElementById('info');
			if (infoElement) {
				infoElement.style.display = 'none';
			}
		});

		this.map.getView().on('change:resolution', () => {
			const infoElement = document.getElementById('info');
			if (infoElement) {
				infoElement.style.display = 'none';
			}
		});
	}

	/**
	 * Erstellt einen kurzen Info-Text für Hover
	 */
	private createInfoText(properties: SightingProperties): string {
		const species = this.translations.speciesMap[properties.ta] || 'Unbekannte Art';
		const count = properties.ct || 0;
		const date = properties.ts
			? new Date(properties.ts * 1000).toLocaleDateString('de-DE')
			: 'Unbekanntes Datum';
		const isDead = properties.tf ? ` (${this.translations.found_dead})` : '';

		return `
      <div class="p-2 text-sm">
        <strong>${species}</strong><br>
        ${this.translations.count}: ${count}${isDead}<br>
        ${this.translations.report_date}${date}
      </div>
    `;
	}

	/**
	 * Erstellt einen detaillierten Info-Text für Click
	 */
	private createDetailedInfoText(properties: SightingProperties): string {
		const species = this.translations.speciesMap[properties.ta] || 'Unbekannte Art';
		const count = properties.ct || 0;
		const juvenileCount = properties.jt || 0;
		const date = properties.ts
			? new Date(properties.ts * 1000).toLocaleDateString('de-DE')
			: 'Unbekanntes Datum';
		const isDead = properties.tf ? ` (${this.translations.found_dead})` : '';
		const shipName = properties.shipname
			? `<br>${this.translations.ship}: ${properties.shipname}`
			: '';
		const waterway = properties.waterway
			? `<br>${this.translations.area}: ${properties.waterway}`
			: '';
		const name = properties.name
			? `<br>${this.translations.name}: ${properties.firstname || ''} ${properties.name}`
			: '';

		return `
      <div class="p-2 text-sm max-w-xs">
        <strong>${species}</strong><br>
        ${this.translations.count}: ${count}${isDead}<br>
        ${juvenileCount > 0 ? `${this.translations.young}: ${juvenileCount}<br>` : ''}
        ${this.translations.report_date}${date}${shipName}${waterway}${name}
        <br><br>
        <em>Klicken Sie außerhalb des Markers, um diese Info zu schließen</em>
      </div>
    `;
	}

	/**
	 * Erstellt einen Info-Text für Cluster (Hover)
	 */
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
				const speciesName = this.translations.speciesMap[speciesId] || 'Unbekannte Art';
				return `${speciesName}: ${count}`;
			});

		return `
			<div class="p-2 text-sm">
				<strong>Cluster mit ${count} Sichtungen</strong><br>
				${sortedSpecies.join('<br>')}
				${Object.keys(speciesCount).length > 3 ? '<br>+ weitere Arten' : ''}
			</div>
		`;
	}

	/**
	 * Zoomt auf ein Cluster, um die einzelnen Features sichtbar zu machen
	 */
	private zoomToCluster(features: Feature<Geometry>[]): void {
		if (!features || features.length === 0) return;

		// Erstelle ein Extent basierend auf allen Features im Cluster
		const ext = olExtent.createEmpty();

		features.forEach((feature) => {
			const geometry = feature.getGeometry();
			if (geometry) {
				olExtent.extend(ext, geometry.getExtent());
			}
		});

		// Wenn alle Features am selben Punkt sind, erweitere das Extent minimal
		if (olExtent.getWidth(ext) === 0 && olExtent.getHeight(ext) === 0) {
			const center = olExtent.getCenter(ext);
			if (
				center &&
				center.length >= 2 &&
				typeof center[0] === 'number' &&
				typeof center[1] === 'number'
			) {
				const buffer = 1000; // 1km Buffer für Punkt-Cluster
				if (ext && ext.length >= 4) {
					const centerX = center[0];
					const centerY = center[1];
					ext[0] = centerX - buffer;
					ext[1] = centerY - buffer;
					ext[2] = centerX + buffer;
					ext[3] = centerY + buffer;
				}
			}
		}

		// Zoome auf das Extent mit Animation
		const view = this.map.getView();
		const currentZoom = view.getZoom() || 8;
		const newZoom = Math.min(currentZoom + 2, 15); // Maximal Zoom-Level 15

		view.fit(ext, {
			padding: [50, 50, 50, 50],
			duration: 500,
			maxZoom: newZoom
		});
	}

	private initializeControls(options: MapOptions): void {
		// Jahr-Selektor
		if (options.yearSelectorId) {
			const yearSelector = document.getElementById(options.yearSelectorId) as HTMLSelectElement;
			if (yearSelector) {
				yearSelector.value = this.displayedYear.toString();
				yearSelector.addEventListener('change', (event) => {
					this.setYearFromSelect(event);
				});
			}
		}

		// Filter-Input
		if (options.filterInputId) {
			const filterInput = document.getElementById(options.filterInputId);
			if (filterInput) {
				filterInput.addEventListener('keypress', (event) => {
					if ((event as KeyboardEvent).key === 'Enter') {
						this.filterByString(event);
					}
				});
			}
		}

		// Aktualisiere die Zeitanzeige
		this.updateTimeRange(options.timeStartId, options.timeEndId);
	}

	/**
	 * Erzeugt einen Style für ein Feature
	 */
	private getStyle(feature: Feature<Geometry>): Style | Style[] | null {
		// Implementierung der Style-Logik
		// Stelle sicher, dass diese Methode immer Style, Style[] oder null zurückgibt
		try {
			// Deine bestehende Style-Logik hier
			const properties = feature.getProperties();
			const timestamp = (properties.ts as number) * 1000; // Timestamp in ms
			const speciesKey = properties.ta?.toString(); // ta = Tierart
			const count = properties.ct as number; // ct = Count (Anzahl)

			// Setze die Properties für createFeatureStyle
			feature.set('speciesKey', speciesKey);
			feature.set('count', count);

			// Prüfe, ob das Feature durch Filter ausgeblendet werden soll
			if (
				this.hiddenSpecies[speciesKey] ||
				this.hiddenColors[this.getColorKey(count)] ||
				timestamp < this.timeFilter.lower ||
				timestamp > this.timeFilter.upper
			) {
				feature.set('stcVisibility', false);
				return null;
			}

			feature.set('stcVisibility', true);

			// Setze die Farbgruppe
			const colorGroup = this.getColorKey(count);
			feature.set('stcGroup', colorGroup);

			const style = createFeatureStyle(
				feature,
				this.hiddenSpecies,
				this.hiddenColors,
				this.timeFilter
			);
			return style === null ? null : style;
		} catch (error) {
			console.warn('Fehler beim Erstellen des Styles:', error);
			return null;
		}
	}

	/**
	 * Ermittelt den Farbschlüssel anhand der Anzahl
	 */
	private getColorKey(count: number): string {
		if (count === 0) return 'ct0'; // Totfund
		if (count === 1) return 'ct1';
		if (count >= 2 && count <= 5) return 'ct2';
		if (count >= 6 && count <= 10) return 'ct6';
		if (count >= 11 && count <= 15) return 'ct11';
		if (count > 15) return 'ct15';
		return 'ct1'; // Fallback
	}

	/**
	 * Gibt das aktuell angezeigte Jahr zurück
	 */
	public getDisplayedYear(): number {
		return this.displayedYear;
	}

	/**
	 * Setzt das Jahr für die anzuzeigenden Daten
	 */
	public setYear(year: number): void {
		this.displayedYear = year;
		const lastDay = new Date(year, 11, 31, 23, 59, 59);
		const lowerDate = new Date(year, 0, 1).getTime();
		this.setFilter(lowerDate, lastDay.getTime());
		this.setSource(year);
	}

	/**
	 * Setzt das Jahr basierend auf der Select-Box
	 */
	private setYearFromSelect(event: Event): void {
		const select = event.target as HTMLSelectElement;
		this.setYear(parseInt(select.value, 10));
	}

	/**
	 * Filtert die Anzeige basierend auf einem Zeitraum
	 */
	public setFilter(start?: number, end?: number): void {
		if (start) this.timeFilter.lower = start;
		if (end) this.timeFilter.upper = end;
		// Aktualisiere Cluster-Source damit nur sichtbare Features geclustert werden
		this.clusterSource.refresh();
		this.reportsLayer.changed(); // Aktualisiert die Anzeige
		this.updateLegendCounts(); // Aktualisiert die Legende
		this.updateTimeRange(this.options.timeStartId, this.options.timeEndId); // Aktualisiert die Zeit-Anzeige
	}

	/**
	 * Aktualisiert die Zeitraum-Anzeige
	 */
	private updateTimeRange(timeStartId?: string, timeEndId?: string): void {
		if (timeStartId) {
			const timeStartElement = document.getElementById(timeStartId);
			if (timeStartElement) {
				timeStartElement.innerText = new Date(this.timeFilter.lower).toLocaleDateString('de-DE', {
					day: '2-digit',
					month: 'short',
					year: 'numeric'
				});
			}
		}

		if (timeEndId) {
			const timeEndElement = document.getElementById(timeEndId);
			if (timeEndElement) {
				timeEndElement.innerText = new Date(this.timeFilter.upper - 60000).toLocaleDateString(
					'de-DE',
					{
						day: '2-digit',
						month: 'short',
						year: 'numeric'
					}
				);
			}
		}
	}

	/**
	 * Lädt die Daten aus der API
	 */
	private setSource(year?: number, filter?: string): void {
		this.featuresLoaded = 0;
		const yearToUse = year || this.displayedYear;
		const filterParam = filter ? `&search=${encodeURIComponent(filter)}` : '';
		const url = `/api/map/sightings?year=${yearToUse}${filterParam}`;

		// Zeige Ladeindikator
		this.showLoading(true);

		fetch(url)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Fehler beim Laden der Daten: ${response.statusText}`);
				}
				return response.json();
			})
			.then((data) => {
				const format = new GeoJSON();
				this.reportsSource.clear(); // Entferne bestehende Features
				const features = format.readFeatures(data, {
					dataProjection: 'EPSG:4326',
					featureProjection: 'EPSG:3857'
				});

				this.reportsSource.addFeatures(features);
				this.featuresLoaded = 1;
				this.showLoading(false);
				this.updateLegendCounts(); // Aktualisiere die Legende nach dem Laden
			})
			.catch((error) => {
				console.error('Fehler beim Laden der Sichtungen:', error);
				this.showLoading(false);
			});
	}

	/**
	 * Filtert die Sichtungen nach einem Suchbegriff
	 */
	private filterByString(event: Event): void {
		const input = event.target as HTMLInputElement;
		const search = input.value;
		this.showLoading(true);
		this.setSource(this.displayedYear, search);
	}

	/**
	 * Zoomt auf alle sichtbaren Features
	 */
	public zoomAllFeatures(): void {
		if (this.reportsSource.getState() === 'ready') {
			// Erstelle ein Extent basierend auf allen sichtbaren Features
			const ext = olExtent.createEmpty();

			this.reportsSource.getFeatures().forEach((feature) => {
				if (feature.get('stcVisibility')) {
					const geometry = feature.getGeometry();
					if (geometry) {
						olExtent.extend(ext, geometry.getExtent());
					}
				}
			});

			// Zoom auf das Extent
			this.map.getView().fit(ext, {
				padding: [50, 50, 50, 50],
				duration: 1000
			});
		}
	}

	/**
	 * Aktualisiert die Anzeige des Ladeindikators
	 */
	private showLoading(show: boolean): void {
		const loadingElement = document.getElementById('overlay-load');
		if (loadingElement) {
			loadingElement.style.display = show ? 'block' : 'none';
		}
	}

	/**
	 * Gibt die verborgenen Arten und Farbgruppen zurück
	 */
	public getHidden(): { species: Record<string, boolean>; colors: Record<string, boolean> } {
		return {
			species: this.hiddenSpecies,
			colors: this.hiddenColors
		};
	}

	/**
	 * Gibt den aktuellen Zeitfilter zurück
	 */
	public getTimeFilter(): { lower: number; upper: number } {
		return { ...this.timeFilter };
	}

	/**
	 * Setzt den Callback für die Legende-Aktualisierung
	 */
	public setLegendUpdateCallback(callback: () => void): void {
		this.legendUpdateCallback = callback;
	}

	/**
	 * Gibt alle Features zurück
	 */
	public getFeatures(): Feature<Geometry>[] {
		return this.reportsSource.getFeatures();
	}

	/**
	 * Setzt die Cluster-Distanz
	 */
	public setClusterDistance(distance: number): void {
		this.clusterDistance = distance;
		this.clusterSource.setDistance(distance);
	}

	/**
	 * Gibt die aktuelle Cluster-Distanz zurück
	 */
	public getClusterDistance(): number {
		return this.clusterDistance;
	}

	/**
	 * Aktualisiert manuell die Legende
	 */
	public refreshLegend(): void {
		this.updateLegendCounts();
	}

	/**
	 * Initialisiert die Geolocation-Funktionalität
	 */
	private initializeGeolocation(): void {
		this.geolocation = new Geolocation({
			projection: this.map.getView().getProjection(),
			trackingOptions: {
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000
			}
		});

		// Event-Handler für Positionsänderung
		this.geolocation.on('change:position', () => {
			const position = this.geolocation.getPosition();
			if (position) {
				this.updateLocationMarker(position);
			}
		});

		// Event-Handler für Genauigkeitsänderung
		this.geolocation.on('change:accuracyGeometry', () => {
			const accuracyGeometry = this.geolocation.getAccuracyGeometry();
			if (accuracyGeometry) {
				this.updateAccuracyCircle(accuracyGeometry);
			}
		});

		// Event-Handler für Fehler
		this.geolocation.on('error', (error) => {
			console.warn('Geolocation Fehler:', error);
			// Optional: Benutzer über Fehler informieren
		});
	}

	/**
	 * Aktualisiert den Standort-Marker
	 */
	private updateLocationMarker(position: number[]): void {
		// Entferne vorherigen Marker
		this.locationSource.clear();

		// Erstelle neuen Marker
		const marker = new Feature({
			geometry: new OlPoint(position),
			type: 'location'
		});

		this.locationSource.addFeature(marker);
	}

	/**
	 * Aktualisiert den Genauigkeitskreis
	 */
	private updateAccuracyCircle(accuracyGeometry: Geometry): void {
		// Suche nach vorhandenem Genauigkeitsfeature
		const features = this.locationSource.getFeatures();
		const accuracyFeature = features.find(f => f.get('type') === 'accuracy');
		
		if (accuracyFeature) {
			// Aktualisiere vorhandenes Feature
			accuracyFeature.setGeometry(accuracyGeometry);
		} else {
			// Erstelle neues Genauigkeitsfeature
			const feature = new Feature({
				geometry: accuracyGeometry,
				type: 'accuracy'
			});
			
			this.locationSource.addFeature(feature);
		}
	}

	/**
	 * Startet oder stoppt das GPS-Tracking
	 */
	public toggleGeolocation(): boolean {
		this.isTracking = !this.isTracking;
		this.geolocation.setTracking(this.isTracking);
		
		if (!this.isTracking) {
			// Entferne Marker beim Stoppen
			this.locationSource.clear();
		}
		
		return this.isTracking;
	}

	/**
	 * Gibt zurück ob GPS-Tracking aktiv ist
	 */
	public isGeolocationTracking(): boolean {
		return this.isTracking;
	}

	/**
	 * Gibt die interne Map-Instanz zurück
	 */
	public getMap(): Map {
		return this.map;
	}

	/**
	 * Optimiert das Canvas-Element für häufige getImageData-Operationen
	 * Monkey-Patch für HTMLCanvasElement.getContext um willReadFrequently zu setzen
	 */
	private optimizeCanvas(): void {
		// Prüfe ob bereits gepatched
		if ((HTMLCanvasElement.prototype as unknown as Record<string, unknown>)._olOptimized) {
			return;
		}

		// Speichere die ursprüngliche getContext-Methode
		const originalGetContext = HTMLCanvasElement.prototype.getContext;
		
		// Überschreibe getContext für alle Canvas-Elemente
		(HTMLCanvasElement.prototype.getContext as any) = function(
			this: HTMLCanvasElement,
			contextType: string, 
			contextAttributes?: CanvasRenderingContext2DSettings | WebGLContextAttributes | ImageBitmapRenderingContextSettings
		) {
			// Für 2D-Kontext: setze willReadFrequently auf true
			if (contextType === '2d') {
				const attrs = contextAttributes as CanvasRenderingContext2DSettings || {};
				attrs.willReadFrequently = true;
				return originalGetContext.call(this, contextType, attrs);
			}
			return originalGetContext.call(this, contextType, contextAttributes);
		};

		// Markiere als gepatched
		(HTMLCanvasElement.prototype as unknown as Record<string, unknown>)._olOptimized = true;
	}

	/**
	 * Erstellt die benutzerdefinierten Controls basierend auf den Optionen
	 */
	private createCustomControls(): Control[] {
		const controls: Control[] = [new ZoomAllControl(this)];
		
		if (this.options.enableLocationControl) {
			controls.push(new LocationControl(this));
		}
		
		return controls;
	}

	/**
	 * Setzt eine Art als verborgen oder sichtbar
	 */
	public setSpeciesVisibility(speciesId: string, visible: boolean): void {
		if (visible) {
			delete this.hiddenSpecies[speciesId];
		} else {
			this.hiddenSpecies[speciesId] = true;
		}
		// Aktualisiere Cluster-Source damit nur sichtbare Features geclustert werden
		this.clusterSource.refresh();
		this.reportsLayer.changed();
		this.updateLegendCounts();
	}

	/**
	 * Setzt eine Farbgruppe als verborgen oder sichtbar
	 */
	public setColorVisibility(colorGroup: string, visible: boolean): void {
		if (visible) {
			delete this.hiddenColors[colorGroup];
		} else {
			this.hiddenColors[colorGroup] = true;
		}
		// Aktualisiere Cluster-Source damit nur sichtbare Features geclustert werden
		this.clusterSource.refresh();
		this.reportsLayer.changed();
		this.updateLegendCounts();
	}

	/**
	 * Aktualisiert die Anzeigewerte in der Legende
	 */
	private updateLegendCounts(): void {
		// Rufe den Callback auf, falls gesetzt
		if (this.legendUpdateCallback) {
			this.legendUpdateCallback();
		}
	}
}

function positionInfoElement(mapContainer: HTMLElement, pixel: Pixel, infoElement: HTMLElement) {
	if (mapContainer) {
		const rect = mapContainer.getBoundingClientRect();
		const offsetX = 10;
		const offsetY = -10;

		// Stelle sicher, dass das Info-Element nicht außerhalb des Containers angezeigt wird
		const [x, y] = pixel;

		if (x && y) {
			let left = x + offsetX;
			let top = y + offsetY;

			// Prüfe rechten Rand
			if (left + 250 > rect.width) {
				// 250px ist die geschätzte Breite des Info-Elements
				left = x - 250 - offsetX;
			}

			// Prüfe oberen Rand
			if (top < 0) {
				top = y + 30; // Zeige unterhalb des Cursors
			}
			infoElement.style.left = `${Math.max(0, left)}px`;
			infoElement.style.top = `${Math.max(0, top)}px`;
		}
	}
}
