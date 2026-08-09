/**
 * @fileoverview Die aktiven Filter der Sichtungstabelle als einzeln
 * entfernbare Chips.
 *
 * Bei geschlossenem Panel zeigte nur ein Punkt-Badge, *dass* gefiltert wird.
 * Welcher Filter greift, stand nirgends, und zurücknehmen ließ sich nur alles
 * auf einmal — wer eine zu enge Menge vor sich hatte, musste das Panel
 * aufklappen und die sieben Felder durchsehen.
 *
 * **Keine zweite Beschriftungsquelle.** Wort für Wort kommen die Chips aus
 * denselben Quellen wie die `<select>`-Felder des Panels:
 * `getEntryChannelOptions()`, `DEAD_FINDING_PRESENTATION`,
 * `BALTIC_SEA_STATUS_PRESENTATION`, `SIGHTING_STATUS_PRESENTATION` und
 * `MEDIA_UPLOAD_ANNOUNCED_MISSING`. Für die beiden Ja/Nein-Wortpaare ohne
 * eigenes Präsentationsmodul — „Mit"/„Ohne" und „Lebendsichtung" — ist diese
 * Datei selbst die Quelle: `AUFNAHME_LABEL` und `MELDEART_LABEL` sind exportiert,
 * und das Panel (`+page.svelte`) rendert seine `<option>`-Beschriftungen daraus,
 * statt sie ein zweites Mal zu tippen. Ein eigener Wortschatz an einer der
 * beiden Stellen hieße, dass Chip und Panel denselben Filter verschieden
 * benennen, sobald eine der beiden angefasst wird — derselbe Fehler, gegen den
 * `deadFinding.ts` und `balticSeaStatus.ts` angelegt wurden.
 *
 * Client-sicher: **kein** Import aus `$lib/server/**`. Die Seite ist eine
 * Client-Komponente, und der Bruch fiele erst in `npm run build` auf.
 *
 * Der Filterzustand kommt aus `activeFilters.ts` und damit aus der URL — hier
 * entsteht kein zweiter gemerkter Zustand.
 */
import { DEAD_FINDING_PRESENTATION } from '$lib/components/admin/deadFinding';
import {
	SIGHTING_STATUS_PRESENTATION,
	type SightingStatus
} from '$lib/components/admin/sightingStatus';
import { getEntryChannelOptions } from '$lib/report/formOptions/entryChannel';
import { formatLocalDateTime } from '$lib/utils/format/dateTime';
import { BALTIC_SEA_STATUS_PRESENTATION, isBalticSeaStatus } from '$lib/utils/geo/balticSeaStatus';
import { MEDIA_UPLOAD_ANNOUNCED_MISSING } from '$lib/utils/media/photoAnnouncement';
import type { FilterParams } from './activeFilters';

export type FilterChip = {
	param: keyof FilterParams;
	/** Menschenlesbar und für sich verständlich — „Von 01.06.2026", „Kanal: Web". */
	label: string;
};

export type BuildFilterChipsOptions = {
	/**
	 * Den Status-Chip auslassen. Die Aufrufstelle setzt das, solange die
	 * Statusreiter über der Tabelle stehen: Der aktive Reiter zeigt den Status
	 * bereits, ein zweites Bedienelement für dieselbe Aussage wäre die
	 * Doppelung, gegen die die Reiter angetreten sind.
	 */
	skipVerified?: boolean;
};

/**
 * Reihenfolge der Chips — dieselbe wie im Panel, damit „zweiter Chip" und
 * „zweites Feld" dasselbe meinen. Die Freitext-Suche steht zuletzt; ihr Feld
 * liegt außerhalb des Panels.
 */
const CHIP_ORDER = [
	'fromDate',
	'toDate',
	'verified',
	'deadFinding',
	'entryChannel',
	'mediaUpload',
	'balticSea',
	'q'
] as const satisfies readonly (keyof FilterParams)[];

/**
 * Das Datum im Format der Tabelle. `fromDate`/`toDate` sind reine
 * Kalenderdaten (`YYYY-MM-DD`) und werden als UTC-Mitternacht gelesen — in
 * Europe/Berlin liegt der Offset ganzjährig vorwärts, der Datumsteil kippt
 * also nicht auf den Vortag.
 */
