import {
	analyzeClientFile,
	convertServerExifToClient,
	type ClientFileMetadata
} from '$lib/utils/client/fileAnalysis';
import { uploadResultToFormData, type UploadFileData } from '$lib/utils/uploadHelpers';
import { deleteFileDirect, uploadFileDirect } from '$lib/utils/uploadUtils';

export interface FileProcessingOptions {
	referenceId: string;
	onFileUploaded?: (file: File, uploadData: UploadFileData, metadata: ClientFileMetadata) => void;
	onFileProcessingError?: (file: File, error: Error) => void;
	onSuccess?: (message: string) => void;
	onError?: (message: string) => void;
}

/**
 * Analyzes files and extracts client-side metadata
 */
export async function analyzeFiles(files: File[]): Promise<ClientFileMetadata[]> {
	const analyses = await Promise.all(files.map((file) => analyzeClientFile(file)));
	return analyses;
}

/**
 * Uploads files to server and processes EXIF data
 */
export async function uploadFiles(
	files: File[],
	options: FileProcessingOptions
): Promise<Map<string, UploadFileData>> {
	const { referenceId, onFileUploaded, onFileProcessingError, onSuccess, onError } = options;
	const uploadedFiles = new Map<string, UploadFileData>();
	
	
	if (!referenceId) {
		throw new Error('Reference ID is required for file upload');
	}

	try {
		// Upload each file
		for (const file of files) {
			try {
				const uploadResult = await uploadFileDirect(file, referenceId);
				const uploadData = uploadResultToFormData(uploadResult);
				uploadedFiles.set(file.name, uploadData);

				// Create updated metadata with server EXIF data (always create, even without EXIF)
				const serverExif = uploadResult.exifData 
					? convertServerExifToClient(uploadResult.exifData)
					: { latitude: null, longitude: null, altitude: null, timestamp: null };
					
				const updatedMetadata: ClientFileMetadata = {
					name: file.name,
					size: file.size,
					type: file.type,
					lastModified: new Date(file.lastModified),
					thumbnail: `/uploads/${uploadResult.filePath}`,
					exif: serverExif
				};

				// Notify about successful upload (always call callback)
				if (onFileUploaded) {
					onFileUploaded(file, uploadData, updatedMetadata);
				}

			} catch (uploadError) {
				if (onFileProcessingError) {
					onFileProcessingError(file, uploadError as Error);
				}
				throw uploadError;
			}
		}

		// Success notification
		const filesWithGPS = Array.from(uploadedFiles.values()).filter(
			(fileData) => fileData.filePath
		).length;

		const successMessage = filesWithGPS > 0
			? `${files.length} Datei(en) hochgeladen! GPS-Daten wurden extrahiert.`
			: `${files.length} Datei(en) erfolgreich hochgeladen!`;

		if (onSuccess) {
			onSuccess(successMessage);
		}

		return uploadedFiles;
	} catch (error) {
		const errorMessage = getUploadErrorMessage(error as Error);
		if (onError) {
			onError(errorMessage);
		}
		throw error;
	}
}

/**
 * Deletes a file from server and cleans up references
 */
export async function deleteFile(filePath: string, _fileName?: string): Promise<void> {
	await deleteFileDirect(filePath);
}

/**
 * Deletes multiple files from server
 */
export async function deleteMultipleFiles(
	uploadedFiles: Map<string, UploadFileData>
): Promise<void> {
	const deletePromises = Array.from(uploadedFiles.values()).map(async (fileInfo) => {
		try {
			await deleteFile(fileInfo.filePath, fileInfo.originalName);
		} catch (_deleteError) {
			// Non-blocking - other files should still be deleted
		}
	});

	await Promise.allSettled(deletePromises);
}

/**
 * Gets user-friendly error message from upload error
 */
export function getUploadErrorMessage(error: Error): string {
	const errorMessage = error.message;
	
	if (
		errorMessage.includes('Ungültiger MIME-Type') ||
		errorMessage.includes('Nur Bild- und Videoformate')
	) {
		return 'Ungültiges Dateiformat. Nur Bilder und Videos sind erlaubt.';
	} else if (errorMessage.includes('zu groß') || errorMessage.includes('Maximum')) {
		return 'Datei zu groß. Maximum: 100MB pro Datei.';
	} else if (errorMessage.includes('leer')) {
		return 'Leere Dateien können nicht hochgeladen werden.';
	} else {
		return 'Fehler beim Hochladen der Dateien. Versuchen Sie es erneut.';
	}
}

/**
 * Handles common file processing workflow: analyze + upload
 */
export async function processFilesComplete(
	files: File[],
	options: FileProcessingOptions
): Promise<{
	uploadedFiles: Map<string, UploadFileData>;
	metadata: ClientFileMetadata[];
}> {
	if (files.length === 0) {
		return { uploadedFiles: new Map(), metadata: [] };
	}

	// Step 1: Analyze files
	const metadata = await analyzeFiles(files);

	// Step 2: Upload files
	const uploadedFiles = await uploadFiles(files, options);

	return { uploadedFiles, metadata };
}