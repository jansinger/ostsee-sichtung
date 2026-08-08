import type { SightingStatusLogEntry } from '$lib/components/admin/sightingStatusLog';
import type { PageLoad } from './$types';

/**
 * Status-Historie der Detailansicht (Spec B3).
 *
 * Steht hier und nicht im `+layout.ts`: Die Bearbeitungsmaske (`[id]/edit`)
 * hängt am selben Layout, zeigt den Status aber nur an — sie soll die Abfrage
 * nicht mitschleppen.
 *
 * Die Historie enthält Bearbeiter-Kennungen und kommt deshalb aus dem
 * admin-geschützten Verify-Endpunkt, nicht aus `/api/sightings/[id]`.
 *
 * **Ein Fehler hier darf die Seite nicht kosten** — die Historie ist eine
 * Ergänzung, ohne sie bleibt die Sichtung vollständig lesbar. Er darf aber auch
 * nicht als Altbestand durchgehen: Eine leere Liste behauptet „es gab keine
 * Entscheidungen", ein Fehlschlag heißt „unbekannt, ob es welche gab". Beides
 * sieht im DOM gleich aus, und die Verwechslung wäre derselbe Fehlermodus,
 * gegen den das Feature antritt — eine Zeitleiste mit Lücke sieht vollständig
 * aus und ist es nicht. Deshalb `statusLogFailed`, das die Zeitleiste als
 * dritten Fall darstellt.
 *
 * Eine Antwort ohne `history` zählt dabei als Fehlschlag und nicht als leere
 * Historie: Sie ist ein Vertragsbruch des Endpunkts, kein Altbestand.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const response = await fetch(`/api/sightings/${params.id}/verify`);
		if (!response.ok) {
			return { statusLog: [] as SightingStatusLogEntry[], statusLogFailed: true };
		}

		const body = await response.json();
		if (!Array.isArray(body?.history)) {
			return { statusLog: [] as SightingStatusLogEntry[], statusLogFailed: true };
		}

		return { statusLog: body.history as SightingStatusLogEntry[], statusLogFailed: false };
	} catch {
		return { statusLog: [] as SightingStatusLogEntry[], statusLogFailed: true };
	}
};
