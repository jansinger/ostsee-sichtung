/**
 * Pure Ableitung der initialen Positionsmethode aus dem (ggf. aus der Session
 * wiederhergestellten) Formularzustand.
 *
 * Hintergrund (U10): `PositionAndTime.svelte` hielt `positionMethod` bisher als
 * reinen UI-State, der nach jedem Reload wieder auf "Foto mit GPS" zurückfiel —
 * unabhängig davon, was der Nutzer zuvor über die Karte oder als Fahrwasser-
 * Beschreibung eingegeben hatte (der Formularzustand selbst wird ja per
 * sessionStorage wiederhergestellt, siehe `$lib/storage/localStorage.ts`).
 *
 * Diese Funktion wird EINMALIG beim Mount von `PositionAndTime.svelte`
 * aufgerufen, um die initiale Anzeige aus dem bestehenden Formularzustand
 * abzuleiten. Eine spätere manuelle Auswahl des Nutzers ruft diese Funktion
 * nicht erneut auf und wird dadurch nie überschrieben.
 *
 * Regeln (in dieser Reihenfolge):
 * 1. Echte GPS-Koordinaten vorhanden (Breiten- UND Längengrad) → "map" (Karte)
 * 2. Keine Koordinaten, aber Fahrwasser oder Seezeichen ausgefüllt → "manual" (Beschreibung)
 * 3. Sonst (leeres Formular) → "photo" (Standard/bevorzugte Methode)
 */
import { hasCoordinates } from '$lib/report/components/form/coordinateValue';

export type PositionMethod = 'photo' | 'map' | 'manual';

export interface PositionMethodFormValues {
	latitude?: unknown;
	longitude?: unknown;
	waterway?: unknown;
	seaMark?: unknown;
}

/** True, wenn der Wert ein nicht-leerer (getrimmter) String ist. */
function isFilledText(value: unknown): boolean {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Leitet die initiale Positionsmethode aus den übergebenen Formularwerten ab.
 * Reine Funktion ohne Svelte-/Store-Abhängigkeit — daher in Node testbar.
 */
export function derivePositionMethod(values: PositionMethodFormValues): PositionMethod {
	if (hasCoordinates(values.latitude, values.longitude)) {
		return 'map';
	}

	if (isFilledText(values.waterway) || isFilledText(values.seaMark)) {
		return 'manual';
	}

	return 'photo';
}
