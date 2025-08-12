import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { createLogger } from '$lib/logger';

const logger = createLogger('csp-report');

/**
 * POST-Handler für /api/csp-report
 * Empfängt und verarbeitet CSP-Verstoßberichte, die vom Browser gesendet werden
 *
 * @param request - Die eingehende Anfrage mit dem CSP-Verstoßbericht
 * @returns Eine leere JSON-Antwort mit 204 Status (No Content)
 */
export async function POST({ request }: RequestEvent) {
	try {
		// CSP-Verstoß aus dem Request-Body extrahieren
		const report = await request.json();

		// CSP-Verstoß loggen
		logger.warn('CSP-Verstoß erkannt', {
			// Bei neueren Browsern ist der Report im 'csp-report' Feld
			...report['csp-report'],
			// Bei älteren Browsern kann der Report direkt im Objekt sein
			fullReport: report,
			timestamp: new Date().toISOString()
		});

		// Optional: Hier könntest du den Verstoß in eine Datenbank oder einen externen Logging-Dienst schreiben

		// 204 No Content zurückgeben, da keine Antwort erforderlich ist
		return new Response(null, { status: 204 });
	} catch (error) {
		// Fehler beim Verarbeiten des CSP-Verstoßes loggen
		logger.error({ error }, 'Fehler bei der Verarbeitung eines CSP-Verstoßes');

		// 400 Bad Request zurückgeben, wenn der Request nicht verarbeitet werden konnte
		return json({ error: 'Ungültiges CSP-Verstoßformat' }, { status: 400 });
	}
}
