/**
 * Öffentliche Upload-Konfiguration (anonyme Melder).
 *
 * Einzige Quelle für die Werte, die `/api/config/upload` an nicht
 * authentifizierte Nutzer ausliefert UND für die Client-Fallbacks in
 * `$lib/stores/configStore`. Beide Seiten müssen übereinstimmen: Weichen sie
 * ab, akzeptiert die Dropzone Dateien, die der Server anschließend ablehnt
 * (oder die UI verspricht Formate, die es gar nicht gibt).
 *
 * Authentifizierte Nutzer (Admin) erhalten stattdessen die Laufzeit-Konfiguration
 * aus dem ConfigService — die kann großzügiger sein.
 */
export const PUBLIC_UPLOAD_MAX_FILE_SIZE_MB = 10;

export const PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES = PUBLIC_UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Obergrenze, die `POST /api/files/upload` für nicht authentifizierte Melder
 * durchlässt. Muss mit der öffentlichen Konfiguration übereinstimmen — sonst
 * nimmt die Dropzone eine Datei an, die der Server danach mit 413 ablehnt.
 * Abgesichert durch `uploadLimitConsistency.test.ts`.
 */
export const ANONYMOUS_UPLOAD_MAX_SIZE_BYTES = PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES;

/**
 * Offline-Fallback für die Videogrenze. Gilt nur, solange
 * `GET /api/config/upload` nicht erreichbar ist — im Normalbetrieb kommt der
 * Wert aus `security.maxVideoFileSize`.
 *
 * Muss ≤ der Vorbelegung von `security.maxVideoFileSize` bleiben, sonst
 * verspricht der Fallback mehr, als der Server annimmt
 * (`uploadLimitConsistency.test.ts`).
 */
export const PUBLIC_UPLOAD_MAX_VIDEO_FILE_SIZE_MB = 100;

export const PUBLIC_UPLOAD_MAX_VIDEO_FILE_SIZE_BYTES =
	PUBLIC_UPLOAD_MAX_VIDEO_FILE_SIZE_MB * 1024 * 1024;

export const PUBLIC_UPLOAD_ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp'
] as const;

export const PUBLIC_UPLOAD_ACCEPT = PUBLIC_UPLOAD_ALLOWED_TYPES.join(',');
