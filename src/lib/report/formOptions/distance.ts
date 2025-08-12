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
export function getDistanceOptions(): Array<{ value: number; label: string }> {
	return Object.entries(distanceLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

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
