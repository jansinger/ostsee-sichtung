/**
 * Panel-Management für Filter und Legende
 * Vereinfacht, da die Panels jetzt mit Svelte 5 runes selbst-verwaltend sind
 */

export interface PanelManager {
	initializePanels(): void;
}

export class MapPanelManager implements PanelManager {
	/**
	 * Initialisiert minimales Panel-Management
	 * Die meiste Logik ist jetzt in den Svelte-Komponenten selbst
	 */
	initializePanels(): void {
		// Da die Panels jetzt Svelte 5 runes verwenden und sich selbst verwalten,
		// ist hier nur noch minimale Konfiguration nötig
		
		console.log('Panel-Manager initialisiert - Panels verwenden jetzt Svelte 5 runes für State-Management');
		
		// Optional: Schließe alle Panels bei Klick auf die Karte
		// Dies ist jetzt optional, da die Panels ihre eigene Logik haben
		const mapElement = document.getElementById('map');
		if (mapElement) {
			mapElement.addEventListener('click', (event) => {
				// Nur schließen, wenn direkt auf die Karte geklickt wurde
				// (nicht auf Panel-Elemente)
				if (event.target === mapElement || mapElement.contains(event.target as Node)) {
					// Trigger zum Schließen aller Panels könnte hier implementiert werden
					// Da die Panels jetzt selbst-verwaltend sind, ist dies optional
				}
			});
		}
	}
}
