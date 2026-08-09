/**
 * @fileoverview Das `mediaUpload`-Flag beim **Bearbeiten** einer Sichtung.
 *
 * Beim Anlegen leitet das Meldeformular das Flag aus den hochgeladenen Dateien
 * ab (`ModernReportForm.svelte`). Die Admin-Maske tat das nicht: Sie reichte
 * den geladenen Wert nur durch. Lud ein Admin ein nachgereichtes Foto an eine
 * Sichtung mit `mediaUpload = 0`, wurde die Datei gespeichert und verknüpft —
 * die Spalte „Aufnahme" in der Admin-Tabelle zeigte trotzdem weiter „Nein".
 *
 * **Das ist bewusst keine Checkbox in der Maske geworden.** Ein Bedienelement
 * neben der Dropzone wäre eine zweite Quelle für dieselbe Aussage und könnte
 * ihr widersprechen. Abgeleitet kann das Flag gar nicht erst lügen.
 *
 * **Die Regel ist asymmetrisch, und das ist der Kern.** Eine Datei setzt das
 * Flag; das Fehlen einer Datei löscht es **nicht**. `mediaUpload = 1` ohne
 * angehängte Datei ist kein Widerspruch, sondern der Zustand „Foto
 * angekündigt, folgt per E-Mail" (`photoAnnouncement.ts`) — die Aussage, auf
 * der die Admin-Arbeitsliste und der Filter `announced_missing` stehen. Eine
 * rein aus dem Dateibestand berechnete Ableitung hätte diesen Zustand bei
 * jeder Bearbeitung getilgt und die Meldung still aus der Arbeitsliste
 * genommen, bevor das Foto eingetroffen ist.
 *
 * Zurücknehmen lässt sich das Flag über diesen Weg damit nicht. Das ist
 * hinnehmbar: Es gab dafür vorher ebenso wenig ein Bedienelement, und der
 * Fehlerfall „Foto war doch keins" ist selten genug für einen eigenen Weg.
 */

/** Zählt als „gesetzt", egal ob DB-Integer (0/1) oder Formular-Boolean. */
type MediaUploadFlag = number | boolean | null | undefined;

export interface MediaUploadFlagInput {
	/** Der Wert, wie er aus dem Bearbeitungsformular zurückkommt. */
	current: MediaUploadFlag;
	/** Anzahl der Dateien, die nach dieser Bearbeitung an der Sichtung hängen. */
	attachedFileCount: number;
}

export function resolveMediaUploadFlag({
	current,
	attachedFileCount
}: MediaUploadFlagInput): boolean {
	return !!current || attachedFileCount > 0;
}
