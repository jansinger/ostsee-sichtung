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

export const PUBLIC_UPLOAD_ALLOWED_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp'
] as const;

export const PUBLIC_UPLOAD_ACCEPT = PUBLIC_UPLOAD_ALLOWED_TYPES.join(',');
