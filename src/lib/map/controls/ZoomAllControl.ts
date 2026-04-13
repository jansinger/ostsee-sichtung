import { Control } from 'ol/control';
import type { MapController } from '$lib/map/optimizedMapController';

/**
 * Control zum Zoomen auf alle Features
 */
export class ZoomAllControl extends Control {
	constructor(mapInstance: MapController) {
		const button = document.createElement('button');
		button.innerHTML = 'Z';
		button.title = 'Auf alle Sichtungen zoomen';
		button.setAttribute('aria-label', 'Auf alle Sichtungen zoomen');

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
