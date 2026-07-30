/**
 * „Foto angekündigt, aber noch nicht eingetroffen" — Zustand einer Sichtung
 * vom neu gebauten iOS-Client (`OstSeeTiere/8`, Stand 2026-07-30).
 *
 * Der Client setzt `aufnahmeHochladen` (→ `mediaUpload`), wenn der Melder ein
 * Foto hat, kann darüber aber keine Datei übertragen — der Client kann nicht
 * geändert werden. Melder werden gebeten, das Foto per E-Mail nachzureichen.
 * Ohne diese Einordnung liest „Upload: ja" ohne angehängte Datei wie ein
 * defekter Datensatz, dabei ist es eine erwartete Zwischenphase.
 *
 * **Einzige Stelle, an der dieser Zustand entsteht** — analog zu
 * `getBalticSeaStatus()` in `$lib/utils/geo/balticSeaStatus.ts`. Angeschlossen
 * sind die Admin-Detailansicht (`AdminSightingView.svelte`) und der
 * Datenbank-Filter für die Admin-Arbeitsliste
 * (`$lib/server/db/mediaUploadFilter.ts`). Die Benachrichtigungs-Mail prüft
 * dagegen nur das rohe Flag: beim Versand — unmittelbar nach dem Anlegen der
 * Sichtung — kann noch keine Datei angehängt sein, der Dateizähler wäre dort
 * immer 0 und träfe keine zusätzliche Aussage.
 */

/** Zählt als „gesetzt", egal ob DB-Integer (0/1) oder Formular-Boolean. */
type MediaUploadFlag = number | boolean | null | undefined;

export function isPhotoAnnouncementPending(
	mediaUpload: MediaUploadFlag,
	attachedFileCount: number
): boolean {
	return !!mediaUpload && attachedFileCount === 0;
}

export const PHOTO_ANNOUNCEMENT_LABEL = 'Foto angekündigt, folgt per E-Mail';

export const PHOTO_ANNOUNCEMENT_TITLE =
	'Der Melder hat laut App ein Foto, kann es darüber aber nicht hochladen — es kommt separat per E-Mail. Beim Eintreffen anhand der Referenz-ID zuordnen.';

/**
 * Wert des `mediaUpload`-Query-Parameters für die Admin-Arbeitsliste
 * „angekündigt, aber keine Datei angehängt" — dieselbe Aussage wie
 * `isPhotoAnnouncementPending()`, hier als Filterwert für Admin-Übersicht und
 * Export (`$lib/server/db/mediaUploadFilter.ts`).
 *
 * **Hier und nicht in `mediaUploadFilter.ts` definiert**, weil diese Datei
 * client-sicher ist und `mediaUploadFilter.ts` `$lib/server/db/schema`
 * importiert — ein Import von dort in `admin/+page.svelte` würde
 * SvelteKits Server-only-Grenze verletzen.
 */
export const MEDIA_UPLOAD_ANNOUNCED_MISSING = 'announced_missing';
