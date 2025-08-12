// Formatiert ein Datum für die Anzeige
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
