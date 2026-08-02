/**
 * Enum für Entfernungen
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum DistanceEnum {
	LESS_THAN_10M = 1,
	FROM_10_TO_50M = 2,
	FROM_51_TO_100M = 3,
	FROM_101_TO_500M = 4,
	MORE_THAN_500M = 5
}

/**
 * Sentinel für eine fehlende Entfernungsangabe.
 *
 * `DistanceEnum` geht von 1 bis 5 — die `0` der Spalte `entfernung` ist damit
 * keine Kategorie, sondern liegt bewusst außerhalb und wird von
 * `getDistanceLabel` als "Unbekannt" aufgelöst. Anders als bei `tierart`,
 * `verteilung` oder `verhalten` behauptet diese Null also nichts Falsches und
 * braucht keinen eigenen Enum-Wert.
 *
 * Steht hier und nicht bei den Schreibpfaden, weil zwei Stellen sie brauchen:
 * `mapFormToSighting` schreibt sie, und `adminSightingSchema` muss sie beim
 * Bearbeiten von Bestandsdaten wieder annehmen (282 Zeilen).
 */
export const DISTANCE_UNSPECIFIED = 0;

/**
 * Deutsche Bezeichnungen für die Entfernungen
 */
export const distanceLabels: Record<DistanceEnum, string> = {
	[DistanceEnum.LESS_THAN_10M]: 'weniger als 10 Meter',
	[DistanceEnum.FROM_10_TO_50M]: '10 bis 50 Meter',
	[DistanceEnum.FROM_51_TO_100M]: '51 bis 100 Meter',
	[DistanceEnum.FROM_101_TO_500M]: '101 bis 500 Meter',
	[DistanceEnum.MORE_THAN_500M]: 'mehr als 500 Meter'
};

export type Distance = DistanceEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const distanceOptions: Array<{ value: number; label: string }> = Object.entries(distanceLabels).map(
	([value, label]) => ({ value: Number(value), label })
);
export const getDistanceOptions = (): Array<{ value: number; label: string }> => distanceOptions;

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getDistanceLabel(value: DistanceEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return distanceLabels[numericValue as DistanceEnum] || 'Unbekannt';
}
/**
 * Prüft, ob ein Wert ein gültiger Distance-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger Distance-Wert ist
 */
export function isValidDistance(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(DistanceEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(DistanceEnum).includes(value);
	}

	return false;
}
