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

/** Zeitzone, in der kalendarische Angaben ausgelegt werden. */
export const DISPLAY_TIME_ZONE = 'Europe/Berlin';

/**
 * Liest eine UTC-Zeitstempelspalte als deutsche Ortszeit.
 *
 * `timestamp AT TIME ZONE 'UTC'` deutet den naiven Wert als UTC-Zeitpunkt,
 * das zweite `AT TIME ZONE` rechnet ihn in die Wanduhrzeit der Zielzone um.
 * Beide Schritte sind IMMUTABLE, der Ausdruck ist damit indizierbar.
 */
function asLocalTime(column: SQLWrapper): SQL {
	return sql`${column} AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'`;
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
