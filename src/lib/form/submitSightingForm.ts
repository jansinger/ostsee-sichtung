import type { SightingFormData } from '$lib/report/types';
import { clearStorage } from '$lib/storage/localStorage';

export async function submitSightingForm(
	values: SightingFormData
): Promise<{ id: number; success: boolean }> {
	// API-Aufruf zur Speicherung der Sichtung
	const response = await fetch('/api/sightings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(values)
	});

	const result = await response.json();

	if (response.ok && result.success) {
		// Bei Erfolg
		clearStorage();
		return { id: result.id, success: true };
	} else {
		// Bei Fehler
		return Promise.reject(
			new Error(result.message || 'Die Sichtung konnte nicht gespeichert werden')
		);
	}
}
