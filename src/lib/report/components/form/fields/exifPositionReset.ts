/**
 * Pure Entscheidungslogik: Darf eine aus EXIF übernommene Position beim
 * Entfernen des zugehörigen GPS-Fotos zurückgenommen werden?
 *
 * Hintergrund: `DropzoneEnhanced.svelte` schreibt beim Auslesen von GPS-EXIF
 * `latitude`/`longitude`/`hasPosition` in den Formularzustand. Beim Entfernen
 * des Fotos (`handleClear`, `handleFileRemoved`) darf dieser Zustand NUR dann
 * zurückgesetzt werden, wenn die aktuellen Formular-Koordinaten noch exakt
 * dem zuletzt aus EXIF übernommenen Wert entsprechen — hat der Nutzer die
 * Position seither manuell überschrieben (z.B. über die Karte), muss ihre
 * Eingabe erhalten bleiben, auch wenn das ursprüngliche Foto entfernt wird.
 */

/** Die zuletzt aus EXIF in den Formularzustand übernommene Position (Rohwerte, wie `toFixed(4)` sie liefert). */
export interface AppliedExifPosition {
	latitude: string;
	longitude: string;
}

/** Minimale Teilmenge der Formularwerte, die für die Entscheidung nötig ist. */
export interface CurrentPositionValues {
	latitude?: unknown;
	longitude?: unknown;
}

/**
 * True, wenn `applied` gesetzt ist und die aktuellen Formular-Koordinaten
 * noch exakt den zuletzt aus EXIF übernommenen Werten entsprechen — also
 * seither nicht manuell verändert wurden und sicher zurückgenommen werden dürfen.
 */
export function shouldResetExifPosition(
	current: CurrentPositionValues,
	applied: AppliedExifPosition | null
): boolean {
	if (!applied) {
		return false;
	}

	return (
		String(current.latitude ?? '') === applied.latitude &&
		String(current.longitude ?? '') === applied.longitude
	);
}
