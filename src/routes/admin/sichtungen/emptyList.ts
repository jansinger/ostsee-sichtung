/**
 * @fileoverview Der Wortlaut des Leer-Zustands von `/admin/sichtungen`.
 *
 * Die Seite rendert dieselbe Menge zweimal — als Kartenliste
 * (`SichtungenCards.svelte`) und als Tabelle (`SichtungenTable.svelte`). Beide
 * brauchen denselben Leer-Zustand, und beide hatten bis 2026-08-14 gar keinen:
 * Ein Filter ohne Treffer zeigte eine Tabelle mit Kopfzeile und leerem Körper,
 * ohne Aussage darüber, ob gefiltert wurde, noch geladen wird oder die
 * Datenbank leer ist (`docs/DESIGN_SYSTEM.md`, „Fehlende Zustände").
 *
 * Der Wortlaut steht deshalb hier und nicht zweimal im Markup — dieselbe
 * Begründung wie bei `deadFinding.ts` und `filterChips.ts`.
 *
 * **Die Unterscheidung ist der eigentliche Zweck.** „Keine Treffer" über einer
 * gefilterten Menge und „noch nichts da" sind verschiedene Aussagen mit
 * verschiedenen Auswegen: Im ersten Fall gibt es einen (Filter zurücksetzen),
 * im zweiten nicht — und eine Schaltfläche, die nichts bewirkt, gehört nicht
 * hin (`design-system.md`, „Button-Hierarchie").
 */

export type EmptyListText = {
	/** Die Aussage — was ist der Fall. */
	title: string;
	/** Ursache und, wo es eine gibt, die Folge. */
	description: string;
	/**
	 * Beschriftung des Auswegs, oder `undefined`, wenn es keinen gibt.
	 *
	 * `undefined` statt eines leeren Strings: Die Aufrufstelle reicht den Wert
	 * an `StatusBlock`s optionales `action` durch, und dessen `| undefined`
	 * steht dort unter `exactOptionalPropertyTypes` bewusst so.
	 */
	resetLabel?: string;
};

export function describeEmptyList(hasActiveFilters: boolean): EmptyListText {
	if (hasActiveFilters) {
		return {
			title: 'Keine Sichtung passt zu den aktiven Filtern',
			description:
				'Die Auswahl ist zu eng. Einzelne Filter lassen sich oben über die Chips zurücknehmen.',
			resetLabel: 'Alle Filter zurücksetzen'
		};
	}

	return {
		title: 'Noch keine Sichtungen erfasst',
		description: 'Sobald eine Meldung eingeht, erscheint sie an dieser Stelle.'
	};
}
