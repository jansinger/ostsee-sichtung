import { Overlay } from 'ol';
import type { Feature } from 'ol';
import type { Geometry } from 'ol/geom';
import type { MapTranslations } from './mapUtils';

export interface SightingProperties {
	id: number;
	ta: number; // species
	ct: number; // count
	jt?: number; // juvenile count
	ts?: number; // timestamp
	tf?: boolean; // dead
	name?: string;
	firstname?: string;
	shipname?: string;
	waterway?: string;
}

export class MapPopup {
	private overlay: Overlay;
	private element: HTMLDivElement;
	private translations: MapTranslations;

	constructor(translations: MapTranslations) {
		this.translations = translations;
		this.element = document.createElement('div');
		this.element.className = 'ol-popup';
		this.element.innerHTML = `
			<div class="ol-popup-content">
				<button class="ol-popup-closer" type="button">×</button>
				<div class="popup-body"></div>
			</div>
		`;

		// Style the popup
		this.element.style.cssText = `
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

		// Add close button functionality
		const closer = this.element.querySelector('.ol-popup-closer') as HTMLButtonElement;
		closer.onclick = () => this.hide();
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

		this.overlay = new Overlay({
			element: this.element,
			autoPan: {
				animation: {
					duration: 250
				}
			}
		});
	}

	getOverlay(): Overlay {
		return this.overlay;
	}

	show(coordinate: number[], features: Feature<Geometry>[]): void {
		const contentDiv = this.element.querySelector('.popup-body') as HTMLDivElement;
		
		if (features.length === 1) {
			// Single feature
			const feature = features[0];
			if (!feature) return;
			
			const isCluster = feature.get('features');
			
			if (isCluster) {
				// Cluster
				const clusterFeatures = feature.get('features') as Feature<Geometry>[];
				contentDiv.innerHTML = this.createClusterContent(clusterFeatures);
			} else {
				// Single sighting
				contentDiv.innerHTML = this.createSightingContent(feature.getProperties() as SightingProperties);
			}
		} else {
			// Multiple features at same location
			contentDiv.innerHTML = this.createMultipleContent(features);
		}

		this.overlay.setPosition(coordinate);
	}

	hide(): void {
		this.overlay.setPosition(undefined);
	}

	private createSightingContent(props: SightingProperties): string {
		const speciesMap = this.translations.speciesMap;
		const speciesName = speciesMap[props.ta.toString()] || `Unbekannte Art (${props.ta})`;
		const date = props.ts ? new Date(props.ts * 1000).toLocaleDateString('de-DE') : 'Unbekannt';
		
		let content = `
			<div class="sighting-popup">
				<h3 style="margin: 0 0 10px 0; color: #333;">${speciesName}</h3>
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.count}:</strong> ${props.ct} Tier${props.ct > 1 ? 'e' : ''}
				</div>
		`;

		if (props.jt && props.jt > 0) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.young}:</strong> ${props.jt}
				</div>
			`;
		}

		if (props.tf) {
			content += `
				<div style="margin-bottom: 8px; color: #dc2626;">
					<strong>${this.translations.found_dead}:</strong> Ja
				</div>
			`;
		}

		content += `
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.report_date}:</strong> ${date}
				</div>
		`;

		if (props.waterway) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.area}:</strong> ${props.waterway}
				</div>
			`;
		}

		// Names only if provided (consent-based)
		if (props.name || props.firstname) {
			const fullName = [props.firstname, props.name].filter(Boolean).join(' ');
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.name}:</strong> ${fullName}
				</div>
			`;
		}

		if (props.shipname) {
			content += `
				<div style="margin-bottom: 8px;">
					<strong>${this.translations.ship}:</strong> ${props.shipname}
				</div>
			`;
		}

		content += '</div>';
		return content;
	}

	private createClusterContent(features: Feature<Geometry>[]): string {
		const count = features.length;
		const speciesCount: Record<string, number> = {};
		
		// Count species
		features.forEach(feature => {
			const props = feature.getProperties() as SightingProperties;
			const species = props.ta.toString();
			speciesCount[species] = (speciesCount[species] || 0) + 1;
		});

		let content = `
			<div class="cluster-popup">
				<h3 style="margin: 0 0 10px 0; color: #333;">${count} Sichtungen</h3>
		`;

		// Show species breakdown
		Object.entries(speciesCount).forEach(([species, count]) => {
			const speciesName = this.translations.speciesMap[species] || `Art ${species}`;
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

	private createMultipleContent(features: Feature<Geometry>[]): string {
		const count = features.length;
		return `
			<div class="multiple-popup">
				<h3 style="margin: 0 0 10px 0; color: #333;">${count} Sichtungen an diesem Ort</h3>
				<div style="font-size: 12px; color: #666;">
					Zoomen Sie hinein für Details
				</div>
			</div>
		`;
	}
}