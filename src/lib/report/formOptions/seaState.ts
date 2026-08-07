/**
 * Enum für Seegangzustände
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
export enum SeaStateEnum {
	NONE = 0,
	SMOOTH = 1,
	CALM = 2,
	SLIGHT = 3,
	ROUGH = 4,
	HIGH = 5
}

/**
 * Deutsche Bezeichnungen für die Seegangzustände
 */
export const seaStateLabels: Record<SeaStateEnum, string> = {
	[SeaStateEnum.NONE]: 'Keine Angabe',
	[SeaStateEnum.SMOOTH]: 'Glatte See, keine Wellen',
	[SeaStateEnum.CALM]: 'Ruhige See, gekräuselte, kurze Wellen',
	[SeaStateEnum.SLIGHT]: 'Leicht bewegte See, Schaumköpfe',
	[SeaStateEnum.ROUGH]: 'Grobe See, lange, brechende Wellen',
	[SeaStateEnum.HIGH]: 'Hohe See, Wellenberge und Gischt'
};

export type SeaState = SeaStateEnum;

/**
 * Seegang-Stufen, die im Formular auswählbar sind.
 *
 * `NONE` ("Keine Angabe") ist bewusst ausgenommen: Das Feld ist optional, und
 * `BaseSelect` rendert ohnehin einen Platzhalter ("Bitte wählen…"), solange
 * nichts gewählt ist. Eine zweite Formulierung derselben Aussage stiftet nur
 * Verwirrung — und sie stand durch den Enum-Wert `0` auch noch an erster
 * Stelle, vor allen echten Kategorien.
 *
 * Der Wert selbst bleibt gültig: `seegang` ist `not null default 0`, im
 * Bestand steht diese `0` also millionenfach und wird von `getSeaStateLabel`
 * weiterhin aufgelöst.
 *
 * Abgeleitet statt aufgezählt: Die Stufen sind ordinal (glatt → hohe See), die
 * Enum-Reihenfolge ist damit die fachlich richtige.
 */
const SELECTABLE_SEA_STATES: readonly SeaStateEnum[] = Object.values(SeaStateEnum).filter(
	(value): value is SeaStateEnum => typeof value === 'number' && value !== SeaStateEnum.NONE
);

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const seaStateOptions: Array<{ value: number; label: string }> = SELECTABLE_SEA_STATES.map(
	(value) => ({ value, label: seaStateLabels[value] })
);
export const getSeaStateOptions = (): Array<{ value: number; label: string }> => seaStateOptions;

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getSeaStateLabel(value: SeaStateEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return seaStateLabels[numericValue as SeaStateEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger SeaState-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger SeaState-Wert ist
 */
export function isValidSeaState(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(SeaStateEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(SeaStateEnum).includes(value);
	}

	return false;
}
