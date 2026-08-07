/**
 * Erkennt gemerkte Tabellen-URLs auf `/admin`.
 *
 * Die Sichtungstabelle lag bis 2026-08 auf `/admin`; Bookmarks und geteilte
 * Filter-Links tragen ihre Parameter. Solche Requests leitet die Eingangsseite
 * auf `/admin/sichtungen` weiter, statt die Parameter still zu ignorieren.
 * `order` fehlt in der Liste bewusst: Das ist der Sortier-Parameter der
 * Eingangsseite selbst.
 */
const TABELLEN_PARAMETER = [
	'page',
	'perPage',
	'sort',
	'fromDate',
	'toDate',
	'verified',
	'entryChannel',
	'mediaUpload',
	'balticSea',
	'deadFinding'
] as const;

export function istTabellenUrl(url: URL): boolean {
	return TABELLEN_PARAMETER.some((param) => url.searchParams.has(param));
}
