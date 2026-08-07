/**
 * Enum für Windrichtungen
 * Die String-Werte werden in der Datenbank gespeichert.
 */
export enum WindDirectionEnum {
	NONE = '',
	N = 'N',
	NO = 'NO',
	O = 'O',
	SO = 'SO',
	S = 'S',
	SW = 'SW',
	W = 'W',
	NW = 'NW'
}

/**
 * Deutsche Bezeichnungen für die Windrichtungen
 */
export const windDirectionLabels: Record<WindDirectionEnum, string> = {
	[WindDirectionEnum.NONE]: 'Keine Angabe',
	[WindDirectionEnum.N]: 'Nord',
	[WindDirectionEnum.NO]: 'Nordost',
	[WindDirectionEnum.O]: 'Ost',
	[WindDirectionEnum.SO]: 'Südost',
	[WindDirectionEnum.S]: 'Süd',
	[WindDirectionEnum.SW]: 'Südwest',
	[WindDirectionEnum.W]: 'West',
	[WindDirectionEnum.NW]: 'Nordwest'
};

export type WindDirection = WindDirectionEnum;

/**
 * Himmelsrichtungen, die im Formular auswählbar sind.
 *
 * `NONE` (Leerstring, "Keine Angabe") ist bewusst ausgenommen — dieselbe
 * Begründung wie beim Seegang (`seaState.ts`). Hier kommt ein zweiter Grund
 * dazu: `BaseSelect` gibt seinem Platzhalter ebenfalls `value=""`, die
 * Option war also ein exaktes Duplikat des Platzhalters.
 *
 * Der Leerstring bleibt im Yup-Schema (`oneOf`) gültig und wird von
 * `getWindDirectionLabel` weiterhin aufgelöst.
 *
 * Abgeleitet statt aufgezählt: Die Enum-Reihenfolge ist die Kompass-Folge
 * (N → NW) und damit die fachlich richtige.
 */
const SELECTABLE_WIND_DIRECTIONS: readonly WindDirectionEnum[] = Object.values(
	WindDirectionEnum
).filter((value) => value !== WindDirectionEnum.NONE);

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const windDirectionOptions: Array<{ value: string; label: string }> =
	SELECTABLE_WIND_DIRECTIONS.map((value) => ({ value, label: windDirectionLabels[value] }));
export const getWindDirectionOptions = (): Array<{ value: string; label: string }> =>
	windDirectionOptions;

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getWindDirectionLabel(
	value: WindDirectionEnum | string | null | undefined
): string {
	if (value === null || value === undefined) return 'Nicht angegeben';
	return windDirectionLabels[value as WindDirectionEnum] || 'Unbekannt';
}
