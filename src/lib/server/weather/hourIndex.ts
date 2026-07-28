/**
 * @fileoverview Stundenindex in die Open-Meteo-Zeitreihe.
 *
 * Open-Meteo wird mit `timezone=Europe/Berlin` abgefragt, `hourly.time[]` ist
 * damit deutsche Ortszeit. Die Uhrzeit einer Sichtung liegt im Formular bereits
 * als deutsche Ortszeit vor ("HH:MM"), sie wird deshalb direkt geparst statt
 * über ein `Date` — dessen `getHours()` würde in der Zeitzone des Prozesses
 * auswerten und im UTC-Container die falsche Stunde treffen.
 */

/** Fallback-Index, wenn keine verwertbare Uhrzeit vorliegt: 12:00 Ortszeit. */
export const NOON_HOUR_INDEX = 12;

/** Letzter gültiger Index einer stündlichen Tages-Zeitreihe. */
const LAST_HOUR_INDEX = 23;

const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;

/**
 * Ermittelt den Index der nächstliegenden vollen Stunde in einer stündlichen Zeitreihe.
 *
 * @param localTime - Uhrzeit in deutscher Ortszeit im Format "HH:MM"
 * @returns Index zwischen 0 und 23; bei fehlender oder ungültiger Eingabe {@link NOON_HOUR_INDEX}
 *
 * @example
 * ```typescript
 * hourIndexFromLocalTime('14:45'); // 15
 * hourIndexFromLocalTime('23:45'); // 23 (kein Überlauf auf den Folgetag)
 * hourIndexFromLocalTime(null);    // 12
 * ```
 */
export function hourIndexFromLocalTime(localTime: string | null | undefined): number {
	const match = localTime?.match(TIME_PATTERN);
	if (!match) {
		return NOON_HOUR_INDEX;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > LAST_HOUR_INDEX || minutes > 59) {
		return NOON_HOUR_INDEX;
	}

	// Auf die nächstliegende volle Stunde runden, ohne auf den Folgetag zu laufen.
	return Math.min(hours + Math.round(minutes / 60), LAST_HOUR_INDEX);
}
