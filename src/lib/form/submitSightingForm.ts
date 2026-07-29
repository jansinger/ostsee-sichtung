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
/** Fehlermeldung, die der Nutzer sieht, wenn der Server keine eigene liefert. */
const FALLBACK_MESSAGE = 'Die Sichtung konnte nicht gespeichert werden';

/** Antwortkörper der Sichtungs-API, soweit der Client ihn auswertet. */
interface SightingApiResponse {
	success?: boolean;
	id?: number;
	message?: string;
}

/**
 * Liest den Antwortkörper als JSON — und gibt `null` zurück, wenn das nicht geht.
 *
 * Nicht jede Antwort auf dieser Route ist JSON: Ein 502 kommt als HTML-Fehlerseite
 * des Reverse Proxy, ein 504 als Klartext des Gateways. `response.json()` wirft
 * dort einen `SyntaxError`, dessen Rohtext („Unexpected token '<' …") für den
 * Nutzer bedeutungslos ist. Der Parse-Fehler wird deshalb hier abgefangen und
 * nicht weitergereicht.
 */
async function readJsonBody(response: Response): Promise<SightingApiResponse | null> {
	try {
		return (await response.json()) as SightingApiResponse;
	} catch {
		return null;
	}
}

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

	// Statusprüfung VOR dem Parsen: Bei einem HTTP-Fehler ist der Körper oft
	// kein JSON, und der Parse-Fehler würde die eigentliche Ursache verdecken.
	if (!response.ok) {
		const body = await readJsonBody(response);
		throw new Error(body?.message || FALLBACK_MESSAGE);
	}

	const result = await readJsonBody(response);

	if (result?.success && typeof result.id === 'number') {
		// Erfolgreiche Übermittlung: Lokalen Speicher bereinigen
		clearStorage();
		return { id: result.id, success: true };
	}

	// 2xx, aber unlesbar oder `success: false` — Server-Meldung oder Fallback.
	throw new Error(result?.message || FALLBACK_MESSAGE);
}
