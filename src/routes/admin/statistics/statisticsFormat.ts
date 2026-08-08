/**
 * @fileoverview Zahlenformat der Statistik-Seite (X4, siehe `docs/ADMIN_IMPROVEMENTS_SPEC.md`).
 *
 * `formatPercentage` gab bis 2026-08-08 `9.2%` mit Dezimalpunkt zurück, direkt neben
 * den deutsch formatierten Zahlen aus `formatNumber` (`19.284`) — ein Bruch mitten auf
 * derselben Seite. `Intl.NumberFormat('de-DE', { style: 'percent' })` multipliziert die
 * Eingabe mit 100 (sie ist für Bruchwerte wie 0.092 gedacht); die Aufrufer hier übergeben
 * aber durchgängig Prozent­punkte (9.2 statt 0.092, z. B. `deadPercentage`,
 * `repeatUserPercentage`) — deshalb die Division vor dem Formatieren.
 */

/* `parseFloat('abc')` ist NaN, und das frühere `|| 0` fing das nicht — es stand
   nur im Nicht-String-Zweig. `Number.isFinite` deckt beide Zweige ab, sonst
   stünde wörtlich „NaN" auf der Seite. */
function toFiniteNumber(num: number | string | null | undefined): number {
	const parsed = typeof num === 'string' ? parseFloat(num) : num;
	return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}

/** Deutsches Tausendertrennzeichen, akzeptiert Zahl, numerischen String oder fehlenden Wert. */
export function formatNumber(num: number | string | null | undefined): string {
	return new Intl.NumberFormat('de-DE').format(toFiniteNumber(num));
}

/**
 * Prozentwert im deutschen Format („9,2 %" statt „9.2%"). `num` ist ein Prozentpunkt
 * (9.2 bedeutet 9,2 %, nicht 0,092) — passend zu den bisherigen Aufrufstellen in
 * `+page.svelte`.
 */
export function formatPercentage(num: number | string | null | undefined): string {
	return new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 }).format(
		toFiniteNumber(num) / 100
	);
}
