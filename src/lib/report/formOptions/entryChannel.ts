/**
 * Enum für Eingabekanäle
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum EntryChannelEnum {
	WEB = 0,
	EMAIL = 1,
	MAIL = 2,
	FAX = 3,
	APP = 4,
	PHONE = 5
}

/**
 * Deutsche Bezeichnungen für die Eingabekanäle
 */
export const entryChannelLabels: Record<EntryChannelEnum, string> = {
	[EntryChannelEnum.WEB]: 'Web',
	[EntryChannelEnum.EMAIL]: 'E-Mail',
	[EntryChannelEnum.MAIL]: 'Post',
	[EntryChannelEnum.FAX]: 'Fax',
	[EntryChannelEnum.APP]: 'App',
	[EntryChannelEnum.PHONE]: 'Telefon'
};

export type EntryChannel = EntryChannelEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getEntryChannelOptions(): Array<{ value: number; label: string }> {
	return Object.entries(entryChannelLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getEntryChannelLabel(value: EntryChannelEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return entryChannelLabels[numericValue as EntryChannelEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger EntryChannelEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger EntryChannelEnum-Wert ist
 */
export function isValidEntryChannel(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(EntryChannelEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(EntryChannelEnum).includes(value);
	}

	return false;
}
