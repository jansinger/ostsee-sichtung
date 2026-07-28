/**
 * Umrechnung deutscher Wanduhrzeit in den echten UTC-Zeitpunkt.
 *
 * Reine Arithmetik auf UTC-Feldern — das Ergebnis hängt an keiner Laufzeit-Zeitzone
 * und die Funktionen sind deshalb auch im Browser einsetzbar.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Liefert den deutschen UTC-Offset in Stunden für eine als UTC verpackte Wanduhrzeit.
 *
 * Die Umstellungsgrenzen liegen auf Wanduhrzeit (02:00 bzw. 03:00) und nicht auf
 * dem UTC-Instant der Umstellung — `wallClock` trägt keine echte UTC-Zeit.
 *
 * @param wallClock - Deutsche Wanduhrzeit, in den UTC-Feldern eines Date abgelegt
 * @returns 2 während MESZ (Sommerzeit), sonst 1 (MEZ)
 */
export function berlinOffsetHoursForWallClock(wallClock: Date): 1 | 2 {
	const year = wallClock.getUTCFullYear();

	// Letzter Sonntag im März (Sommerzeit beginnt)
	const march = new Date(Date.UTC(year, 2, 31)); // 31. März
	const marchDay = march.getUTCDay();
	const lastMarchSunday = 31 - marchDay;
	const cestStart = Date.UTC(year, 2, lastMarchSunday, 2); // Wanduhr 2:00, danach gilt MESZ

	// Letzter Sonntag im Oktober (Sommerzeit endet)
	const october = new Date(Date.UTC(year, 9, 31)); // 31. Oktober
	const octoberDay = october.getUTCDay();
	const lastOctoberSunday = 31 - octoberDay;
	const cestEnd = Date.UTC(year, 9, lastOctoberSunday, 3); // Wanduhr 3:00, danach gilt MEZ

	const time = wallClock.getTime();

	// CEST gilt von cestStart (einschließlich) bis cestEnd (ausschließlich)
	return time >= cestStart && time < cestEnd ? 2 : 1;
}

/** Kalender- und Uhrzeitfelder einer deutschen Wanduhrzeit. */
export type BerlinWallClockParts = {
	year: number;
	/** 1–12, nicht der 0-basierte `Date`-Monat. */
	month: number;
	day: number;
	hours: number;
	minutes: number;
	seconds?: number;
	milliseconds?: number;
};

/**
 * Baut aus deutscher Wanduhrzeit den echten UTC-Zeitpunkt.
 *
 * @param parts - Kalender- und Uhrzeitfelder, wie sie ein Mensch abliest
 * @returns Der Zeitpunkt, den diese Wanduhrzeit in Deutschland bezeichnet
 */
export function berlinWallClockToInstant(parts: BerlinWallClockParts): Date {
	const wallClock = new Date(
		Date.UTC(
			parts.year,
			parts.month - 1,
			parts.day,
			parts.hours,
			parts.minutes,
			parts.seconds ?? 0,
			parts.milliseconds ?? 0
		)
	);

	return new Date(wallClock.getTime() - berlinOffsetHoursForWallClock(wallClock) * MS_PER_HOUR);
}
