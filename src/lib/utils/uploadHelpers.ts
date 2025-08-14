import type { UploadedFileInfo } from '$lib/types';

/**
 * Upload file data interface that matches the server response
 */
export interface UploadFileData {
	filePath: string;
	originalName: string;
	fileName?: string;
	mimeType: string;
	size: number;
	url?: string;
	uploadedAt?: string;
	exifData?: unknown;
}

/**
 * Convert server upload response to form-compatible upload data
 */
export function uploadResultToFormData(uploadResult: UploadedFileInfo): UploadFileData {
	return {
		filePath: uploadResult.filePath,
		originalName: uploadResult.originalName,
		fileName: uploadResult.fileName,
		mimeType: uploadResult.mimeType,
		size: uploadResult.size,
		url: uploadResult.url,
		uploadedAt: uploadResult.uploadedAt,
		exifData: uploadResult.exifData
	};
}

/**
 * Convert form data to upload file data, handling undefined values
 */
export function formDataToUploadData(fileInfo: Record<string, unknown>): UploadFileData {
	const data: UploadFileData = {
		filePath: fileInfo.filePath as string,
		originalName: fileInfo.originalName as string,
		mimeType: fileInfo.mimeType as string,
		size: fileInfo.size as number
	};

	// Only add optional fields if they have values
	if (fileInfo.fileName !== undefined) data.fileName = fileInfo.fileName as string;
	if (fileInfo.url !== undefined) data.url = fileInfo.url as string;
	if (fileInfo.uploadedAt !== undefined) data.uploadedAt = fileInfo.uploadedAt as string;
	if (fileInfo.exifData !== undefined) data.exifData = fileInfo.exifData;

	return data;
}

/**
 * Create a safe upload data object that handles undefined values
 */
export function createUploadData(params: {
	filePath: string;
	originalName: string;
	mimeType: string;
	size: number;
	fileName?: string;
	url?: string;
	uploadedAt?: string;
	exifData?: unknown;
}): UploadFileData {
	const data: UploadFileData = {
		filePath: params.filePath,
		originalName: params.originalName,
		mimeType: params.mimeType,
		size: params.size
	};

	if (params.fileName !== undefined) data.fileName = params.fileName;
	if (params.url !== undefined) data.url = params.url;
	if (params.uploadedAt !== undefined) data.uploadedAt = params.uploadedAt;
	if (params.exifData !== undefined) data.exifData = params.exifData;

	return data;
}
