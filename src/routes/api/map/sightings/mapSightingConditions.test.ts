import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { mapSightingConditions } from './publicMapConditions';

/**
 * Der Test prüft nicht das erzeugte SQL im Wortlaut — das wäre eine zweite
 * Quelle neben Drizzle. Er prüft die Struktur: wie viele Bedingungen
 * entstehen, und dass die Statusbedingung mit der Zahl der gewählten
 * Zustände von einer Einzelbedingung zu einer Disjunktion wechselt.
 *
 * Der Vergleich läuft über `PgDialect().sqlToQuery(...)`, nicht über
 * `JSON.stringify`: Die von Drizzle erzeugten SQL-Objekte referenzieren die
 * Tabelle über ihre Spalten selbst (Spalte -> Tabelle -> Spalte …), und
 * `JSON.stringify` bricht daran mit "Converting circular structure to JSON"
 * ab — bereits bei einer einzelnen `isNotNull(...)`-Bedingung, unabhängig von
 * dieser Funktion. Gleiches Muster wie in
 * `src/routes/admin/sichtungen/statusFilter.test.ts`.
 */
const dialect = new PgDialect();
const toSqlText = (condition: SQL): string => dialect.sqlToQuery(condition).sql;
const toSqlTextArray = (conditions: SQL[]): string[] => conditions.map(toSqlText);

describe('mapSightingConditions', () => {
	it('liefert ohne Argument die öffentliche Grundmenge (Status + 6 Koordinatenprüfungen)', () => {
		expect(mapSightingConditions()).toHaveLength(7);
	});

	it('liefert für jede Auswahl genau eine Statusbedingung', () => {
		expect(mapSightingConditions(['open'])).toHaveLength(7);
		expect(mapSightingConditions(['open', 'approved'])).toHaveLength(7);
		expect(mapSightingConditions(['open', 'approved', 'rejected'])).toHaveLength(7);
	});

	it('unterscheidet die Statusbedingung nach Auswahl', () => {
		// Non-null-Assertion statt Destrukturierung: `noUncheckedIndexedAccess`
		// kennt die durch den ersten Test belegte Länge 7 nicht statisch.
		const approved = mapSightingConditions(['approved'])[0]!;
		const open = mapSightingConditions(['open'])[0]!;
		const all = mapSightingConditions(['open', 'approved', 'rejected'])[0]!;

		expect(toSqlText(approved)).not.toBe(toSqlText(open));
		expect(toSqlText(all)).not.toBe(toSqlText(approved));
	});

	it('behandelt eine leere Auswahl wie die öffentliche Grundmenge', () => {
		// Defensiv: resolveMapStatuses lässt eine leere Auswahl gar nicht durch
		// (Aufgabe 1, 400). Käme sie doch hier an, ist die restriktive Menge die
		// richtige Antwort — nicht "alles".
		expect(toSqlTextArray(mapSightingConditions([]))).toEqual(
			toSqlTextArray(mapSightingConditions())
		);
	});
});
