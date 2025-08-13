/**
 * Shared utilities for file type detection and validation
 * Consolidates multiple implementations across the codebase
 */

/**
 * Checks if a file or mime type represents an image
 * @param fileOrMimeType - File object or mime type string
 * @returns True if the file is an image
 */
export function isImageFile(fileOrMimeType: File | string): boolean {
	const mimeType = typeof fileOrMimeType === 'string' 
		? fileOrMimeType 
		: fileOrMimeType.type;
	
	return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
}

/**
 * Checks if a file or mime type represents a video
 * @param fileOrMimeType - File object or mime type string
 * @returns True if the file is a video
 */
export function isVideoFile(fileOrMimeType: File | string): boolean {
	const mimeType = typeof fileOrMimeType === 'string' 
		? fileOrMimeType 
		: fileOrMimeType.type;
	
	return mimeType.startsWith('video/');
}

/**
 * Checks if a file or mime type represents a supported media file
 * @param fileOrMimeType - File object or mime type string
 * @returns True if the file is a supported media file
 */
export function isMediaFile(fileOrMimeType: File | string): boolean {
	return isImageFile(fileOrMimeType) || isVideoFile(fileOrMimeType);
}

/**
 * Gets an appropriate emoji icon for a file type
 * @param mimeType - The file's mime type
 * @returns Emoji string representing the file type
 */
export function getFileIcon(mimeType: string): string {
	if (isImageFile(mimeType)) return '🖼️';
	if (isVideoFile(mimeType)) return '🎥';
	if (mimeType.includes('pdf')) return '📄';
	if (mimeType.includes('audio')) return '🎵';
	if (mimeType.includes('text')) return '📝';
	if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
	return '📄';
}

/**
 * Gets file extension from filename or mime type
 * @param fileNameOrMimeType - File name or mime type
 * @returns File extension with dot (e.g., '.jpg')
 */
export function getFileExtension(fileNameOrMimeType: string): string {
	// If it looks like a mime type
	if (fileNameOrMimeType.includes('/')) {
		const extensionMap: Record<string, string> = {
			'image/jpeg': '.jpg',
			'image/png': '.png',
			'image/gif': '.gif',
			'image/webp': '.webp',
			'image/bmp': '.bmp',
			'video/mp4': '.mp4',
			'video/webm': '.webm',
			'video/avi': '.avi',
			'video/mov': '.mov',
			'application/pdf': '.pdf'
		};
		return extensionMap[fileNameOrMimeType] || '';
	}
	
	// If it's a filename
	const lastDot = fileNameOrMimeType.lastIndexOf('.');
	return lastDot !== -1 ? fileNameOrMimeType.substring(lastDot) : '';
}

/**
 * Gets mime type from file extension
 * @param extension - File extension (with or without dot)
 * @returns Mime type string
 */
export function getMimeTypeFromExtension(extension: string): string {
	const ext = extension.startsWith('.') ? extension : `.${extension}`;
	
	const mimeTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.bmp': 'image/bmp',
		'.svg': 'image/svg+xml',
		'.mp4': 'video/mp4',
		'.webm': 'video/webm',
		'.avi': 'video/avi',
		'.mov': 'video/mov',
		'.wmv': 'video/wmv',
		'.flv': 'video/flv',
		'.mkv': 'video/mkv',
		'.m4v': 'video/m4v',
		'.pdf': 'application/pdf'
	};
	
	return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}