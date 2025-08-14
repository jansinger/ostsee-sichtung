/**
 * Client-side Download Utilities
 * Diese Funktionen triggern Downloads von server-generierten Daten
 */

export type ExportFormat = 'csv' | 'json' | 'kml' | 'xml';

/**
 * Triggert einen Download für server-generierte Export-Daten
 */
export function downloadFromServer(
	data: string, 
	filename: string, 
	mimeType: string
): void {
	const blob = new Blob([data], { type: `${mimeType};charset=utf-8;` });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Cleanup
	URL.revokeObjectURL(url);
}

/**
 * Format-spezifische Download-Funktionen
 */
export const downloadHandlers = {
	csv: (data: string, filename = 'sichtungen-export.csv') => 
		downloadFromServer(data, filename, 'text/csv'),
	
	json: (data: string, filename = 'sichtungen-export.json') => 
		downloadFromServer(data, filename, 'application/json'),
	
	kml: (data: string, filename = 'sichtungen-export.kml') => 
		downloadFromServer(data, filename, 'application/vnd.google-earth.kml+xml'),
	
	xml: (data: string, filename = 'sichtungen-export.xml') => 
		downloadFromServer(data, filename, 'application/xml')
};

/**
 * Erstellt einen Dateinamen mit Datums-Bereich für Export
 */
export function createTimestampedFilename(fromDate: string, toDate: string, extension: string): string;
export function createTimestampedFilename(baseName: string, extension: string): string;
export function createTimestampedFilename(arg1: string, arg2: string, arg3?: string): string {
	if (arg3) {
		// Überladung mit Datumsbereich: createTimestampedFilename(fromDate, toDate, extension)
		const fromDate = arg1;
		const toDate = arg2;
		const extension = arg3;
		
		const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
		const dateRange = fromDate === toDate ? fromDate : `${fromDate}_bis_${toDate}`;
		
		return `sichtungen-export_${dateRange}_erstellt-${timestamp}.${extension}`;
	} else {
		// Standard-Überladung: createTimestampedFilename(baseName, extension)
		const baseName = arg1;
		const extension = arg2;
		const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
		return `${baseName}_${timestamp}.${extension}`;
	}
}