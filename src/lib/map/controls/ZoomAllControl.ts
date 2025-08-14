import { Control } from 'ol/control';
import type { SichtungenMap } from '../mapController.js';

/**
 * Control zum Zoomen auf alle Features
 */
export class ZoomAllControl extends Control {
	constructor(mapInstance: SichtungenMap) {
		const button = document.createElement('button');
		button.innerHTML = 'Z';
		button.title = 'Auf alle Sichtungen zoomen';

		const element = document.createElement('div');
		element.className = 'zoom-all-control ol-unselectable ol-control';
		element.appendChild(button);

		super({
			element: element
		});

		button.addEventListener('click', () => {
			mapInstance.zoomAllFeatures();
		});
	}
}