/**
 * Storage factory to create the appropriate storage provider based on environment
 */
import { dev } from '$app/environment';
import { createLogger } from '$lib/logger';
import { LocalStorageProvider } from './local';
import { VercelBlobStorageProvider } from './vercel-blob';
import type { StorageProvider, StorageProviderType } from './types';

const logger = createLogger('storage:factory');

let storageProvider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
	if (storageProvider) {
		return storageProvider;
	}

	const providerType = getStorageProviderType();
	
	switch (providerType) {
		case 'local':
			storageProvider = new LocalStorageProvider('uploads', '/uploads');
			logger.info('Using local file storage');
			break;
			
		case 'vercel-blob':
			storageProvider = new VercelBlobStorageProvider();
			logger.info('Using Vercel Blob storage');
			break;
			
		case 's3':
			throw new Error('S3 storage provider not implemented yet');
			
		case 'gcs':
			throw new Error('Google Cloud Storage provider not implemented yet');
			
		default:
			throw new Error(`Unknown storage provider: ${providerType}`);
	}

	return storageProvider;
}

function getStorageProviderType(): StorageProviderType {
	// Check environment variable first
	const envProvider = process.env.STORAGE_PROVIDER as StorageProviderType;
	if (envProvider) {
		logger.debug({ provider: envProvider }, 'Storage provider from environment');
		return envProvider;
	}

	// Auto-detect based on environment
	if (process.env.VERCEL) {
		logger.debug('Detected Vercel environment, using vercel-blob');
		return 'vercel-blob';
	}

	if (dev) {
		logger.debug('Development environment, using local storage');
		return 'local';
	}

	// Default to local for other environments
	logger.debug('Unknown environment, defaulting to local storage');
	return 'local';
}

/**
 * Reset the storage provider (mainly for testing)
 */
export function resetStorageProvider(): void {
	storageProvider = null;
}

/**
 * Check if we're using cloud storage
 */
export function isCloudStorage(): boolean {
	const providerType = getStorageProviderType();
	return providerType !== 'local';
}

/**
 * Get the current storage provider type
 */
export function getCurrentStorageProvider(): StorageProviderType {
	return getStorageProviderType();
}