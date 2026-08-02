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
 * bis zum Auflösen der Metadaten-Promise `undefined` bleibt (`MediaFile`),
 * während die Datei schon synchron im Store liegt (`handleFilesAdded` in
 * `DropzoneEnhanced.svelte`).
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
 * Darf das Panel behaupten, im Foto stecke keine Position?
 *
 * Nur wenn im Formular auch wirklich keine steht. `photoStatus` urteilt allein
 * über die `MediaFile`-Instanzen, die Koordinaten kommen aber aus einer zweiten,
 * unabhängigen Quelle (`$form.latitude`/`longitude`, über `sessionStorage`
 * reloadfest). Beide können auseinanderlaufen: Eine nach einem Reload aus
 * `$form.uploadedFiles` neu gebaute Datei ohne `exifData` meldet
 * `hasPosition() === false`, während die Koordinaten längst wieder da sind.
 *
 * Das Ergebnis war ein sichtbarer Widerspruch — grüne Ostsee-Bestätigung neben
 * gelber „keine GPS-Daten"-Warnung — und der angebotene Ausweg „Auf Karte
 * wählen" hätte die korrekte Position überschrieben. Ein Panel, das Koordinaten
 * anzeigt, darf ihr Fehlen nicht behaupten.
 */
export function shouldWarnAboutMissingGps(
	status: PhotoStatus,
	coordinatesPresent: boolean
): boolean {
	return status === 'no-gps' && !coordinatesPresent;
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
 * Die Ortsbeschreibung klappt nur zu, wenn Koordinaten vorliegen UND das Feld
 * leer ist. Wer erst das Seegebiet beschreibt und danach ein Foto mit GPS
 * hochlädt, darf seinen Text nicht verlieren.
 *
 * Ein Parameter, nicht zwei: Seit A2.4 steht im Meldeformular nur noch
 * `waterway` im Block — Seegebiet, Fahrwasser und Orientierungspunkte laufen
 * durch dasselbe Feld. `seaMark` gibt es dort nicht mehr zu bewerten.
 */
export function descriptionCollapsed(hasCoordinates: boolean, waterway: unknown): boolean {
	if (!hasCoordinates) return false;
	return !isFilledText(waterway);
}
