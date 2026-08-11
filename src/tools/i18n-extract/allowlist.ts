/**
 * Die strukturelle Entscheidung des Extraktors: Was wird zu einer Botschaft?
 *
 * **Diese Datei entscheidet nie nach Inhalt.** `classifyText` aus
 * `i18n-inventory.ts` liegt an vier belegten Stellen falsch — es hält
 * `meta.type: 'toggle'` für möglicherweise sprachlich und
 * `'Foto-/Videobeschreibung'` für einen MIME-Typ (case-insensitives Muster,
 * i18n-inventory.ts:93). Für ein Werkzeug, das vorschlägt, ist das folgenlos;
 * für eines, das ersetzt, ist es der Unterschied zwischen einer heilen und
 * einer kaputten Anwendung.
 *
 * Die beiden Listen sind unterschiedlich streng, und das ist Absicht:
 *
 *  - **meta-Schlüssel: geschlossen.** Ein unbekannter Schlüssel bricht ab. Er
 *    könnte sprachlich sein und bliebe sonst still deutsch — ein Fehler, den
 *    nachher niemand sieht.
 *  - **Yup-Regeln: offen.** Eine unbekannte Regel wird schlicht nicht
 *    extrahiert. Die meisten Yup-Methoden (`default`, `when`, `transform`,
 *    `shape`, `of`, `nullable`) tragen keine Meldung; ein Abbruch dort wäre
 *    unbrauchbar. Die Restlücke — eine meldungstragende Regel, die hier fehlt —
 *    fängt der Hartcodiert-Scan aus Aufgabe 5.
 */

/** Warum eine Zeichenkette nicht extrahiert wird — erscheint im Trockenlauf. */
export type SkipReason =
	| 'meta-key-denied'
	| 'meta-key-unknown'
	| 'test-name-argument'
	| 'non-literal-argument'
	| 'numeric-only'
	| 'empty-string'
	// Trifft, wenn `collectFormOptionsSites` auf eine Stelle stößt, die
	// String-Literale trägt, aber vom `export const x: Record<Enum, string>`-
	// Muster nicht erfasst wird: ein Record mit einem anderen Wertetyp
	// (z.B. `Record<Enum, SpeciesIdentificationEntry>`), ein exportiertes
	// Array-Literal, oder ein Rückfalltext in einer `return`-Anweisung einer
	// exportierten Funktion. Ohne diesen Grund blieben solche Stellen unsichtbar
	// übersprungen — nicht eingesammelt UND nicht gemeldet. Ein Mensch muss hier
	// von Hand entscheiden, ob und wie extrahiert wird; das Werkzeug kann die
	// Struktur nicht auf Anhieb in Schlüssel und Text zerlegen.
	| 'record-pattern-miss';

export type MetaDecision =
	| { kind: 'extract' }
	| { kind: 'skip'; reason: SkipReason; explanation: string }
	| { kind: 'unknown'; reason: 'meta-key-unknown'; explanation: string };

export type ValueCheck = { ok: true } | { ok: false; reason: SkipReason; explanation: string };

/** Die sprachlichen `meta`-Schlüssel. Gemessen: 53 + 29 + 52 Vorkommen. */
export const TRANSLATABLE_META_KEYS = ['helpText', 'placeholder', 'valueText'] as const;

/**
 * Die nicht-sprachlichen `meta`-Schlüssel, mit Begründung je Eintrag.
 *
 * `icon`, `options` und `step` tauchen im Inventar nicht auf, weil ihre Werte
 * keine String-Literale sind (`icon: Wind`, `options: getWindDirectionOptions()`).
 * Ohne sie führe die geschlossene Liste oben am ersten Tag zum Abbruch.
 */
const META_DENY_REASONS: Record<string, string> = {
	type: 'meta.type steuert den FieldRenderer, kein Anzeigetext',
	icon: 'meta.icon trägt einen Icon-Bezeichner (lucide:anchor)',
	options: 'meta.options ruft Schicht B auf, keine Zeichenkette',
	autocomplete: 'meta.autocomplete trägt normierte HTML-Werte (postal-code)',
	step: 'meta.step ist eine Zahlenschrittweite'
};

// Befund F: Es gab hier eine `NON_TRANSLATABLE_META_KEYS`-Konstante
// (Object.keys(META_DENY_REASONS)), die außer dem eigenen Test niemand
// benutzte. Entfernt statt exportiert zu lassen — META_DENY_REASONS ist die
// einzige Quelle der Wahrheit, ein zweiter abgeleiteter Export war
// redundant. Der Test prüft die Überschneidungsfreiheit mit
// TRANSLATABLE_META_KEYS jetzt über das Verhalten von metaKeyDecision.

export function metaKeyDecision(key: string): MetaDecision {
	if ((TRANSLATABLE_META_KEYS as readonly string[]).includes(key)) {
		return { kind: 'extract' };
	}
	const denyReason = META_DENY_REASONS[key];
	if (denyReason !== undefined) {
		return { kind: 'skip', reason: 'meta-key-denied', explanation: denyReason };
	}
	return {
		kind: 'unknown',
		reason: 'meta-key-unknown',
		explanation: `meta.${key} steht weder in TRANSLATABLE_META_KEYS noch in NON_TRANSLATABLE_META_KEYS`
	};
}

/**
 * An welcher Argumentposition die Meldung einer Yup-Regel steht.
 *
 * `test` ist der Sonderfall, der Aufmerksamkeit verdient: `.test(name, message, fn)`.
 * Argument 0 ist der Testname, er erscheint als `errors[field].type` und wird
 * maschinell ausgewertet.
 */
const MESSAGE_ARGUMENT_INDEX: Record<string, number> = {
	required: 0,
	email: 0,
	url: 0,
	typeError: 0,
	min: 1,
	max: 1,
	length: 1,
	matches: 1,
	oneOf: 1,
	notOneOf: 1,
	test: 1
};

export function messageArgumentIndex(method: string): number | undefined {
	return MESSAGE_ARGUMENT_INDEX[method];
}

/** Prüft den Wert selbst — die einzige inhaltliche Prüfung, und sie ist eng. */
export function checkValue(text: string): ValueCheck {
	if (text.trim().length === 0) {
		return {
			ok: false,
			reason: 'empty-string',
			explanation: 'leere Zeichenkette ist keine Botschaft'
		};
	}
	if (/^\d+$/.test(text.trim())) {
		return {
			ok: false,
			reason: 'numeric-only',
			explanation: 'rein numerisch — in jeder Sprache derselbe Text'
		};
	}
	return { ok: true };
}
