/**
 * Enum für Bootsantriebsarten
 * Die numerischen Werte werden in der Datenbank gespeichert.
 *
 * **Achtung bei `OTHER = 0`:** Die Spalte `bootsantrieb` ist
 * `integer default(0) notNull` — `0` ist also gleichzeitig der Default und die
 * Bedeutung "Sonstiger Bootsantrieb". Wer nie ein Boot hatte, darf deshalb
 * nicht auf `0` landen, sondern bekommt `NONE`.
 */
export enum BoatDriveEnum {
	OTHER = 0,
	MOTOR = 1,
	SAIL = 2,
	DRIFTING = 3,
	ANCHORED = 4,
	/**
	 * Kein Boot im Spiel (Sichtung von Land).
	 *
	 * Wird ausschließlich serverseitig beim Speichern gesetzt
	 * (`mapFormToSighting`) und ist bewusst **nicht** auswählbar — im Formular
	 * erscheint das Antriebsfeld nur bei Segelschiff/Motorboot.
	 */
	NONE = 5
}

/**
 * Deutsche Bezeichnungen für die Bootsantriebsarten
 */
export const boatDriveLabels: Record<BoatDriveEnum, string> = {
	[BoatDriveEnum.OTHER]: 'Sonstiger Bootsantrieb',
	[BoatDriveEnum.MOTOR]: 'Motor',
	[BoatDriveEnum.SAIL]: 'Segel',
	[BoatDriveEnum.DRIFTING]: 'Treibend',
	[BoatDriveEnum.ANCHORED]: 'Vor Anker',
	[BoatDriveEnum.NONE]: 'Kein Boot'
};

export type BoatDrive = BoatDriveEnum;

/**
 * Antriebsarten, die im Formular auswählbar sind.
 * `NONE` ist bewusst ausgenommen (siehe Enum-Kommentar).
 *
 * Abgeleitet statt aufgezählt: Ein später ergänzter echter Wert erscheint
 * dadurch automatisch im Formular, statt still zu fehlen.
 */
const SELECTABLE_BOAT_DRIVES: readonly BoatDriveEnum[] = Object.values(BoatDriveEnum).filter(
	(value): value is BoatDriveEnum => typeof value === 'number' && value !== BoatDriveEnum.NONE
);

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const boatDriveOptions: Array<{ value: number; label: string }> = SELECTABLE_BOAT_DRIVES.map(
	(value) => ({ value, label: boatDriveLabels[value] })
);
export const getBoatDriveOptions = (): Array<{ value: number; label: string }> => boatDriveOptions;

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
