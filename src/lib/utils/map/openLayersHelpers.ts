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

const TargetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-crosshair" viewBox="0 0 24 24">
							<circle cx="12" cy="12" r="10"/>
							<line x1="12" y1="2" x2="12" y2="6"/>
							<line x1="12" y1="18" x2="12" y2="22"/>
							<line x1="22" y1="12" x2="18" y2="12"/>
							<line x1="6" y1="12" x2="2" y2="12"/>
						</svg>
					`;

/**
 * GPS-Positionierungs-Control für OpenLayers
 */
export class GPSControl extends Control {
	private onPositionCallback?: (position: Coordinate) => void;

	constructor(onPosition: (position: Coordinate) => void) {
		const button = document.createElement('button');
		button.innerHTML = TargetIcon;
		button.title = 'Aktuelle GPS-Position abrufen';
		button.className = 'gps-button';

		const element = document.createElement('div');
		element.className = 'ol-control gps-control';
		element.appendChild(button);

		super({
			element: element
		});

		this.onPositionCallback = onPosition;

		button.addEventListener('click', () => {
			this.getCurrentPosition();
		});
	}

	private getCurrentPosition() {
		const button = this.element?.querySelector('.gps-button') as HTMLButtonElement;

		if (!navigator.geolocation) {
			alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
			return;
		}

		// Button-Status auf "loading" setzen
		if (button) {
			button.disabled = true;
			button.innerHTML = '⟳';
			button.classList.add('loading');
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const coords: Coordinate = [position.coords.longitude, position.coords.latitude];

				if (this.onPositionCallback) {
					this.onPositionCallback(coords);
				}

				// Button-Status zurücksetzen
				if (button) {
					button.disabled = false;
					button.innerHTML = TargetIcon;
					button.classList.remove('loading');
				}
			},
			(error) => {
				console.error('GPS-Positionierung fehlgeschlagen:', error);
				let errorMessage = 'GPS-Position konnte nicht abgerufen werden.';

				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage =
							'GPS-Berechtigung wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.';
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = 'GPS-Position ist nicht verfügbar.';
						break;
					case error.TIMEOUT:
						errorMessage = 'GPS-Anfrage hat zu lange gedauert.';
						break;
				}

				alert(errorMessage);

				// Button-Status zurücksetzen
				if (button) {
					button.disabled = false;
					button.innerHTML = TargetIcon;
					button.classList.remove('loading');
				}
			},
			{
				enableHighAccuracy: true,
				timeout: 15000,
				maximumAge: 60000
			}
		);
	}
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
		const gpsControl = new GPSControl(onGPSPosition);
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
