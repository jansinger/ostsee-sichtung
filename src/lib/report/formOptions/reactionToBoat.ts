/**
 * Enum für Reaktionen auf Boote
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum ReactionToBoatEnum {
	NONE = 0,
	APPROACH = 1,
	AVOIDANCE = 2,
	BOW_RIDING = 3,
	COURSE_CHANGE = 4,
	LONGER_DIVING = 5,
	FREQUENT_SURFACING = 6
}

/**
 * Deutsche Bezeichnungen für die Reaktionen auf Boote
 */
export const reactionToBoatLabels: Record<ReactionToBoatEnum, string> = {
	[ReactionToBoatEnum.NONE]: 'Keine Reaktion',
	[ReactionToBoatEnum.APPROACH]: 'Annäherung an Boot',
	[ReactionToBoatEnum.AVOIDANCE]: 'Vermeidung/Flucht',
	[ReactionToBoatEnum.BOW_RIDING]: 'Bugwellenreiten',
	[ReactionToBoatEnum.COURSE_CHANGE]: 'Kursänderung',
	[ReactionToBoatEnum.LONGER_DIVING]: 'Längeres Abtauchen',
	[ReactionToBoatEnum.FREQUENT_SURFACING]: 'Häufigeres Auftauchen'
};

export type ReactionToBoat = ReactionToBoatEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
export function getReactionToBoatOptions(): Array<{ value: number; label: string }> {
	return Object.entries(reactionToBoatLabels).map(([value, label]) => ({
		value: Number(value),
		label
	}));
}

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getReactionToBoatLabel(
	value: ReactionToBoatEnum | number | null | undefined
): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return reactionToBoatLabels[numericValue as ReactionToBoatEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger ReactionToBoatEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger ReactionToBoatEnum-Wert ist
 */
export function isValidReactionToBoat(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(ReactionToBoatEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(ReactionToBoatEnum).includes(value);
	}

	return false;
}
