/**
 * @fileoverview Date/Time utilities for Legacy REST API - Timezone-safe formatting
 *
 * `sichtungen.sichtungsdatum` holds true UTC instants. The mobile apps expect
 * German local time, so these helpers convert explicitly to `Europe/Berlin` via
 * `Intl` — never through the process timezone, which the deployment pins to UTC.
 *
 * Historical note: until the UTC migration the column held German wall-clock
 * time and these helpers used `getUTC*`, which returned it verbatim. Migration
 * and conversion cancel out, so the output for existing records is unchanged —
 * locked down by `date-utils.timezone.test.ts`. See docs/ENVIRONMENT.md → TZ.
 *
 * @author Ostsee-Tiere Team
 * @since 1.10.0
 */

/** Timezone the legacy API renders its date and time fields in. */
const API_TIME_ZONE = 'Europe/Berlin';

const berlinFormat = new Intl.DateTimeFormat('en-GB', {
	timeZone: API_TIME_ZONE,
	year: '2-digit',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** Splits a UTC instant into its German local wall-clock components. */
function berlinParts(date: Date): Record<string, string> {
	return Object.fromEntries(
		berlinFormat
			.formatToParts(date)
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, part.value])
	);
}

/**
 * Formats a Date object to DD.MM.YY format in German local time (timezone-safe)
 *
 * @param date - Date object to format (a UTC instant)
 * @returns Date string in DD.MM.YY format
 */
export function formatDateDDMMYY(date: Date): string {
	const { day, month, year } = berlinParts(date);

	return `${day}.${month}.${year}`;
}

/**
 * Formats a Date object to HH:MI format in German local time (timezone-safe)
 *
 * @param date - Date object to format (a UTC instant)
 * @returns Time string in HH:MI format (24-hour)
 */
export function formatTimeHHMI(date: Date): string {
	const { hour, minute } = berlinParts(date);

	return `${hour}:${minute}`;
}

/**
 * Converts Date to Unix timestamp (timezone-safe)
 *
 * @param date - Date object to convert
 * @returns Unix timestamp (seconds since epoch)
 */
export function toUnixTimestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000);
}

/**
 * Liefert Anfang und Ende eines Jahres in deutscher Ortszeit als UTC-Zeitpunkte
 *
 * Das Jahr einer Sichtung ist eine Ortszeit-Frage: `dt` wird über
 * {@link formatDateDDMMYY} in `Europe/Berlin` gebildet, der Filter muss dieselbe
 * Auslegung haben. Sonst liefert `year=2024` Datensätze, deren `dt` in 2023
 * liegt. Der lokale Konstruktor `new Date(year, 0, 1)` scheidet aus — er hinge
 * an der Server-Zeitzone, die das Deployment auf UTC pinnt.
 *
 * @param year - Jahreszahl (YYYY)
 * @returns Jahresanfang und Anfang des Folgejahres als UTC-Zeitpunkte
 */
export function getYearRange(year: number): { startDate: Date; endDate: Date } {
	return {
		startDate: berlinMidnightAsUtc(year),
		endDate: berlinMidnightAsUtc(year + 1)
	};
}

/** Liefert den UTC-Zeitpunkt von Neujahr 00:00 deutscher Ortszeit. */
function berlinMidnightAsUtc(year: number): Date {
	const alsUtcGelesen = Date.UTC(year, 0, 1);
	// Neujahr liegt immer in der Winterzeit, der Offset ist an beiden Enden
	// derselbe — eine Iteration genügt.
	const offsetMs = berlinOffsetMs(new Date(alsUtcGelesen));

	return new Date(alsUtcGelesen - offsetMs);
}

/** Offset von `Europe/Berlin` gegenüber UTC zum gegebenen Zeitpunkt, in Millisekunden. */
function berlinOffsetMs(instant: Date): number {
	// sv-SE liefert "YYYY-MM-DD HH:MM:SS" — als UTC gelesen ergibt die Differenz den Offset.
	const abgelesen = new Date(
		`${instant.toLocaleString('sv-SE', { timeZone: API_TIME_ZONE }).replace(' ', 'T')}Z`
	);

	return abgelesen.getTime() - instant.getTime();
}
