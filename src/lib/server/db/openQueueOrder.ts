/**
 * @fileoverview Die Ordnung des offenen Sichtungsstapels — einmal definiert.
 *
 * Zwei Stellen brauchen dieselbe Reihenfolge: die Eingangsliste (`/admin`) und
 * der Warteschlangen-Endpunkt (`/api/sightings/[id]/queue`). Liefen sie
 * auseinander, wäre der Fehler nicht sichtbar, sondern still — beim Abarbeiten
 * würde eine Meldung übersprungen, und niemand bemerkt eine Sichtung, die nie
 * erschienen ist.
 *
 * **`id` ist nicht Kosmetik, sondern Voraussetzung.** `created` ist
 * `notNull`, aber nicht `unique` (`schema.ts`): Zwei am selben Zeitpunkt
 * eingegangene Meldungen haben ohne Tiebreaker keine definierte Reihenfolge,
 * und PostgreSQL darf sie zwischen zwei Abfragen unterschiedlich anordnen. Die
 * Keyset-Bedingung unten vergleicht deshalb das **Wertepaar** und nicht die
 * Spalten einzeln — `created < x OR (created = x AND id < y)` wäre dasselbe,
 * nur länger und leichter falsch abzuschreiben.
 *
 * Gleiche Bauart und gleicher Zweck wie `approvalFilter.ts`: eine Regel, die an
 * zwei Stellen nachgebaut wird, driftet.
 */
import { sightings } from '$lib/server/db/schema';
import { asc, desc, sql, type SQL } from 'drizzle-orm';

/** Sortierrichtung des Stapels nach Meldedatum. */
export type QueueOrder = 'asc' | 'desc';

/** Die Position einer Sichtung im Stapel, so weit die Ordnung sie braucht. */
export interface QueueAnchor {
	created: Date;
	id: number;
}

/**
 * Auswertung des `?order`-Parameters.
 *
 * Default `desc` (neueste zuerst, Entscheidung Jan 2026-08-08): Der Altbestand
 * ab 2013 macht FIFO als Default unbrauchbar. Alles außer `asc` fällt zurück,
 * statt in die SQL zu wandern.
 */
export function resolveQueueOrder(value: string | null): QueueOrder {
	return value === 'asc' ? 'asc' : 'desc';
}

/** Sortierausdrücke für `.orderBy(...)` — inklusive Tiebreaker. */
export function openQueueOrderBy(order: QueueOrder): SQL[] {
	return order === 'asc'
		? [asc(sightings.created), asc(sightings.id)]
		: [desc(sightings.created), desc(sightings.id)];
}

/**
 * Keyset-Bedingung „liegt hinter/vor dieser Sichtung".
 *
 * Der Vergleich hängt an den **Werten** des Ankers, nicht an seiner
 * Mitgliedschaft in der offenen Menge. Genau deshalb bleibt die Frage „wer
 * kommt danach" beantwortbar, nachdem die aktuelle Sichtung entschieden wurde
 * und den Stapel verlassen hat — der Auto-Advance braucht keinen Sonderfall.
 */
export function queueNeighborCondition(
	order: QueueOrder,
	direction: 'next' | 'prev',
	anchor: QueueAnchor
): SQL {
	const kleinerAlsAnker = (order === 'desc') === (direction === 'next');
	return kleinerAlsAnker
		? sql`(${sightings.created}, ${sightings.id}) < (${anchor.created}, ${anchor.id})`
		: sql`(${sightings.created}, ${sightings.id}) > (${anchor.created}, ${anchor.id})`;
}

/**
 * In welcher Richtung nach dem Nachbarn gesucht wird.
 *
 * Vorwärts ist es die Queue-Richtung selbst; rückwärts muss die Sortierung
 * gedreht werden, sonst liefert `LIMIT 1` den Stapelanfang statt des direkten
 * Vorgängers.
 */
export function neighborScanOrder(order: QueueOrder, direction: 'next' | 'prev'): QueueOrder {
	if (direction === 'next') return order;
	return order === 'desc' ? 'asc' : 'desc';
}
