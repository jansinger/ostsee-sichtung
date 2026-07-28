/**
 * Reine Zustandsregeln des Positions-Panels.
 *
 * Bewusst ohne Svelte-/Store-Abhängigkeit, damit sie in Node testbar sind und
 * nicht im Markup verstreut liegen — dort waren sie die Ursache der bisherigen
 * Widersprüche zwischen Methodenwahl und Fallback-Block.
 */
export type PhotoStatus = 'none' | 'analyzing' | 'position-applied' | 'no-gps';

/**
 * Minimalform einer Mediendatei, wie sie hier gebraucht wird. Bewusst strukturell
 * statt über `MediaFileData` — `mediaStore.mediaFiles` trägt den Klassentyp
 * `MediaFile`, dessen Deckungsgleichheit mit dem Interface nicht zugesichert ist.
 *
 * Zwei Prädikate statt einem, weil `hasPosition()` allein nicht zwischen „kein
 * GPS" und „noch nicht nachgesehen" unterscheiden kann: Es liest `exifData`, das
 * bis zum Auflösen der Metadaten-Promise `undefined` bleibt (MediaFile.ts:13),
 * während die Datei schon synchron im Store liegt (DropzoneEnhanced.svelte:264).
 * `isAnalyzed()` trennt die beiden Fälle.
 *
 * `isFromPositionStep` grenzt ein, worüber das Panel überhaupt urteilen darf —
 * siehe `photoStatus`.
 */
export interface PositionCapableFile {
	hasPosition(): boolean;
	isAnalyzed(): boolean;
	isFromPositionStep: boolean;
}

/**
 * Leitet den Foto-Zustand aus den Medien-Dateien ab.
 *
 * **Nur Dateien des Positions-Schritts zählen.** `mediaStore` wird einmal pro
 * Formular angelegt (Form.svelte:40) und von allen Schritten geteilt; ohne diese
 * Eingrenzung entschieden die Fotos aus Schritt 3 (Medien) darüber mit, was das
 * Panel über „dieses Foto" behauptet — bis hin zur Meldung „In diesem Foto sind
 * keine GPS-Daten gespeichert", obwohl in Schritt 1 gar kein Foto liegt.
 *
 * Reihenfolge der Regeln danach ist bewusst:
 * 1. Ein Foto mit GPS gewinnt immer — das ist eine abgeschlossene Tatsache und
 *    gilt auch, wenn daneben noch eine Datei ausgewertet wird.
 * 2. Läuft noch eine Auswertung, ist der GPS-Befund offen → `analyzing`.
 *    Ohne diesen Zweig behauptete das Panel im Moment des Drops „keine GPS-Daten"
 *    und nähme es Sekundenbruchteile später wieder zurück.
 * 3. Erst wenn alles ausgewertet ist und nichts GPS trägt, gilt `no-gps`.
 */
export function photoStatus(mediaFiles: readonly PositionCapableFile[]): PhotoStatus {
	const positionFiles = mediaFiles.filter((file) => file.isFromPositionStep);
	if (positionFiles.length === 0) return 'none';
	if (positionFiles.some((file) => file.hasPosition())) return 'position-applied';
	if (positionFiles.some((file) => !file.isAnalyzed())) return 'analyzing';
	return 'no-gps';
}

/**
 * True auf der steigenden Flanke: genau dann, wenn eine Position NEU entsteht.
 *
 * Nicht `hasCoordinates || wasEverExpanded` — das würde `open` erzwingen und dem
 * Nutzer das Zuklappen der Karte unmöglich machen.
 */
export function shouldOpenMapOnCoordinateChange(
	hasCoordinates: boolean,
	hadCoordinates: boolean
): boolean {
	return hasCoordinates && !hadCoordinates;
}

/** True, wenn der Wert ein nicht-leerer (getrimmter) String ist. */
function isFilledText(value: unknown): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Die Ortsbeschreibung klappt nur zu, wenn Koordinaten vorliegen UND beide Felder
 * leer sind. Wer erst das Seegebiet beschreibt und danach ein Foto mit GPS
 * hochlädt, darf seinen Text nicht verlieren.
 */
export function descriptionCollapsed(
	hasCoordinates: boolean,
	waterway: unknown,
	seaMark: unknown
): boolean {
	if (!hasCoordinates) return false;
	return !isFilledText(waterway) && !isFilledText(seaMark);
}
