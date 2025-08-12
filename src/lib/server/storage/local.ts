/**
 * Local filesystem storage provider
 */
import { writeFileSync, unlinkSync, existsSync, statSync, readdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { createId } from '@paralleldrive/cuid2';
import { createLogger } from '$lib/logger';
import { readImageExifData } from '$lib/server/exifUtils';
import type { StorageProvider, UploadedFile, UploadOptions, FileMetadata } from './types';

const logger = createLogger('storage:local');

export class LocalStorageProvider implements StorageProvider {
	private baseDir: string;
	private publicUrlBase: string;

	constructor(baseDir: string = 'uploads', publicUrlBase: string = '/uploads') {
		this.baseDir = baseDir;
		this.publicUrlBase = publicUrlBase;
	}

	async upload(file: File, options: UploadOptions): Promise<UploadedFile> {
		const id = createId();
		const extension = extname(file.name);
		const fileName = options.preserveOriginalName 
			? `${basename(file.name, extension)}-${id}${extension}`
			: `${id}${extension}`;
		
		const relativePath = join(options.referenceId, fileName);
		const fullPath = join(this.baseDir, relativePath);
		const dir = join(this.baseDir, options.referenceId);

		// Ensure directory exists
		if (!existsSync(dir)) {
			await import('fs').then(fs => fs.mkdirSync(dir, { recursive: true }));
		}

		// Convert File to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Write file
		writeFileSync(fullPath, buffer);

		// Extract EXIF data if requested and it's an image
		let exifData = null;
		if (options.extractExif && file.type.startsWith('image/')) {
			try {
				exifData = await readImageExifData(fullPath);
			} catch (error) {
				logger.warn({ error, filePath: fullPath }, 'Failed to extract EXIF data');
			}
		}

		const uploadedFile: UploadedFile = {
			id,
			originalName: file.name,
			fileName,
			filePath: relativePath,
			size: file.size,
			mimeType: file.type,
			url: this.getUrl(relativePath),
			uploadedAt: new Date().toISOString(),
			exifData
		};

		logger.debug({ uploadedFile }, 'File uploaded to local storage');
		return uploadedFile;
	}

	async delete(filePath: string): Promise<void> {
		const fullPath = join(this.baseDir, filePath);
		
		if (existsSync(fullPath)) {
			unlinkSync(fullPath);
			logger.debug({ filePath }, 'File deleted from local storage');
		} else {
			logger.warn({ filePath }, 'File not found for deletion');
		}
	}

	getUrl(filePath: string): string {
		return `${this.publicUrlBase}/${filePath}`;
	}

	async getMetadata(filePath: string): Promise<FileMetadata | null> {
		const fullPath = join(this.baseDir, filePath);
		
		if (!existsSync(fullPath)) {
			return null;
		}

		const stats = statSync(fullPath);
		
		return {
			size: stats.size,
			mimeType: this.getMimeTypeFromExtension(extname(filePath)),
			lastModified: stats.mtime
		};
	}

	async list(prefix?: string): Promise<UploadedFile[]> {
		const searchDir = prefix ? join(this.baseDir, prefix) : this.baseDir;
		
		if (!existsSync(searchDir)) {
			return [];
		}

		const files: UploadedFile[] = [];
		const entries = readdirSync(searchDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isFile()) {
				const fullPath = join(searchDir, entry.name);
				const relativePath = prefix ? join(prefix, entry.name) : entry.name;
				const stats = statSync(fullPath);

				files.push({
					id: entry.name.split('.')[0] || 'unknown',
					originalName: entry.name,
					fileName: entry.name,
					filePath: relativePath,
					size: stats.size,
					mimeType: this.getMimeTypeFromExtension(extname(entry.name)),
					url: this.getUrl(relativePath),
					uploadedAt: stats.birthtime.toISOString()
				});
			}
		}

		return files;
	}

	async exists(filePath: string): Promise<boolean> {
		const fullPath = join(this.baseDir, filePath);
		return existsSync(fullPath);
	}

	private getMimeTypeFromExtension(ext: string): string {
		const mimeTypes: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp',
			'.svg': 'image/svg+xml',
			'.mp4': 'video/mp4',
			'.webm': 'video/webm',
			'.pdf': 'application/pdf',
			'.txt': 'text/plain'
		};

		return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
	}
}