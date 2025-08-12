import { createLogger } from '$lib/logger';
import { getFileInfo, getUploadPath, isValidUploadPath } from '$lib/server/uploads';
import { error } from '@sveltejs/kit';
import { createReadStream } from 'fs';
import { getStorageProvider, isCloudStorage } from '$lib/server/storage/factory';
import type { RequestHandler } from './$types';

const logger = createLogger('api:uploads');

export const GET: RequestHandler = async ({ params }) => {
	const filePath = params.path;
	
	// Pfad-Validierung
	if (!filePath || !isValidUploadPath(filePath)) {
		logger.warn({ filePath }, 'Ungültiger Dateipfad angefordert');
		throw error(400, 'Ungültiger Dateipfad');
	}

	// For cloud storage, redirect to the actual URL
	if (isCloudStorage()) {
		try {
			const storage = getStorageProvider();
			const url = storage.getUrl(filePath);
			
			// For Vercel Blob and other cloud providers, redirect to their URL
			return new Response(null, {
				status: 302,
				headers: {
					Location: url,
					'Cache-Control': 'public, max-age=31536000, immutable'
				}
			});
		} catch (err) {
			logger.error({ error: err, filePath }, 'Fehler beim Abrufen der Cloud-Storage-URL');
			throw error(404, 'Datei nicht gefunden');
		}
	}

	// Local storage - serve directly
	const fullPath = getUploadPath(filePath);
	
	// Datei-Informationen abrufen
	const fileInfo = getFileInfo(fullPath);
	
	if (!fileInfo) {
		logger.info({ filePath }, 'Datei nicht gefunden');
		throw error(404, 'Datei nicht gefunden');
	}

	// Nur erlaubte Dateitypen servieren
	if (!fileInfo.isAllowed) {
		logger.warn({ filePath, mimeType: fileInfo.mimeType }, 'Nicht erlaubter Dateityp angefordert');
		throw error(403, 'Dateityp nicht erlaubt');
	}

	logger.debug({ filePath, size: fileInfo.size, mimeType: fileInfo.mimeType }, 'Upload-Datei serviert');

	// Datei-Stream erstellen
	const stream = createReadStream(fullPath);
	
	// Node.js ReadStream in Web ReadableStream konvertieren
	const readableStream = new ReadableStream({
		start(controller) {
			stream.on('data', (chunk: Buffer | string) => {
				if (Buffer.isBuffer(chunk)) {
					controller.enqueue(new Uint8Array(chunk));
				} else {
					controller.enqueue(new TextEncoder().encode(chunk));
				}
			});
			stream.on('end', () => controller.close());
			stream.on('error', (err) => controller.error(err));
		}
	});
	
	// Response mit Security-Headers
	return new Response(readableStream, {
		status: 200,
		headers: {
			'Content-Type': fileInfo.mimeType,
			'Cache-Control': 'public, max-age=86400', // 1 Tag Cache
			'Content-Length': fileInfo.size.toString(),
			'Last-Modified': fileInfo.lastModified.toUTCString(),
			// Security Headers
			'X-Content-Type-Options': 'nosniff',
			'Content-Security-Policy': "default-src 'none'",
			'X-Frame-Options': 'DENY',
			// CORS für lokale Entwicklung
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};