/**
 * Herkunft hochgeladener Dateien — „stammt aus dem Positions-Schritt?"
 *
 * Warum das überhaupt gespeichert werden muss: `$form.uploadedFiles` überlebt
 * einen Reload (sessionStorage), `mediaStore` nicht. DropzoneEnhanced baut die
 * `MediaFile`s danach aus den Formulardaten neu auf — und `UploadedFileInfo`
 * trägt die Herkunft nicht. Vorher wurde sie deshalb aus der Mount-Reihenfolge
 * geraten: Die zuerst gemountete Dropzone stempelte ihre eigene Herkunft auf
 * ALLE wiederhergestellten Dateien. Beide Richtungen waren falsch — ein Reload
 * auf Schritt 1 machte Schritt-3-Medien zum „Positions-Foto ohne GPS", ein
 * Reload auf Schritt 2+ nahm dem echten Positions-Foto seinen Hinweis.
 *
 * Bewusst **neben** den Formulardaten und nicht in ihnen: `uploadedFiles` ist
 * Teil des Yup-Schemas und wandert beim Absenden zum Server (Legacy-API-
 * Vertrag). Die Herkunft ist reine UI-Information des Browsers und hat dort
 * nichts verloren. Der Schlüssel liegt wie `FORM_DATA` in `sessionStorage` und
 * wird von `clearStorage()` mit aufgeräumt — beide leben und sterben gemeinsam.
 *
 * Die Mengen-Regeln stehen als pure Funktionen darüber, damit sie ohne Browser
 * testbar sind.
 */
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '$lib/storage/localStorage';

/**
 * Speicherform.
 *
 * Ein Objekt und kein blankes Array, weil `loadFromStorage` ein gespeichertes
 * Array verwirft (Array-Guard in der Sanitisierung) und stattdessen den
 * Default zurückgäbe — die Herkunft wäre nach jedem Reload wieder weg.
 */
type PositionFileOrigin = { uids: string[] };

const EMPTY: PositionFileOrigin = { uids: [] };

/** Fügt eine uid hinzu, ohne Duplikate und ohne die Eingabe zu verändern. */
export function withPositionUid(uids: readonly string[], uid: string): string[] {
	return uids.includes(uid) ? [...uids] : [...uids, uid];
}

/** Entfernt eine uid, ohne die Eingabe zu verändern. */
export function withoutPositionUid(uids: readonly string[], uid: string): string[] {
	return uids.filter((known) => known !== uid);
}

/** True, wenn die uid als Datei des Positions-Schritts vorgemerkt ist. */
export function isPositionUid(uids: readonly string[], uid: string): boolean {
	return uids.includes(uid);
}

/**
 * Liest die vorgemerkten uids. Einmal je Wiederherstellungslauf aufrufen und
 * das Ergebnis an `isPositionUid` weiterreichen, statt pro Datei zu laden.
 */
export function loadPositionUids(): string[] {
	const stored = loadFromStorage<PositionFileOrigin>(STORAGE_KEYS.POSITION_FILE_UIDS, EMPTY);
	return Array.isArray(stored.uids) ? stored.uids.filter((uid) => typeof uid === 'string') : [];
}

/** Merkt eine Datei als Datei des Positions-Schritts vor. */
export function markPositionFile(uid: string): void {
	saveToStorage(STORAGE_KEYS.POSITION_FILE_UIDS, {
		uids: withPositionUid(loadPositionUids(), uid)
	});
}

/** Nimmt die Vormerkung zurück — beim Löschen der Datei. */
export function unmarkPositionFile(uid: string): void {
	saveToStorage(STORAGE_KEYS.POSITION_FILE_UIDS, {
		uids: withoutPositionUid(loadPositionUids(), uid)
	});
}
