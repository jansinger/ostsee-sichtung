/**
 * Storage provider interfaces
 */

export interface UploadedFile {
	id: string;
	originalName: string;
	fileName: string;
	filePath: string;
	size: number;
	mimeType: string;
	url: string; // Public URL to access the file
	uploadedAt: string;
	exifData?: unknown;
}

export interface StorageProvider {
	/**
	 * Upload a file to storage
	 */
	upload(file: File, options: UploadOptions): Promise<UploadedFile>;
	
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
	list(prefix?: string): Promise<UploadedFile[]>;
	
	/**
	 * Check if file exists
	 */
	exists(filePath: string): Promise<boolean>;
}

export interface UploadOptions {
	referenceId: string;
	preserveOriginalName?: boolean;
	generateThumbnail?: boolean;
	extractExif?: boolean;
}

export interface FileMetadata {
	size: number;
	mimeType: string;
	lastModified: Date;
	etag?: string;
}

export type StorageProviderType = 'local' | 'vercel-blob' | 's3' | 'gcs';