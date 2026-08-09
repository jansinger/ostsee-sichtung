/**
 * Welche Spalten die Eingangsseite `/admin` aus `sichtungen` liest.
 *
 * Gleicher Befund wie bei der Sichtungstabelle (`sichtungen/listColumns.ts`):
 * `load()` las mit `db.select()` die ganze Zeile, 50-mal pro Aufruf, und legte
 * damit Anschrift, Telefonnummer und sämtliche Einwilligungs-Nachweisspalten
 * ins ausgelieferte HTML. Die Karte zeigt achtzehn Felder.
 *
 * **Der Unterschied zur Tabelle:** Hier stehen Vor- und Nachname bewusst
 * drin — die Karte nennt den Melder (`melderName`), weil die Triage im Zweifel
 * eine Rückfrage nach sich zieht. `phone` dagegen nicht: Für die Telefonnummer
 * gibt es die Detailansicht.
 *
 * **Warum die Karte auf `InboxSighting` typisiert ist und nicht auf
 * `SightingSelect`.** Der Typ ist hier der eigentliche Wächter: Liest
 * `SightingInboxCard.svelte` ein Feld, das diese Liste nicht führt, bricht
 * `svelte-check` — und nicht erst die Karte im Betrieb mit einem leeren Platz.
 * Mit `SightingSelect` (der vollen Zeile) wäre jede solche Erweiterung still
 * durchgegangen.
 */

import { sightings, type SightingSelect } from './schema';

/**
 * Reihenfolge alphabetisch, damit ein Diff lesbar bleibt — sie hat keine
 * Bedeutung für das erzeugte SQL.
 */
export const INBOX_FIELDS = [
	'created',
	'email',
	'firstName',
	'id',
	'inBalticSea',
	'inBalticSeaGeo',
	'isDead',
	'juvenileCount',
	'lastName',
	'latitude',
	'longitude',
	'notes',
	'sightingDate',
	'spamIndicators',
	'spamScore',
	'species',
	'totalCount',
	'waterway'
] as const satisfies readonly (keyof SightingSelect)[];

/** Eine Zeile der Eingangsliste — genau die Felder, die `load()` liest. */
export type InboxSighting = Pick<SightingSelect, (typeof INBOX_FIELDS)[number]>;

/**
 * Das Select-Objekt für `db.select(…)`, aus der Feldliste erzeugt statt als
 * zweites Literal geschrieben: Zwei Aufzählungen nebeneinander wären zwei
 * Quellen, und die zweite altert.
 */
export const INBOX_COLUMNS = Object.fromEntries(
	INBOX_FIELDS.map((field) => [field, sightings[field]])
) as Pick<typeof sightings, (typeof INBOX_FIELDS)[number]>;
