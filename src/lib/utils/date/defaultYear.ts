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
 * Gibt eine Liste von Jahren für Auswahlfelder zurück.
 * Beginnt mit dem aktuellen Jahr und geht die angegebene Anzahl Jahre zurück.
 * 
 * @param yearsBack Anzahl der Jahre, die zurück gegangen werden soll (Standard: 10)
 * @returns Array von Jahren in absteigender Reihenfolge
 */
export function getAvailableYears(yearsBack: number = 10): number[] {
	const currentYear = new Date().getFullYear();
	const years: number[] = [];
	
	for (let i = 0; i <= yearsBack; i++) {
		years.push(currentYear - i);
	}
	
	return years;
}