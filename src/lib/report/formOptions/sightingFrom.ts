/**
 * Enum für die Art des Beobachtungsorts
 * Die numerischen Werte werden in der Datenbank gespeichert.
 *
 * **Achtung bei `OTHER = 0`:** Die Spalte `vonwo` ist
 * `integer default(0) notNull` — `0` ist also gleichzeitig der Default und die
 * Bedeutung "Sonstiges". Anders als beim Bootsantrieb ist "Sonstiges" hier eine
 * echte, häufig genutzte Kategorie (Kajak, SUP, Mehrzweckschiff, Seebrücke …);
 * 713 der 1.833 Bestandszeilen belegen das über einen Freitext in `vonwo_text`.
 * Deshalb wurde der Bestand NICHT umgeschrieben — nur der Schreibpfad gehärtet.
 */
export enum SightingFromEnum {
	OTHER = 0,
	SAILBOAT = 1,
	MOTORBOAT = 2,
	LAND = 3,
	FERRY = 4,
	/**
	 * Es wurde kein Beobachtungsort angegeben.
	 *
	 * Wird ausschließlich serverseitig beim Speichern gesetzt
	 * (`mapFormToSighting`) und ist bewusst **nicht** auswählbar — "keine
	 * Angabe" ist keine Wahl, die ein Melder trifft.
	 */
	UNKNOWN = 5
}

/**
 * Deutsche Bezeichnungen für die Beobachtungsorte
 */
export const sightingFromLabels: Record<SightingFromEnum, string> = {
	[SightingFromEnum.OTHER]: 'Sonstiges',
	[SightingFromEnum.SAILBOAT]: 'Segelschiff',
	[SightingFromEnum.MOTORBOAT]: 'Motorboot',
	[SightingFromEnum.LAND]: 'Land',
	[SightingFromEnum.FERRY]: 'Fähre',
	[SightingFromEnum.UNKNOWN]: 'Keine Angabe'
};

export type SightingFrom = SightingFromEnum;

/**
 * Beobachtungsorte, die im Formular auswählbar sind — in dieser Reihenfolge.
 * `UNKNOWN` ist bewusst ausgenommen (siehe Enum-Kommentar).
 *
 * **Die Reihenfolge ist aufgezählt und nicht abgeleitet**, anders als bei den
 * übrigen Listen. Sie folgt der gemessenen Häufigkeit im Bestand
 * (2026-08-07, 19.947 Zeilen): Segelschiff 10.362, Land 5.937, Motorboot 1.479,
 * Fähre 281. `OTHER` steht trotz seiner 1.888 Zeilen am Ende — es ist die
 * Auffangkategorie und gehört hinter die konkreten Antworten.
 *
 * Ein neu ergänzter Wert erscheint dadurch NICHT automatisch; er muss hier
 * einsortiert werden. Das ist der Preis dafür, dass die Reihenfolge eine
 * Aussage trifft — `Object.values()` hätte sie nach Enum-Wert sortiert, also
 * nach einer Zahl ohne fachliche Bedeutung.
 */
const SELECTABLE_SIGHTING_FROM: readonly SightingFromEnum[] = [
	SightingFromEnum.SAILBOAT,
	SightingFromEnum.LAND,
	SightingFromEnum.MOTORBOAT,
	SightingFromEnum.FERRY,
	SightingFromEnum.OTHER
];

/**
 * Generiert eine Array-Struktur für Select-Komponenten
 * @returns Array von Objekten mit value und label
 */
const sightingFromOptions: Array<{ value: number; label: string }> = SELECTABLE_SIGHTING_FROM.map(
	(value) => ({ value, label: sightingFromLabels[value] })
);
export const getSightingFromOptions = (): Array<{ value: number; label: string }> =>
	sightingFromOptions;

/**
 * Hilfsfunktion zum Abrufen des Labels für einen bestimmten Enum-Wert
 * @param value - Der Enum-Wert (z.B. aus der Datenbank)
 * @returns Das zugehörige Label oder einen Fallback-Text
 */
export function getSightingFromLabel(value: SightingFromEnum | number | null | undefined): string {
	if (value === null || value === undefined) return 'Nicht angegeben';

	const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
	return sightingFromLabels[numericValue as SightingFromEnum] || 'Unbekannt';
}

/**
 * Prüft, ob ein Wert ein gültiger SightingFromEnum-Wert ist
 * @param value - Der zu prüfende Wert
 * @returns true, wenn der Wert ein gültiger SightingFromEnum-Wert ist
 */
export function isValidSightingFrom(value: unknown): boolean {
	if (typeof value === 'string') {
		const numValue = parseInt(value, 10);
		return !isNaN(numValue) && Object.values(SightingFromEnum).includes(numValue);
	}

	if (typeof value === 'number') {
		return Object.values(SightingFromEnum).includes(value);
	}

	return false;
}
