/**
 * Enum für Bootstypen
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum BoatTypeEnum {
	OTHER = 0,
	SAILBOAT = 1,
	MOTORBOAT = 2,
	FERRY = 3,
	FISHING_VESSEL = 4,
	CARGO_SHIP = 5,
	CRUISE_SHIP = 6,
	RESEARCH_VESSEL = 7,
	INFLATABLE_BOAT = 8,
	SAILING_CATAMARAN = 9,
	MOTOR_YACHT = 10
}

/**
 * Deutsche Bezeichnungen für die Bootstypen
 */
export const boatTypeLabels: Record<BoatTypeEnum, string> = {
	[BoatTypeEnum.OTHER]: 'Sonstiger Bootstyp',
	[BoatTypeEnum.SAILBOAT]: 'Segelboot',
	[BoatTypeEnum.MOTORBOAT]: 'Motorboot',
	[BoatTypeEnum.FERRY]: 'Fähre',
	[BoatTypeEnum.FISHING_VESSEL]: 'Fischereifahrzeug',
	[BoatTypeEnum.CARGO_SHIP]: 'Frachtschiff',
	[BoatTypeEnum.CRUISE_SHIP]: 'Kreuzfahrtschiff',
	[BoatTypeEnum.RESEARCH_VESSEL]: 'Forschungsschiff',
	[BoatTypeEnum.INFLATABLE_BOAT]: 'Schlauchboot',
	[BoatTypeEnum.SAILING_CATAMARAN]: 'Segelkatamaran',
	[BoatTypeEnum.MOTOR_YACHT]: 'Motoryacht'
};

export type BoatType = BoatTypeEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getBoatTypeOptions(): Array<{ value: number; label: string }> {
	return Object.entries(boatTypeLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getBoatTypeLabel(value: BoatTypeEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return boatTypeLabels[numericValue as BoatTypeEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger BoatTypeEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger BoatTypeEnum-Wert ist
 */
export function isValidBoatType(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(BoatTypeEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(BoatTypeEnum).includes(value);
	}

	return false;
}
