/**
 * Vercel Blob storage provider
 */
import { createLogger } from '$lib/logger';
import type { FileMetadata, StorageProvider, UploadedFileInfo, UploadOptions } from '$lib/types';
import { createId } from '@paralleldrive/cuid2';
import { del, head, list, put } from '@vercel/blob';
import { basename, extname } from 'path';

const logger = createLogger('storage:vercel-blob');

export class VercelBlobStorageProvider implements StorageProvider {
	private token: string;

	constructor(token?: string) {
		this.token = token || process.env.BLOB_READ_WRITE_TOKEN || '';
		if (!this.token) {
			throw new Error(
				'BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob storage'
			);
		}
	}

	async upload(file: File, buffer: Buffer, options: UploadOptions): Promise<UploadedFileInfo> {
		const uid = createId();
		const extension = extname(file.name);
		const fileName = options.preserveOriginalName
			? `${basename(file.name, extension)}-${uid}${extension}`
			: `${uid}${extension}`;

		const filePath = `${options.referenceId}/${fileName}`;

		try {
			const blob = await put(filePath, buffer, {
				access: 'public',
				token: this.token,
				contentType: file.type
			});

			const uploadedFile: UploadedFileInfo = {
				uid,
				originalName: file.name,
				fileName,
				filePath,
				size: file.size,
				mimeType: file.type,
				url: blob.url,
				uploadedAt: new Date().toISOString()
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

	async list(prefix?: string): Promise<UploadedFileInfo[]> {
		try {
			const listOptions: { token: string; prefix?: string } = { token: this.token };
			if (prefix) {
				listOptions.prefix = prefix;
			}
			const result = await list(listOptions);

			return result.blobs.map((blob) => ({
				uid: this.extractUidFromPathname(blob.pathname),
				originalName: basename(blob.pathname),
				fileName: basename(blob.pathname),
				filePath: blob.pathname,
				size: blob.size,
				mimeType:
					'contentType' in blob
						? (blob as { contentType: string }).contentType
						: 'application/octet-stream',
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

	async getFileContent(filePath: string): Promise<Buffer | null> {
		try {
			// Get the URL for the file and fetch it
			const response = await fetch(this.getUrl(filePath));

			if (!response.ok) {
				logger.warn(
					{ filePath, status: response.status },
					'File not found for content retrieval from Vercel Blob'
				);
				return null;
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			logger.debug({ filePath, size: buffer.length }, 'File content retrieved from Vercel Blob');
			return buffer;
		} catch (error) {
			logger.error({ error, filePath }, 'Failed to get file content from Vercel Blob');
			return null;
		}
	}

	private extractUidFromPathname(pathname: string): string {
		// Extract UID from filename pattern: referenceId/filename-UID.ext
		const filename = basename(pathname);
		const parts = filename.split('-');
		if (parts.length > 1) {
			const uidWithExt = parts[parts.length - 1];
			if (uidWithExt) {
				return uidWithExt.split('.')[0] || 'unknown';
			}
		}
		return filename.split('.')[0] || 'unknown';
	}
}
