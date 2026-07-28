/**
 * Rechnet eine deutsche Wanduhrzeit in den echten UTC-Zeitpunkt um.
 *
 * Läuft der Prozess in UTC, erzeugt `combineToDate` aus der Formulareingabe ein
 * `Date`, dessen UTC-Felder die *Wanduhrzeit* tragen (14:30 Eingabe → 14:30Z).
 * Diese Funktion zieht den passenden MEZ/MESZ-Offset ab und macht daraus den
 * tatsächlichen Zeitpunkt.
 *
 * In jeder anderen Prozess-Zeitzone hat `combineToDate` den Offset bereits
 * korrekt angewandt — dann ist diese Funktion ein No-op.
 *
 * WICHTIG: `date` trägt Wanduhrzeit, keinen echten UTC-Zeitpunkt. Die
 * Umstellungsgrenzen unten liegen deshalb ebenfalls auf Wanduhrzeit (02:00 bzw.
 * 03:00) und nicht auf dem UTC-Instant der Umstellung (01:00Z).
 *
 * @param date - Als UTC verpackte deutsche Wanduhrzeit. Wird in-place verändert.
 * @returns Dasselbe (mutierte) Date-Objekt, um den MEZ/MESZ-Offset zurückgesetzt.
 */
export function correctCestOffsetUTC(date: Date): Date {
	// Nur, wenn die Server Timezone UTC ist
	// Dann soll das Datum als CE(S)T Interpretiert werden
	if (date.getTimezoneOffset() !== 0) {
		return date;
	}
	const year = date.getUTCFullYear();

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

	const time = date.getTime();

	// CEST gilt von cestStart (einschließlich) bis cestEnd (ausschließlich)
	if (time >= cestStart && time < cestEnd) {
		date.setHours(date.getHours() - 2); // UTC+2 (CEST)
		return date;
	} else {
		date.setHours(date.getHours() - 1); // UTC+1 (CET)
		return date;
	}
}
