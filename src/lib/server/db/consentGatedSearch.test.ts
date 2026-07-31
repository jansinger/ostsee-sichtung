/**
 * @fileoverview Tests für die geteilte, consent-gegatete Personensuche.
 *
 * Der Nutzen des Moduls ist, dass die beiden öffentlichen Flächen
 * (`/sichtungen/showreports.json` und `/api/map/sightings`) **dieselbe**
 * Teilmenge freigeben — genau damit begründet
 * `docs/LEGACY_API_SPECIFICATION.md` die Abweichung von der Spezifikation.
 * Diese Tests schreiben deshalb nicht nur das Escaping fest, sondern auch,
 * dass das Consent-Gate zu beiden Operatoren identisch aufgebaut ist.
 */

import { describe, expect, it } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { consentGatedNameSearch, containsPattern, escapeLikePattern } from './consentGatedSearch';

const dialect = new PgDialect();

function render(fragment: SQL): { text: string; params: unknown[] } {
	const query = dialect.sqlToQuery(fragment);
	return { text: query.sql, params: query.params };
}

describe('escapeLikePattern', () => {
	it('escaped die LIKE-Wildcards % und _', () => {
		// Ohne Escaping matcht `%` jeden Datensatz und `_` jedes Einzelzeichen —
		// das verstärkt das Membership-Orakel über personenbezogene Felder.
		expect(escapeLikePattern('50%_x')).toBe('50\\%\\_x');
	});

	it('escaped den Escape-Zeichen-Backslash selbst', () => {
		// Sonst könnte ein Suchbegriff das nachfolgende Zeichen entwerten.
		expect(escapeLikePattern('a\\b')).toBe('a\\\\b');
	});

	it('lässt gewöhnliche Suchbegriffe unverändert', () => {
		expect(escapeLikePattern('Schneider')).toBe('Schneider');
	});

	it('trimmt nicht — das Trimmen gehört zu containsPattern', () => {
		expect(escapeLikePattern('  Wal  ')).toBe('  Wal  ');
	});
});

describe('containsPattern', () => {
	it('umschließt den escapten Begriff mit %', () => {
		expect(containsPattern('50%_x')).toBe('%50\\%\\_x%');
	});

	it('trimmt den Suchbegriff', () => {
		// Beide Flächen müssen denselben Begriff suchen. Das Map-Frontend trimmt
		// bereits (urlFilterState.ts), handgebaute URLs bisher nicht.
		expect(containsPattern('  Wal  ')).toBe('%Wal%');
	});

	it('erzeugt für einen reinen Whitespace-Begriff das leere Contains-Muster', () => {
		expect(containsPattern('   ')).toBe('%%');
	});
});

describe('consentGatedNameSearch', () => {
	it('durchsucht Vor- und Nachname nur bei namensnennung = 1', () => {
		const { text } = render(consentGatedNameSearch('%Private%', 'LIKE'));

		expect(text).toContain('"vorname"');
		expect(text).toContain('"name"');
		expect(text).toMatch(/"namensnennung"\s*=\s*1/);
	});

	it('durchsucht den Schiffsnamen nur bei schiffnamensnennung = 1', () => {
		const { text } = render(consentGatedNameSearch('%Yacht%', 'LIKE'));

		expect(text).toContain('"schiffsname"');
		expect(text).toMatch(/"schiffnamensnennung"\s*=\s*1/);
	});

	it('durchsucht die E-Mail-Adresse nie', () => {
		// Das Feld ist in keiner öffentlichen Response enthalten; eine Suche
		// darüber hätte für öffentliche Clients keinen legitimen Zweck.
		const { text } = render(consentGatedNameSearch('%melder@example.com%', 'ILIKE'));

		expect(text).not.toContain('"email"');
	});

	it('gibt das Suchmuster als Parameter aus, nicht als SQL-Literal', () => {
		const { params } = render(consentGatedNameSearch('%50\\%\\_x%', 'LIKE'));

		expect(params).toContain('%50\\%\\_x%');
	});

	it('setzt die ESCAPE-Klausel für jedes Feld', () => {
		const { text } = render(consentGatedNameSearch('%x%', 'LIKE'));

		// Drei Felder: vorname, name, schiffsname.
		expect(text.match(/ESCAPE/g)).toHaveLength(3);
	});

	it('erzeugt mit ILIKE case-insensitive Vergleiche', () => {
		// Die Legacy-Route ist vertraglich case-insensitiv.
		const { text } = render(consentGatedNameSearch('%x%', 'ILIKE'));

		expect(text.match(/ILIKE/g)).toHaveLength(3);
		// Kein Feld darf auf das case-sensitive LIKE zurückfallen.
		expect(text).not.toMatch(/(?<!I)LIKE/);
	});

	it('erzeugt mit LIKE case-sensitive Vergleiche', () => {
		const { text } = render(consentGatedNameSearch('%x%', 'LIKE'));

		expect(text).not.toContain('ILIKE');
		expect(text.match(/LIKE/g)).toHaveLength(3);
	});

	it('unterscheidet sich zwischen LIKE und ILIKE ausschließlich im Operator', () => {
		// Kern der Zusammenführung: Die Gate-Struktur darf zwischen den beiden
		// öffentlichen Flächen nicht auseinanderlaufen.
		const withLike = render(consentGatedNameSearch('%x%', 'LIKE'));
		const withIlike = render(consentGatedNameSearch('%x%', 'ILIKE'));

		expect(withIlike.text.replace(/ILIKE/g, 'LIKE')).toBe(withLike.text);
		expect(withIlike.params).toEqual(withLike.params);
	});
});
