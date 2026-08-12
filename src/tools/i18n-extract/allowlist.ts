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
 *  - **Yup-Regeln: offen, aber nicht mehr STUMM offen.** Eine unbekannte Regel
 *    wird weiterhin nicht extrahiert — ein Abbruch wäre unbrauchbar, weil die
 *    meisten Yup-Methoden (`default`, `when`, `transform`, `shape`, `of`, …,
 *    siehe `NO_MESSAGE_METHOD_REASONS`) keine Meldung tragen. Bis Aufgabe 4
 *    verschwand eine unbekannte Regel mit String-Literal-Argument dabei aber
 *    komplett — weder Fund noch Übersprungen. Genau das traf `.integer(message)`
 *    an vier Feldern (totalCount, juvenileCount, deadSize, shipCount): Der
 *    Extraktor meldete nichts, die vier Meldungen blieben in jeder Sprache
 *    deutsch, bis sie von Hand nachgetragen wurden. Der in der ursprünglichen
 *    Begründung angekündigte Hartcodiert-Scan (Aufgabe 5) existiert nicht — die
 *    Lücke war nicht abgefangen, sie war offen.
 *
 *    Seit Aufgabe 4 gilt deshalb: Jeder Aufruf `.methode(…)` mit mindestens
 *    einem direkten String-Literal-Argument, dessen Methode weder eine bekannte
 *    Meldungsposition hat (`MESSAGE_ARGUMENT_INDEX`) noch als meldungsfrei
 *    bekannt ist (`NO_MESSAGE_METHOD_REASONS`), wird als `skipped` mit Grund
 *    `method-unknown` gemeldet — nicht extrahiert (die Methode könnte immer
 *    noch strukturell etwas anderes als eine Meldung tragen), aber sichtbar.
 */

/** Warum eine Zeichenkette nicht extrahiert wird — erscheint im Trockenlauf. */
export type SkipReason =
	| 'meta-key-denied'
	| 'meta-key-unknown'
	| 'test-name-argument'
	| 'non-literal-argument'
	| 'numeric-only'
	| 'empty-string'
	// Schicht A/B sind umgebaut: Das Argument ist bereits ein Aufruf einer
	// Paraglide-Botschaftsfunktion (`m.<schlüssel>({}, { locale })`), also
	// erledigte Arbeit, kein offener Fall. Ohne diesen eigenen Grund landeten
	// diese Stellen unter 'non-literal-argument' und füllten den Abschnitt
	// „Übersprungen — bitte durchsehen" mit Fehlalarmen über bereits
	// übersetzten Code (Befund: 132 von 188 Übersprungenen nach dem Umbau von
	// sightingSchema.ts). Der Bericht zählt sie weiterhin (render.ts), listet
	// sie aber nicht mehr einzeln auf.
	| 'already-translated'
	// Ein Aufruf `.methode(literal)`, dessen Methode weder in
	// MESSAGE_ARGUMENT_INDEX noch in NO_MESSAGE_METHOD_REASONS steht — die
	// einzige Stelle, an der ein Mensch bemerkt, dass eine der beiden Listen zu
	// eng ist (siehe Dateikopf).
	| 'method-unknown'
	// Trifft, wenn `collectFormOptionsSites` auf eine Stelle stößt, die
	// String-Literale trägt, aber vom `export const x: Record<Enum, string>`-
	// Muster nicht erfasst wird: ein Record mit einem anderen Wertetyp
	// (z.B. `Record<Enum, SpeciesIdentificationEntry>`), ein exportiertes
	// Array-Literal, oder ein Rückfalltext in einer `return`-Anweisung einer
	// exportierten Funktion. Ohne diesen Grund blieben solche Stellen unsichtbar
	// übersprungen — nicht eingesammelt UND nicht gemeldet. Ein Mensch muss hier
	// von Hand entscheiden, ob und wie extrahiert wird; das Werkzeug kann die
	// Struktur nicht auf Anhieb in Schlüssel und Text zerlegen.
	| 'record-pattern-miss'
	// --- Ab hier: `collectSvelteSites` (Aufgabe 2.2) ---
	//
	// Der wichtigste Grund von allen (siehe Dateikopf von collect.ts): Ein
	// Textknoten mit Geschwister-ELEMENTEN (`Vielen Dank für Ihre
	// <strong>Meldung</strong>!`). Die drei Textknoten einzeln zu übersetzen
	// bricht die Wortstellung in jeder Zielsprache — auf Englisch steht das
	// ausgezeichnete Wort woanders. Braucht eine Botschaft über das ganze
	// Element, mit Auszeichnung als Parameter (Aufgabe 2.3, Handarbeit).
	| 'sentence-fragment'
	// Ein Textknoten mit einem `ExpressionTag`-Geschwister (`Insgesamt {count}
	// Tiere`). Braucht eine ICU-Botschaft mit Parameter statt eines reinen
	// Textbausteins.
	| 'interpolation'
	// Der Text (Textknoten oder Attributwert) enthält eine Ziffer — möglicher
	// ICU-Plural. Menschliche Entscheidung (Aufgabe 2.4), nicht mechanisch.
	| 'plural-candidate'
	// Reine Satzzeichen, Symbole oder Zahlen ohne eine einzige Buchstabengruppe
	// — kein Fließtext, nichts zu übersetzen.
	| 'no-letter-group'
	// Ein Attributwert (`placeholder`/`title`/`aria-label`/`alt`) ist kein
	// reines Literal — enthält mindestens einen dynamischen Anteil
	// (`{ausdruck}`). Die Ersetzung `attr={m.key()}` ginge sonst kaputt: Der
	// dynamische Anteil hätte keinen Platz mehr in der Botschaft.
	| 'dynamic-attribute';

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
 *
 * Jeder Eintrag ist an `node_modules/yup/index.d.ts` belegt — nicht geraten.
 * `integer`, `positive`, `negative`, `trim`, `lowercase`, `uppercase`, `uuid`,
 * `defined` und `nonNullable` tragen die Meldung als einziges Argument
 * (Position 0); `lessThan`/`moreThan` haben wie `min`/`max` zuerst den
 * Vergleichswert, die Meldung folgt an Position 1.
 */
