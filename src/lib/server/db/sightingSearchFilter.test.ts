import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQLWrapper } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { normalizeSearchTerm, searchCondition } from './sightingSearchFilter';

const dialect = new PgDialect();
const compile = (condition: SQLWrapper) => dialect.sqlToQuery(condition.getSQL());

describe('normalizeSearchTerm', () => {
	it('schneidet Leerraum ab', () => {
		expect(normalizeSearchTerm('  Müller  ')).toBe('Müller');
	});

	it.each([null, undefined, '', '   '])('liefert für %p undefined', (eingabe) => {
		expect(normalizeSearchTerm(eingabe)).toBeUndefined();
	});
});

describe('searchCondition', () => {
	it('liefert ohne Suchbegriff kein Prädikat', () => {
		expect(searchCondition(null)).toBeUndefined();
		expect(searchCondition('   ')).toBeUndefined();
	});

	it('sucht über alle fünf Felder mit ILIKE', () => {
		const { sql } = compile(searchCondition('müller') as SQLWrapper);

		for (const spalte of ['referenz_id', 'email', 'vorname', 'name', 'fahrwasser']) {
			expect(sql).toContain(`"${spalte}" ilike`);
		}
	});

	it('übergibt den Suchbegriff als Parameter, nicht als SQL-Text', () => {
		// Kein SQL-String-Bau: Der Begriff darf nirgends im SQL-Text auftauchen,
		// sondern ausschließlich in der Parameterliste. Sonst wäre `'; drop …`
		// eine Injektion statt eines erfolglosen Suchbegriffs.
		const { sql, params } = compile(searchCondition("o'brien") as SQLWrapper);

		expect(sql).not.toContain("o'brien");
		expect(params).toEqual(Array(5).fill("%o'brien%"));
	});

	it('entschärft LIKE-Platzhalter im Suchbegriff', () => {
		// Ohne Escaping wäre `%` eine Suche nach allem und `_` ein Joker — der
		// Nutzer tippt aber einen Literaltext, keinen Suchausdruck.
		const { params } = compile(searchCondition('50%_rest') as SQLWrapper);

		expect(params[0]).toBe('%50\\%\\_rest%');
	});

	it('entschärft den Escape-Backslash selbst', () => {
		const { params } = compile(searchCondition('a\\b') as SQLWrapper);

		expect(params[0]).toBe('%a\\\\b%');
	});
});
