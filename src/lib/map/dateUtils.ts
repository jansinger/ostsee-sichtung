/**
 * Gibt die Anzahl der Tage in einem Jahr zurück (365 oder 366 bei Schaltjahr).
 */
export function getDaysInYear(year: number): number {
	return isLeapYear(year) ? 366 : 365;
}

/**
 * Prüft ob ein Jahr ein Schaltjahr ist.
 * Schaltjahr: durch 4 teilbar, außer durch 100 — es sei denn auch durch 400 teilbar.
 */
export function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