function datum(value: string): string {
	return formatLocalDateTime(value, 'date');
}

function kanalLabel(value: string): string {
	return getEntryChannelOptions().find((option) => String(option.value) === value)?.label ?? value;
}

function statusLabel(value: string): string {
	return isSightingStatus(value) ? SIGHTING_STATUS_PRESENTATION[value].label : value;
}

function isSightingStatus(value: string): value is SightingStatus {
	return Object.hasOwn(SIGHTING_STATUS_PRESENTATION, value);
}

/**
 * „Mit"/„Ohne" sind keine Auszeichnung eines Datensatzes, sondern nur die zwei
 * Seiten eines Ja/Nein-Filters — kein `deadFinding.ts`/`balticSeaStatus.ts`-Modul
 * nimmt sie auf. Diese Datei ist deshalb selbst die Quelle, exportiert für das
 * `<select>` des Panels (`+page.svelte`), das seine `<option>`-Beschriftungen von
 * hier bezieht statt sie ein zweites Mal zu tippen. Der Sonderwert kommt aus
 * seinem eigenen Modul — er trägt eine fachliche Aussage (`photoAnnouncement.ts`).
 */
export const AUFNAHME_LABEL: Record<string, string> = {
	'1': 'Mit',
	'0': 'Ohne',
	[MEDIA_UPLOAD_ANNOUNCED_MISSING]: 'Angekündigt, fehlt noch'
};

/**
 * Gegenstück zum Totfund; `deadFinding.ts` führt für den Normalfall bewusst kein
 * Wort, deshalb steht „Lebendsichtung" hier. Exportiert aus demselben Grund wie
 * `AUFNAHME_LABEL`: Das Panel rendert seine Option daraus.
 */
export const MELDEART_LABEL: Record<string, string> = {
	'1': DEAD_FINDING_PRESENTATION.label,
	'0': 'Lebendsichtung'
};

/**
 * Ein Wert, den keine Quelle kennt (veraltetes Lesezeichen, von Hand getippte
 * URL), erscheint unverändert. Den Chip wegzulassen wäre der schlechtere
 * Ausgang: Die Tabelle filterte dann sichtbar, ohne dass es etwas zum
 * Wegklicken gäbe.
 */
const CHIP_LABEL: Record<keyof FilterParams, (value: string) => string> = {
	fromDate: (value) => `Von ${datum(value)}`,
	toDate: (value) => `Bis ${datum(value)}`,
	verified: (value) => `Status: ${statusLabel(value)}`,
	deadFinding: (value) => `Meldeart: ${MELDEART_LABEL[value] ?? value}`,
	entryChannel: (value) => `Kanal: ${kanalLabel(value)}`,
	mediaUpload: (value) => `Aufnahme: ${AUFNAHME_LABEL[value] ?? value}`,
	balticSea: (value) =>
		`Ostsee: ${isBalticSeaStatus(value) ? BALTIC_SEA_STATUS_PRESENTATION[value].label : value}`,
	q: (value) => `Suche: „${value}“`
};

/** Ein Chip je gesetztem Filter, in der Reihenfolge des Panels. */
export function buildFilterChips(
	params: FilterParams,
	options: BuildFilterChipsOptions = {}
): FilterChip[] {
	return CHIP_ORDER.filter((param) => {
		if (options.skipVerified && param === 'verified') return false;
		return params[param] !== '';
	}).map((param) => ({ param, label: CHIP_LABEL[param](params[param]) }));
}

/**
 * Die URL ohne diesen einen Filter.
 *
 * `page=1` aus demselben Grund wie bei jedem anderen Filterwechsel: Die
 * Trefferzahl springt, und ohne Rücksprung stünde man auf einer leeren Seite 7.
 * Die übergebene URL bleibt unverändert — der Aufrufer navigiert mit dem
 * Rückgabewert.
 */
export function removeFilterParam(url: URL, param: keyof FilterParams): URL {
	const ziel = new URL(url);
	ziel.searchParams.delete(param);
	ziel.searchParams.set('page', '1');
	return ziel;
}
