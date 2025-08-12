/**
 * Enum für Sichtbarkeitszustände
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum VisibilityEnum {
	NONE = 0,
	EXCEPTIONAL = 1,
	CLEAR = 2,
	HAZY = 3,
	FOGGY = 4
}

/**
 * Deutsche Bezeichnungen für die Sichtbarkeitszustände
 */
export const visibilityLabels: Record<VisibilityEnum, string> = {
	[VisibilityEnum.NONE]: 'Keine Angabe',
	[VisibilityEnum.EXCEPTIONAL]: 'Außergewöhnlich klar (mehr als 20km)',
	[VisibilityEnum.CLEAR]: 'Klar (bis 20km)',
	[VisibilityEnum.HAZY]: 'Diesig (bis 4km)',
	[VisibilityEnum.FOGGY]: 'Nebel (bis 1km)'
};

export type Visibility = VisibilityEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getVisibilityOptions(): Array<{ value: number; label: string }> {
	return Object.entries(visibilityLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getVisibilityLabel(value: VisibilityEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return visibilityLabels[numericValue as VisibilityEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger VisibilityEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger VisibilityEnum-Wert ist
 */
export function isValidVisibility(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(VisibilityEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(VisibilityEnum).includes(value);
	}

	return false;
}
