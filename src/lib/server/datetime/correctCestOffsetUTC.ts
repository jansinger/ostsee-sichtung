/**
 * Corrects the UTC offset for Central European Summer Time (CEST).
 * This function adjusts the given UTC date to account for daylight saving time in Central Europe.
 *
 * @param date - The UTC date to be corrected. Must be a UTC date.
 * @returns The corrected date, adjusted for CEST or CET as appropriate.
 */
export function correctCestOffsetUTC(date: Date): Date {
	// Nur, wenn die Server Timezone UTC ist
	// Dann soll das Datum als CE(S)T Interpretiert werden
	if (date.getTimezoneOffset() !== 0) {
		return date;
	}
	// Das Datum muss ein UTC-Datum sein!
	const year = date.getUTCFullYear();

	// Letzter Sonntag im März (Sommerzeit beginnt)
	const march = new Date(Date.UTC(year, 2, 31)); // 31. März
	const marchDay = march.getUTCDay();
	const lastMarchSunday = 31 - marchDay;
	const cestStart = Date.UTC(year, 2, lastMarchSunday, 1); // 2:00 MEZ == 1:00 UTC

	// Letzter Sonntag im Oktober (Sommerzeit endet)
	const october = new Date(Date.UTC(year, 9, 31)); // 31. Oktober
	const octoberDay = october.getUTCDay();
	const lastOctoberSunday = 31 - octoberDay;
	const cestEnd = Date.UTC(year, 9, lastOctoberSunday, 1); // 3:00 MESZ == 1:00 UTC

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
