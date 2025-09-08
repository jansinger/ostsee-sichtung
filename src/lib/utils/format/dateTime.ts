/**
 * Zentrale Zeitzonenverwaltung für die Ostsee-Tiere Anwendung
 *
 * Diese Datei stellt einheitliche Funktionen für die Formatierung von Datum und Zeit bereit,
 * mit korrekter Zeitzonenbehandlung für Deutschland/Berlin. Alle UTC-Zeiten aus der Datenbank
 * werden automatisch in die lokale Zeitzone konvertiert.
 *
 * Wichtige Konzepte:
 * - Datenbank speichert immer in UTC (korrekt)
 * - Anzeige erfolgt immer in lokaler Zeit (Europe/Berlin)
 * - Automatische Berücksichtigung von Sommer-/Winterzeit
 * - Einheitliche Formatierung für alle Komponenten
 */

/**
 * Zeitzone für die Anwendung (Deutschland/Berlin)
 * Berücksichtigt automatisch Sommer-/Winterzeit (CEST/CET)
 */
const APP_TIMEZONE = 'Europe/Berlin';

/**
 * Standard-Locale für deutsche Formatierung
 */
const APP_LOCALE = 'de-DE';

/**
 * Formatiert eine UTC-Datenbank-Zeit für die lokale Anzeige in Deutschland.
 *
 * Diese Hauptfunktion konvertiert UTC-Zeiten aus der Datenbank automatisch
 * in die deutsche Zeitzone und formatiert sie benutzerfreundlich.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank (ISO String oder Date)
 * @param format - Gewünschtes Anzeigeformat
 * @returns Lokalisierte Zeitangabe in deutscher Formatierung
 *
 * @example
 * ```typescript
 * // UTC-Zeit aus DB: "2024-01-15T08:57:00.000Z"
 * formatLocalDateTime(utcTime, 'datetime')
 * // Ausgabe: "15.01.2024, 10:57" (in Winter) oder "15.01.2024, 09:57" (in Sommer)
 *
 * formatLocalDateTime(utcTime, 'date')
 * // Ausgabe: "15.01.2024"
 *
 * formatLocalDateTime(utcTime, 'time')
 * // Ausgabe: "10:57"
 * ```
 */
export function formatLocalDateTime(
	utcDateTime: string | Date | null | undefined,
	format: 'full' | 'date' | 'time' | 'datetime' = 'datetime',
	locale: string = APP_LOCALE
): string {
	if (!utcDateTime) return 'Nicht angegeben';

	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return 'Ungültiges Datum';
	}

	const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
		full: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: APP_TIMEZONE
		},
		date: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: APP_TIMEZONE
		},
		time: {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: APP_TIMEZONE
		},
		datetime: {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: APP_TIMEZONE
		}
	};

	return date.toLocaleString(locale, formatOptions[format]);
}

/**
 * Formatiert speziell für KML-Export (Legacy-kompatibel).
 *
 * Erstellt das Format "DD.MM.YY HH:MM" wie im ursprünglichen KML-Export,
 * aber mit korrekter Zeitzonenkonvertierung.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @returns Formatierter String im KML-Legacy-Format
 *
 * @example
 * ```typescript
 * formatForKmlExport("2024-01-15T08:57:00.000Z")
 * // Ausgabe: "15.01.24 10:57"
 * ```
 */
export function formatForKmlExport(utcDateTime: string | Date): string {
	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return 'Ungültiges Datum';
	}

	// Verwende toLocaleString mit Zeitzone-Option für korrekte Konvertierung
	const germanTime = date.toLocaleString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		year: '2-digit',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	// Format: "DD.MM.YY, HH:MM" -> "DD.MM.YY HH:MM"
	return germanTime.replace(',', '');
}

/**
 * Formatiert speziell für XML-Export (Legacy-kompatibel).
 *
 * Erstellt separate Datum- und Zeit-Strings für XML-Export:
 * - Datum im Format "DD.MM.YY"
 * - Zeit im Format "HHMM" (ohne Doppelpunkt)
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @returns Objekt mit separaten Datum- und Zeit-Strings
 *
 * @example
 * ```typescript
 * formatForXmlExport("2024-01-15T08:57:00.000Z")
 * // Ausgabe: { date: "15.01.24", time: "1057" }
 * ```
 */
