/**
 * Enum für Bootsantriebsarten
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum BoatDriveEnum {
	OTHER = 0,
	MOTOR = 1,
	SAIL = 2,
	DRIFTING = 3,
	ANCHORED = 4
}

/**
 * Deutsche Bezeichnungen für die Bootsantriebsarten
 */
export const boatDriveLabels: Record<BoatDriveEnum, string> = {
	[BoatDriveEnum.OTHER]: 'Sonstiger Bootsantrieb',
	[BoatDriveEnum.MOTOR]: 'Motor',
	[BoatDriveEnum.SAIL]: 'Segel',
	[BoatDriveEnum.DRIFTING]: 'Treibend',
	[BoatDriveEnum.ANCHORED]: 'Vor Anker'
};

export type BoatDrive = BoatDriveEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getBoatDriveOptions(): Array<{ value: number; label: string }> {
	return Object.entries(boatDriveLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getBoatDriveLabel(value: BoatDriveEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return boatDriveLabels[numericValue as BoatDriveEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger BoatDriveEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger BoatDriveEnum-Wert ist
 */
export function isValidBoatDrive(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(BoatDriveEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(BoatDriveEnum).includes(value);
	}

	return false;
}
