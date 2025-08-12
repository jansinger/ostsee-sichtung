/**
 * Enum für Tierarten
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum SpeciesEnum {
	// Kleinwale
	HARBOR_PORPOISE = 0,
	DOLPHIN = 3,
	BELUGA = 4,

	// Großwale
	MINKE_WHALE = 5,
	FIN_WHALE = 6,
	HUMPBACK_WHALE = 7,
	UNKNOWN_WHALE = 8,

	// Robben
	GREY_SEAL = 1,
	HARBOR_SEAL = 2,
	RINGED_SEAL = 9,
	UNKNOWN_SEAL = 10
}

/**
 * Deutsche Bezeichnungen für die Tierarten
 */
export const speciesLabels: Record<SpeciesEnum, string> = {
	[SpeciesEnum.HARBOR_PORPOISE]: 'Schweinswal',
	[SpeciesEnum.GREY_SEAL]: 'Kegelrobbe',
	[SpeciesEnum.HARBOR_SEAL]: 'Seehund',
	[SpeciesEnum.DOLPHIN]: 'Delphin',
	[SpeciesEnum.BELUGA]: 'Beluga',
	[SpeciesEnum.MINKE_WHALE]: 'Zwergwal',
	[SpeciesEnum.FIN_WHALE]: 'Finnwal',
	[SpeciesEnum.HUMPBACK_WHALE]: 'Buckelwal',
	[SpeciesEnum.UNKNOWN_WHALE]: 'Unbekannte Walart',
	[SpeciesEnum.RINGED_SEAL]: 'Ringelrobbe',
	[SpeciesEnum.UNKNOWN_SEAL]: 'Unbekannte Robbenart'
};

/**
 * Gruppierung der Tierarten für UI-Anzeige
 */
export const speciesGroups = {
	Kleinwale: [SpeciesEnum.HARBOR_PORPOISE, SpeciesEnum.DOLPHIN, SpeciesEnum.BELUGA],
	Großwale: [
		SpeciesEnum.MINKE_WHALE,
		SpeciesEnum.FIN_WHALE,
		SpeciesEnum.HUMPBACK_WHALE,
		SpeciesEnum.UNKNOWN_WHALE
	],
	Robben: [
		SpeciesEnum.GREY_SEAL,
		SpeciesEnum.HARBOR_SEAL,
		SpeciesEnum.RINGED_SEAL,
		SpeciesEnum.UNKNOWN_SEAL
	]
};

export type Species = SpeciesEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @param grouped - Ob die Optionen nach Gruppen gruppiert werden sollen
 * @returns Array von Objekten mit value und label (und optional group)
 */
export function getSpeciesOptions(grouped = false): Array<{
	value: string;
	label: string;
	group?: string;
}> {
	if (!grouped) {
		return Object.entries(speciesLabels).map(([value, label]) => ({
			value: String(value),
			label
		}));
	}

	// Gruppierte Optionen zurückgeben
	return Object.entries(speciesGroups).flatMap(([groupName, species]) =>
		species.map((speciesValue) => ({
			value: String(speciesValue),
			label: speciesLabels[speciesValue],
			group: groupName
		}))
	);
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getSpeciesLabel(value: SpeciesEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return speciesLabels[numericValue as SpeciesEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger SpeciesEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger SpeciesEnum-Wert ist
 */
export function isValidSpecies(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(SpeciesEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(SpeciesEnum).includes(value);
	}

	return false;
}

/**
 * Konvertiert einen beliebigen Wert in einen SpeciesEnum-Wert, wenn möglich
 * @param value - Der zu konvertierende Wert
 * @returns Den SpeciesEnum-Wert oder undefined, wenn keine Konvertierung möglich ist
 */
export function toSpeciesEnum(value: unknown): SpeciesEnum | undefined {
	if (value === null || value === undefined) return undefined;

	let numValue: number;

	if (typeof value === 'string') {
		numValue = parseInt(value, 10);
		if (isNaN(numValue)) return undefined;
	} else if (typeof value === 'number') {
		numValue = value;
	} else {
		return undefined;
	}

	return isValidSpecies(numValue) ? (numValue as SpeciesEnum) : undefined;
}
