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
 * Zustände, die im Formular auswählbar sind — "Unbekannt" am Ende.
 *
 * Anders als bei `seaState`, `visibility` und `sex` bleibt die Nicht-Antwort
 * hier **wählbar**: `deadCondition` ist im Totfund-Zweig ein Pflichtfeld
 * (`when('isDead')` im Schema). Ohne "Unbekannt" gäbe es keinen Ausweg für
 * jemanden, der den Verwesungsgrad am Strand nicht einschätzen kann — der
 * Platzhalter von `BaseSelect` taugt dafür nicht, weil er die Pflicht nicht
 * erfüllt. Sie steht nur nicht mehr an erster Stelle, wohin ihr Enum-Wert `0`
 * sie sortiert hatte.
 *
 * Abgeleitet statt aufgezählt: Die übrigen Stufen sind ordinal
 * (extrem frisch → starke Verwesung).
 */
const SELECTABLE_ANIMAL_CONDITIONS: readonly AnimalConditionEnum[] = [
	...Object.values(AnimalConditionEnum).filter(
		(value): value is AnimalConditionEnum =>
			typeof value === 'number' && value !== AnimalConditionEnum.UNKNOWN
	),
	AnimalConditionEnum.UNKNOWN
];

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const animalConditionOptions: Array<{ value: number; label: string }> =
	SELECTABLE_ANIMAL_CONDITIONS.map((value) => ({ value, label: animalConditionLabels[value] }));
export const getAnimalConditionOptions = (): Array<{ value: number; label: string }> =>
	animalConditionOptions;

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
