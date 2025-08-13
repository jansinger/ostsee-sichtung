/**
 * Shared utility for file size formatting
 * Consolidates multiple implementations across the codebase
 */

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "324 KB")
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Formats file size with German locale formatting
 * @param bytes - File size in bytes
 * @returns Formatted string with German decimal separator
 */
export function formatFileSizeDE(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	const value = bytes / Math.pow(k, i);
	return value.toLocaleString('de-DE', { 
		minimumFractionDigits: 0,
		maximumFractionDigits: 2 
	}) + ' ' + sizes[i];
}

/**
 * Converts file size string back to bytes
 * @param sizeString - Formatted size string (e.g., "1.5 MB")
 * @returns Size in bytes
 */
export function parseFileSize(sizeString: string): number {
	const units: Record<string, number> = {
		'bytes': 1,
		'kb': 1024,
		'mb': 1024 * 1024,
		'gb': 1024 * 1024 * 1024,
		'tb': 1024 * 1024 * 1024 * 1024
	};
	
	const match = sizeString.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b)$/);
	if (!match) return 0;
	
	const [, valueStr, unit] = match;
	if (!valueStr || !unit) return 0;
	
	const value = parseFloat(valueStr);
	const multiplier = units[unit] || 1;
	
	return value * multiplier;
}