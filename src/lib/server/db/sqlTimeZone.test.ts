/**
 * @fileoverview Absicherung der geteilten Zeitzonen-SQL-Ausdrücke.
 *
 * Kernpunkt: Der Ausdruck im Ausdrucksindex (`schema.ts`) und der in der
 * Dedup-Abfrage (`weatherDeduplication.ts`) müssen **zeichengleich** sein.
 * Postgres nutzt einen Ausdrucksindex nur bei exakter Übereinstimmung — driften
 * die beiden auseinander, fällt die Abfrage still auf einen Seq Scan zurück,
 * ohne dass irgendein Test rot wird.
 */

import { PgDialect, getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { sightings } from './schema';
import { berlinCalendarDate, berlinDatePart } from './sqlTimeZone';

const dialect = new PgDialect();

/** Rendert einen Drizzle-SQL-Ausdruck zu seinem Postgres-Text. */
function toSql(expression: Parameters<PgDialect['sqlToQuery']>[0]): string {
	return dialect.sqlToQuery(expression).sql;
}

describe('berlinCalendarDate', () => {
	it('rechnet die UTC-Spalte vor DATE() nach Europe/Berlin um', () => {
		expect(toSql(berlinCalendarDate(sightings.sightingDate))).toBe(
			`DATE("sichtungen"."sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
		);
	});

	it('erzeugt für dieselbe Spalte einen deterministischen Ausdruck', () => {
		// Grundlage dafür, dass Index und Abfrage übereinstimmen können.
		expect(toSql(berlinCalendarDate(sightings.sightingDate))).toBe(
			toSql(berlinCalendarDate(sightings.sightingDate))
		);
	});

	it('ist auf jede Zeitstempelspalte anwendbar', () => {
		expect(toSql(berlinCalendarDate(sightings.created))).toBe(
			`DATE("sichtungen"."created" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
		);
	});
});

describe('berlinDatePart', () => {
	it('extrahiert Jahr in deutscher Ortszeit', () => {
		expect(toSql(berlinDatePart('year', sightings.sightingDate))).toBe(
			`EXTRACT(year FROM "sichtungen"."sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
		);
	});

	it('extrahiert Monat in deutscher Ortszeit', () => {
		expect(toSql(berlinDatePart('month', sightings.sightingDate))).toBe(
			`EXTRACT(month FROM "sichtungen"."sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')`
		);
	});
});

describe('Index-/Abfrage-Übereinstimmung', () => {
	it('nutzt im Dedup-Index denselben Datumsausdruck wie die Dedup-Abfrage', () => {
		const dedupIndex = getTableConfig(sightings).indexes.find(
			(index) => index.config.name === 'idx_position_date_weather'
		);
		const datumsSpalte = dedupIndex?.config.columns.at(-1);

		// Nicht vakuum-grün: Index muss existieren und einen echten Ausdruck tragen.
		expect(dedupIndex, 'idx_position_date_weather fehlt im Schema').toBeDefined();
		expect(toSql(datumsSpalte as never)).toContain('Europe/Berlin');

		// Postgres nutzt einen Ausdrucksindex nur bei exakter Übereinstimmung.
		expect(toSql(datumsSpalte as never)).toBe(toSql(berlinCalendarDate(sightings.sightingDate)));
	});

	it('nutzt im Jahres-Index denselben Ausdruck wie die Statistik-Gruppierung', () => {
		const yearIndex = getTableConfig(sightings).indexes.find(
			(index) => index.config.name === 'idx_year_sichtungen'
		);

		expect(yearIndex, 'idx_year_sichtungen fehlt im Schema').toBeDefined();
		expect(toSql(yearIndex?.config.columns.at(-1) as never)).toContain('Europe/Berlin');
		expect(toSql(yearIndex?.config.columns.at(-1) as never)).toBe(
			toSql(berlinDatePart('year', sightings.sightingDate))
		);
	});
});
