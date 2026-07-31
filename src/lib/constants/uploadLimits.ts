/**
 * Die eine Stelle, die aus MIME-Typ und Konfiguration eine Größengrenze macht.
 *
 * Torwächter (`POST /api/files/upload`), Auskunft (`GET /api/config/upload`)
 * und Client-Validierung (`validateFile`) rufen alle diese Funktion auf. Genau
 * das ist der Punkt: Sobald zwei Stellen selbst rechnen, laufen sie
 * auseinander, und die Dropzone nimmt Dateien an, die der Server ablehnt.
 */
import { isVideoFile } from '$lib/utils/file/fileType';

export interface UploadSizeLimits {
	/** Grenze für Bilder und alles Übrige, in Bytes */
	maxFileSize: number;
	/** Grenze für `video/*`, in Bytes */
	maxVideoFileSize: number;
}

/**
 * Liefert die erlaubte Dateigröße in Bytes für einen MIME-Typ.
 *
 * Unbekannte Typen bekommen die allgemeine (kleinere) Grenze — im Zweifel
 * restriktiv, damit ein neuer Typ nicht versehentlich die Videogrenze erbt.
 */
export function maxUploadSizeFor(mimeType: string, limits: UploadSizeLimits): number {
	return isVideoFile(mimeType.toLowerCase()) ? limits.maxVideoFileSize : limits.maxFileSize;
}
