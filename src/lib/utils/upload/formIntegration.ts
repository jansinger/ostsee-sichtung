import type { UploadFileData } from '$lib/utils/uploadHelpers';
import { SvelteMap } from 'svelte/reactivity';

export interface FormUpdateOptions {
	handleChange: (event: Event) => void;
}

/**
 * Creates a reactive map for tracking uploaded files and syncs with form
 */
export function createUploadedFilesMap(
	initialFiles: UploadFileData[] = [],
	_options: FormUpdateOptions
): SvelteMap<string, UploadFileData> {
	const uploadedFiles = new SvelteMap<string, UploadFileData>();

	// Initialize from existing form data
	if (initialFiles.length > 0) {
		initialFiles.forEach((fileInfo) => {
			uploadedFiles.set(fileInfo.originalName, fileInfo);
		});
	}

	return uploadedFiles;
}

/**
 * Creates an effect to sync uploaded files map with form data
 */
export function createFormSyncEffect(
	uploadedFiles: SvelteMap<string, UploadFileData>,
	options: FormUpdateOptions
): () => void {
	return () => {
		const filesArray = Array.from(uploadedFiles.values());
		options.handleChange({
			target: {
				name: 'uploadedFiles',
				value: filesArray
			}
		} as unknown as Event);
	};
}

/**
 * Updates uploaded files map and triggers form sync
 */
export function updateUploadedFiles(
	uploadedFiles: SvelteMap<string, UploadFileData>,
	newFiles: Map<string, UploadFileData>
): void {
	newFiles.forEach((fileData, fileName) => {
		uploadedFiles.set(fileName, fileData);
	});
}

/**
 * Removes a file from uploaded files map
 */
export function removeUploadedFile(
	uploadedFiles: SvelteMap<string, UploadFileData>,
	fileName: string
): boolean {
	return uploadedFiles.delete(fileName);
}

/**
 * Clears all uploaded files from map
 */
export function clearUploadedFiles(uploadedFiles: SvelteMap<string, UploadFileData>): void {
	uploadedFiles.clear();
}

/**
 * Gets upload data for a specific file
 */
export function getUploadedFile(
	uploadedFiles: SvelteMap<string, UploadFileData>,
	fileName: string
): UploadFileData | undefined {
	return uploadedFiles.get(fileName);
}

/**
 * Checks if a file has been uploaded
 */
export function isFileUploaded(
	uploadedFiles: SvelteMap<string, UploadFileData>,
	fileName: string
): boolean {
	return uploadedFiles.has(fileName);
}

/**
 * Gets count of uploaded files
 */
export function getUploadedFileCount(uploadedFiles: SvelteMap<string, UploadFileData>): number {
	return uploadedFiles.size;
}

/**
 * Gets all uploaded file paths
 */
export function getUploadedFilePaths(uploadedFiles: SvelteMap<string, UploadFileData>): string[] {
	return Array.from(uploadedFiles.values()).map((file) => file.filePath);
}