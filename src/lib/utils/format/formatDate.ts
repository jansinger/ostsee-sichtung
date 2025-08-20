import { formatLocalDateTime } from './dateTime';

/**
 * Formatiert ein Datum für die Anzeige
 * 
 * @deprecated Diese Funktion ist veraltet. Verwende stattdessen formatLocalDateTime() 
 * aus '$lib/utils/format/dateTime' für neue Implementierungen.
 * 
 * Diese Wrapper-Funktion stellt Rückwärtskompatibilität sicher, während die neue 
 * zeitzonenbewusste Formatierung verwendet wird.
 * 
 * @param date Das zu formatierende Datum
 * @returns Das formatierte Datum als String mit korrekter Zeitzonenkonvertierung
 */
export function formatDate(date: string | Date | null): string {
	return formatLocalDateTime(date, 'datetime');
}
