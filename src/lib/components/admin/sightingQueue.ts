/**
 * @fileoverview Warteschlangen-Modus der Detailansicht: Ziele und Zustände.
 *
 * Bewusst DOM- und Store-frei, damit die Zielbestimmung ohne gerenderte Seite
 * prüfbar ist — gleiche Bauart wie `adminTriageShortcuts.ts`.
 *
 * Die Ziel-Hrefs entstehen über `inboxDetailHref` und nicht per String-Bau:
 * So reisen Herkunft (`from=inbox`) und Sortierung (`order`) bei **jedem**
 * Queue-Schritt mit. Genau daran ist `edit/` bis 2026-08 gescheitert — der
 * Rückweg verlor die Herkunft, weil eine Route sie nicht durchgereicht hat.
 */
import { inboxDetailHref } from './adminReturn';

/**
 * Ein Nachbar im Stapel, so weit die Oberfläche ihn braucht.
 *
 * `referenceId` ist `string | null`, nicht `string`: `referenz_id` ist im
 * Schema (`src/lib/server/db/schema.ts`) ein `varchar` **ohne** `.notNull()`
 * — Altbestand ohne Referenz-ID existiert, und der bereits gebaute Endpunkt
 * (`GET /api/sightings/[id]/queue`) liefert `null` entsprechend mit.
 */
export interface QueueNeighbor {
	id: number;
	referenceId: string | null;
}

/** Die Antwort von `GET /api/sightings/[id]/queue`. */
export interface SightingQueue {
	prev: QueueNeighbor | null;
	next: QueueNeighbor | null;
	/** `null`, sobald die Sichtung nicht mehr offen ist — sie hat dann keinen Rang. */
	position: number | null;
	total: number;
}

/**
 * Der Ziel-Href einer Sichtung im Warteschlangen-Modus.
 *
 * Nimmt die ID und nicht den ganzen `QueueNeighbor`: Gebraucht wird ohnehin nur
 * `.id`, und `planAdvance` (`queueAdvance.ts`) baut den Rückweg zur **gerade
 * entschiedenen** Sichtung — die ist kein Nachbar und hat hier keinen
 * `referenceId` beizusteuern. Mit der Objekt-Signatur entstand dort eine
 * Attrappe (`{ id, referenceId: '' }`), deren leeres Feld nur den Typ
 * befriedigte und einen Wert behauptete, den es nicht gibt.
 */
export function queueHref(sightingId: number, order: 'asc' | 'desc'): string {
	return inboxDetailHref(sightingId, order);
}

/** Wohin die Seite nach einer Entscheidung geht. */
export type AdvanceTarget =
	{ kind: 'sighting'; href: string } | { kind: 'inbox' } | { kind: 'stay' };

/**
 * Das Ziel nach einer Entscheidung.
 *
 * **`stay` ist kein Randfall, sondern die Sicherung.** Ein fehlgeschlagener
 * Queue-Aufruf heißt „unbekannt, wer als Nächstes kommt" — nicht „es kommt
 * niemand mehr". Würden beide gleich behandelt, landete man bei jedem
 * Netzwerkfehler im Eingang und hielte den Stapel für abgearbeitet. Die
 * Entscheidung selbst ist zu diesem Zeitpunkt bereits gespeichert; stehen zu
 * bleiben kostet nur einen Klick, die falsche Annahme kostet den Überblick.
 */
export function advanceTarget(
	queue: SightingQueue | null,
	queueFailed: boolean,
	order: 'asc' | 'desc'
): AdvanceTarget {
	if (queueFailed || !queue) return { kind: 'stay' };
	if (queue.next) return { kind: 'sighting', href: queueHref(queue.next.id, order) };
	return { kind: 'inbox' };
}
