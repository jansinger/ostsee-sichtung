import { createLogger } from '$lib/logger';
import { db } from '$lib/server/db';
import { sightingFiles } from '$lib/server/db/schema';
import { deleteFileByPath } from '$lib/server/db/sightingFilesRepository';
import { getStorageProvider } from '$lib/server/storage/factory';
import { isAdminUser } from '$lib/server/auth/auth';
import { error, isHttpError, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const logger = createLogger('FileDeleteAPI');

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const userIdentifier = locals.user?.sub || 'anonymous';
	const isAuthenticated = !!locals.user;
	const clientIp =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

	try {
		const { filePath } = await request.json();

		if (!filePath) {
			throw error(400, 'File path ist erforderlich');
		}

		// Check if user is admin or if file is deletable by regular users
		const isAdmin = isAdminUser(locals.user);

		// Security audit logging
		logger.info(
			{
				action: 'file_delete_attempt',
				user: userIdentifier,
				authenticated: isAuthenticated,
				isAdmin,
				clientIp,
				filePath
			},
			'File deletion requested'
		);

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
						action: 'file_delete_blocked',
						reason: 'file_assigned_to_sighting',
						filePath,
						sightingId: file.sightingId,
						user: userIdentifier,
						authenticated: isAuthenticated,
						clientIp
					},
					'Non-admin user attempted to delete file assigned to sighting'
				);
				throw error(
					403,
					'Datei kann nicht gelöscht werden - sie ist bereits einer Sichtung zugeordnet'
				);
			}

			logger.info(
				{
					action: 'file_delete_allowed',
					filePath,
					user: userIdentifier,
					authenticated: isAuthenticated,
					clientIp
				},
				'User deleting unassigned file'
			);
		} else {
			logger.info(
				{
					action: 'file_delete_admin',
					filePath,
					user: userIdentifier,
					clientIp
				},
				'Admin user deleting file'
			);
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
		if (isHttpError(err)) {
			throw err; // Re-throw SvelteKit errors
		}

		logger.error({ error: err }, 'Unerwarteter Fehler beim Datei-Löschen');
		throw error(500, 'Interner Server-Fehler beim Datei-Löschen');
	}
};
