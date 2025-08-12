/**
 * Enum für Tierverhalten
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum AnimalBehaviorEnum {
	OTHER = 0,
	CONSTANT_COURSE = 1,
	VARYING_COURSE = 2,
	SLOW_SWIMMING = 3
}

/**
 * Deutsche Bezeichnungen für das Tierverhalten
 */
export const animalBehaviorLabels: Record<AnimalBehaviorEnum, string> = {
	[AnimalBehaviorEnum.OTHER]: 'Sonstiges Verhalten',
	[AnimalBehaviorEnum.CONSTANT_COURSE]: 'Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)',
	[AnimalBehaviorEnum.VARYING_COURSE]:
		'Unterschiedlicher Kurs, kreisend, unregelmäßiges Tauchen (futtersuchend)',
	[AnimalBehaviorEnum.SLOW_SWIMMING]:
		'Langsames Schwimmen, längere Zeit an der Wasseroberfläche (ruhend)'
};

export type AnimalBehavior = AnimalBehaviorEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getAnimalBehaviorOptions(): Array<{ value: number; label: string }> {
	return Object.entries(animalBehaviorLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getAnimalBehaviorLabel(
	value: AnimalBehaviorEnum | number | null | undefined
): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return animalBehaviorLabels[numericValue as AnimalBehaviorEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger AnimalBehaviorEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger AnimalBehaviorEnum-Wert ist
 */
export function isValidAnimalBehavior(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(AnimalBehaviorEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(AnimalBehaviorEnum).includes(value);
	}

	return false;
}
