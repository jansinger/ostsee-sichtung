/**
 * Enum für Medientypen
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum MediaTypeEnum {
	OTHER = 0,
	PHOTO = 1,
	VIDEO = 2,
	AUDIO = 3,
	DRAWING = 4,
	SATELLITE = 5,
	DRONE = 6,
	UNDERWATER = 7
}

/**
 * Deutsche Bezeichnungen für die Medientypen
 */
export const mediaTypeLabels: Record<MediaTypeEnum, string> = {
	[MediaTypeEnum.OTHER]: 'Sonstiges Medienformat',
	[MediaTypeEnum.PHOTO]: 'Foto',
	[MediaTypeEnum.VIDEO]: 'Video',
	[MediaTypeEnum.AUDIO]: 'Audiodatei',
	[MediaTypeEnum.DRAWING]: 'Zeichnung/Skizze',
	[MediaTypeEnum.SATELLITE]: 'Satellitenaufnahme',
	[MediaTypeEnum.DRONE]: 'Drohnenaufnahme',
	[MediaTypeEnum.UNDERWATER]: 'Unterwasseraufnahme'
};

export type MediaType = MediaTypeEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getMediaTypeOptions(): Array<{ value: number; label: string }> {
	return Object.entries(mediaTypeLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getMediaTypeLabel(value: MediaTypeEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return mediaTypeLabels[numericValue as MediaTypeEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger MediaTypeEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger MediaTypeEnum-Wert ist
 */
export function isValidMediaType(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(MediaTypeEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(MediaTypeEnum).includes(value);
	}

	return false;
}
