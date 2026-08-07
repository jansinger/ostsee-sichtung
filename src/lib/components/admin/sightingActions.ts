/**
 * Sichtungs-Aktionen des Admin-Bereichs, geteilt zwischen Tabelle (`/admin/sichtungen`) und
 * Detailansicht (`/admin/[id]`).
 *
 * Beide Funktionen erledigen Toast und Logging selbst — was danach passiert, ist
 * dagegen von der Aufrufstelle abhängig: Die Tabelle lädt ihre Daten neu, die
 * Detailansicht muss die gelöschte Sichtung verlassen. `deleteSighting` gibt den
 * Ausgang deshalb zurück und navigiert nicht.
 */
import { createLogger } from '$lib/logger';
import { toast } from '$lib/stores/toastState.svelte';

const logger = createLogger('adminSightingActions');

/**
 * Tooltip der Mail-Aktion — an einer Stelle, weil er an drei Bedienelementen
 * hängt (Tabelle, Karten-Layout, Detailansicht).
 *
 * Er nennt den Empfänger ausdrücklich: Die frühere Beschriftung „Interne
 * Benachrichtigung testweise senden" ließ offen, wer die Mail bekommt, und
 * genau diese Lücke war der Anlass für #621 — die Erfolgsmeldung las sich, als
 * wäre die meldende Person angeschrieben worden.
 */
export const TEST_EMAIL_HINT =
	'Verschickt die interne Benachrichtigung zu dieser Sichtung erneut an die konfigurierte Empfänger-Adresse des Teams — nicht an die meldende Person.';

/**
 * Schickt die interne Benachrichtigung zu einer Sichtung testweise an die
 * konfigurierte Empfänger-Adresse — nicht an die meldende Person (#621).
 */
export async function sendTestEmail(sightingId: number): Promise<void> {
	const loadingToastId = toast.info('E-Mail wird gesendet...', { duration: 0 });

	try {
		const response = await fetch('/api/admin/test-email', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				sightingId,
				testType: 'sighting'
			})
		});

		const result = await response.json();

		if (result.success) {
			toast.success(result.message || 'Test-E-Mail wurde erfolgreich gesendet', {
				title: 'E-Mail gesendet',
				duration: 5000
			});
		} else {
			toast.error(result.error || 'Fehler beim Senden der Test-E-Mail', {
				title: 'Fehler',
				dismissible: true
			});
		}
	} catch (error) {
		logger.error({ error, sightingId }, 'Error sending test email');
		toast.error('Netzwerkfehler beim Senden der Test-E-Mail', {
			title: 'Verbindungsfehler',
			dismissible: true
		});
	} finally {
		// Auch im Fehlerfall: sonst bleibt der Lade-Toast wegen duration 0 stehen.
		toast.remove(loadingToastId);
	}
}

/** Löscht eine Sichtung. Gibt zurück, ob der Server sie tatsächlich gelöscht hat. */
export async function deleteSighting(id: number): Promise<boolean> {
	try {
		const response = await fetch(`/api/sightings/${id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const result = await response.json();
			logger.info({ id, result }, 'Sichtung erfolgreich gelöscht');
			toast.success('Sichtung wurde gelöscht', { duration: 5000 });
			return true;
		}

		const error = await response.json();
		logger.error({ id, error }, 'Fehler beim Löschen der Sichtung');
		toast.error(error.error || 'Sichtung konnte nicht gelöscht werden', {
			title: 'Fehler',
			dismissible: true
		});
		return false;
	} catch (error) {
		logger.error({ id, error }, 'Netzwerkfehler beim Löschen');
		toast.error('Netzwerkfehler beim Löschen der Sichtung', {
			title: 'Verbindungsfehler',
			dismissible: true
		});
		return false;
	}
}
