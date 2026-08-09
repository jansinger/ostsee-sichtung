/**
 * @fileoverview Die eine Ordnung des offenen Stapels.
 *
 * `created` ist nicht eindeutig. Ohne `id` als Tiebreaker können Eingangsliste
 * und Nachbar-Query bei gleichem Zeitstempel unterschiedliche Reihenfolgen
 * liefern — beim Abarbeiten fiele dann eine Meldung durch. Die Tests prüfen
 * deshalb den kompilierten SQL-Text, nicht nur die Rückgabe-Arity.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQLWrapper } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
	neighborScanOrder,
	openQueueOrderBy,
	queueNeighborCondition,
	resolveQueueOrder
} from './openQueueOrder';

const dialect = new PgDialect();
const toSql = (expression: SQLWrapper): string => dialect.sqlToQuery(expression.getSQL()).sql;
const anchor = { created: new Date('2026-08-01T10:00:00Z'), id: 4711 };

describe('resolveQueueOrder', () => {
	it('nimmt asc als bewusste Wahl an', () => {
		expect(resolveQueueOrder('asc')).toBe('asc');
	});

	it('fällt bei fehlendem oder ungültigem Wert auf desc zurück', () => {
		expect(resolveQueueOrder(null)).toBe('desc');
		expect(resolveQueueOrder('DESC')).toBe('desc');
		expect(resolveQueueOrder('random')).toBe('desc');
	});
});

describe('openQueueOrderBy', () => {
	it('sortiert absteigend mit id als Tiebreaker', () => {
		const sql = openQueueOrderBy('desc').map(toSql).join(', ');
		expect(sql).toMatch(/"created" desc/);
		expect(sql).toMatch(/"id" desc/);
	});

	it('sortiert aufsteigend mit id als Tiebreaker', () => {
		const sql = openQueueOrderBy('asc').map(toSql).join(', ');
		expect(sql).toMatch(/"created" asc/);
		expect(sql).toMatch(/"id" asc/);
	});

	it('nennt created vor id — sonst wäre die Sortierung eine andere', () => {
		const [erstes, zweites] = openQueueOrderBy('desc').map(toSql);
		expect(erstes).toContain('created');
		expect(zweites).toContain('id');
	});
});

describe('queueNeighborCondition', () => {
	/**
	 * Prüft die Wertepaar-Form `("created", "id") <op> (...)` — nicht nur, dass
	 * irgendwo ein `<` oder `>` im SQL-Text steht. Ein spaltenweiser Vergleich
	 * oder vertauschte Operanden enthielten das Zeichen ebenfalls und blieben
	 * mit einem reinen `toContain('<')` unbemerkt.
	 */
	const wertepaarRegex = (operator: '<' | '>'): RegExp =>
		new RegExp(`\\("sichtungen"\\."created", "sichtungen"\\."id"\\)\\s*\\${operator}\\s*\\(`);

	it('vergleicht als Wertepaar, nicht spaltenweise', () => {
		const sql = toSql(queueNeighborCondition('desc', 'next', anchor));
		expect(sql).toMatch(wertepaarRegex('<'));
	});

	it('geht bei desc vorwärts zu kleineren Werten (Wertepaar-Form)', () => {
		expect(toSql(queueNeighborCondition('desc', 'next', anchor))).toMatch(wertepaarRegex('<'));
	});

	it('geht bei desc rückwärts zu größeren Werten (Wertepaar-Form)', () => {
		expect(toSql(queueNeighborCondition('desc', 'prev', anchor))).toMatch(wertepaarRegex('>'));
	});

	it('dreht bei asc vorwärts zu größeren Werten (Wertepaar-Form)', () => {
		expect(toSql(queueNeighborCondition('asc', 'next', anchor))).toMatch(wertepaarRegex('>'));
	});

	it('dreht bei asc rückwärts zu kleineren Werten (Wertepaar-Form)', () => {
		expect(toSql(queueNeighborCondition('asc', 'prev', anchor))).toMatch(wertepaarRegex('<'));
	});

	/**
	 * Dass Parameterreihenfolge und Spaltenreihenfolge zusammenpassen, prüft sonst
	 * niemand — ein vertauschtes Wertepaar wäre syntaktisch gültiges SQL und bliebe
	 * ohne diese Assertion unbemerkt. Der Anker-Zeitpunkt muss dabei als
	 * `timestamp`-Text ankommen (kein rohes `Date`, siehe Docblock in
	 * `openQueueOrder.ts` und `postgresTypes.ts`) — sonst bindet `postgres.js` ihn
	 * als `timestamptz` und der Vergleich läuft über die Session-TimeZone.
	 */
	it('bindet den Anker als ISO-Text, in Spaltenreihenfolge created vor id', () => {
		const query = dialect.sqlToQuery(queueNeighborCondition('desc', 'next', anchor).getSQL());
		expect(query.params).toEqual([anchor.created.toISOString(), anchor.id]);
	});
});

describe('neighborScanOrder', () => {
	it('sucht den Nachfolger in Queue-Richtung', () => {
		expect(neighborScanOrder('desc', 'next')).toBe('desc');
		expect(neighborScanOrder('asc', 'next')).toBe('asc');
	});

	it('sucht den Vorgänger in Gegenrichtung — sonst käme der Stapelanfang statt des Nachbarn', () => {
		expect(neighborScanOrder('desc', 'prev')).toBe('asc');
		expect(neighborScanOrder('asc', 'prev')).toBe('desc');
	});
});
