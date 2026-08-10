/**
 * @fileoverview Stufe der Melder-Historie — Wort, Farbe, Icon, Schwellen.
 *
 * Eine Quelle für beide Anzeigestellen (Eingangskarte, Kontakt-Karte der
 * Detailansicht), nach dem Vorbild von `SPAM_RISK_PRESENTATION` und
 * `SIGHTING_STATUS_PRESENTATION`.
 *
 * **Die Historie ist kein zweiter Spam-Score.** Sie senkt keinen Score, ändert
 * keine Sichtbarkeit und trifft keine Entscheidung — sie sagt nur, was über
 * diese Adresse schon bekannt ist. Die E-Mail ist nicht verifiziert; wer sie
 * kennt, kann sie eintragen. Deshalb ausschließlich Anzeige (Abgrenzung und
 * Messwerte in `docs/SPAM_DETECTION.md`).
 *
 * Client-sicher: nur der Typ aus `$lib/types/reporterHistory`, kein Import aus
 * `$lib/server/**`.
 */
import type { ReporterHistory } from '$lib/types/reporterHistory';

export type ReporterLevel = 'first' | 'pending' | 'new' | 'known' | 'established' | 'flagged';

/** Ab so vielen Freigaben gilt ein Melder als bekannt (Entscheidung Jan, 2026-08-10). */
export const REPORTER_KNOWN_THRESHOLD = 3;

/** Ab so vielen Freigaben als etabliert (Entscheidung Jan, 2026-08-10). */
export const REPORTER_ESTABLISHED_THRESHOLD = 10;

/**
 * Ab diesem Verhältnis von Ablehnungen zu bearbeiteten Meldungen wird gewarnt.
 *
 * Verhältnis und nicht Vorkommen: Eine einzelne Ablehnung unter 29 Freigaben
 * ist ein Fehlgriff, kein Muster — ein dauerhaftes Warn-Badge dafür wäre
 * schlicht falsch. Offene Meldungen gehen nicht in den Nenner ein: Die
 * Ablehnung existiert erst seit 2026-08, unbearbeitete Altmeldungen sind
 * Bearbeitungsstau und kein Qualitätsurteil.
 *
 * Bezugsgröße sind die bearbeiteten Meldungen (Freigaben + Ablehnungen), nicht
 * allein die Freigaben: Bei zwei Freigaben und einer Ablehnung greift die
 * Warnung genau an der Drittel-Schwelle (1 Ablehnung auf 3 bearbeitete
 * Meldungen). `rejected > 0` ist Vorbedingung, damit ein Melder ohne jede
 * bearbeitete Meldung nicht durch eine Division durch 0 fälschlich als
 * `flagged` gilt.
 */
export const REPORTER_FLAGGED_RATIO = 1 / 3;

/**
 * Die Stufe aus den Zahlen — `null`, wo es keine Zahlen gibt.
 *
 * `null` heißt „nicht ermittelt" (Abfrage fehlgeschlagen, keine Adresse) und
 * bekommt bewusst **kein** Badge. Ein graues „Melder: –" läse sich wie ein
 * Befund und wäre die Abwesenheit eines Befunds — dieselbe Unterscheidung wie
 * bei `spam_score IS NULL`.
 */
export function getReporterLevel(
	history: ReporterHistory | null | undefined
): ReporterLevel | null {
	if (!history) return null;

	const { approved, rejected, open } = history;

	if (rejected > 0 && rejected / (approved + rejected) >= REPORTER_FLAGGED_RATIO) return 'flagged';
	if (approved >= REPORTER_ESTABLISHED_THRESHOLD) return 'established';
	if (approved >= REPORTER_KNOWN_THRESHOLD) return 'known';
	if (approved > 0) return 'new';
	if (open > 0) return 'pending';
	return 'first';
}

