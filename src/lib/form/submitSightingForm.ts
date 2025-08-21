/**
 * @fileoverview Formular-Übermittlung für Sichtungsdaten
 *
 * Dieses Modul implementiert die Client-seitige Logik zur Übermittlung
 * von Sichtungsformularen an die Server-API. Es verwaltet die HTTP-
 * Kommunikation, Fehlerbehandlung und automatische Bereinigung des
 * lokalen Browser-Speichers nach erfolgreicher Übermittlung.
 *
 * @author Ostsee-Tiere Team
 * @since 1.0.0
 */

import { clearStorage } from '$lib/storage/localStorage';
import type { SightingFormValues } from '$lib/types/Form';

/**
 * Übermittelt validierte Sichtungsformulardaten an die Server-API
 *
 * Diese Funktion führt eine POST-Anfrage an den `/api/sightings` Endpunkt
 * durch und verarbeitet die Antwort. Bei erfolgreicher Übermittlung wird
 * der lokale Browser-Speicher automatisch bereinigt.
 *
 * @param values Vollständig validierte Sichtungsformulardaten
 * @returns Promise mit Sichtungs-ID und Erfolgsstatus
 *
 * @example
 * try {
 *   const result = await submitSightingForm(formData);
 *   console.log(`Sichtung ${result.id} erfolgreich gespeichert`);
 * } catch (error) {
 *   console.error('Fehler beim Speichern:', error.message);
 * }
 *
 * @throws {Error} Bei Netzwerkfehlern, Validierungsfehlern oder Server-Problemen
 *
 * @note Bereinigt automatisch den localStorage bei erfolgreicher Übermittlung
 * @note Verwendet JSON-Serialisierung für komplexe Formularstrukturen
 */
export async function submitSightingForm(
	values: SightingFormValues
): Promise<{ id: number; success: boolean }> {
	// HTTP POST-Anfrage an die Sichtungs-API mit JSON-Payload
	const response = await fetch('/api/sightings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(values) // Serialisiere komplette Formulardaten
	});

	// Parse JSON-Antwort vom Server
	const result = await response.json();

	if (response.ok && result.success) {
		// Erfolgreiche Übermittlung: Lokalen Speicher bereinigen
		clearStorage();
		return { id: result.id, success: true };
	} else {
		// Fehlerbehandlung: Server-Fehlermeldung oder Fallback verwenden
		return Promise.reject(
			new Error(result.message || 'Die Sichtung konnte nicht gespeichert werden')
		);
	}
}
