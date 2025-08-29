import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sightingFiles } from '$lib/server/db/schema';
import { deleteFileByPath } from '$lib/server/db/sightingFilesRepository';
import { getStorageProvider } from '$lib/server/storage/factory';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const logger = createLogger('FileDeleteAPI');

export const DELETE: RequestHandler = async ({ request, locals }) => {
	try {
		const { filePath } = await request.json();

		if (!filePath) {
			throw error(400, 'File path ist erforderlich');
		}

		// Check if user is admin or if file is deletable by regular users
		const isAdmin = locals.user?.roles?.includes('admin') || false;

		if (!isAdmin) {
			// For non-admin users, check if file exists and has no sightingId assigned
			const fileRecord = await db
				.select({ id: sightingFiles.id, sightingId: sightingFiles.sightingId })
				.from(sightingFiles)
				.where(eq(sightingFiles.filePath, filePath))
				.limit(1);

			if (fileRecord.length === 0) {
				logger.warn({ filePath }, 'File not found in database for deletion');
				throw error(404, 'Datei nicht gefunden');
			}

			const file = fileRecord[0]!; // Safe after length check
			if (file.sightingId !== null) {
				logger.warn(
					{
						filePath,
						sightingId: file.sightingId,
						user: locals.user?.sub || 'anonymous'
					},
					'Non-admin user attempted to delete file assigned to sighting'
				);
				throw error(
					403,
					'Datei kann nicht gelöscht werden - sie ist bereits einer Sichtung zugeordnet'
				);
			}

			logger.info(
				{ filePath, user: locals.user?.sub || 'anonymous' },
				'Regular user deleting unassigned file'
			);
		} else {
			logger.info({ filePath, user: locals.user?.sub }, 'Admin user deleting file');
		}

		// Basic security check - no path traversal
		if (filePath.includes('..') || filePath.includes('\\') || filePath.startsWith('/')) {
			logger.warn({ filePath }, 'Verdächtiger Datei-Pfad erkannt');
			throw error(400, 'Ungültiger Datei-Pfad');
		}

		// Use storage provider to delete file
		const storage = getStorageProvider();
		try {
			await storage.delete(filePath);

			logger.info({ filePath }, 'Datei erfolgreich gelöscht');

			await deleteFileByPath(filePath);

			return json({
				success: true,
				message: 'Datei erfolgreich gelöscht',
				filePath
			});
		} catch (deleteError: unknown) {
			logger.error({ error: deleteError, filePath }, 'Fehler beim Löschen der Datei');

			// For cloud storage, we don't get ENOENT errors, so just log and continue
			return json({
				success: true,
				message: 'Datei wurde gelöscht oder existierte bereits nicht',
				filePath
			});
		}
	} catch (err) {
		if (err instanceof Response) {
			throw err; // Re-throw SvelteKit errors
		}

		logger.error({ error: err }, 'Unerwarteter Fehler beim Datei-Löschen');
		throw error(500, 'Interner Server-Fehler beim Datei-Löschen');
	}
};
