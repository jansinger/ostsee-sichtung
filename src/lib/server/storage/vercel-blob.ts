/**
 * Vercel Blob storage provider
 */
import { put, del, head, list } from '@vercel/blob';
import { createId } from '@paralleldrive/cuid2';
import { extname, basename } from 'path';
import { createLogger } from '$lib/logger';
import { readImageExifData } from '$lib/server/exifUtils';
import type { StorageProvider, UploadedFile, UploadOptions, FileMetadata } from './types';
import type { ExifDataRaw } from '$lib/types/types';

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
			// For EXIF extraction, process the file buffer BEFORE upload
			let exifData: ExifDataRaw | null = null;
			let fileBuffer: ArrayBuffer | null = null;
			
			if (options.extractExif && file.type.startsWith('image/')) {
				try {
					logger.debug({ filePath, fileType: file.type, fileSize: file.size }, 'Extracting EXIF data for Vercel Blob upload');
					
					// Get file as array buffer for EXIF processing
					fileBuffer = await file.arrayBuffer();
					const buffer = Buffer.from(fileBuffer);
					
					logger.debug({ filePath, bufferSize: buffer.length }, 'Buffer created for EXIF extraction');
					
					// Extract EXIF data directly from buffer
					exifData = await readImageExifData(buffer);
					
					logger.debug({ 
						filePath, 
						hasExifData: !!exifData,
						hasGPS: !!(exifData?.latitude && exifData?.longitude),
						exifKeys: exifData ? Object.keys(exifData).filter(k => {
							const value = exifData![k as keyof ExifDataRaw];
							return value !== null && value !== undefined;
						}) : []
					}, 'EXIF extraction completed for Vercel Blob');
				} catch (error) {
					logger.error({ 
						error: {
							message: error instanceof Error ? error.message : String(error),
							stack: error instanceof Error ? error.stack : undefined
						}, 
						filePath, 
						fileType: file.type 
					}, 'Failed to extract EXIF data from Vercel Blob');
				}
			}

			// Upload to Vercel Blob (use buffer if we have it, otherwise original file)
			const uploadData = fileBuffer ? Buffer.from(fileBuffer) : file;
			const blob = await put(filePath, uploadData, {
				access: 'public',
				token: this.token,
				contentType: file.type
			});

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
				etag: 'etag' in metadata && typeof metadata.etag === 'string' ? metadata.etag : 'unknown'
			};
		} catch (error) {
			logger.warn({ error, filePath }, 'Failed to get metadata from Vercel Blob');
			return null;
		}
	}

	async list(prefix?: string): Promise<UploadedFile[]> {
		try {
			const listOptions: { token: string; prefix?: string } = { token: this.token };
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
				mimeType: 'contentType' in blob ? (blob as { contentType: string }).contentType : 'application/octet-stream',
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