/**
 * @fileoverview Auswahl-Logik der Bulk-Aktionen in der Sichtungstabelle.
 *
 * Reine Funktionen über ID-Listen, bewusst ohne Runes: Die Tabelle hält den
 * Zustand selbst (`$state`), hier steht nur die Rechnung. Das hält die Regeln —
 * indeterminate-Zustand, „alle auf dieser Seite", Leeren bei Datenwechsel — an
 * einem Ort testbar, statt sie im Markup zu verstreuen.
 *
 * **Es gibt bewusst kein Cross-Page-Gedächtnis.** Eine Auswahl, die über den
 * Seiten- oder Filterwechsel überlebte, hieße: „Freigeben" wirkt auf Zeilen, die
 * gerade niemand sieht. Deshalb prüft `isSameIdList` die sichtbare Liste, und die
 * Tabelle leert die Auswahl, sobald sie sich ändert.
 */

/** Zustand der Kopf-Checkbox „Alle auf dieser Seite". */
export type BulkHeaderState = 'none' | 'partial' | 'all';

/** Nimmt eine ID auf oder entfernt sie — ohne die Eingabe zu verändern. */
export function toggleSelection(selected: readonly number[], id: number): number[] {
	return selected.includes(id)
		? selected.filter((vorhanden) => vorhanden !== id)
		: [...selected, id];
}

/** „Alle auf dieser Seite" — `ids` ist immer nur die aktuelle Tabellenseite. */
export function setAllSelected(ids: readonly number[], checked: boolean): number[] {
	return checked ? [...ids] : [];
}

/**
 * Der Zustand der Kopf-Checkbox, berechnet **nur über die sichtbaren Zeilen**.
 * Eine ID aus einer früheren Seite (die es hier nicht geben sollte, aber der
 * Zustand ist billiger geprüft als bewiesen) darf „alle gewählt" nicht auslösen.
 */
export function getHeaderState(
	selected: readonly number[],
	ids: readonly number[]
): BulkHeaderState {
	if (ids.length === 0) return 'none';
	const sichtbarGewaehlt = ids.filter((id) => selected.includes(id)).length;
	if (sichtbarGewaehlt === 0) return 'none';
	return sichtbarGewaehlt === ids.length && selected.length === ids.length ? 'all' : 'partial';
}

/**
 * Zeigt die Tabelle noch dieselbe Liste? Reihenfolge zählt mit: Ein
 * Sortierwechsel liefert dieselben IDs, stellt dem Nutzer aber eine andere Liste
 * hin — die Auswahl gehört dann genauso geleert wie beim Seitenwechsel.
 */
export function isSameIdList(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}
