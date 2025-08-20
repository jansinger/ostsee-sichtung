import type { UploadedFileInfo } from '$lib/types';
import { deleteFileDirect } from '$lib/utils/uploadUtils';

/**
 * Deletes multiple files from server
 */
export async function deleteMultipleFiles(uploadedFiles: UploadedFileInfo[]): Promise<void> {
	const deletePromises = uploadedFiles.map((fileInfo) => deleteFileDirect(fileInfo.filePath));

	await Promise.allSettled(deletePromises);
}
