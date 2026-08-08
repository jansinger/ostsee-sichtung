/**
 * Baut den Rückweg aus der Detailansicht zurück auf `/admin/sichtungen`.
 *
 * Die Detailansicht wird mit **allen** Parametern der Tabelle aufgerufen
 * (`viewSightingDetails` kopiert sie unbesehen); zurück gehen darf nur, was die
 * Tabelle auch liest. Diese Liste lag bis 2026-08 inline im `+layout.svelte` —
 * und hat `balticSea` und `deadFinding` nie nachgezogen, als die beiden Filter
 * dazukamen: Wer nach Ostsee-Status oder Meldeart filterte, eine Sichtung
 * öffnete und zurückging, stand wieder vor der ungefilterten Tabelle. Deshalb
 * eigenes Modul statt Inline-Liste — `tableReturnUrl.test.ts` gleicht sie gegen
 * die tatsächlich in `sichtungen/` gelesenen Parameter ab und meldet die nächste
 * solche Lücke, statt sie still entstehen zu lassen.
 */
export const TABELLEN_PARAMETER = [
	'fromDate',
	'toDate',
	'verified',
	'entryChannel',
	'mediaUpload',
	'balticSea',
	'deadFinding',
	'sort',
	'order',
	'page',
	'perPage'
] as const;

export function tableReturnUrl(currentUrl: URL): string {
	const zielUrl = new URL('/admin/sichtungen', currentUrl.origin);

	for (const param of TABELLEN_PARAMETER) {
		const wert = currentUrl.searchParams.get(param);
		if (wert) {
			zielUrl.searchParams.set(param, wert);
		}
	}

	return zielUrl.toString();
}
