/**
 * Hilfsfunktionen zur Normalisierung von Koordinaten-Formularwerten.
 *
 * Die Formularwerte für `latitude`/`longitude` sind zur Laufzeit nicht zwingend
 * Zahlen: `handleChange` speichert den DOM-String des Eingabefeldes und die
 * EXIF-Extraktion schreibt `toFixed(4)`-Strings. Nach dem Entfernen der
 * Phantom-Defaults können sie außerdem `undefined` oder `''` sein.
 *
 * Für Kartenanzeige und Pflichtfeld-Logik brauchen wir daraus entweder eine
 * echte Zahl oder `undefined` — niemals einen erfundenen Ersatzwert.
 */

/**
 * Wandelt einen rohen Formularwert in eine echte Koordinate um.
 *
 * @returns die Zahl, oder `undefined` wenn kein verwertbarer Wert vorliegt
 */
export function toCoordinate(value: unknown): number | undefined {
	if (value === undefined || value === null || typeof value === 'boolean') {
		return undefined;
	}
	if (typeof value === 'string' && value.trim() === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * True, wenn Breiten- UND Längengrad als echte Zahlen vorliegen.
 * Entspricht der Bedingung, unter der `hasPosition` gesetzt werden darf.
 */
export function hasCoordinates(latitude: unknown, longitude: unknown): boolean {
	return toCoordinate(latitude) !== undefined && toCoordinate(longitude) !== undefined;
}
