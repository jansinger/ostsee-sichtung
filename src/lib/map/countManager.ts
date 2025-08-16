import { createLogger } from './../logger';
import type { SichtungenMap } from './optimizedMapController';
import type { MapTranslations } from './mapUtils';
import { getFeatureColorGroup } from './styleUtils';

const logger = createLogger('map:MapCountManager');

/**
 * Count Manager für Species und Color Counts
 */

export interface CountData {
	speciesCounts: Record<string, { visible: number; total: number }>;
	colorCounts: Record<string, number>;
}

export interface CountManager {
	initialize(mapInstance: SichtungenMap, translations: MapTranslations): void;
	updateCounts(): void;
	getCounts(): CountData;
	onCountsUpdated(callback: (counts: CountData) => void): void;
}

export class MapCountManager implements CountManager {
	private mapInstance?: SichtungenMap;
	private translations?: MapTranslations;
	private speciesCounts: Record<string, { visible: number; total: number }> = {};
	private colorCounts: Record<string, number> = {};
	private updateCallback?: (counts: CountData) => void;

	private readonly colorGroups = ['ct0', 'ct1', 'ct2', 'ct6', 'ct11', 'ct15'];

	/**
	 * Initialisiert den Count Manager
	 */
	initialize(mapInstance: SichtungenMap, translations: MapTranslations): void {
		this.mapInstance = mapInstance;
		this.translations = translations;

		// Initialisiere die Zähler
		for (const speciesId in translations.speciesMap) {
			this.speciesCounts[speciesId] = { visible: 0, total: 0 };
		}

		for (const colorGroup of this.colorGroups) {
			this.colorCounts[colorGroup] = 0;
		}

		// Setze die Update-Funktion für die Karte
		mapInstance.setLegendUpdateCallback(() => this.updateCounts());

		// Initialisiere die Ereignisbehandler für die Legende
		this.initializeEventHandlers();
	}

	/**
	 * Aktualisiert die Zähler basierend auf den Karten-Features
	 * Berücksichtigt sowohl einzelne Features als auch geclusterte Features
	 */
	updateCounts(): void {
		if (!this.mapInstance) return;

		// Reset der Zähler
		for (const speciesId in this.speciesCounts) {
			this.speciesCounts[speciesId] = { visible: 0, total: 0 };
		}
		for (const colorGroup of this.colorGroups) {
			this.colorCounts[colorGroup] = 0;
		}

		// Hole aktuelle Filter-States direkt von der Karte
		const hiddenStates = this.mapInstance.getHidden();
		const timeFilter = this.mapInstance.getTimeFilter();

		// Für Cluster-Features müssen wir die ursprünglichen Features aus der reportsSource verwenden
		const features = this.mapInstance.getFeatures();

		features.forEach((feature) => {
			// Verwende sowohl speciesKey (von mapController gesetzt) als auch ta (original property)
			const speciesId = (feature.get('speciesKey') || feature.get('ta'))?.toString();

			// Berechne Sichtbarkeit direkt basierend auf aktuellen Filter-States
			if (speciesId && this.speciesCounts[speciesId] !== undefined) {
				const properties = feature.getProperties();
				const timestamp = (properties.ts as number) * 1000;

				// Bestimme Color-Group
				const colorGroup = getFeatureColorGroup({
					ta: properties.ta,
					ct: properties.ct,
					tf: properties.tf || properties.isDead || false,
					ts: properties.ts
				});

				this.speciesCounts[speciesId].total++;

				// Prüfe Sichtbarkeit basierend auf aktuellen Filtern
				const isHiddenBySpecies = hiddenStates.species[speciesId];
				const isHiddenByColor = hiddenStates.colors[colorGroup];
				const isHiddenByTime = timestamp < timeFilter.lower || timestamp > timeFilter.upper;

				const isVisible = !isHiddenBySpecies && !isHiddenByColor && !isHiddenByTime;

				if (isVisible) {
					this.speciesCounts[speciesId].visible++;
					if (this.colorCounts[colorGroup] !== undefined) {
						this.colorCounts[colorGroup]++;
					}
				}
			}
		});

		// Callback aufrufen wenn gesetzt
		if (this.updateCallback) {
			this.updateCallback(this.getCounts());
		}

		// Debug-Ausgabe
		logger.debug(
			{
				speciesCounts: this.speciesCounts,
				colorCounts: this.colorCounts,
				totalFeatures: features.length,
				hiddenStates,
				timeFilter
			},
			'Count Manager Update (with clustering support):'
		);
	}

	/**
	 * Gibt die aktuellen Count-Daten zurück
	 */
	getCounts(): CountData {
		return {
			speciesCounts: { ...this.speciesCounts },
			colorCounts: { ...this.colorCounts }
		};
	}

	/**
	 * Setzt einen Callback für Count-Updates
	 */
	onCountsUpdated(callback: (counts: CountData) => void): void {
		this.updateCallback = callback;
	}

	/**
	 * Initialisiert die Event Handler für Checkboxes (modernisiert für Svelte-Komponenten)
	 */
	private initializeEventHandlers(): void {
		if (!this.mapInstance) return;

		// Event-Delegation für dynamisch hinzugefügte Checkboxen
		document.addEventListener('change', (event) => {
			const target = event.target as HTMLInputElement;

			if (target.classList.contains('species-checkbox')) {
				this.mapInstance!.setSpeciesVisibility(target.value, target.checked);
			} else if (target.classList.contains('color-checkbox')) {
				this.mapInstance!.setColorVisibility(target.value, target.checked);
			}
		});
	}

	/**
	 * Öffentliche Methoden für Svelte-Komponenten zum Steuern der Sichtbarkeit
	 */
	public setSpeciesVisibility(speciesId: string, visible: boolean): void {
		if (this.mapInstance) {
			this.mapInstance.setSpeciesVisibility(speciesId, visible);
		}
	}

	public setColorVisibility(colorGroup: string, visible: boolean): void {
		if (this.mapInstance) {
			this.mapInstance.setColorVisibility(colorGroup, visible);
		}
	}
}
