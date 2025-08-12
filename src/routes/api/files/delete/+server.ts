import { error, json } from '@sveltejs/kit';
import { createLogger } from '$lib/logger';
import { getStorageProvider } from '$lib/server/storage/factory';
import type { RequestHandler } from './$types';

const logger = createLogger('FileDeleteAPI');

// Upload-Ordner konfigurieren - keeping for backward compatibility but unused with storage abstraction
const _UPLOAD_BASE_PATH = process.env.UPLOAD_PATH || 'uploads';

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { filePath } = await request.json();
		
		if (!filePath) {
			throw error(400, 'File path ist erforderlich');
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