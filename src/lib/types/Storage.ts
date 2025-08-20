/**
 * Storage provider interfaces
 */

import type { FileMetadata, UploadedFileInfo, UploadOptions } from './UploadedFile';

export interface StorageProvider {
	/**
	 * Upload a file to storage
	 */
	upload(file: File, data: Buffer, options: UploadOptions): Promise<UploadedFileInfo>;

	/**
	 * Delete a file from storage
	 */
	delete(filePath: string): Promise<void>;

	/**
	 * Get public URL for a file
	 */
	getUrl(filePath: string): string;

	/**
	 * Get file metadata
	 */
	getMetadata(filePath: string): Promise<FileMetadata | null>;

	/**
	 * List files in a directory
	 */
	list(prefix?: string): Promise<UploadedFileInfo[]>;

	/**
	 * Check if file exists
	 */
	exists(filePath: string): Promise<boolean>;

	/**
	 * Get file content as Buffer for secure serving
	 */
	getFileContent(filePath: string): Promise<Buffer | null>;
}

export type StorageProviderType = 'local' | 'vercel-blob' | 's3' | 'gcs';
