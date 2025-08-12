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
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getWindDirectionOptions(): Array<{ value: string; label: string }> {
	return Object.entries(windDirectionLabels).map(([value, label]) => ({
		value,
		label
	}));
}

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