export function formatForXmlExport(utcDateTime: string | Date): {
	date: string;
	time: string;
} {
	const date = new Date(utcDateTime);

	// Validierung: Prüfe auf ungültige Daten
	if (isNaN(date.getTime())) {
		return { date: 'Ungültiges Datum', time: 'Ungültige Zeit' };
	}

	// Konvertiere zu deutscher Zeit mit separaten Formatierungen
	const dateString = date.toLocaleDateString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		year: '2-digit',
		month: '2-digit',
		day: '2-digit'
	});

	const timeString = date.toLocaleTimeString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	// Entferne Doppelpunkt aus Zeit für XML-Format
	const xmlTime = timeString.replace(':', '');

	return {
		date: dateString,
		time: xmlTime
	};
}

/**
 * Kombiniert ein Datum und eine Uhrzeit zu einem vollständigen Date-Objekt.
 *
 * Interpretiert das Datum in der browser locale
 *
 * @param localDate - Das lokale Datum im Format "YYYY-MM-DD"
 * @param localTime - Die lokale Uhrzeit im Format "HH:MM" (optional)
 * @returns Das kombinierte Date-Objekt oder das aktuelle Datum, wenn die Eingabe ungültig ist
 */
export function combineToDate(localDate: string, localTime?: string | undefined | null): Date {
	// Validierung der Eingabe
	if (!localDate) {
		return new Date();
	}

	const fullDateTime = new Date(localDate);

	if (localTime && localTime.match(/^\d{2}:\d{2}$/)) {
		const [hours, minutes] = localTime.split(':').map(Number);
		fullDateTime.setHours(hours ?? 0, minutes ?? 0, 0, 0); // Sekunden und MS auf 0
	}

	return fullDateTime;
}

/**
 * Formatiert Datum/Zeit für verschiedene Export-Formate.
 *
 * Zentrale Funktion für alle Export-Typen mit einheitlicher Zeitzonenbehandlung.
 *
 * @param utcDateTime - UTC-Zeit aus der Datenbank
 * @param exportType - Typ des Exports
 * @returns Formatierter String je nach Export-Typ
 */
export function formatForExport(
	utcDateTime: string | Date,
	exportType: 'csv' | 'json' | 'kml' | 'xml-date' | 'xml-time'
): string {
	switch (exportType) {
		case 'csv':
		case 'json':
			return formatLocalDateTime(utcDateTime, 'datetime');
		case 'kml':
			return formatForKmlExport(utcDateTime);
		case 'xml-date':
			return formatForXmlExport(utcDateTime).date;
		case 'xml-time':
			return formatForXmlExport(utcDateTime).time;
		default:
			return formatLocalDateTime(utcDateTime, 'datetime');
	}
}

/**
 * Hilfsfunktion: Prüft ob ein Datum gültig ist.
 *
 * @param date - Zu prüfendes Datum
 * @returns true wenn das Datum gültig ist
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
	if (!date) return false;
	const d = new Date(date);
	return !isNaN(d.getTime());
}

/**
 * Hilfsfunktion: Gibt die aktuelle Zeit in deutscher Zeitzone zurück.
 *
 * @returns Aktuelles Datum/Zeit-Objekt in deutscher Zeitzone
 */
export function getCurrentLocalTime(): Date {
	const now = new Date();

	// Konvertiere aktuelle Zeit zu deutscher Zeitzone
	const germanTimeString = now.toLocaleString(APP_LOCALE, {
		timeZone: APP_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});

	// Parse zurück zu Date-Objekt
	return new Date(germanTimeString.replace(/(\d{2})\.(\d{2})\.(\d{4}), /, '$3-$2-$1T'));
}

/**
 * Format datetime in ISO-like format (YYYY-MM-DD HH:MM)
 * Used for weather data timestamps and API responses
 * @param dateTime Date object or ISO datetime string  
 * @returns Formatted datetime as "YYYY-MM-DD HH:MM"
 */
export function formatISOLikeDatetime(dateTime: string | Date | null | undefined): string {
	if (!dateTime) return '';
	
	const date = new Date(dateTime);
	if (isNaN(date.getTime())) return '';
	
	return date.toLocaleDateString('sv-SE', {
		year: 'numeric',
		month: '2-digit', 
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/**
 * Hilfsfunktion: Formatiert ein Datum/Zeit-Objekt in einer bestimmten
 * Format zur Nutzung in Eingabefeldern
 *
 * @param date - Datum/Zeit-Objekt
 * @param format - Format der Ausgabe
 * @returns Formatiertes Datum/Zeit-Objekt als String
 */
export function splitDateTime(dateTime: string | Date): { date: string; time: string } {
	const date = formatLocalDateTime(dateTime, 'date', 'sv-SE');
	const time = formatLocalDateTime(dateTime, 'time', 'sv-SE');
	return { date, time };
}
