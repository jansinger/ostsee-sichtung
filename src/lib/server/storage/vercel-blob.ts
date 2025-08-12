/**
 * Vercel Blob storage provider
 */
import { put, del, head, list } from '@vercel/blob';
import { createId } from '@paralleldrive/cuid2';
import { extname, basename } from 'path';
import { createLogger } from '$lib/logger';
import { readImageExifData } from '$lib/server/exifUtils';
import type { StorageProvider, UploadedFile, UploadOptions, FileMetadata } from './types';

const logger = createLogger('storage:vercel-blob');

export class VercelBlobStorageProvider implements StorageProvider {
	private token: string;

	constructor(token?: string) {
		this.token = token || process.env.BLOB_READ_WRITE_TOKEN || '';
		if (!this.token) {
			throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob storage');
		}
	}

	async upload(file: File, options: UploadOptions): Promise<UploadedFile> {
		const id = createId();
		const extension = extname(file.name);
		const fileName = options.preserveOriginalName 
			? `${basename(file.name, extension)}-${id}${extension}`
			: `${id}${extension}`;
		
		const filePath = `${options.referenceId}/${fileName}`;

		try {
			// Upload to Vercel Blob
			const blob = await put(filePath, file, {
				access: 'public',
				token: this.token,
				contentType: file.type
			});

			// For EXIF extraction, we need to download the file temporarily
			let exifData = null;
			if (options.extractExif && file.type.startsWith('image/')) {
				try {
					// Create temporary file from the uploaded blob
					const response = await fetch(blob.url);
					const arrayBuffer = await response.arrayBuffer();
					const buffer = Buffer.from(arrayBuffer);
					
					// Write to temporary file for EXIF processing
					const tmpFile = `/tmp/${fileName}`;
					await import('fs').then(fs => fs.writeFileSync(tmpFile, buffer));
					
					exifData = await readImageExifData(tmpFile);
					
					// Cleanup temp file
					await import('fs').then(fs => fs.unlinkSync(tmpFile));
				} catch (error) {
					logger.warn({ error, filePath }, 'Failed to extract EXIF data from Vercel Blob');
				}
			}

			const uploadedFile: UploadedFile = {
				id,
				originalName: file.name,
				fileName,
				filePath,
				size: file.size,
				mimeType: file.type,
				url: blob.url,
				uploadedAt: new Date().toISOString(),
				exifData
			};

			logger.debug({ uploadedFile, blobUrl: blob.url }, 'File uploaded to Vercel Blob');
			return uploadedFile;

		} catch (error) {
			logger.error({ error, filePath }, 'Failed to upload to Vercel Blob');
			throw error;
		}
	}

	async delete(filePath: string): Promise<void> {
		try {
			await del(filePath, { token: this.token });
			logger.debug({ filePath }, 'File deleted from Vercel Blob');
		} catch (error) {
			logger.error({ error, filePath }, 'Failed to delete from Vercel Blob');
			throw error;
		}
	}

	getUrl(filePath: string): string {
		// Vercel Blob stores files with a token-based URL pattern
		// The token is embedded in the storage configuration
		// Files are accessible via: https://[token-prefix].public.blob.vercel-storage.com/[filepath]
		
		// Extract the token prefix from the BLOB_READ_WRITE_TOKEN
		// Format: vercel_blob_rw_[prefix]_[suffix]
		const tokenParts = this.token.split('_');
		const tokenPrefix = tokenParts[3]; // The prefix part after vercel_blob_rw_
		
		// Construct the public URL
		return `https://${tokenPrefix}.public.blob.vercel-storage.com/${filePath}`;
	}

	async getMetadata(filePath: string): Promise<FileMetadata | null> {
		try {
			const metadata = await head(filePath, { token: this.token });
			
			return {
				size: metadata.size,
				mimeType: metadata.contentType || 'application/octet-stream',
				lastModified: new Date(metadata.uploadedAt),
				etag: (metadata as any).etag || 'unknown'
			};
		} catch (error) {
			logger.warn({ error, filePath }, 'Failed to get metadata from Vercel Blob');
			return null;
		}
	}

	async list(prefix?: string): Promise<UploadedFile[]> {
		try {
			const listOptions = { token: this.token } as any;
			if (prefix) {
				listOptions.prefix = prefix;
			}
			const result = await list(listOptions);

			return result.blobs.map(blob => ({
				id: this.extractIdFromPathname(blob.pathname),
				originalName: basename(blob.pathname),
				fileName: basename(blob.pathname),
				filePath: blob.pathname,
				size: blob.size,
				mimeType: (blob as any).contentType || 'application/octet-stream',
				url: blob.url,
				uploadedAt: new Date(blob.uploadedAt).toISOString()
			}));

		} catch (error) {
			logger.error({ error, prefix }, 'Failed to list files from Vercel Blob');
			return [];
		}
	}

	async exists(filePath: string): Promise<boolean> {
		try {
			await head(filePath, { token: this.token });
			return true;
		} catch (_error) {
			return false;
		}
	}

	private extractIdFromPathname(pathname: string): string {
		// Extract ID from filename pattern: referenceId/filename-ID.ext
		const filename = basename(pathname);
		const parts = filename.split('-');
		if (parts.length > 1) {
			const idWithExt = parts[parts.length - 1];
			if (idWithExt) {
				return idWithExt.split('.')[0] || 'unknown';
			}
		}
		return filename.split('.')[0] || 'unknown';
	}
}