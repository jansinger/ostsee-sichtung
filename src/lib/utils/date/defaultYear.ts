/**
 * Ermittelt das Standard-Jahr für den Abruf von Sichtungen.
 *
 * Logik gemäß API-Dokumentation:
 * - Von Januar bis einschließlich März: Vorjahr
 * - Ab April: Aktuelles Jahr
 *
 * Diese Logik berücksichtigt, dass zu Beginn eines neuen Jahres
 * noch hauptsächlich Sichtungen aus dem Vorjahr relevant sind.
 *
 * @returns Das Jahr, das standardmäßig für Sichtungsabfragen verwendet werden soll
 */
export function getDefaultSightingYear(): number {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth(); // 0-basiert: 0 = Januar, 2 = März

	// Januar (0), Februar (1), März (2) -> Vorjahr
	if (currentMonth <= 2) {
		return currentYear - 1;
	}

	// Ab April (3) -> Aktuelles Jahr
	return currentYear;
}

/**
 * Prüft, ob wir uns in der Übergangsphase befinden (Januar-März),
 * in der standardmäßig das Vorjahr angezeigt wird.
 *
 * @returns true wenn Januar-März, sonst false
 */
export function isInTransitionPeriod(): boolean {
	const currentMonth = new Date().getMonth();
	return currentMonth <= 2;
}

/**
 * Ein Jahr mit der Anzahl an Sichtungen darin (z. B. Antwort von
 * `GET /api/map/sightings/years`).
 */
export interface YearWithCount {
	year: number;
	count: number;
}

/**
 * Leitet die im Jahres-Dropdown wählbaren Jahre ab (N4).
 *
 * Reine Funktion (kein Fetch, kein Datum) — testbar ohne Fake-Timer.
 * - Basis sind alle Jahre mit `count > 0` aus `GET /api/map/sightings/years`.
 * - Liefert der Endpoint nichts Brauchbares (Fehler, leere Dev-DB), greift der
 *   bisherige Fallback: die letzten 11 Kalenderjahre ab `currentYear`.
 * - `currentYear` ist immer wählbar, auch ohne Daten — sonst käme man nach der
 *   ersten Freigabe des Jahres ohne Seiten-Reload nicht dorthin.
 * - `extraYear` (Jahr aus einer geteilten URL, M4) wird ergänzt, falls es fehlt.
 *
 * @param availableYears Jahre mit Sichtungsanzahl, beliebige Reihenfolge
 * @param currentYear Aktuelles Kalenderjahr
 * @param extraYear Zusätzlich wählbares Jahr (z. B. `?year=…` aus der URL)
 * @returns Wählbare Jahre, absteigend sortiert und ohne Duplikate
 */
export function deriveSelectableYears(
	availableYears: YearWithCount[],
	currentYear: number,
	extraYear?: number
): number[] {
	const withData = availableYears.filter((entry) => entry.count > 0).map((entry) => entry.year);
	const fallback = Array.from({ length: 11 }, (_, index) => currentYear - index);

	const years = new Set(withData.length > 0 ? withData : fallback);
	years.add(currentYear);
	if (extraYear !== undefined) {
		years.add(extraYear);
	}

	return [...years].sort((a, b) => b - a);
}

/**
 * Ermittelt das Default-Jahr für die Sichtungskarte anhand tatsächlich
 * vorhandener Daten.
 *
 * Reine Funktion (kein Fetch, kein Datum) — testbar ohne Fake-Timer.
 * Logik gemäß Spec (QW2b):
 * 1. Jüngstes Jahr mit `count > 0`, das ≤ `fallbackYear` ist.
 * 2. Gibt es keins (alle Jahre mit Daten liegen in der Zukunft von
 *    `fallbackYear`), das jüngste Jahr mit Daten überhaupt.
 * 3. Gibt es gar keine Jahre mit Daten (leere Liste oder nur `count === 0`),
 *    den `fallbackYear` selbst (bisheriges Verhalten).
 *
 * @param availableYears Jahre mit Sichtungsanzahl, beliebige Reihenfolge
 * @param fallbackYear Bisheriges Default-Jahr (z. B. `getDefaultSightingYear()`)
 * @returns Das zu verwendende Default-Jahr
 */
export function pickDefaultYear(availableYears: YearWithCount[], fallbackYear: number): number {
	const withData = availableYears.filter((entry) => entry.count > 0);

	if (withData.length === 0) {
		return fallbackYear;
	}

	const eligible = withData.filter((entry) => entry.year <= fallbackYear);
	const pool = eligible.length > 0 ? eligible : withData;

	return pool.reduce((latest, entry) => (entry.year > latest ? entry.year : latest), pool[0]!.year);
}
