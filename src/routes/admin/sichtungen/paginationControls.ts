/**
 * @fileoverview Der Zustand der Seiten-Navigation — insbesondere ihr Leerfall.
 *
 * `+page.server.ts` liefert `totalPages` als `Math.ceil(count / perPage)`. Bei
 * null Treffern ist das **0**, und daraus folgten im Markup zwei Fehler
 * gleichzeitig: Die Anzeige las „1 / 0", und die Sperre der Vorwärts-Knöpfe
 * prüfte `page === totalPages` — also `1 === 0` und damit `false`. „Nächste
 * Seite" und „Letzte Seite" blieben auf einer leeren Trefferliste bedienbar
 * und führten auf Seite 2 bzw. Seite 0.
 *
 * Die Rechnung steht deshalb hier und nicht als Ausdruck im Template: Der
 * Leerfall ist genau der, den man beim Bauen nicht vor sich hat, und ein
 * Ausdruck im Markup lässt sich nicht gegen ihn scharf stellen.
 */

export interface PaginationControls {
	/**
	 * Seitenzahl für die Anzeige — mindestens 1.
	 *
	 * Eine leere Trefferliste ist „Seite 1 von 1" und nicht „1 von 0": Man
	 * steht auf einer Seite, sie ist nur leer. Die Null gehört in die
	 * Trefferzahl daneben, nicht in die Seitenzählung.
	 */
	totalPages: number;
	/** Kein Rückweg — „Erste"/„Vorherige" gehören gesperrt. */
	atFirst: boolean;
	/** Kein Vorwärtsweg — „Nächste"/„Letzte" gehören gesperrt. */
	atLast: boolean;
}

export function paginationControls(page: number, totalPages: number): PaginationControls {
	const seiten = Math.max(1, totalPages);
	return {
		totalPages: seiten,
		atFirst: page <= 1,
		/*
		 * `>=` und nicht `===`: Eine Seitenzahl jenseits des Bestands ist über
		 * die Adresszeile herstellbar und entsteht außerdem von selbst, wenn ein
		 * Filterwechsel die Treffermenge schrumpfen lässt. Mit `===` wäre der
		 * Vorwärtsweg dort offen und führte noch weiter ins Leere — der Rückweg
		 * bleibt in beiden Fällen frei, sonst säße man fest.
		 */
		atLast: page >= seiten
	};
}
