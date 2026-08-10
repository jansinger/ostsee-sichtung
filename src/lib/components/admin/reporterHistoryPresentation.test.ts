/**
 * @fileoverview Stufen der Melder-Historie — Schwellen und Wortlaut.
 *
 * Die Schwellen (3 / 10 / ⅓) sind eine Produktentscheidung (Jan, 2026-08-10)
 * und stehen deshalb hier als Test und nicht nur als Konstante: Eine Zahl, die
 * niemand nachrechnet, verschiebt sich beim nächsten Umbau unbemerkt.
 */
import { describe, expect, it } from 'vitest';
import type { ReporterHistory } from '$lib/types/reporterHistory';
import {
	REPORTER_ESTABLISHED_THRESHOLD,
	REPORTER_KNOWN_THRESHOLD,
	REPORTER_LEVEL_PRESENTATION,
	getReporterLevel,
	reporterBadgeText
} from './reporterHistoryPresentation';

function historie(overrides: Partial<ReporterHistory> = {}): ReporterHistory {
	return { approved: 0, rejected: 0, open: 0, since: '2019-03-04T08:00:00Z', ...overrides };
}

describe('getReporterLevel', () => {
	it('liefert null ohne Daten — dann gibt es nichts zu behaupten', () => {
		expect(getReporterLevel(null)).toBeNull();
		expect(getReporterLevel(undefined)).toBeNull();
	});

	it('nennt einen Melder ohne jede weitere Meldung „first"', () => {
		expect(getReporterLevel(historie())).toBe('first');
	});

	/* „Nur offene Meldungen" ist nicht dasselbe wie „Erstmeldung": Ein Schwall
	   von fünf Meldungen einer unbekannten Adresse ist genau der Fall, den die
	   Triage sehen muss. Offen zählt trotzdem nirgends negativ. */
	it('unterscheidet unbearbeitete Vorgeschichte von der Erstmeldung', () => {
		expect(getReporterLevel(historie({ open: 4 }))).toBe('pending');
	});

	it('steigt bei 3 Freigaben auf „known" und bei 10 auf „established"', () => {
		expect(getReporterLevel(historie({ approved: REPORTER_KNOWN_THRESHOLD - 1 }))).toBe('new');
		expect(getReporterLevel(historie({ approved: REPORTER_KNOWN_THRESHOLD }))).toBe('known');
		expect(getReporterLevel(historie({ approved: REPORTER_ESTABLISHED_THRESHOLD - 1 }))).toBe(
			'known'
		);
		expect(getReporterLevel(historie({ approved: REPORTER_ESTABLISHED_THRESHOLD }))).toBe(
			'established'
		);
	});

	/* Eine einzelne Ablehnung unter vielen Freigaben ist kein Warnsignal —
	   sonst trüge jeder langjährige Melder nach einem Fehlgriff dauerhaft ein
	   gelbes Badge. Ausschlaggebend ist der Anteil, nicht das Vorkommen. */
	it('warnt erst ab einem Drittel abgelehnter Meldungen', () => {
		expect(getReporterLevel(historie({ approved: 29, rejected: 1 }))).toBe('established');
		expect(getReporterLevel(historie({ approved: 2, rejected: 1 }))).toBe('flagged');
		expect(getReporterLevel(historie({ approved: 0, rejected: 1 }))).toBe('flagged');
	});

	/* Offene Meldungen gehen in den Anteil nicht ein: Bis 2026-08 gab es die
	   Ablehnung gar nicht, unbearbeitete Altmeldungen sind Bearbeitungsstau. */
	it('rechnet offene Meldungen nicht in den Anteil ein', () => {
		expect(getReporterLevel(historie({ approved: 3, rejected: 1, open: 40 }))).toBe('flagged');
	});
});

describe('reporterBadgeText', () => {
	it('nennt die Zahl, auf die es je Stufe ankommt', () => {
		expect(reporterBadgeText('first', historie())).toBe('Erstmeldung');
		expect(reporterBadgeText('pending', historie({ open: 4 }))).toBe('Melder: 4 offen');
		expect(reporterBadgeText('new', historie({ approved: 2 }))).toBe('Melder: 2 freigegeben');
		expect(reporterBadgeText('established', historie({ approved: 23 }))).toBe(
			'Melder: 23 freigegeben'
		);
		expect(reporterBadgeText('flagged', historie({ approved: 2, rejected: 2 }))).toBe(
			'Melder: 2 von 4 abgelehnt'
		);
	});
});

describe('REPORTER_LEVEL_PRESENTATION', () => {
	/* `badge-success` wäre neben dem Freigeben-Knopf eine Aussage über die
	   Meldung, nicht über den Melder — dieselbe Begründung wie bei der Stufe
	   `clean` in `spamScorePresentation.ts`. */
	it('reserviert Farbe für die Warnstufe und lässt den Rest neutral', () => {
		expect(REPORTER_LEVEL_PRESENTATION.flagged.badgeClass).toBe('badge-warning');
		for (const level of ['first', 'pending', 'new', 'known', 'established'] as const) {
			expect(REPORTER_LEVEL_PRESENTATION[level].badgeClass).toBe('badge-ghost');
		}
	});

	it('gibt jeder Stufe ein Icon — Farbe trägt die Bedeutung nicht allein', () => {
		for (const presentation of Object.values(REPORTER_LEVEL_PRESENTATION)) {
			expect(presentation.icon).toMatch(/^lucide:/);
			expect(presentation.description.length).toBeGreaterThan(0);
		}
	});
});
