/**
 * Enum für Tierverhalten
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
/**
 * **Achtung bei `OTHER = 0`:** Die Spalte `verhalten` ist
 * `integer default(0) notNull` — `0` ist gleichzeitig Default und die Bedeutung
 * "Sonstiges Verhalten". Das Feld ist im Schema nicht `.required()`, eine
 * fehlende Antwort wurde also als aktive Aussage gespeichert (9.192 von 19.880
 * Zeilen, Stand 2026-07-29). Fehlt eine Angabe, gehört sie auf `UNKNOWN`.
 */
export enum AnimalBehaviorEnum {
	OTHER = 0,
	CONSTANT_COURSE = 1,
	VARYING_COURSE = 2,
	SLOW_SWIMMING = 3,
	/**
	 * Es wurde kein Verhalten angegeben.
	 *
	 * Wird ausschließlich serverseitig beim Speichern gesetzt
	 * (`mapFormToSighting`) und ist bewusst nicht auswählbar.
	 */
	UNKNOWN = 4
}

/**
 * Deutsche Bezeichnungen für das Tierverhalten
 */
export const animalBehaviorLabels: Record<AnimalBehaviorEnum, string> = {
	[AnimalBehaviorEnum.OTHER]: 'Sonstiges Verhalten',
	[AnimalBehaviorEnum.CONSTANT_COURSE]: 'Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)',
	[AnimalBehaviorEnum.VARYING_COURSE]:
		'Unterschiedlicher Kurs, kreisend, unregelmäßiges Tauchen (futtersuchend)',
	[AnimalBehaviorEnum.SLOW_SWIMMING]:
		'Langsames Schwimmen, längere Zeit an der Wasseroberfläche (ruhend)',
	[AnimalBehaviorEnum.UNKNOWN]: 'Keine Angabe'
};

/**
 * Verhaltensweisen, die im Formular auswählbar sind.
 * `UNKNOWN` ist bewusst ausgenommen (siehe Enum-Kommentar).
 *
 * Abgeleitet statt aufgezählt: Ein später ergänzter echter Wert erscheint
 * dadurch automatisch im Formular, statt still zu fehlen.
 *
 * `OTHER` wandert dabei ans Ende der Liste — es ist die Auffangkategorie und
 * stand durch den Enum-Wert `0` bisher an erster Stelle, also vor allen
 * konkreten Antworten (Wunsch des Deutschen Meeresmuseums). Der gespeicherte
 * Wert bleibt `0`; nur die Reihenfolge der Optionen ändert sich.
 */
const SELECTABLE_BEHAVIORS: readonly AnimalBehaviorEnum[] = [
	...Object.values(AnimalBehaviorEnum).filter(
		(value): value is AnimalBehaviorEnum =>
			typeof value === 'number' &&
			value !== AnimalBehaviorEnum.UNKNOWN &&
			value !== AnimalBehaviorEnum.OTHER
	),
	AnimalBehaviorEnum.OTHER
];

export type AnimalBehavior = AnimalBehaviorEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const animalBehaviorOptions: Array<{ value: number; label: string }> = SELECTABLE_BEHAVIORS.map(
	(value) => ({ value, label: animalBehaviorLabels[value] })
);
export const getAnimalBehaviorOptions = (): Array<{ value: number; label: string }> =>
	animalBehaviorOptions;

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getAnimalBehaviorLabel(
	value: AnimalBehaviorEnum | number | null | undefined
): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return animalBehaviorLabels[numericValue as AnimalBehaviorEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger AnimalBehaviorEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger AnimalBehaviorEnum-Wert ist
 */
export function isValidAnimalBehavior(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(AnimalBehaviorEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(AnimalBehaviorEnum).includes(value);
	}

	return false;
}
