import type { Map } from 'ol';
import type { Coordinate } from 'ol/coordinate';
import type Feature from 'ol/Feature';
import type BaseLayer from 'ol/layer/Base';

// Direkte Importe für alle benötigten OpenLayers-Module

import Collection from 'ol/Collection';
import { Control, defaults as defaultControls } from 'ol/control';
import OLFeature from 'ol/Feature';
import OLPoint from 'ol/geom/Point';
import Translate from 'ol/interaction/Translate';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import OLMap from 'ol/Map';
import { fromLonLat, toLonLat, transform } from 'ol/proj';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Icon, Style } from 'ol/style';
import OLView from 'ol/View';


/**
 * GPS-Positionierungs-Control für OpenLayers (vereinfacht für OLMap)
 * Verwendet das neue LocationControl-Design mit kontinuierlichem Tracking
 */
export class FormLocationControl extends Control {
	private onPositionCallback?: (position: Coordinate) => void;
	private button: HTMLButtonElement;
	private isTracking: boolean = false;
	private watchId: number | null = null;

	constructor(onPosition: (position: Coordinate) => void) {
		const button = document.createElement('button');
		button.innerHTML = '📍';
		button.title = 'GPS-Position anzeigen';
		button.className = 'gps-button';

		const element = document.createElement('div');
		element.className = 'ol-control gps-control';
		element.appendChild(button);

		super({
			element: element
		});

		this.onPositionCallback = onPosition;
		this.button = button;

		button.addEventListener('click', () => {
			this.toggleGeolocation();
		});
	}

	private toggleGeolocation() {
		if (!navigator.geolocation) {
			alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
			return;
		}

		this.isTracking = !this.isTracking;

		if (this.isTracking) {
			// Starte GPS-Tracking
			this.startTracking();
		} else {
			// Stoppe GPS-Tracking
			this.stopTracking();
		}
	}

	private startTracking() {
		// Button-Erscheinungsbild aktualisieren
		this.button.style.backgroundColor = '#3b82f6';
		this.button.style.color = 'white';
		this.button.title = 'GPS-Tracking stoppen';

		// Kontinuierliche Positionsverfolgung starten
		this.watchId = navigator.geolocation.watchPosition(
			(position) => {
				const coords: Coordinate = [position.coords.longitude, position.coords.latitude];
				
				if (this.onPositionCallback) {
					this.onPositionCallback(coords);
				}
			},
			(error) => {
				console.warn('GPS-Positionierung fehlgeschlagen:', error);
				this.stopTracking();
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000
			}
		);
	}

	private stopTracking() {
		// Position tracking stoppen
		if (this.watchId !== null) {
			navigator.geolocation.clearWatch(this.watchId);
			this.watchId = null;
		}

		this.isTracking = false;

		// Button-Erscheinungsbild zurücksetzen
		this.button.style.backgroundColor = 'rgba(0, 60, 136, 0.5)';
		this.button.style.color = 'white';
		this.button.title = 'GPS-Position anzeigen';
	}
}

/**
 * Optimiert Canvas für häufige getImageData-Operationen (OpenLayers)
 */
