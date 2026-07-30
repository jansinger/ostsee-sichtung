/**
 * @fileoverview M1 — `firstSighting`/`lastSighting` in der Top-Observers-Abfrage
 * müssen den Kalendertag in deutscher Ortszeit liefern, nicht den naiven
 * UTC-Tag.
 *
 * Bug: `MIN(${sightings.created})::date` castet die naive UTC-Spalte direkt zu
 * `date` — das ist der UTC-Kalendertag. Eine Sichtung um 00:30 Berliner Zeit
 * (23:30 UTC am Vortag) würde als „gestern" gezählt, obwohl dieselbe Datei
 * 60 Zeilen darüber (`recentActivity`) korrekt `berlinCalendarDate` verwendet.
 *
 * Testansatz: wie `statisticsApprovalScope.test.ts` — ein aufzeichnender
 * `db.select`-Mock erfasst die Spalten-Definitionen jedes `select({...})`-Laufs;
 * der SQL-Text der `firstSighting`/`lastSighting`-Spalten wird über den echten
 * `PgDialect` kompiliert und mit dem erwarteten Berlin-Ausdruck verglichen.
 */

import { PgDialect } from 'drizzle-orm/pg-core';
import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';
import { sightings } from '$lib/server/db/schema';
import { berlinCalendarDate } from '$lib/server/db/sqlTimeZone';

const dialect = new PgDialect();
const toSqlText = (expression: SQLWrapper): string => dialect.sqlToQuery(expression.getSQL()).sql;

/** Alle Spalten-Objekte, die je an `db.select({...})` übergeben wurden. */
let recordedSelectColumns: Array<Record<string, unknown>> = [];

/** Alle Prädikate, die je an `.where(...)` übergeben wurden. */
let recordedWhereClauses: SQLWrapper[] = [];

/**
 * Minimaler, aufzeichnender Drizzle-Query-Builder.
 *
 * Deckt jede Verkettung ab, die `load()` in `+page.server.ts` verwendet
 * (`from`, `innerJoin`, `where`, `groupBy`, `orderBy`, `having`, `limit`) und
 * löst beim `await` auf eine leere Ergebnisliste auf — die Werte selbst sind
 * für diesen Test irrelevant, nur die Spalten-Definitionen zählen.
 */
function createRecordingBuilder() {
	const builder = {
		from: () => builder,
		innerJoin: () => builder,
		where: (predicate?: SQLWrapper) => {
			if (predicate) recordedWhereClauses.push(predicate);
			return builder;
		},
		groupBy: () => builder,
		orderBy: () => builder,
		having: () => builder,
		limit: () => builder,
		then: (
			resolve: (rows: Array<Record<string, unknown>>) => unknown,
			reject?: (error: unknown) => unknown
		) => Promise.resolve([]).then(resolve, reject)
	};
	return builder;
}

vi.mock('$lib/server/db', () => ({
	db: {
		select: (columns?: Record<string, unknown>) => {
			if (columns) recordedSelectColumns.push(columns);
			return createRecordingBuilder();
		}
	}
}));

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}));

const { load } = await import('./+page.server');

describe('admin/statistics load() — Top-Observers Datumsspalten (M1)', () => {
	it('berechnet firstSighting/lastSighting in Berlin-Ortszeit statt UTC-Tag', async () => {
		recordedSelectColumns = [];

		await load({} as unknown as Parameters<typeof load>[0]);

		const topObserversColumns = recordedSelectColumns.find(
			(columns) => 'firstSighting' in columns && 'lastSighting' in columns
		);
		expect(
			topObserversColumns,
			'Top-Observers-Query mit firstSighting/lastSighting wurde nicht gefunden'
		).toBeDefined();

		const firstSightingSql = toSqlText(topObserversColumns!.firstSighting as SQL);
		const lastSightingSql = toSqlText(topObserversColumns!.lastSighting as SQL);

		const expectedFirst = toSqlText(berlinCalendarDate(sql`MIN(${sightings.created})`));
		const expectedLast = toSqlText(berlinCalendarDate(sql`MAX(${sightings.created})`));

		expect(firstSightingSql).toBe(expectedFirst);
		expect(lastSightingSql).toBe(expectedLast);

		// Der naive UTC-Cast darf nicht mehr vorkommen.
		expect(firstSightingSql).not.toContain('::date');
		expect(lastSightingSql).not.toContain('::date');
		expect(firstSightingSql).toContain('Europe/Berlin');
		expect(lastSightingSql).toContain('Europe/Berlin');
	});
});

/**
 * Vorgabe 3 aus `src/lib/server/db/approvalFilter.ts`: „Eine Statistikzahl ohne
 * erkennbaren Freigabebezug soll es nicht geben."
 *
 * Bis 2026-07-30 galt das nur für die Kopfzahlen. Arten-, Jahres-, Monats-,
 * Nutzer-, Schiffs-, Beobachter- und Qualitätsabfragen filterten stattdessen auf
 * `geprueft = 1`, `recentActivity` filterte überhaupt nicht. Die Seite mischte
 * damit zwei Grundmengen: Kopfzeile 19.262 (freigegeben), Abschnitte darunter
 * 19.253 (geprüft) — und `recentActivity` die vollen 19.880 inklusive offener
 * Meldungen.
 *
 * Der Test prüft die Struktur, nicht Zahlen: **jede** Abfrage muss sich auf
 * `freigegeben_am` beziehen, und keine darf mehr über `geprueft` filtern.
 */
describe('admin/statistics load() — einheitliche Grundmenge', () => {
	it('bezieht jede Abfrage auf den Freigabestatus und keine mehr auf geprueft', async () => {
		recordedWhereClauses = [];

		await load({} as unknown as Parameters<typeof load>[0]);

		expect(
			recordedWhereClauses.length,
			'keine WHERE-Klauseln aufgezeichnet — Mock greift nicht mehr'
		).toBeGreaterThan(5);

		const ohneFreigabebezug: string[] = [];
		const mitGeprueft: string[] = [];

		for (const clause of recordedWhereClauses) {
			const text = toSqlText(clause);
			if (!text.includes('freigegeben_am')) ohneFreigabebezug.push(text);
			if (text.includes('geprueft')) mitGeprueft.push(text);
		}

		expect(
			ohneFreigabebezug,
			`Abfrage(n) ohne Freigabebezug:\n${ohneFreigabebezug.join('\n')}`
		).toEqual([]);
		expect(mitGeprueft, `Abfrage(n) filtern noch auf geprueft:\n${mitGeprueft.join('\n')}`).toEqual(
			[]
		);
	});

	it('fährt die Kopfzahlen getrennt für freigegeben und offen', async () => {
		recordedWhereClauses = [];

		await load({} as unknown as Parameters<typeof load>[0]);

		const texte = recordedWhereClauses.map(toSqlText);

		// `loadBasicStats` läuft zweimal — einmal je Freigabestatus. Eine vermischte
		// Summe über beide soll strukturell unmöglich bleiben (Vorgabe 2).
		expect(texte.some((t) => /freigegeben_am"? is not null/i.test(t))).toBe(true);
		expect(texte.some((t) => /freigegeben_am"? is null/i.test(t))).toBe(true);
	});
});
