import { createLogger } from '$lib/logger';
import { existsSync, statSync } from 'fs';
import path from 'path';

const logger = createLogger('server:uploads');

// Sichere Pfad-Validierung
export function isValidUploadPath(filePath: string): boolean {
	// Verhindere Directory Traversal Angriffe
	const normalizedPath = path.normalize(filePath);
	const isValid = !normalizedPath.includes('..') && !path.isAbsolute(normalizedPath);

	if (!isValid) {
		logger.warn({ filePath, normalizedPath }, 'Ungültiger Upload-Pfad blockiert');
	}

	return isValid;
}

// Erlaube nur bestimmte Dateitypen
// MIME-Type Mapping basierend auf Datei-Endungen
const MIME_TYPE_MAP = {
	// Bilder
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.bmp': 'image/bmp',
	'.svg': 'image/svg+xml',
	// Videos
	'.mp4': 'video/mp4',
	'.mov': 'video/quicktime',
	'.avi': 'video/x-msvideo',
	'.webm': 'video/webm',
	'.mkv': 'video/x-matroska',
	'.wmv': 'video/x-ms-wmv',
	// Dokumente
	'.pdf': 'application/pdf',
	'.txt': 'text/plain',
	'.csv': 'text/csv'
} as const;

export const ALLOWED_UPLOAD_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/bmp',
	'video/mp4',
	'video/quicktime',
	'video/x-msvideo',
	'video/webm',
	'application/pdf'
] as const;

export function getMimeTypeFromExtension(filePath: string): string {
	const ext = path.extname(filePath).toLowerCase() as keyof typeof MIME_TYPE_MAP;
	return MIME_TYPE_MAP[ext] || 'application/octet-stream';
}

export function isAllowedMimeType(mimeType: string): boolean {
	return ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as typeof ALLOWED_UPLOAD_MIME_TYPES[number]);
}

export function getUploadPath(filePath: string): string {
	return path.join(process.cwd(), 'uploads', filePath);
}

export function getFileInfo(fullPath: string) {
	if (!existsSync(fullPath)) {
		return null;
	}

	const stats = statSync(fullPath);
	if (!stats.isFile()) {
		return null;
	}

	const mimeType = getMimeTypeFromExtension(fullPath);

	return {
		size: stats.size,
		mimeType,
		lastModified: stats.mtime,
		isAllowed: isAllowedMimeType(mimeType)
	};
}
