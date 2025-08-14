import { createLogger } from '$lib/logger';
import type { UploadedFileInfo } from '$lib/types';

const logger = createLogger('UploadUtils');

/**
 * Direkter Upload einer Datei ohne MediaStore-Abhängigkeit
 */
export async function uploadFileDirect(file: File, referenceId: string): Promise<UploadedFileInfo> {
	logger.info({ fileName: file.name, referenceId }, 'Starting direct upload');

	if (!referenceId) {
		throw new Error('Reference ID ist erforderlich für Upload');
	}

	const formData = new FormData();
	formData.append('file', file);
	formData.append('referenceId', referenceId);

	const response = await fetch('/api/files/upload', {
		method: 'POST',
		body: formData
	});

	logger.info(
		{
			fileName: file.name,
			status: response.status,
			ok: response.ok
		},
		'Upload response received'
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		logger.error({ errorData, status: response.status }, 'Upload failed');
		throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
	}

	const result = await response.json();
	logger.info({ fileName: file.name, result }, 'Upload completed successfully');
	return result;
}

/**
 * Direktes Löschen einer Datei vom Server
 */
export async function deleteFileDirect(filePath: string): Promise<void> {
	logger.info({ filePath }, 'Starting direct delete');

	const response = await fetch('/api/files/delete', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ filePath })
	});

	logger.info(
		{
			filePath,
			status: response.status,
			ok: response.ok
		},
		'Delete response received'
	);

	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		logger.error({ errorData, status: response.status }, 'Delete failed');
		throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
	}

	const result = await response.json();
	logger.info({ filePath, result }, 'Delete completed successfully');
	return result;
}
