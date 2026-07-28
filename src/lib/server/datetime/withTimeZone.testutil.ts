/**
 * @fileoverview Test-Helfer: führt eine Funktion unter einer festen Zeitzone aus.
 *
 * Node wertet `process.env.TZ` zur Laufzeit aus, eine Änderung wirkt also sofort
 * auf alle danach erzeugten `Date`-Operationen. Der Helfer stellt die vorherige
 * Zeitzone garantiert wieder her, damit sich Testdateien im selben Worker nicht
 * gegenseitig die Zeitzone verstellen.
 */

/** Zeitzonen, unter denen zeitzonenkritischer Code stabil sein muss. */
export const TEST_TIME_ZONES = ['UTC', 'Europe/Berlin', 'America/New_York', 'Pacific/Kiritimati'];

/**
 * Führt `fn` unter der angegebenen Zeitzone aus und stellt die alte wieder her.
 *
 * @param timeZone - IANA-Zeitzone, z. B. `Europe/Berlin`
 * @param fn - Auszuführende Funktion
 * @returns Rückgabewert von `fn`
 */
export function withTimeZone<T>(timeZone: string, fn: () => T): T {
	const original = process.env.TZ;
	process.env.TZ = timeZone;
	try {
		return fn();
	} finally {
		if (original === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = original;
		}
	}
}
