/**
 * Formatiert ein Datum für die Anzeige
 * @param date Das zu formatierende Datum
 * @returns Das formatierte Datum als String
 */
export function formatDate(date: string | Date | null): string {
	if (!date) return 'Nicht angegeben';
	return new Date(date).toLocaleString('de-DE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit'
	});
}
