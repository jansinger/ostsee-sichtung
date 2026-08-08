/**
 * Vergleicht den aktuellen Formularzustand mit seinen Startwerten.
 *
 * **Warum ein Vergleich und kein `isDirty` aus `createForm`:** Die eigene
 * Form-Implementierung führt kein solches Kennzeichen. Sie hat zwar `touched`,
 * das aber nur die Anzeige steuert („grünes Häkchen an berührten Feldern") und
 * bereits vom bloßen Antippen eines Feldes gesetzt wird — ein Feld, das der
 * Bearbeiter angefasst und wieder auf den Ausgangswert gestellt hat, gälte
 * damit als geändert. Für eine Rückfrage vor dem Wegnavigieren ist das die
 * falsche Frage: Sie soll nur kommen, wenn wirklich etwas verloren ginge.
 *
 * Der Vergleich ist bewusst nachsichtig, weil Formularfelder Werte in einer
 * anderen Form zurückgeben, als sie hineingegangen sind:
 *
 * - Ein Zahlenfeld liefert `'1'`, wo die Startwerte `1` trugen.
 * - Ein nie befülltes Select startet als `null` und meldet sich als `''`.
 * - Datumswerte sind Objekte und nie identisch, auch bei gleichem Zeitpunkt.
 *
 * Ohne diese Normalisierung fragte die Maske bei jedem Verlassen nach, auch
 * wenn niemand etwas geändert hat — und eine Rückfrage, die immer kommt, wird
 * weggeklickt, bevor sie einmal recht hat.
 */
function normalize(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

export function isFormDirty(
	current: Record<string, unknown> | undefined,
	initial: Record<string, unknown> | undefined
): boolean {
	// Der Formular-Store hängt am Context und steht beim ersten Rendern noch
	// nicht bereit. „Kein Zustand" heißt „nichts zu verlieren".
	if (!current || !initial) return false;

	for (const key of new Set([...Object.keys(current), ...Object.keys(initial)])) {
		if (normalize(current[key]) !== normalize(initial[key])) return true;
	}
	return false;
}