export interface ReporterLevelPresentation {
	/** Flächenfarbe — ohne `-strong`-Suffix (`.claude/rules/design-system.md`). */
	badgeClass: string;
	/**
	 * Die Fläche, die die Stufe sichtbar macht — leer, wo es nichts zu
	 * unterscheiden gibt.
	 *
	 * **Warum es das Feld gibt.** `new`, `known` und `established` trugen
	 * dieselbe Fläche, dasselbe Icon und denselben Text („Melder: N
	 * freigegeben"); die Schwellen 3 und 10 änderten damit nur das Adjektiv im
	 * Tooltip. Ein Bearbeiter sah bei 3 Freigaben dasselbe Badge wie bei 30
	 * (Entscheidung Jan, 2026-08-10).
	 *
	 * **Erst ein Rahmen, dann ein Tint.** Die erste Fassung setzte hier
	 * `border-base-content/25` bzw. `border-primary/45`. Im Betrieb war davon
	 * nichts zu erkennen: Ein 1px-Rahmen auf einer `badge-ghost`-Fläche
	 * verschwindet zwischen den übrigen Badges der Karte. Deshalb jetzt eine
	 * Tönung — sie belegt dieselbe Fläche wie das Badge selbst und ist damit
	 * auch beim Überfliegen einer 50-Karten-Liste sichtbar.
	 *
	 * **Primärfarbe und ausdrücklich nicht `success`.** Ein grüner Tint neben
	 * dem Freigeben-Knopf wäre ein Urteil über die **Meldung** („kann durch");
	 * die Markenfarbe zeichnet die **Adresse** aus, ohne etwas zu behaupten.
	 * Dieselbe Begründung, aus der `badgeClass` nirgends `badge-success` trägt.
	 *
	 * **Auf einem Tint gilt `text-base-content`, nie `*-content`**
	 * (`.claude/rules/design-system.md`). Das Badge erbt seine Textfarbe von
	 * `badge-ghost` und bekommt hier bewusst keine eigene — ein
	 * `text-primary-content` (Weiß) auf 10 % Tönung ergäbe rund 1,3:1.
	 *
	 * Der Tint bleibt **redundant**: Die Zahl im Text trägt die Aussage
	 * weiterhin allein (WCAG 1.4.1). Und `flagged` bekommt keinen — dort trägt
	 * die Warnfläche, eine zweite Tönung wäre doppelt gemoppelt.
	 */
	accentClass: string;
	/** Icon-Name für `$lib/components/Icon.svelte` — die farbunabhängige Unterscheidung. */
	icon: string;
	/** Was die Stufe bedeutet — als `title` und für Screenreader. */
	description: string;
}

export const REPORTER_LEVEL_PRESENTATION: Record<ReporterLevel, ReporterLevelPresentation> = {
	first: {
		badgeClass: 'badge-ghost',
		accentClass: '',
		icon: 'lucide:user-plus',
		description: 'Erste Meldung dieser E-Mail-Adresse — keine Vorgeschichte im Bestand'
	},
	pending: {
		badgeClass: 'badge-ghost',
		accentClass: '',
		icon: 'lucide:users',
		description: 'Weitere Meldungen dieser Adresse sind selbst noch unbearbeitet'
	},
	new: {
		badgeClass: 'badge-ghost',
		accentClass: '',
		icon: 'lucide:user-check',
		description: 'Einzelne frühere Meldungen dieser Adresse wurden freigegeben'
	},
	known: {
		badgeClass: 'badge-ghost',
		accentClass: 'bg-primary/10',
		icon: 'lucide:user-check',
		description: 'Mehrere frühere Meldungen dieser Adresse wurden freigegeben'
	},
	established: {
		badgeClass: 'badge-ghost',
		accentClass: 'bg-primary/20',
		/* Nicht „langjährig": Die Stufe zählt Freigaben, nicht Dauer — zehn
		   Meldungen können aus einer Woche stammen. Wie lange die Adresse meldet,
		   sagt `since` in der Detailansicht, und zwar getrennt davon. */
		icon: 'lucide:user-check',
		description: 'Viele frühere Meldungen dieser Adresse wurden freigegeben'
	},
	flagged: {
		badgeClass: 'badge-warning',
		accentClass: '',
		icon: 'lucide:user-x',
		description: 'Ein erheblicher Teil der bearbeiteten Meldungen dieser Adresse wurde abgelehnt'
	}
};

/**
 * Der Badge-Text — jede Stufe nennt die Zahl, auf die es ankommt.
 *
 * Eine Zahl statt eines Urteils: „23 freigegeben" ist überprüfbar, „hohe
 * Reputation" ist eine Behauptung.
 */
export function reporterBadgeText(level: ReporterLevel, history: ReporterHistory): string {
	if (level === 'first') return 'Erstmeldung';
	if (level === 'pending') return `Melder: ${history.open} offen`;
	if (level === 'flagged') {
		return `Melder: ${history.rejected} von ${history.approved + history.rejected} abgelehnt`;
	}
	return `Melder: ${history.approved} freigegeben`;
}
