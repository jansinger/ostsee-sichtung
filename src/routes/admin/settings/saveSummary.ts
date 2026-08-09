/**
 * @fileoverview Die Rückmeldung von „Alle Änderungen speichern".
 *
 * **Der Befund.** `saveAllChanges` hängte seine Erfolgsmeldung an
 * `changedConfigs.size === 0`. Schlug eine von fünf Einstellungen fehl, blieb
 * deren Schlüssel in der Menge, die Bedingung war falsch — und es erschien
 * **gar keine** Meldung. Die Fehlermeldung des gescheiterten `saveConfig`
 * überlebte das nicht: Jeder folgende Aufruf überschrieb `errorMessage`, und
 * der letzte war im Regelfall ein erfolgreicher. Sichtbar blieb also nichts,
 * während vier Werte gespeichert waren und einer nicht.
 *
 * Die Zusammenfassung entsteht deshalb aus den gezählten Ausgängen statt aus
 * dem Zustand einer nebenbei mitgeführten Menge — dasselbe Muster wie
 * `buildBulkSummary` in der Sichtungstabelle.
 */

export interface SaveSummary {
	message: string;
	/** Steuert die Alert-Variante: Teilerfolg gehört nicht in ein grünes Feld. */
	hasFailures: boolean;
}

const einstellungen = (anzahl: number) =>
	anzahl === 1 ? '1 Einstellung' : `${anzahl} Einstellungen`;

export function buildSaveSummary(saved: number, failed: number): SaveSummary {
	if (failed === 0) {
		return saved === 0
			? { message: 'Keine Änderungen zu speichern', hasFailures: false }
			: { message: `${einstellungen(saved)} gespeichert`, hasFailures: false };
	}

	/*
	 * Die Zahl der gespeicherten Werte steht mit im Satz. Nur „2 fehlgeschlagen"
	 * zu melden ließe offen, ob die übrigen durchgelaufen sind — und genau das
	 * muss man wissen, um zu entscheiden, ob ein zweiter Versuch gefahrlos ist.
	 */
	if (saved === 0) {
		return {
			message: `Keine Einstellung gespeichert — ${failed} fehlgeschlagen`,
			hasFailures: true
		};
	}

	return {
		message: `${saved} von ${saved + failed} Einstellungen gespeichert — ${failed} fehlgeschlagen`,
		hasFailures: true
	};
}