function optimizeCanvasForOpenLayers(): void {
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
 * Erstellt eine neue OpenLayers-Karte
 * @param target Das HTML-Element für die Karte
 * @param center Koordinaten für das Zentrum der Karte
 * @param zoom Zoomlevel
 * @param enableGPS Optional: GPS-Control hinzufügen
 * @param onGPSPosition Optional: Callback für GPS-Position
 * @returns Die erstellte Karte
 */
export function createMap(
	target: HTMLElement,
	center: Coordinate,
	zoom: number,
	enableGPS: boolean = false,
	onGPSPosition?: (position: Coordinate) => void
): Map {
	// Optimiere Canvas vor Map-Erstellung
	optimizeCanvasForOpenLayers();
	// OSM-Layer erstellen
	const osmLayer = new TileLayer({
		source: new OSM()
	});

	// Kartenansicht erstellen
	const view = new OLView({
		center: fromLonLat(center),
		zoom: zoom
	});

	// Controls erstellen
	const controls = defaultControls();

	// GPS-Control hinzufügen, wenn aktiviert
	if (enableGPS && onGPSPosition) {
		const gpsControl = new FormLocationControl(onGPSPosition);
		controls.push(gpsControl);
	}

	// Karte erstellen
	const map = new OLMap({
		target: target,
		layers: [osmLayer],
		view: view,
		controls: controls
	});

	// Wichtig: Karte neu rendern, wenn das Ziel-Element sichtbar ist
	map.updateSize();

	return map;
}

/**
 * Erstellt einen Marker auf der Karte
 * @param map Die OpenLayers-Karte
 * @param coordinates Die Koordinaten für den Marker [lon, lat]
 * @param draggable Ob der Marker ziehbar sein soll
 * @param onMove Callback-Funktion für Bewegungen des Markers
 * @returns Das erstellte Feature und die Vector-Layer
 */
export function addMarker(
	map: Map,
	coordinates: Coordinate,
	draggable: boolean = false,
	onMove?: (coordinates: Coordinate) => void
): { feature: Feature; layer: BaseLayer } {
	// Koordinaten transformieren
	const transformedCoords = fromLonLat(coordinates);

	// Feature mit Punkt-Geometrie erstellen
	const feature = new OLFeature({
		geometry: new OLPoint(transformedCoords)
	});

	// Stil für den Marker erstellen
	const markerStyle = new Style({
		image: new Icon({
			anchor: [0.5, 1],
			src: draggable ? '/marker-icon-2x.png' : '/marker-icon.png', // Größeres Icon für verschiebbare Marker
			scale: draggable ? 0.8 : 1,
			// Spezielle Stile für verschiebbare Marker
			opacity: draggable ? 0.9 : 1,
			crossOrigin: 'anonymous'
		})
	});

	feature.setStyle(markerStyle);

	// Vektorquelle mit dem Feature erstellen
	const vectorSource = new VectorSource({
		features: [feature]
	});

	// Vector Layer erstellen und zur Karte hinzufügen
	const vectorLayer = new VectorLayer({
		source: vectorSource
	});

	map.addLayer(vectorLayer);

	// Drag-and-Drop-Funktionalität hinzufügen, wenn draggable ist true
	if (draggable) {
		// Feature-Collection für Translate erstellen
		const features = new Collection([feature]);

		// Translate-Interaktion erstellen für das Verschieben von Features
		const translate = new Translate({
			features: features
		});

		map.addInteraction(translate);

		if (onMove) {
			// Event beim Verschieben auslösen
			translate.on('translateend', () => {
				const geometry = feature.getGeometry() as OLPoint;
				const internalCoords = geometry.getCoordinates();
				// Konvertiere zurück in Längen- und Breitengrad
				const lonLatCoords = toLonLat(internalCoords);
				onMove(lonLatCoords);
			});
		}
	}

	return { feature, layer: vectorLayer };
}

/**
 * Konvertiert Koordinaten zwischen WGS84 (EPSG:4326) und Web Mercator (EPSG:3857)
 * @param coordinates Die zu konvertierenden Koordinaten
 * @param source Das Quell-Projektionssystem
 * @param destination Das Ziel-Projektionssystem
 * @returns Die konvertierten Koordinaten
 */
export function transformCoordinates(
	coordinates: Coordinate,
	source: string = 'EPSG:4326',
	destination: string = 'EPSG:3857'
): Coordinate {
	return transform(coordinates, source, destination);
}

/**
 * Setzt das Zentrum der Karte
 * @param map Die OpenLayers-Karte
 * @param coordinates Die Koordinaten für das Zentrum [lon, lat]
 * @param zoom Optional: Zoomlevel
 */
export function setMapCenter(map: Map, coordinates: Coordinate, zoom?: number): void {
	const view = map.getView();
	view.setCenter(fromLonLat(coordinates));
	if (zoom !== undefined) {
		view.setZoom(zoom);
	}
}
