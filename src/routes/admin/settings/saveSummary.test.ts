import { describe, expect, it } from 'vitest';
import { buildSaveSummary } from './saveSummary';

/**
 * saveSummary.test.ts — „Alle speichern" meldet auch den Teilfehlschlag.
 *
 * **Der Befund.** `saveAllChanges` setzte seine Erfolgsmeldung hinter die
 * Bedingung `changedConfigs.size === 0`. Schlug eine von fünf Einstellungen
 * fehl, blieb dieser Schlüssel in `changedConfigs` — die Bedingung war falsch,
 * und es erschien **gar keine** Meldung. Die Fehlermeldung aus `saveConfig`
 * überlebte das nicht: Jeder weitere Durchlauf überschrieb `errorMessage`, und
 * der letzte Aufruf war im Regelfall ein erfolgreicher. Sichtbar blieb also
 * nichts, während vier von fünf Werten gespeichert waren und einer nicht.
 *
 * Die Zusammenfassung entsteht deshalb aus den gezählten Ausgängen und nicht
 * aus dem Zustand einer Menge, die nebenbei mitgeführt wird — dasselbe Muster
 * wie `buildBulkSummary` in der Sichtungstabelle.
 */
describe('buildSaveSummary', () => {
	it('meldet den vollständigen Erfolg', () => {
		expect(buildSaveSummary(3, 0)).toEqual({
			message: '3 Einstellungen gespeichert',
			hasFailures: false
		});
	});

	it('nennt die Einzahl im Singular', () => {
		expect(buildSaveSummary(1, 0)).toEqual({
			message: '1 Einstellung gespeichert',
			hasFailures: false
		});
	});

	/*
	 * Der Fall, um den es geht: Die Zahl der gespeicherten Werte steht mit im
	 * Satz. Nur „2 fehlgeschlagen" zu melden, ließe offen, ob die übrigen drei
	 * durchgelaufen sind — und genau das muss man wissen, um zu entscheiden, ob
	 * man den Vorgang wiederholen darf.
	 */
	it('nennt bei einem Teilfehlschlag beide Zahlen', () => {
		expect(buildSaveSummary(3, 2)).toEqual({
			message: '3 von 5 Einstellungen gespeichert — 2 fehlgeschlagen',
			hasFailures: true
		});
	});

	it('meldet den vollständigen Fehlschlag ohne Erfolgszahl', () => {
		expect(buildSaveSummary(0, 2)).toEqual({
			message: 'Keine Einstellung gespeichert — 2 fehlgeschlagen',
			hasFailures: true
		});
	});

	it('meldet, wenn es nichts zu speichern gab', () => {
		expect(buildSaveSummary(0, 0)).toEqual({
			message: 'Keine Änderungen zu speichern',
			hasFailures: false
		});
	});
});