const MESSAGE_ARGUMENT_INDEX: Record<string, number> = {
	required: 0,
	email: 0,
	url: 0,
	typeError: 0,
	// NumberSchema.integer(message?: Message<any>): this — index.d.ts:706.
	// Die konkrete Lücke, die Aufgabe 4 schließt: vier `.integer(…)`-Aufrufe
	// (totalCount, juvenileCount, deadSize, shipCount) blieben unsichtbar.
	integer: 0,
	// NumberSchema.positive(msg?: …): index.d.ts:700.
	positive: 0,
	// NumberSchema.negative(msg?: …): index.d.ts:703.
	negative: 0,
	// StringSchema.trim(message?: Message<any>): index.d.ts:659.
	trim: 0,
	// StringSchema.lowercase(message?: Message<any>): index.d.ts:660.
	lowercase: 0,
	// StringSchema.uppercase(message?: Message<any>): index.d.ts:661.
	uppercase: 0,
	// StringSchema.uuid(message?: …): index.d.ts:654.
	uuid: 0,
	// Schema.defined(message?: Message<any>): index.d.ts:251 (und je Subtyp
	// erneut, z.B. NumberSchema.defined, index.d.ts:714).
	defined: 0,
	// Schema.nonNullable(message?: Message<any>): index.d.ts:253 (und je
	// Subtyp erneut, z.B. NumberSchema.nonNullable, index.d.ts:719).
	nonNullable: 0,
	min: 1,
	max: 1,
	length: 1,
	matches: 1,
	oneOf: 1,
	notOneOf: 1,
	// NumberSchema.lessThan(less, message?): index.d.ts:694.
	lessThan: 1,
	// NumberSchema.moreThan(more, message?): index.d.ts:697.
	moreThan: 1,
	test: 1
};

export function messageArgumentIndex(method: string): number | undefined {
	return MESSAGE_ARGUMENT_INDEX[method];
}

/**
 * Yup-Methoden, die im Bestand (`sightingSchema.ts`) auf Schemas aufgerufen
 * werden und nachweislich keine Meldung tragen — erhoben per Grep über
 * `sightingSchema.ts` und die `formOptions`-Module (die keine Yup-Aufrufe
 * enthalten), nicht geraten. `label`, `meta` und die Objektform von `test`
 * stehen NICHT hier: Sie werden vorher in `collect.ts` speziell behandelt und
 * erreichen diese Prüfung nie.
 */
const NO_MESSAGE_METHOD_REASONS: Record<string, string> = {
	array: 'Typkonstruktor, kein Meldungsträger',
	boolean: 'Typkonstruktor, kein Meldungsträger',
	number: 'Typkonstruktor, kein Meldungsträger',
	object: 'Typkonstruktor, kein Meldungsträger',
	string: 'Typkonstruktor, kein Meldungsträger',
	mixed: 'Typkonstruktor, kein Meldungsträger',
	of: 'nimmt ein Unterschema entgegen, keine Meldung',
	shape: 'nimmt die Feld-Definitionen entgegen, keine Meldung',
	concat: 'verkettet zwei Schemas, keine Meldung',
	default: 'nimmt den Default-Wert entgegen (z.B. `.default(1)`), keine Meldung',
	transform: 'nimmt eine Transformationsfunktion entgegen, keine Meldung',
	when: 'nimmt Feldname und Bedingungs-Konfiguration entgegen, keine Meldung',
	// nullable()/notRequired()/optional() nehmen in diesem Bestand nie ein
	// Argument (siehe MESSAGE_ARGUMENT_INDEX-Kommentar zu `nullable(msg?)`,
	// yup ließe eine Meldung technisch zu) — im Code stehen sie immer ohne
	// Argument, ein String-Literal darin wäre also ohnehin nie ein Meldungstext.
	nullable: 'wird im Bestand ausschließlich ohne Argument aufgerufen',
	notRequired: 'nimmt kein Argument entgegen',
	optional: 'nimmt kein Argument entgegen'
};

export function isKnownNoMessageMethod(method: string): boolean {
	return method in NO_MESSAGE_METHOD_REASONS;
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
