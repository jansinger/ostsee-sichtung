import type { Sighting } from '$lib/types/types';

/**
 * Erzeugt JSON-Daten aus Sichtungen
 * Basiert auf der ursprünglichen PHP-Funktion getJsonData
 */
export function generateJsonData(sightings: Sighting[]): string {
	// Kopiere die Sichtungen, um die Originaldaten nicht zu verändern
	const processedSightings = sightings.map(cleanJsonData);

	return JSON.stringify(processedSightings, null, 2);
}

/**
 * Bereinigt Sichtungsdaten für JSON-Export
 */
function cleanJsonData(sighting: Sighting): Record<string, unknown> {
	// Erstellen einer Kopie des Sighting-Objekts
	const cleanedSighting = { ...sighting };

	// In der PHP-Version werden bestimmte Felder ausgeschlossen oder transformiert
	// Hier können wir ähnliche Transformationen durchführen, falls nötig

	return cleanedSighting;
}

/**
 * Generiert einen JSON-Download für die gegebenen Sichtungen
 */
export function downloadJson(sightings: Sighting[], filename = 'sichtungen-export.json'): void {
	const jsonContent = generateJsonData(sightings);
	const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
