/**
 * Enum für Verteilungen der Tiere
 * Die numerischen Werte werden in der Datenbank gespeichert.
 */
/**
 * **Achtung bei `OTHER = 0`:** Die Spalte `verteilung` ist
 * `integer default(0) notNull` — `0` ist gleichzeitig Default und die Bedeutung
 * "Sonstige Verteilung". Das Feld ist im Schema nicht `.required()`, eine
 * fehlende Antwort wurde also als aktive Aussage gespeichert (15.129 von 19.880
 * Zeilen, Stand 2026-07-29). Fehlt eine Angabe, gehört sie auf `UNKNOWN`.
 */
export enum DistributionEnum {
	OTHER = 0,
	SINGLE = 1,
	MOTHER_WITH_YOUNG = 2,
	SCHOOLS = 3,
	/**
	 * Es wurde keine Verteilung angegeben.
	 *
	 * Wird ausschließlich serverseitig beim Speichern gesetzt
	 * (`mapFormToSighting`) und ist bewusst nicht auswählbar.
	 */
	UNKNOWN = 4
}

/**
 * Deutsche Bezeichnungen für die Verteilungen
 */
export const distributionLabels: Record<DistributionEnum, string> = {
	[DistributionEnum.OTHER]: 'Sonstige Verteilung',
	[DistributionEnum.SINGLE]: 'Einzeln',
	[DistributionEnum.MOTHER_WITH_YOUNG]: 'Mutter mit Jungtier',
	[DistributionEnum.SCHOOLS]: 'Deutliche Schulen',
	[DistributionEnum.UNKNOWN]: 'Keine Angabe'
};

/**
 * Verteilungen, die im Formular auswählbar sind — in dieser Reihenfolge.
 * `UNKNOWN` ist bewusst ausgenommen (siehe Enum-Kommentar).
 *
 * Aufgezählt statt abgeleitet, aus zwei Gründen: `OTHER` ist die
 * Auffangkategorie und gehört ans Ende (sein Enum-Wert `0` hätte es nach vorn
 * sortiert), und die konkreten Antworten stehen nach gemessener Häufigkeit
 * (2026-08-07): Einzeln 3.066, Deutliche Schulen 1.096, Mutter mit Jungtier
 * 644. Der gespeicherte Wert bleibt jeweils unverändert.
 */
const SELECTABLE_DISTRIBUTIONS: readonly DistributionEnum[] = [
	DistributionEnum.SINGLE,
	DistributionEnum.SCHOOLS,
	DistributionEnum.MOTHER_WITH_YOUNG,
	DistributionEnum.OTHER
];

export type Distribution = DistributionEnum;

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const distributionOptions: Array<{ value: number; label: string }> = SELECTABLE_DISTRIBUTIONS.map(
	(value) => ({ value, label: distributionLabels[value] })
);
export const getDistributionOptions = (): Array<{ value: number; label: string }> =>
	distributionOptions;

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
