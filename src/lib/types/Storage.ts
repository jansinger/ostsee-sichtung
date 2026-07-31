/**
 * Storage provider interfaces
 */

import type { FileMetadata, UploadedFileInfo, UploadOptions } from './UploadedFile';

/**
 * Ergebnis von `getFileStream()`.
 *
 * `totalSize` ist immer die Gesamtgröße der Datei, auch wenn nur ein Bereich
 * geliefert wird — die Route braucht sie für den `Content-Range`-Header.
 */
export interface StorageFileStream {
	stream: ReadableStream<Uint8Array>;
	totalSize: number;

	/**
	 * Ob ein angeforderter Bereich tatsächlich als Teilantwort geliefert wurde.
	 *
	 * `true`, wenn kein Bereich angefordert wurde (die ganze Datei ist die
	 * Antwort) oder wenn der Storage den angeforderten Bereich eingehalten hat.
	 * `false` ausschließlich dann, wenn ein Bereich angefordert, aber vom
	 * Storage ignoriert wurde — `stream` enthält dann die gesamte Datei statt
	 * des angeforderten Ausschnitts. Das ist bei Vercel Blob möglich: Die
	 * Range-Anfrage geht an ein CDN, das laut HTTP-Spec einen Range-Header
	 * ignorieren und stattdessen mit 200 und vollem Body antworten darf. Der
	 * lokale Provider hält einen angeforderten Bereich immer ein, dort ist das
	 * Feld deshalb immer `true`.
	 *
	 * Aufrufer, die das Feld ignorieren, riskieren eine in sich widersprüchliche
	 * Antwort: Status 206 mit `Content-Range`-Grenzen über einem Body, der die
	 * ganze Datei enthält.
	 */
	rangeDelivered: boolean;
}

export interface StorageProvider {
	/**
	 * Upload a file to storage
	 */
	upload(file: File, data: Buffer, options: UploadOptions): Promise<UploadedFileInfo>;

	/**
	 * Delete a file from storage
	 */
	delete(filePath: string): Promise<void>;

	/**
	 * Get public URL for a file
	 */
	getUrl(filePath: string): string;

	/**
	 * Get file metadata
	 */
	getMetadata(filePath: string): Promise<FileMetadata | null>;

	/**
	 * List files in a directory
	 */
	list(prefix?: string): Promise<UploadedFileInfo[]>;

	/**
	 * Check if file exists
	 */
	exists(filePath: string): Promise<boolean>;

	/**
	 * Get file content as Buffer for secure serving
	 */
	getFileContent(filePath: string): Promise<Buffer | null>;

	/**
	 * Get file content as a stream, optionally limited to a byte range.
	 *
	 * Für Videos zwingend: `getFileContent()` lädt die ganze Datei in den
	 * Speicher, was bei 100 MB je Abruf 100 MB RSS kostet und ohne
	 * Range-Unterstützung außerdem das Springen im Video unmöglich macht.
	 *
	 * @param range Inklusiver Bereich; `end` ist das letzte gelieferte Byte.
	 * @returns null, wenn die Datei fehlt oder der Pfad ungültig ist
	 */
	getFileStream(
		filePath: string,
		range?: { start: number; end: number }
	): Promise<StorageFileStream | null>;
}

export type StorageProviderType = 'local' | 'vercel-blob' | 's3' | 'gcs';
