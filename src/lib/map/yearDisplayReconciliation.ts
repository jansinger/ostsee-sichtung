/**
 * @fileoverview Hält das angezeigte Jahr mit der wählbaren Jahresliste
 * synchron, nachdem sich die Liste geändert hat (z. B. nach einem
 * Statuswechsel im Admin-Filter).
 *
 * Eigene Datei aus demselben Grund wie `yearsRequestSequencer.ts`: die
 * Entscheidung selbst braucht weder Karte noch DOM und soll ohne beides
 * prüfbar sein.
 *
 * **Der konkrete Fehler (Pre-Merge-Review, zweimal unabhängig gefunden):**
 * `SightingsMapView.svelte` lud nach einem Statuswechsel `availableYearsData`
 * neu, glich das aktuell *angezeigte* Jahr aber nie gegen die neue Liste ab.
 * `FilterPanel.svelte` rendert die `<option>`-Elemente mit
 * `selected={year === selectedYear}` — fällt das angezeigte Jahr aus der
 * Liste (z. B. 2024 hat unter „Offen" keine Treffer, `deriveSelectableYears`
 * lässt es weg), trägt **keine** Option `selected`, und der Browser zeigt
 * kommentarlos die erste Option. Das Dropdown zeigt dann ein anderes Jahr als
 * die Karte tatsächlich geladen hat.
 *
 * Vor der Statusfilter-Funktion war das nicht erreichbar: `availableYearsData`
 * wurde nur einmal geschrieben, bevor die Karte überhaupt existierte.
 */

/**
 * Ermittelt, ob das angezeigte Jahr nach einer aktualisierten Jahresliste
 * gewechselt werden muss.
 *
 * Reine Funktion (kein DOM, kein Fetch) — testbar ohne Map-Controller.
 *
 * @param displayedYear Das Jahr, das die Karte gerade tatsächlich anzeigt
 *   (`mapInstance.getDisplayedYear()`).
 * @param selectableYears Die aktualisierte, im Dropdown wählbare Jahresliste
 *   (`years`, abgeleitet über `deriveSelectableYears`).
 * @param fallbackYear Das Jahr, auf das gewechselt werden soll, falls
 *   `displayedYear` nicht mehr wählbar ist (`pickDefaultYear(...)`).
 * @returns Das Jahr, auf das umgeschaltet werden muss, oder `null`, wenn
 *   `displayedYear` weiterhin in `selectableYears` steht und nichts zu tun ist.
 */
export function reconcileDisplayedYear(
	displayedYear: number,
	selectableYears: readonly number[],
	fallbackYear: number
): number | null {
	if (selectableYears.includes(displayedYear)) {
		return null;
	}
	return fallbackYear;
}
