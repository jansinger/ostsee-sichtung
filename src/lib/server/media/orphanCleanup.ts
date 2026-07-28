/**
 * Aufräumen verwaister Uploads.
 *
 * Dateien werden sofort beim Ablegen in der Dropzone übertragen — also bevor
 * feststeht, ob die Meldung überhaupt abgeschickt wird. Bleibt sie aus, liegt
 * eine Datei ohne Sichtung (`sightingId IS NULL`) im Storage: ohne Zweck, ohne
 * Einwilligungsnachweis und ohne Bezug zu einer Person, über den ein
 * Löschbegehren erfüllbar wäre. Diese Befristung ist die Gegenleistung dafür,
 * dass der Upload vor der Einwilligung passieren darf.
 *
 * Siehe docs/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Befund B6 und Abschnitt 9.
 */

import { ORPHAN_RETENTION_HOURS } from '$lib/constants/uploadRetention';

export { ORPHAN_RETENTION_HOURS };

/** Eine noch keiner Sichtung zugeordnete Datei. */
export interface OrphanedFile {
	filePath: string;
	uid: string;
}

export interface CleanupResult {
	deleted: number;
	failed: number;
}

export interface CleanupOptions {
	/** Bezugszeitpunkt — explizit, damit der Ablauf testbar bleibt. */
	now: Date;
	retentionHours?: number;
	/** Liefert alle Dateien ohne Sichtung, die vor `cutoff` hochgeladen wurden. */
	listOrphans: (cutoff: Date) => Promise<OrphanedFile[]>;
	deleteFromStorage: (filePath: string) => Promise<void>;
	deleteRow: (filePath: string) => Promise<void>;
	onError?: (filePath: string, error: unknown) => void;
}

/**
 * Zeitpunkt, vor dem eine nicht zugeordnete Datei als verwaist gilt.
 * Lässt `now` unangetastet.
 */
export function orphanCutoff(now: Date, retentionHours: number = ORPHAN_RETENTION_HOURS): Date {
	return new Date(now.getTime() - retentionHours * 60 * 60 * 1000);
}

/**
 * Entfernt verwaiste Dateien aus Storage und Datenbank.
 *
 * Reihenfolge ist wesentlich: erst der Storage, dann die Zeile. Andersherum
 * wäre der Pfad verloren und die Datei bliebe unauffindbar liegen. Scheitert
 * eine Löschung, bleibt die Zeile stehen und der Lauf geht weiter — beim
 * nächsten Durchgang wird es erneut versucht.
 */
export async function cleanupOrphanedFiles(options: CleanupOptions): Promise<CleanupResult> {
	const { now, retentionHours, listOrphans, deleteFromStorage, deleteRow, onError } = options;

	const orphans = await listOrphans(orphanCutoff(now, retentionHours));

	let deleted = 0;
	let failed = 0;

	for (const orphan of orphans) {
		try {
			await deleteFromStorage(orphan.filePath);
			await deleteRow(orphan.filePath);
			deleted++;
		} catch (error) {
			failed++;
			onError?.(orphan.filePath, error);
		}
	}

	return { deleted, failed };
}
