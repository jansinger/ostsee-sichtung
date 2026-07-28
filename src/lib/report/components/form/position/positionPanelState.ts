/**
 * Reine Zustandsregeln des Positions-Panels.
 *
 * Bewusst ohne Svelte-/Store-Abhängigkeit, damit sie in Node testbar sind und
 * nicht im Markup verstreut liegen — dort waren sie die Ursache der bisherigen
 * Widersprüche zwischen Methodenwahl und Fallback-Block.
 */
export type PhotoStatus = 'none' | 'position-applied' | 'no-gps';

/**
 * Minimalform einer Mediendatei, wie sie hier gebraucht wird. Bewusst strukturell
 * statt über `MediaFileData` — `mediaStore.mediaFiles` trägt den Klassentyp
 * `MediaFile`, dessen Deckungsgleichheit mit dem Interface nicht zugesichert ist.
 */
export interface PositionCapableFile {
	hasPosition(): boolean;
}

/**
 * Leitet den Foto-Zustand aus den bereits analysierten Medien-Dateien ab.
 * Ein Foto mit GPS gewinnt immer — auch wenn zuvor eines ohne GPS abgelegt wurde.
 */
export function photoStatus(mediaFiles: readonly PositionCapableFile[]): PhotoStatus {
	if (mediaFiles.length === 0) return 'none';
	if (mediaFiles.some((file) => file.hasPosition())) return 'position-applied';
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
