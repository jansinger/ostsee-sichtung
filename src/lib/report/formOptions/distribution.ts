/**
 * Enum für Verteilungen der Tiere
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum DistributionEnum {
	OTHER = 0,
	SINGLE = 1,
	MOTHER_WITH_YOUNG = 2,
	SCHOOLS = 3
}

/**
 * Deutsche Bezeichnungen für die Verteilungen
 */
export const distributionLabels: Record<DistributionEnum, string> = {
	[DistributionEnum.OTHER]: 'Sonstige Verteilung',
	[DistributionEnum.SINGLE]: 'Einzeln',
	[DistributionEnum.MOTHER_WITH_YOUNG]: 'Mutter mit Jungtier',
	[DistributionEnum.SCHOOLS]: 'Deutliche Schulen'
};

export type Distribution = DistributionEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getDistributionOptions(): Array<{ value: number; label: string }> {
	return Object.entries(distributionLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getDistributionLabel(value: DistributionEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return distributionLabels[numericValue as DistributionEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger DistributionEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger DistributionEnum-Wert ist
 */
export function isValidDistribution(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(DistributionEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(DistributionEnum).includes(value);
	}

	return false;
}
