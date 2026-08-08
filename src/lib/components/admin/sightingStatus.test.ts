import { describe, expect, it } from 'vitest';
import {
	getSightingStatus,
	SIGHTING_STATUS_ORDER,
	SIGHTING_STATUS_PRESENTATION,
	verdictToStatus,
	type SightingStatus
} from './sightingStatus';

describe('getSightingStatus', () => {
	it('meldet „offen", wenn weder freigegeben noch abgelehnt', () => {
		expect(getSightingStatus({ approvedAt: null, rejectedAt: null })).toBe('open');
	});

	it('meldet „freigegeben", sobald freigegeben_am gesetzt ist', () => {
		expect(getSightingStatus({ approvedAt: new Date('2026-03-12'), rejectedAt: null })).toBe(
			'approved'
		);
	});

	it('meldet „abgelehnt", sobald abgelehnt_am gesetzt ist', () => {
		expect(getSightingStatus({ approvedAt: null, rejectedAt: new Date('2026-03-12') })).toBe(
			'rejected'
		);
	});

	/* Der Verify-Endpunkt setzt beide Spalten in EINEM Update und schließt diesen
	   Fall aus (0 Zeilen im Bestand, gemessen 2026-08-07). Der Test pinnt trotzdem
	   ein Ergebnis: Eine Ableitung, die je nach Auswertungsreihenfolge kippt, wäre
	   in der Tabelle nicht reproduzierbar. Freigabe gewinnt, weil sie der Zustand
	   ist, den die Öffentlichkeit sieht — die Anzeige darf ihn nicht verschweigen. */
	it('lässt bei (nie vorkommender) Doppelbelegung die Freigabe gewinnen', () => {
		expect(
			getSightingStatus({ approvedAt: new Date('2026-03-12'), rejectedAt: new Date('2026-03-13') })
		).toBe('approved');
	});

	/* Regression zum Bestandsbefund vom 2026-08-07: 22 Zeilen tragen geprueft = 1
	   ohne Freigabe, 9 tragen eine Freigabe ohne geprueft = 1. Die Ableitung darf
	   `geprueft` deshalb nicht einmal als Hinweis lesen. */
	it('ignoriert `verified` vollständig', () => {
		const quelle = { approvedAt: null, rejectedAt: null, verified: 1 };
		expect(getSightingStatus(quelle)).toBe('open');
	});

	it('versteht ISO-Strings aus der JSON-Serialisierung', () => {
		expect(getSightingStatus({ approvedAt: '2026-03-12T10:00:00.000Z', rejectedAt: null })).toBe(
			'approved'
		);
	});

	/* Regression zu Befund 4 (Review Task 5): `FrontendSighting` führt beide
	   Felder als `Date | null | undefined`, `SightingStatusSource` bislang nur
	   `Date | string | null` — die Aufrufstellen in `+page.svelte` normalisierten
	   deshalb mit `?? null`. Das Interface erlaubt `undefined` jetzt direkt; die
	   Truthiness-Prüfung oben behandelt es wie `null`. */
	it('meldet „offen", wenn beide Felder undefined sind', () => {
		expect(getSightingStatus({ approvedAt: undefined, rejectedAt: undefined })).toBe('open');
	});
});

describe('SIGHTING_STATUS_PRESENTATION', () => {
	it('deckt alle drei Zustände ab', () => {
		for (const status of SIGHTING_STATUS_ORDER) {
			expect(SIGHTING_STATUS_PRESENTATION[status]).toBeDefined();
		}
		expect(SIGHTING_STATUS_ORDER).toEqual(['open', 'approved', 'rejected']);
	});

	it('ordnet jedem Zustand das Verdict zu, das ihn herstellt', () => {
		expect(SIGHTING_STATUS_PRESENTATION.open.verdict).toBe('reset');
		expect(SIGHTING_STATUS_PRESENTATION.approved.verdict).toBe('approve');
		expect(SIGHTING_STATUS_PRESENTATION.rejected.verdict).toBe('reject');
	});

	it('benennt die Zustände wie die Oberfläche', () => {
		expect(SIGHTING_STATUS_PRESENTATION.open.label).toBe('Offen');
		expect(SIGHTING_STATUS_PRESENTATION.approved.label).toBe('Freigegeben');
		expect(SIGHTING_STATUS_PRESENTATION.rejected.label).toBe('Abgelehnt');
	});

	it('trennt Zustandswort und Handlungswort', () => {
		expect(SIGHTING_STATUS_PRESENTATION.approved.actionLabel).toBe('Freigeben');
		expect(SIGHTING_STATUS_PRESENTATION.rejected.actionLabel).toBe('Ablehnen');
		expect(SIGHTING_STATUS_PRESENTATION.open.actionLabel).toBe('Zurücksetzen');
	});

	/* `.claude/rules/design-system.md`: Statusfarben sind Flächenfarben. Ein
	   `-strong`-Suffix hinter `badge-` wäre ein Verstoß, ein `text-`-Präfix hier
	   ebenfalls. */
	it('führt ausschließlich Flächenfarben', () => {
		for (const status of SIGHTING_STATUS_ORDER) {
			const klasse = SIGHTING_STATUS_PRESENTATION[status].badgeClass;
			expect(klasse.startsWith('badge-')).toBe(true);
			expect(klasse).not.toContain('-strong');
		}
	});

	it('kehrt Verdict und Zustand verlustfrei ineinander um', () => {
		for (const status of SIGHTING_STATUS_ORDER) {
			expect(verdictToStatus(SIGHTING_STATUS_PRESENTATION[status].verdict)).toBe(status);
		}
	});

	it('gibt jedem Zustand ein eigenes Icon', () => {
		const icons = SIGHTING_STATUS_ORDER.map(
			(s: SightingStatus) => SIGHTING_STATUS_PRESENTATION[s].icon
		);
		expect(new Set(icons).size).toBe(3);
	});
});
