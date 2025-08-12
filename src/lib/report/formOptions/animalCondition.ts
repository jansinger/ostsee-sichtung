/**
 * Enum für den Zustand des Tieres (bei Totfunden)
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum AnimalConditionEnum {
	UNKNOWN = 0,
	EXTREMELY_FRESH = 1,
	FRESH_BEGINNING_DECOMPOSITION = 2,
	MEDIUM_DECOMPOSITION = 3,
	ADVANCED_DECOMPOSITION = 4,
	SEVERE_DECOMPOSITION = 5
}

/**
 * Deutsche Bezeichnungen für die Tierzustände
 */
export const animalConditionLabels: Record<AnimalConditionEnum, string> = {
	[AnimalConditionEnum.UNKNOWN]: 'Unbekannt',
	[AnimalConditionEnum.EXTREMELY_FRESH]: 'Extrem frisch',
	[AnimalConditionEnum.FRESH_BEGINNING_DECOMPOSITION]: 'Frisch, bzw. beginnende Verwesung',
	[AnimalConditionEnum.MEDIUM_DECOMPOSITION]: 'Mittlere Verwesung',
	[AnimalConditionEnum.ADVANCED_DECOMPOSITION]: 'Fortgeschrittene Verwesung',
	[AnimalConditionEnum.SEVERE_DECOMPOSITION]: 'Starke Verwesung'
};

export type AnimalCondition = AnimalConditionEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getAnimalConditionOptions(): Array<{ value: number; label: string }> {
	return Object.entries(animalConditionLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getAnimalConditionLabel(
	value: AnimalConditionEnum | number | null | undefined
): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return animalConditionLabels[numericValue as AnimalConditionEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger AnimalConditionEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger AnimalConditionEnum-Wert ist
 */
export function isValidAnimalCondition(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(AnimalConditionEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(AnimalConditionEnum).includes(value);
	}

	return false;
}
