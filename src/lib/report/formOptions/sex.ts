/**
 * Enum für Geschlecht der beobachteten Tiere
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum SexEnum {
	UNKNOWN = 0,
	FEMALE = 1,
	MALE = 2
}

/**
 * Deutsche Bezeichnungen für die Geschlechter
 */
export const sexLabels: Record<SexEnum, string> = {
	[SexEnum.UNKNOWN]: 'Unbekannt',
	[SexEnum.FEMALE]: 'Weiblich',
	[SexEnum.MALE]: 'Männlich'
};

export type Sex = SexEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getSexOptions(): Array<{ value: number; label: string }> {
	return Object.entries(sexLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getSexLabel(value: SexEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return sexLabels[numericValue as SexEnum] || 'Unbekannt';
}

/**
 *
 * @param value - Der Enum-Wert oder String, der überprüft werden soll
 * @description Überprüft, ob der gegebene Wert ein gültiges Geschlecht ist.
 * Gibt true zurück, wenn der Wert gültig ist, andernfalls false.
 * @example isValidSex(1) // true
 * @returns
 */
export function isValidSex(value: string | number): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(SexEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(SexEnum).includes(value);
	}

	return false;
}
