/**
 * Lesbare Beschriftungen der aktiven Filter für den Export-Dialog
 * (`ExportModal.svelte`).
 *
 * Eigenes Modul statt einer Funktion in der Komponente: Diese Liste ist die
 * dritte Stelle, an der ein neuer Tabellenfilter nachgezogen werden muss —
 * neben `exportFilterParams.ts` (was tatsächlich gefiltert wird) und
 * `tableReturnUrl.ts` (was der Rückweg behält). Vergisst man sie, verspricht
 * der Dialog eine andere Menge, als die Datei enthält; als reine Funktion ist
 * das ohne Browser testbar (`exportFilterDisplay.test.ts`).
 *
 * Die Beschriftungen kommen, wo vorhanden, aus den Präsentations-Konstanten
 * (`BALTIC_SEA_STATUS_PRESENTATION`, `DEAD_FINDING_PRESENTATION`) statt neu
 * formuliert zu werden — sonst laufen Filter-Panel und Export-Zusammenfassung
 * auseinander.
 */
import { formatWallClockDateTime } from '$lib/utils/format/formatWallClockDateTime';
import { MEDIA_UPLOAD_ANNOUNCED_MISSING } from '$lib/utils/media/photoAnnouncement';
import { BALTIC_SEA_STATUS_PRESENTATION, isBalticSeaStatus } from '$lib/utils/geo/balticSeaStatus';
import { DEAD_FINDING_PRESENTATION } from '$lib/components/admin/deadFinding';
import { normalizeStatusParam } from '$lib/components/admin/sightingStatusFilter';

/**
 * @param currentFilters Die Filterwerte der Tabelle, so wie sie auch an die
 *   Export-API gehen.
 * @returns Je ein Badge-Text pro aktivem Filter, oder `['Keine Filter aktiv']`.
 */
export function getActiveFiltersDisplay(
	currentFilters: Record<string, string | boolean | undefined>
): string[] {
	const filterDisplays: string[] = [];

	// `fromDate`/`toDate` sind reine Kalendertag-Strings ("YYYY-MM-DD") aus dem
	// Datumsfilter, kein Zeitpunkt — formatWallClockDateTime sortiert nur um,
	// ohne Date-Objekt (sonst bestimmt die Browser-Zone den Tag mit, bis zu
	// ±1 Tag).
	if (currentFilters.fromDate) {
		filterDisplays.push(
			`Sichtung von: ${formatWallClockDateTime(currentFilters.fromDate as string)}`
		);
	}
	if (currentFilters.toDate) {
		filterDisplays.push(
			`Sichtung bis: ${formatWallClockDateTime(currentFilters.toDate as string)}`
		);
	}
	const statusFilter = normalizeStatusParam(currentFilters.verified as string | null);
	if (statusFilter) {
		const statusLabel = {
			open: 'Nur offene Sichtungen',
			approved: 'Nur freigegebene Sichtungen',
			rejected: 'Nur abgelehnte Sichtungen'
		}[statusFilter];
		filterDisplays.push(statusLabel);
	}
	if (currentFilters.entryChannel && currentFilters.entryChannel !== 'all') {
		filterDisplays.push(`Kanal: ${currentFilters.entryChannel}`);
	}
	if (currentFilters.mediaUpload === '1') {
		filterDisplays.push('Nur mit Aufnahmen');
	} else if (currentFilters.mediaUpload === '0') {
		filterDisplays.push('Nur ohne Aufnahmen');
	} else if (currentFilters.mediaUpload === MEDIA_UPLOAD_ANNOUNCED_MISSING) {
		filterDisplays.push('Nur angekündigt, Foto fehlt noch');
	}
	if (isBalticSeaStatus(currentFilters.balticSea)) {
		const presentation = BALTIC_SEA_STATUS_PRESENTATION[currentFilters.balticSea];
		filterDisplays.push(`Ostsee-Status: ${presentation.label}`);
	}
	if (currentFilters.deadFinding === '1') {
		filterDisplays.push(`Meldeart: ${DEAD_FINDING_PRESENTATION.label}`);
	} else if (currentFilters.deadFinding === '0') {
		filterDisplays.push('Meldeart: Lebendsichtung');
	}
	// Getrimmt geprüft und getrimmt angezeigt — dieselbe Grenze wie serverseitig
	// in `normalizeSearchTerm`, sonst stünde hier ein Badge für eine Suche, die
	// die Abfrage gar nicht einschränkt.
	const searchTerm = typeof currentFilters.q === 'string' ? currentFilters.q.trim() : '';
	if (searchTerm) {
		filterDisplays.push(`Suche: „${searchTerm}"`);
	}

	return filterDisplays.length > 0 ? filterDisplays : ['Keine Filter aktiv'];
}
