/**
 * @fileoverview Dateigröße-Formatierungsfunktionen für Medien-Uploads
 * 
 * Dieses Modul bietet einheitliche Funktionen zur Darstellung und Verarbeitung
 * von Dateigrößen in der Ostsee-Tiere-Anwendung. Es unterstützt sowohl
 * internationale als auch deutsche Lokalisierung.
 * 
 * Konsolidiert mehrere Implementierungen aus der gesamten Codebasis in
 * einem zentralen Modul für bessere Wartbarkeit.
 * 
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

/**
 * Formatiert eine Dateigröße in Bytes zu einer menschenlesbaren Zeichenkette
 * 
 * Verwendet binäre Präfixe (1024-basiert) entsprechend der IEC-Norm,
 * was bei den meisten Betriebssystemen und Speichergeräten üblich ist.
 * 
 * @param bytes Dateigröße in Bytes (nicht-negative Zahl)
 * @returns Formatierte Zeichenkette (z.B. "1.5 MB", "324 KB")
 * 
 * @example
 * formatFileSize(1536); // "1.5 KB"
 * formatFileSize(2097152); // "2 MB"
 * formatFileSize(0); // "0 Bytes"
 */
export function formatFileSize(bytes: number): string {
	// Spezialfall: 0 Bytes
	if (bytes === 0) return '0 Bytes';
	
	// Binäre Einheiten (1024-basiert, nicht 1000)
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	
	// Bestimme die passende Einheit durch Logarithmus
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	// Berechne den Wert und formatiere mit maximal 2 Nachkommastellen
	const value = bytes / Math.pow(k, i);
	const formattedValue = parseFloat(value.toFixed(2));
	
	return formattedValue + ' ' + sizes[i];
}

/**
 * Formatiert eine Dateigröße mit deutscher Lokalisierung
 * 
 * Verwendet deutsche Zahlenformatierung mit Komma als Dezimaltrennzeichen
 * und Punkt als Tausendertrennzeichen, entsprechend der deutschen Norm.
 * 
 * @param bytes Dateigröße in Bytes
 * @returns Formatierte Zeichenkette mit deutschem Dezimaltrennzeichen
 * 
 * @example
 * formatFileSizeDE(1536); // "1,5 KB"
 * formatFileSizeDE(1234567); // "1,18 MB"
 */
export function formatFileSizeDE(bytes: number): string {
	// Spezialfall: 0 Bytes
	if (bytes === 0) return '0 Bytes';
	
	// Binäre Einheiten
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	
	// Bestimme die passende Einheit
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	// Berechne den Wert
	const value = bytes / Math.pow(k, i);
	
	// Formatiere mit deutscher Lokalisierung
	const formattedValue = value.toLocaleString('de-DE', { 
		minimumFractionDigits: 0,    // Keine unnötigen Nullen
		maximumFractionDigits: 2     // Max. 2 Nachkommastellen
	});
	
	return formattedValue + ' ' + sizes[i];
}

/**
 * Konvertiert eine Dateigröße-Zeichenkette zurück in Bytes
 * 
 * Parst formatierte Dateigrößen und wandelt sie in Bytes um.
 * Unterstützt die gängigen Einheiten von Bytes bis Terabytes.
 * 
 * @param sizeString Formatierte Größen-Zeichenkette (z.B. "1.5 MB", "2 kb")
 * @returns Größe in Bytes, oder 0 bei ungültiger Eingabe
 * 
 * @example
 * parseFileSize("1.5 MB"); // 1572864
 * parseFileSize("512 KB"); // 524288
 * parseFileSize("invalid"); // 0
 * 
 * @note Akzeptiert nur Format "[Zahl] [Einheit]" - "Bytes" wird nicht unterstützt,
 *       verwende "b" stattdessen
 */
export function parseFileSize(sizeString: string): number {
	// Einheiten-Definitionen (binär, 1024-basiert)
	const units: Record<string, number> = {
		'b': 1,                          // Bytes (verkürzte Form)
		'kb': 1024,                      // Kilobytes
		'mb': 1024 * 1024,               // Megabytes
		'gb': 1024 * 1024 * 1024,        // Gigabytes
		'tb': 1024 * 1024 * 1024 * 1024  // Terabytes
	};
	
	// Regex-Pattern: Zahl (optional mit Dezimalstellen) + optionale Leerzeichen + Einheit
	const match = sizeString.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmgt]?b)$/);
	
	// Keine gültige Übereinstimmung gefunden
	if (!match) return 0;
	
	// Extrahiere Wert und Einheit aus dem Match
	const [, valueStr, unit] = match;
	if (!valueStr || !unit) return 0;
	
	// Konvertiere String-Wert zu Zahl
	const value = parseFloat(valueStr);
	
	// Hole den Multiplikator für die Einheit (Standard: 1)
	const multiplier = units[unit] || 1;
	
	// Berechne und gebe die finale Byte-Größe zurück
	return value * multiplier;
}