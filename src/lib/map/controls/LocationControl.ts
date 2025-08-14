import { Control } from 'ol/control';
import type { SichtungenMap } from '../mapController.js';

/**
 * Control für GPS-Standortbestimmung
 */
export class LocationControl extends Control {
	private mapInstance: SichtungenMap;
	private button: HTMLButtonElement;

	constructor(mapInstance: SichtungenMap) {
		const button = document.createElement('button');
		button.innerHTML = '📍';
		button.title = 'GPS-Position anzeigen';

		const element = document.createElement('div');
		element.className = 'location-control ol-unselectable ol-control';
		element.appendChild(button);

		super({
			element: element
		});

		this.mapInstance = mapInstance;
		this.button = button;

		button.addEventListener('click', () => {
			this.toggleLocation();
		});
	}

	private toggleLocation(): void {
		const isTracking = this.mapInstance.toggleGeolocation();
		
		// Aktualisiere Button-Erscheinungsbild
		if (isTracking) {
			this.button.style.backgroundColor = '#3b82f6';
			this.button.style.color = 'white';
			this.button.title = 'GPS-Tracking stoppen';
		} else {
			this.button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
			this.button.style.color = '#444';
			this.button.title = 'GPS-Position anzeigen';
		}
	}
}