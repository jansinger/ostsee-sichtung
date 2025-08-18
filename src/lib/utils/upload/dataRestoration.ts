import { mediaStore, type MediaFile } from '$lib/stores/mediaStore';
import type { ClientFileMetadata } from '$lib/utils/client/fileAnalysis';
import type { UploadFileData } from '$lib/utils/uploadHelpers';

export interface RestorationOptions {
	/** Filter uploaded files before restoration */
	fileFilter?: (fileInfo: UploadFileData) => boolean;
	/** Transform file info to metadata */
	metadataTransformer?: (fileInfo: UploadFileData, formData?: any) => ClientFileMetadata;
	/** Mark files as from position step */
	isFromPositionStep?: boolean;
	/** Maximum number of files to restore */
	maxFiles?: number;
	/** Current media files to check for duplicates */
	existingFiles?: MediaFile[];
}

export interface RestorationResult {
	restoredCount: number;
	skippedCount: number;
	errorCount: number;
	restoredFiles: MediaFile[];
}

/**
 * Default metadata transformer that creates basic metadata from upload file info
 */
export function createDefaultMetadata(
	fileInfo: UploadFileData, 
	_formData?: any
): ClientFileMetadata {
	return {
		name: fileInfo.originalName,
		size: fileInfo.size,
		type: fileInfo.mimeType,
		lastModified: new Date(),
		thumbnail: `/uploads/${fileInfo.filePath}`,
		exif: {
			latitude: null,
			longitude: null,
			altitude: null,
			timestamp: null
		}
	};
}

/**
 * Position-specific metadata transformer that includes GPS data from form
 */
export function createPositionMetadata(
	fileInfo: UploadFileData, 
	formData?: any
): ClientFileMetadata {
	const baseMetadata = createDefaultMetadata(fileInfo, formData);
	
	// Add GPS data from form if available
	if (formData) {
		baseMetadata.exif = {
			latitude: formData.latitude ? parseFloat(formData.latitude.toString()) : null,
			longitude: formData.longitude ? parseFloat(formData.longitude.toString()) : null,
			altitude: null,
			timestamp: formData.sightingDate
				? new Date(formData.sightingDate + 'T' + (formData.sightingTime || '12:00'))
				: null
		};
	}
	
	return baseMetadata;
}

/**
 * Restores uploaded files from form data to media store
 */
export function restoreFilesFromFormData(
	uploadedFiles: UploadFileData[],
	options: RestorationOptions = {},
	formData?: any
): RestorationResult {
	const {
		fileFilter,
		metadataTransformer = createDefaultMetadata,
		isFromPositionStep = false,
		maxFiles,
		existingFiles = []
	} = options;


	// Filter files if filter provided
	let filesToRestore = fileFilter ? uploadedFiles.filter(fileFilter) : uploadedFiles;

	// Check for existing files to avoid duplicates
	const existingFileNames = existingFiles.map((mf) => mf.metadata.name);
	filesToRestore = filesToRestore.filter(
		(fileInfo) => !existingFileNames.includes(fileInfo.originalName)
	);

	// Apply max files limit
	if (maxFiles && filesToRestore.length > maxFiles) {
		filesToRestore = filesToRestore.slice(0, maxFiles);
	}

	const result: RestorationResult = {
		restoredCount: 0,
		skippedCount: uploadedFiles.length - filesToRestore.length,
		errorCount: 0,
		restoredFiles: []
	};

	if (filesToRestore.length === 0) {
		return result;
	}

	// Convert uploaded files back to MediaFile format
	const restoredMediaFiles: MediaFile[] = [];

	for (const fileInfo of filesToRestore) {
		try {
			// Create mock File object for display
			const mockFile = new File([''], fileInfo.originalName, { 
				type: fileInfo.mimeType 
			});

			// Create metadata using provided transformer
			const metadata = metadataTransformer(fileInfo, formData);

			restoredMediaFiles.push({
				file: mockFile,
				metadata,
				isFromPositionStep
			});

			result.restoredCount++;
		} catch (_error) {
			result.errorCount++;
		}
	}

	// Add restored files to media store
	if (restoredMediaFiles.length > 0) {
		const filesToAdd = restoredMediaFiles.map((mf) => ({ 
			file: mf.file, 
			metadata: mf.metadata 
		}));

		if (isFromPositionStep) {
			// For position files, use special method
			filesToAdd.forEach((fileData) => {
				mediaStore.addFromPositionStep(fileData.file, fileData.metadata);
			});
		} else {
			// For regular media files
			mediaStore.addFiles(filesToAdd);
		}

		result.restoredFiles = restoredMediaFiles;
	}

	return result;
}

/**
 * Convenience function for restoring position files (single image with GPS)
 */
export function restorePositionFiles(
	uploadedFiles: UploadFileData[],
	formData: any,
	existingFiles: MediaFile[] = []
): RestorationResult {
	return restoreFilesFromFormData(uploadedFiles, {
		fileFilter: (fileInfo) => 
			fileInfo.mimeType?.startsWith('image/') && 
			!!fileInfo.filePath && 
			!!fileInfo.originalName,
		metadataTransformer: createPositionMetadata,
		isFromPositionStep: true,
		maxFiles: 1,
		existingFiles
	}, formData);
}

/**
 * Convenience function for restoring media files (multiple files, no GPS)
 */
export function restoreMediaFiles(
	uploadedFiles: UploadFileData[],
	existingFiles: MediaFile[] = []
): RestorationResult {
	return restoreFilesFromFormData(uploadedFiles, {
		fileFilter: (fileInfo) => !!fileInfo.filePath && !!fileInfo.originalName,
		metadataTransformer: createDefaultMetadata,
		isFromPositionStep: false,
		existingFiles
	});
}

/**
 * Check if restoration is needed based on form data and current media store state
 */
export function shouldRestore(
	uploadedFiles: UploadFileData[] | undefined,
	existingFiles: MediaFile[],
	isFromPositionStep?: boolean
): boolean {
	if (!uploadedFiles || !Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
		return false;
	}

	// Filter files based on context
	let relevantUploadedFiles = uploadedFiles;
	if (isFromPositionStep !== undefined) {
		relevantUploadedFiles = uploadedFiles.filter((fileInfo) => {
			if (isFromPositionStep) {
				// For position step, only images
				return fileInfo.mimeType?.startsWith('image/');
			} else {
				// For media step, all files except those already from position
				return true; // We'll handle duplicates in restoration
			}
		});
	}

	// Check if we need to restore files
	const existingFileNames = existingFiles.map((mf) => mf.metadata.name);
	const filesToRestore = relevantUploadedFiles.filter(
		(fileInfo) => !existingFileNames.includes(fileInfo.originalName)
	);

	return filesToRestore.length > 0;
}