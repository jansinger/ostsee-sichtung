/**
 * @fileoverview Geteilte SQL-Ausdrücke für die Auslegung von Zeitstempeln in Ortszeit.
 *
 * Die Zeitstempelspalten sind `timestamp without time zone` und halten seit der
 * UTC-Migration echte UTC-Zeitpunkte. Kalendarische Fragen — „welcher Tag?",
 * „welches Jahr?" — sind dagegen Ortszeit-Fragen: Eine Sichtung am 01.01. um
 * 00:30 deutscher Zeit steht als 31.12. 23:30 UTC in der Spalte und gehört
 * trotzdem in den 01.01.
 *
 * Warum zentral statt inline: Postgres nutzt einen Ausdrucksindex nur bei
 * **exakter** Übereinstimmung von Index- und Abfrageausdruck. Stünde der
 * Ausdruck an beiden Stellen getrennt ausgeschrieben, würde schon eine
 * abweichende Schreibweise den Index still wirkungslos machen. Abgesichert
 * durch `sqlTimeZone.test.ts`.
 *
 * @author Ostsee-Tiere Team
 */

import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

/** Zeitzone, als deren Zeitpunkte die naiven Zeitstempelspalten zu lesen sind. */
const STORAGE_TIME_ZONE = 'UTC';

/** Zeitzone, in der kalendarische Angaben ausgelegt werden. */
export const DISPLAY_TIME_ZONE = 'Europe/Berlin';

/**
 * Bettet einen Zeitzonennamen als SQL-Literal ein.
 *
 * Bewusst `sql.raw` statt eines gebundenen Parameters: Ein Ausdrucksindex kann
 * keine Parameter enthalten, der Zonenname muss also im SQL-Text stehen. Das ist
 * hier unbedenklich, weil ausschließlich die beiden Modulkonstanten oben
 * hineingereicht werden — es gibt keinen Pfad von einer Eingabe hierher.
 */
function zoneLiteral(timeZone: string): SQL {
	return sql.raw(`'${timeZone}'`);
}

/**
 * Liest eine Zeitstempelspalte als Ortszeit der Anzeige-Zeitzone.
 *
 * Das erste `AT TIME ZONE` deutet den naiven Wert als Zeitpunkt in
 * `STORAGE_TIME_ZONE`, das zweite rechnet ihn in die Wanduhrzeit von
 * `DISPLAY_TIME_ZONE` um. Beide Schritte sind IMMUTABLE (verifiziert über
 * `pg_proc.provolatile`), der Ausdruck ist damit indizierbar.
 */
function asLocalTime(column: SQLWrapper): SQL {
	return sql`${column} AT TIME ZONE ${zoneLiteral(STORAGE_TIME_ZONE)} AT TIME ZONE ${zoneLiteral(DISPLAY_TIME_ZONE)}`;
}

/**
 * Kalendertag einer UTC-Zeitstempelspalte in deutscher Ortszeit.
 *
 * Muss zeichengleich mit dem Ausdruck in `idx_position_date_weather`
 * (siehe `schema.ts`) bleiben, sonst greift der Index nicht mehr.
 *
 * @param column - Zeitstempelspalte, die UTC-Zeitpunkte hält
 * @returns SQL-Ausdruck, der den lokalen Kalendertag als `date` liefert
 *
 * @example
 * ```typescript
 * eq(berlinCalendarDate(sightings.sightingDate), '2024-07-15')
 * ```
 */
export function berlinCalendarDate(column: SQLWrapper): SQL {
	return sql`DATE(${asLocalTime(column)})`;
}

/**
 * Extrahiert einen Datumsbestandteil in deutscher Ortszeit.
 *
 * @param part - Bestandteil, z. B. `'year'` oder `'month'`
 * @param column - Zeitstempelspalte, die UTC-Zeitpunkte hält
 * @returns SQL-Ausdruck für `EXTRACT(<part> FROM <spalte in Ortszeit>)`
 */
export function berlinDatePart(part: 'year' | 'month' | 'day', column: SQLWrapper): SQL {
	return sql`EXTRACT(${sql.raw(part)} FROM ${asLocalTime(column)})`;
}

/**
 * Formatiert eine UTC-Zeitstempelspalte über `to_char` als String in deutscher
 * Ortszeit (z. B. für Legacy-kompatible Feldnamen wie `dt`/`ti`, die dieselbe
 * Zeitzone wie die übrigen Legacy-Endpunkte tragen müssen).
 *
 * @param column - Zeitstempelspalte, die UTC-Zeitpunkte hält
 * @param pattern - `to_char`-Formatmuster, z. B. `'DD.MM.YYYY'` oder `'HH24:MI'`.
 *   **Nur Modulkonstanten/Literale übergeben, niemals Nutzereingabe** — das
 *   Muster landet unparametrisiert (`sql.raw`) im SQL-Text. Anführungszeichen
 *   werden defensiv SQL-standardkonform verdoppelt, damit ein versehentlich
 *   durchgereichtes Muster das Literal nicht aufbrechen kann.
 */
export function berlinToChar(column: SQLWrapper, pattern: string): SQL {
	const escaped = pattern.replaceAll("'", "''");

	return sql`to_char(${asLocalTime(column)}, ${sql.raw(`'${escaped}'`)})`;
}
