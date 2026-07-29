/**
 * Pure Entscheidungslogik: Darf die Aufnahmezeit aus EXIF in `sightingDate` und
 * `sightingTime` geschrieben werden?
 *
 * Hintergrund: Für ein Foto OHNE GPS ist der Zeitstempel das Einzige, was EXIF
 * noch beisteuern kann — bisher wurde er dort nur angezeigt und nie übernommen
 * (`DropzoneEnhanced.svelte` schrieb ihn ausschließlich im Zweig
 * `isPositionStep && mediaFile.hasPosition()`). Die Karte zeigte also die
 * richtige Aufnahmezeit an, während im Formular weiter das heutige Datum stand;
 * wer die Anzeige sah, prüfte das Feld nicht mehr.
 *
 * Gegenstück zu `exifPositionReset.ts`: Dort geht es um das Zurücknehmen einer
 * übernommenen Position, hier um das Übernehmen einer Zeit — beide dürfen eine
 * Eingabe des Nutzers nicht überschreiben.
 */

/** Die zuletzt aus EXIF übernommenen Werte, exakt wie ins Formular geschrieben. */
export interface AppliedExifDateTime {
	sightingDate: string;
	sightingTime: string;
}

/** Minimale Teilmenge der Formularwerte, die für die Entscheidung nötig ist. */
export interface CurrentDateTimeValues {
	sightingDate?: unknown;
	sightingTime?: unknown;
}

/** Der `touched`-Ausschnitt aus `createForm` für dieselben zwei Felder. */
export interface DateTimeTouched {
	sightingDate?: boolean;
	sightingTime?: boolean;
}

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * True, wenn die EXIF-Zeit übernommen werden darf.
 *
 * Drei Regeln, in dieser Reihenfolge:
 *
 * 1. **Es sind noch unsere eigenen Werte** → übernehmen. Nötig, weil die
 *    Übernahme selbst über `handleChange` läuft und die Felder damit als
 *    `touched` markiert; ohne diese Regel scheiterte jedes Ersetzen des Fotos
 *    (Einzeldatei-Modus) an der Spur des Vorgängers.
 * 2. **Der Nutzer hat eines der Felder angefasst** → nicht überschreiben.
 * 3. Sonst nur, wenn **noch keine Uhrzeit** feststeht. `sightingDate` taugt als
 *    Prüfgröße nicht: Das Schema gibt ihm `berlinToday()` als Default, es ist
 *    also immer gefüllt. `sightingTime` startet leer und wird von jeder
 *    Übernahme gemeinsam mit dem Datum gesetzt — eine gefüllte Uhrzeit heißt
 *    damit „hier steht bereits etwas", auch nach einem Reload, bei dem
 *    `touched` wieder leer ist.
 */
export function shouldApplyExifDateTime(
	current: CurrentDateTimeValues,
	applied: AppliedExifDateTime | null,
	touched: DateTimeTouched
): boolean {
	if (
		applied &&
		text(current.sightingDate) === applied.sightingDate &&
		text(current.sightingTime) === applied.sightingTime
	) {
		return true;
	}

	if (touched.sightingDate || touched.sightingTime) {
		return false;
	}

	return text(current.sightingTime) === '';
}
