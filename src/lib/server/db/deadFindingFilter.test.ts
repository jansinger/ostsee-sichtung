/**
 * Der Meldeart-Filter muss dieselbe Aussage treffen wie die Anzeige: Ein
 * Totfund ist überall, wo `isDeadFinding()` (Boolean(isDead)) wahr ist — also
 * `totfund <> 0`, nicht `totfund = 1`. Ein Altbestand mit einem anderen
 * Nicht-Null-Wert würde sonst zwar das Badge tragen, aber aus dem Filter fallen.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQLWrapper } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { deadFindingCondition, DEAD_FINDING_FILTER_DEAD } from './deadFindingFilter';

const dialect = new PgDialect();
const toSqlText = (condition: SQLWrapper): string => dialect.sqlToQuery(condition.getSQL()).sql;

describe('deadFindingCondition', () => {
	it('filtert Totfunde über totfund <> 0 (Boolean-Semantik wie isDeadFinding)', () => {
		const condition = deadFindingCondition(DEAD_FINDING_FILTER_DEAD);

		expect(condition).toBeDefined();
		const sqlText = toSqlText(condition as unknown as SQLWrapper);
		expect(sqlText).toContain('totfund');
		expect(sqlText).toContain('<>');
	});

	it('filtert Lebendsichtungen über totfund = 0', () => {
		const condition = deadFindingCondition('0');

		expect(condition).toBeDefined();
		const sqlText = toSqlText(condition as unknown as SQLWrapper);
		expect(sqlText).toContain('totfund');
		expect(sqlText).toContain('=');
		expect(sqlText).not.toContain('<>');
	});

	it('löst für fehlende oder unbekannte Werte keinen Filter aus', () => {
		expect(deadFindingCondition(null)).toBeUndefined();
		expect(deadFindingCondition(undefined)).toBeUndefined();
		expect(deadFindingCondition('')).toBeUndefined();
		expect(deadFindingCondition('quatsch')).toBeUndefined();
	});
});
