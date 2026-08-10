/**
 * Baut den undynamischen (noch nicht lokalisierten) Pfad, den
 * `localizedHomeHref()` in `+page.svelte` an `localizeHref()` übergibt.
 *
 * Ausgelagert aus `+page.svelte`, damit die Query-Bedingung ohne die restliche
 * Seite (Formular, Karte, Storage) unit-testbar ist — `localizeHref()` selbst
 * baut seinen Rückgabewert aus `pathname + search + hash` und normalisiert
 * dabei eine leere Query über `URL.prototype.search` bereits weg
 * (`new URL('/?').search === ''`), sodass ein Fehler an dieser Stelle im
 * Browser nicht sichtbar würde, wohl aber am rohen, hier gebauten String.
 *
 * Review-Fund: Ein bedingungsloses `` `/?${searchParams.toString()}` `` liefert
 * bei leeren `URLSearchParams` (z. B. `returnToSelection()`, wenn `meldung`
 * der einzige Parameter war und gerade gelöscht wurde) den nicht-kanonischen
 * String `/?` statt `/`. Der Query-Erhalt im nicht-leeren Fall bleibt davon
 * unberührt — er hing bereits dreimal als Critical-Fund an dieser Stelle.
 */
export function buildHomeQueryPath(searchParams: URLSearchParams): string {
	const query = searchParams.toString();
	return query ? `/?${query}` : '/';
}
