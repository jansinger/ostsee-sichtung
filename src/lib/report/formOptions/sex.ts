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
 * Geschlechter, die im Formular auswählbar sind.
 *
 * `UNKNOWN` ("Unbekannt") ist bewusst ausgenommen: `deadSex` ist optional
 * (das Museum hat das Feld am 2026-08-04 aus dem Meldeformular abbestellt, es
 * steht nur noch in der Admin-Maske), und der Platzhalter von `BaseSelect`
 * sagt "nicht angegeben" bereits. Der Enum-Wert `0` hätte "Unbekannt"
 * außerdem vor die beiden echten Antworten sortiert.
 *
 * `totfund_geschlecht` ist `not null default 0`; der Wert bleibt für
 * Bestandsdaten gültig und wird von `getSexLabel` weiterhin aufgelöst.
 */
const SELECTABLE_SEXES: readonly SexEnum[] = [SexEnum.FEMALE, SexEnum.MALE];

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const sexOptions: Array<{ value: number; label: string }> = SELECTABLE_SEXES.map((value) => ({
	value,
	label: sexLabels[value]
}));
export const getSexOptions = (): Array<{ value: number; label: string }> => sexOptions;

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
