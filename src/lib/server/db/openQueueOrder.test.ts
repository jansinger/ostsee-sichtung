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
	it('vergleicht als Wertepaar, nicht spaltenweise', () => {
		const sql = toSql(queueNeighborCondition('desc', 'next', anchor));
		expect(sql).toMatch(/\("sichtungen"\."created", "sichtungen"\."id"\)\s*<\s*\(/);
	});

	it('geht bei desc vorwärts zu kleineren Werten', () => {
		expect(toSql(queueNeighborCondition('desc', 'next', anchor))).toContain('<');
		expect(toSql(queueNeighborCondition('desc', 'prev', anchor))).toContain('>');
	});

	it('dreht die Richtung bei asc um', () => {
		expect(toSql(queueNeighborCondition('asc', 'next', anchor))).toContain('>');
		expect(toSql(queueNeighborCondition('asc', 'prev', anchor))).toContain('<');
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
