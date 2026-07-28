/**
 * Räumt verwaiste Uploads auf — Dateien, die übertragen, aber nie mit einer
 * abgeschickten Sichtung verknüpft wurden.
 *
 * Läuft als Endpunkt und nicht als Standalone-Skript, weil Storage-Provider und
 * DB-Verbindung an der SvelteKit-Laufzeit hängen (`$env`). Für den regelmäßigen
 * Lauf einen Job gegen diesen Endpunkt einrichten.
 *
 * `?dryRun=true` listet nur, was entfernt würde.
 * `?hours=<n>` überschreibt die Aufbewahrungsfrist.
 *
 * Hintergrund: docs/MEDIENEINWILLIGUNG_ANALYSE_2026-07-28.md, Befund B6.
 */
import { createLogger } from '$lib/logger.server';
import { requireUserRole } from '$lib/server/auth/auth';
import { deleteFileByPath, listOrphanedFilesBefore } from '$lib/server/db/sightingFilesRepository';
import {
	ORPHAN_RETENTION_HOURS,
	cleanupOrphanedFiles,
	orphanCutoff
} from '$lib/server/media/orphanCleanup';
import { getStorageProvider } from '$lib/server/storage/factory';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:admin:cleanup-orphans');

/** Liest eine positive Stundenangabe aus der Query, sonst die Standardfrist. */
function parseRetentionHours(raw: string | null): number {
	const parsed = raw === null ? NaN : Number(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : ORPHAN_RETENTION_HOURS;
}

export const POST: RequestHandler = async ({ locals, url }) => {
	// SECURITY: Must be outside try/catch so redirect(302) propagates correctly
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	const retentionHours = parseRetentionHours(url.searchParams.get('hours'));
	const dryRun = url.searchParams.get('dryRun') === 'true';
	const now = new Date();

	try {
		if (dryRun) {
			const orphans = await listOrphanedFilesBefore(orphanCutoff(now, retentionHours));
			logger.info({ count: orphans.length, retentionHours }, 'Trockenlauf verwaiste Uploads');
			return json({ dryRun: true, retentionHours, count: orphans.length });
		}

		const storage = getStorageProvider();
		const result = await cleanupOrphanedFiles({
			now,
			retentionHours,
			listOrphans: listOrphanedFilesBefore,
			deleteFromStorage: (filePath) => storage.delete(filePath),
			deleteRow: deleteFileByPath,
			onError: (filePath, error) => logger.error({ filePath, error }, 'Löschen fehlgeschlagen')
		});

		logger.info({ ...result, retentionHours }, 'Verwaiste Uploads aufgeräumt');
		return json({ dryRun: false, retentionHours, ...result });
	} catch (error) {
		logger.error({ error }, 'Aufräumen verwaister Uploads fehlgeschlagen');
		return json({ error: 'Aufräumen fehlgeschlagen' }, { status: 500 });
	}
};
