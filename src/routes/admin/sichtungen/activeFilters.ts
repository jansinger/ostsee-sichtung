import { normalizeStatusParam } from '$lib/components/admin/sightingStatusFilter';

/**
 * Der Filterzustand der Sichtungstabelle, gelesen aus der URL.
 *
 * **Warum aus der URL und nicht aus den Feld-States des Panels:** Die Tabelle
 * zeigt, was in der URL steht — nichts anderes. Wer im Panel ein Datum wählt
 * und nicht „Anwenden" klickt, hat keinen Filter gesetzt; die Feld-States sind
 * bis dahin ein Editier-Puffer. Aus ihnen abgeleitet, exportierte der
 * Export-Dialog eine Menge, die die Tabelle nie gezeigt hat, und die
 * Filter-Schaltfläche stand schon beim Tippen markiert da.
 *
 * Client-sicher: `+page.svelte` und (über WP2/WP3) die Statusreiter und
 * Filter-Chips lesen dieselben zwei Funktionen.
 *
 * Leerer String heißt „nicht gesetzt" — die Form, die `ExportModal.svelte`
 * ohnehin erwartet.
 */
export type FilterParams = {
	fromDate: string;
	toDate: string;
	verified: string;
	entryChannel: string;
	mediaUpload: string;
	balticSea: string;
	deadFinding: string;
	q: string;
};

export function readFilterParams(searchParams: URLSearchParams): FilterParams {
	const lies = (name: string): string => searchParams.get(name) ?? '';

	return {
		fromDate: lies('fromDate'),
		toDate: lies('toDate'),
		/* Normalisiert, nicht roh: Der Server versteht die alten Aliase
		   `verified=1`/`verified=0` weiterhin (Lesezeichen, verlinkte
		   Filteransichten). Ohne die Umrechnung stünde in der Beschriftung des
		   Export-Dialogs eine `1`, und das `<select>` im Panel — das nur
		   `open`/`approved`/`rejected` kennt — bliebe leer. Ein unbekannter Wert
		   liefert `undefined` und gilt hier als „nicht gesetzt". */
		verified: normalizeStatusParam(searchParams.get('verified')) ?? '',
		/* Ohne das UI-Sentinel `all`: Das Panel-`<select>` braucht einen Wert für
		   „egal", die URL trägt dafür gar keinen Parameter. */
		entryChannel: lies('entryChannel'),
		mediaUpload: lies('mediaUpload'),
		balticSea: lies('balticSea'),
		deadFinding: lies('deadFinding'),
		q: lies('q')
	};
}
