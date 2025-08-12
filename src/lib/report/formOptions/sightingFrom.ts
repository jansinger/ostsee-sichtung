/**
 * Enum für die Art des Beobachtungsorts
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum SightingFromEnum {
	OTHER = 0,
	SAILBOAT = 1,
	MOTORBOAT = 2,
	LAND = 3,
	FERRY = 4
}

/**
 * Deutsche Bezeichnungen für die Beobachtungsorte
 */
export const sightingFromLabels: Record<SightingFromEnum, string> = {
	[SightingFromEnum.OTHER]: 'Sonstiges',
	[SightingFromEnum.SAILBOAT]: 'Segelschiff',
	[SightingFromEnum.MOTORBOAT]: 'Motorboot',
	[SightingFromEnum.LAND]: 'Land',
	[SightingFromEnum.FERRY]: 'Fähre'
};

export type SightingFrom = SightingFromEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getSightingFromOptions(): Array<{ value: number; label: string }> {
	return Object.entries(sightingFromLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getSightingFromLabel(value: SightingFromEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return sightingFromLabels[numericValue as SightingFromEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger SightingFromEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger SightingFromEnum-Wert ist
 */
export function isValidSightingFrom(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(SightingFromEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(SightingFromEnum).includes(value);
	}

	return false;
}
