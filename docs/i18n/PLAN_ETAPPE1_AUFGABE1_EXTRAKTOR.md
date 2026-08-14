# Etappe 1, Aufgabe 1 — Extraktor mit Trockenlauf

> **Für agentische Bearbeiter:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development`
> (empfohlen) oder `superpowers:executing-plans`. Die Schritte tragen Checkboxen (`- [ ]`).

**Ziel:** Ein Werkzeug, das die zu übersetzenden Zeichenketten in
`sightingSchema.ts` und `src/lib/report/formOptions/` **strukturell** findet,
Schlüssel dafür vergibt und einen Diff-Vorschlag ausgibt — **ohne eine einzige
Datei zu verändern**.

**Architektur:** Vier kleine, einzeln testbare Module unter
`src/tools/i18n-extract/` plus eine CLI. Die Entscheidung „extrahieren oder
nicht" fällt allein an der Aufrufstelle und der Argumentposition
(`allowlist.ts`), nie am Inhalt. Die AST-Leser aus `src/tools/i18n-inventory.ts`
werden weiterverwendet, `classifyText` ausdrücklich **nicht**.

**Tech-Stack:** TypeScript, `typescript`-Compiler-API (`ts.createSourceFile`),
Vitest (Projekt `server`), `tsx` für die CLI.

**Abweichung vom Entwurf:** Der Entwurf nennt eine Datei
`src/tools/i18n-extract.ts`. Der Plan legt stattdessen ein Verzeichnis
`src/tools/i18n-extract/` mit vier Modulen an. Grund: Die Allowlist ist reine
Datenpflege und wird von Menschen gelesen und ergänzt; sie in derselben Datei wie
die AST-Traversierung zu halten, macht genau die Stelle unübersichtlich, an der
Übersehen teuer ist.

## Globale Randbedingungen

Sie gelten für **jeden** Schritt unten, ohne Wiederholung:

- **Dieses Werkzeug schreibt in Aufgabe 1 nichts.** Kein `writeFileSync`, kein
  `mkdirSync`, kein `--apply`. Das Schreiben kommt in Aufgabe 3/4.
- **`classifyText` aus `i18n-inventory.ts` wird nicht importiert.** Begründung:
  Entwurf Abschnitt 3.1 — es liegt an vier belegten Stellen falsch.
- **Kein `any`.** Explizite Rückgabetypen an jeder exportierten Funktion
  (`.claude/rules/architecture.md`).
- **Test zuerst.** Jeder Schritt „Test schreiben" wird von einem Schritt „Test
  läuft rot" gefolgt, bevor implementiert wird (`.claude/rules/testing.md`).
- **Tests laufen im Projekt `server`:** `npx vitest run --project server <pfad>`.
- **Commit-Format:** `<type>(<scope>): <beschreibung>`, Englisch, Subject
  kleingeschrieben (`commitlint.config.mjs`).
- **Deutsche Bezeichner nur dort, wo der Bestand sie führt.** Neue Bezeichner
  englisch, Kommentare und Ausgaben deutsch — wie in `i18n-inventory.ts`.

## Dateien

| Datei                                             | Verantwortung                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `src/tools/i18n-extract/allowlist.ts`             | Entscheidet je Aufrufstelle/Argumentposition: extrahieren oder nicht |
| `src/tools/i18n-extract/allowlist.test.ts`        | dazu                                                                 |
| `src/tools/i18n-extract/messageKey.ts`            | Feldnamen auflösen, Schlüssel bauen, Kollisionen auflösen            |
| `src/tools/i18n-extract/messageKey.test.ts`       | dazu                                                                 |
| `src/tools/i18n-extract/collect.ts`               | AST-Durchlauf, erzeugt `ExtractionSite[]` und `SkippedSite[]`        |
| `src/tools/i18n-extract/collect.test.ts`          | dazu                                                                 |
| `src/tools/i18n-extract/render.ts`                | Diff-Vorschau und Bericht als Text                                   |
| `src/tools/i18n-extract/render.test.ts`           | dazu                                                                 |
| `src/tools/i18n-extract-cli.ts`                   | CLI, Trockenlauf als einzige Betriebsart                             |
| `src/tools/i18n-extract-cli.test.ts`              | dazu, inkl. Nachweis „schreibt nichts"                               |
| `package.json`                                    | Skript `i18n:extract`                                                |

---

## Aufgabe 1.1 — Allowlist

**Dateien:**

- Anlegen: `src/tools/i18n-extract/allowlist.ts`
- Test: `src/tools/i18n-extract/allowlist.test.ts`

**Schnittstellen:**

- Verbraucht: nichts.
- Liefert: `metaKeyDecision(key: string): MetaDecision`,
  `messageArgumentIndex(method: string): number | undefined`,
  `checkValue(text: string): ValueCheck`,
  `TRANSLATABLE_META_KEYS`, `NON_TRANSLATABLE_META_KEYS`,
  Typen `MetaDecision`, `ValueCheck`, `SkipReason`.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`src/tools/i18n-extract/allowlist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
	checkValue,
	messageArgumentIndex,
	metaKeyDecision,
	NON_TRANSLATABLE_META_KEYS,
	TRANSLATABLE_META_KEYS
} from './allowlist';

describe('metaKeyDecision', () => {
	it('extrahiert die drei sprachlichen meta-Schlüssel', () => {
		expect(metaKeyDecision('helpText')).toEqual({ kind: 'extract' });
		expect(metaKeyDecision('placeholder')).toEqual({ kind: 'extract' });
		expect(metaKeyDecision('valueText')).toEqual({ kind: 'extract' });
	});

	it('überspringt meta.type — FieldRenderer schaltet daran den Feldtyp um', () => {
		expect(metaKeyDecision('type')).toEqual({
			kind: 'skip',
			reason: 'meta-key-denied',
			explanation: 'meta.type steuert den FieldRenderer, kein Anzeigetext'
		});
	});

	it('überspringt icon, options, autocomplete und step', () => {
		for (const key of ['icon', 'options', 'autocomplete', 'step']) {
			expect(metaKeyDecision(key).kind).toBe('skip');
		}
	});

	// Die Asymmetrie zu messageArgumentIndex ist Absicht: Ein unbekannter
	// meta-Schlüssel kann sprachlich sein und würde sonst still deutsch bleiben.
	it('bricht bei einem unbekannten meta-Schlüssel ab, statt zu raten', () => {
		expect(metaKeyDecision('tooltipText')).toEqual({
			kind: 'unknown',
			reason: 'meta-key-unknown',
			explanation:
				'meta.tooltipText steht weder in TRANSLATABLE_META_KEYS noch in NON_TRANSLATABLE_META_KEYS'
		});
	});

	it('führt die beiden Listen überschneidungsfrei', () => {
		const overlap = TRANSLATABLE_META_KEYS.filter((k) =>
			(NON_TRANSLATABLE_META_KEYS as readonly string[]).includes(k)
		);
		expect(overlap).toEqual([]);
	});
});

describe('messageArgumentIndex', () => {
	it('kennt die Argumentposition der Meldung je Yup-Regel', () => {
		expect(messageArgumentIndex('required')).toBe(0);
		expect(messageArgumentIndex('email')).toBe(0);
		expect(messageArgumentIndex('min')).toBe(1);
		expect(messageArgumentIndex('max')).toBe(1);
		expect(messageArgumentIndex('matches')).toBe(1);
		expect(messageArgumentIndex('oneOf')).toBe(1);
	});

	// Der teuerste Einzelfall: Argument 0 ist der Testname und wird
	// maschinell ausgewertet (errors[field].type).
	it('nennt für test() die Position 1, nicht 0', () => {
		expect(messageArgumentIndex('test')).toBe(1);
	});

	it('liefert undefined für Regeln ohne Meldung', () => {
		expect(messageArgumentIndex('default')).toBeUndefined();
		expect(messageArgumentIndex('when')).toBeUndefined();
		expect(messageArgumentIndex('shape')).toBeUndefined();
		expect(messageArgumentIndex('transform')).toBeUndefined();
	});
});

describe('checkValue', () => {
	it('nimmt gewöhnlichen Anzeigetext an', () => {
		expect(checkValue('Bitte wählen Sie eine Tierart aus')).toEqual({ ok: true });
	});

	it('überspringt rein numerische Zeichenketten', () => {
		expect(checkValue('1').ok).toBe(false);
		expect(checkValue('12345')).toEqual({
			ok: false,
			reason: 'numeric-only',
			explanation: 'rein numerisch — in jeder Sprache derselbe Text'
		});
	});

	it('überspringt leere Zeichenketten', () => {
		// sightingSchema.ts:1403 trägt message: '' — das überschreibt nur einen
		// gleichnamigen Test, es ist keine Botschaft.
		expect(checkValue('')).toEqual({
			ok: false,
			reason: 'empty-string',
			explanation: 'leere Zeichenkette ist keine Botschaft'
		});
		expect(checkValue('   ').ok).toBe(false);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/allowlist.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./allowlist"`.

- [ ] **Schritt 3: `allowlist.ts` schreiben**

```ts
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
	| 'empty-string';

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

export const NON_TRANSLATABLE_META_KEYS = Object.keys(
	META_DENY_REASONS
) as ReadonlyArray<string>;

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
```

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/allowlist.test.ts
```

Erwartet: PASS, 11 Tests.

- [ ] **Schritt 5: Wirksamkeit per Mutation belegen**

`META_DENY_REASONS.type` auskommentieren, Test erneut laufen lassen.
Erwartet: der Test „bricht bei einem unbekannten meta-Schlüssel ab" bleibt grün,
aber „überspringt meta.type" wird **rot** (`kind` ist `unknown` statt `skip`).
Danach zurücksetzen und Grün erneut bestätigen. **Das Ergebnis in den Commit-Body
schreiben** — nicht „Test grün", sondern „`type` entfernt → Test X rot →
zurückgesetzt".

- [ ] **Schritt 6: Commit**

```bash
git add src/tools/i18n-extract/allowlist.ts src/tools/i18n-extract/allowlist.test.ts && git commit
```

Betreff: `feat(build): add structural allowlist for i18n message extraction`

---

## Aufgabe 1.2 — Schlüsselvergabe

**Dateien:**

- Anlegen: `src/tools/i18n-extract/messageKey.ts`
- Test: `src/tools/i18n-extract/messageKey.test.ts`

**Schnittstellen:**

- Verbraucht: `slugify` aus `../i18n-inventory` (bereits exportiert,
  i18n-inventory.ts:289).
- Liefert: `resolveFieldName(node: ts.Node, sourceFile: ts.SourceFile): string | undefined`,
  `schemaMessageKey(field, aspect, taken): string`,
  `formOptionsMessageKey(fileBaseName, enumKey, taken): string`,
  `createKeyRegistry(): Set<string>`.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`src/tools/i18n-extract/messageKey.test.ts`:

```ts
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
	createKeyRegistry,
	formOptionsMessageKey,
	resolveFieldName,
	schemaMessageKey
} from './messageKey';

/** Findet den ersten String-Literal-Knoten mit dem gegebenen Text. */
function findLiteral(sourceFile: ts.SourceFile, text: string): ts.Node {
	let found: ts.Node | undefined;
	const visit = (node: ts.Node): void => {
		if (ts.isStringLiteralLike(node) && node.text === text) {
			found = found ?? node;
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	if (!found) {
		throw new Error(`Literal ${JSON.stringify(text)} nicht gefunden`);
	}
	return found;
}

function parse(source: string): ts.SourceFile {
	return ts.createSourceFile('probe.ts', source, ts.ScriptTarget.Latest, true);
}

describe('resolveFieldName', () => {
	it('liest den Feldnamen an der direkten shape()-Eigenschaft', () => {
		const sf = parse(`
			const s = yup.object().shape({
				waterway: yup.string().max(255, 'zu lang')
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'zu lang'), sf)).toBe('waterway');
	});

	// Der Fehler aus dem Bestand: findEnclosingFieldName (i18n-inventory.ts:589)
	// liefert hier 'then'. Sechs verschiedene Meldungen kollabierten dadurch auf
	// den Schlüssel sighting_then_required.
	it('steigt durch when()/then hindurch bis zum echten Feld', () => {
		const sf = parse(`
			const s = yup.object().shape({
				latitude: yup.number().when('hasPosition', {
					is: true,
					then: (schema) => schema.required('Breitengrad ist erforderlich')
				})
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'Breitengrad ist erforderlich'), sf)).toBe('latitude');
	});

	it('steigt durch meta() hindurch bis zum echten Feld', () => {
		const sf = parse(`
			const s = yup.object().shape({
				sightingTime: yup.string().meta({ helpText: 'Wann ungefähr?' })
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'Wann ungefähr?'), sf)).toBe('sightingTime');
	});

	it('liest auch aus einem nachgelagerten shape() (adminSightingSchema)', () => {
		const sf = parse(`
			const admin = base.shape({
				totalCount: field.min(0, 'nicht negativ')
			});
		`);
		expect(resolveFieldName(findLiteral(sf, 'nicht negativ'), sf)).toBe('totalCount');
	});

	it('liefert undefined außerhalb jedes shape()', () => {
		const sf = parse(`const x = { foo: 'frei stehend' };`);
		expect(resolveFieldName(findLiteral(sf, 'frei stehend'), sf)).toBeUndefined();
	});
});

describe('schemaMessageKey', () => {
	it('baut sighting_<feld>_<aspekt>', () => {
		const taken = createKeyRegistry();
		expect(schemaMessageKey('latitude', 'label', taken)).toBe('sighting_latitude_label');
		expect(schemaMessageKey('latitude', 'meta.helpText', taken)).toBe(
			'sighting_latitude_meta_helptext'
		);
	});

	it('hängt ein Zählsuffix an, wenn ein Feld dieselbe Regel zweimal trägt', () => {
		const taken = createKeyRegistry();
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max');
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max_2');
		expect(schemaMessageKey('latitude', 'max', taken)).toBe('sighting_latitude_max_3');
	});
});

describe('formOptionsMessageKey', () => {
	it('baut formoptions_<datei>_<enumschlüssel> ohne Enum-Präfix', () => {
		const taken = createKeyRegistry();
		expect(formOptionsMessageKey('species', 'SpeciesEnum.HARBOR_PORPOISE', taken)).toBe(
			'formoptions_species_harbor_porpoise'
		);
	});

	it('verträgt einen Leerstring-Schlüssel (WindDirectionEnum.NONE)', () => {
		const taken = createKeyRegistry();
		expect(formOptionsMessageKey('windDirection', 'WindDirectionEnum.NONE', taken)).toBe(
			'formoptions_winddirection_none'
		);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/messageKey.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./messageKey"`.

- [ ] **Schritt 3: `messageKey.ts` schreiben**

```ts
/**
 * Feldnamen auflösen und Botschaftsschlüssel vergeben.
 *
 * Das Schlüsselschema stammt aus `i18n-inventory.ts`, damit
 * `docs/i18n/i18n-inventory.md` als Nachschlagewerk lesbar bleibt — mit einer
 * behobenen Schwäche: `findEnclosingFieldName` (i18n-inventory.ts:589) läuft zum
 * NÄCHSTEN umschließenden `PropertyAssignment` hoch. Innerhalb von
 * `.when('hasPosition', { is: true, then: … })` heißt der `then`, nicht
 * `latitude`. Im aktuellen Inventar erzeugt das 20 Schlüsselkollisionen, davon
 * `sighting_then_required` für sechs verschiedene Meldungen.
 *
 * `resolveFieldName` sucht deshalb nicht den nächsten, sondern den RICHTIGEN
 * Knoten: die Eigenschaft, die direkt in dem Objektliteral steht, das an
 * `.shape(…)` übergeben wird. Alles darunter (`then`, `otherwise`, `is`, `meta`)
 * wird übersprungen, ohne dass diese Namen aufgezählt werden müssen.
 */
import ts from 'typescript';
import { slugify } from '../i18n-inventory';

/**
 * Der Feldname zu einem Knoten, oder `undefined`, wenn er in keinem
 * `.shape(…)`-Objektliteral liegt.
 */
export function resolveFieldName(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
	let current: ts.Node | undefined = node;
	while (current) {
		if (
			ts.isPropertyAssignment(current) &&
			!ts.isComputedPropertyName(current.name) &&
			isShapeArgumentObject(current.parent)
		) {
			return current.name.getText(sourceFile);
		}
		current = current.parent;
	}
	return undefined;
}

/** Ist dieses Objektliteral das Argument eines `.shape(…)`-Aufrufs? */
function isShapeArgumentObject(node: ts.Node): boolean {
	if (!ts.isObjectLiteralExpression(node)) {
		return false;
	}
	const call = node.parent;
	return (
		call !== undefined &&
		ts.isCallExpression(call) &&
		ts.isPropertyAccessExpression(call.expression) &&
		call.expression.name.text === 'shape' &&
		call.arguments[0] === node
	);
}

/** Die Menge bereits vergebener Schlüssel eines Laufs. */
export function createKeyRegistry(): Set<string> {
	return new Set<string>();
}

export function schemaMessageKey(field: string, aspect: string, taken: Set<string>): string {
	return register(['sighting', slugify(field, 24), slugify(aspect, 24)].join('_'), taken);
}

export function formOptionsMessageKey(
	fileBaseName: string,
	enumKey: string,
	taken: Set<string>
): string {
	// `SpeciesEnum.HARBOR_PORPOISE` → `harbor_porpoise`: Das Enum-Präfix ist an
	// dieser Stelle redundant, der Dateiname trägt dieselbe Information.
	const bareKey = enumKey.replace(/^.*\./, '');
	return register(
		['formoptions', slugify(fileBaseName, 24), slugify(bareKey, 30)].join('_'),
		taken
	);
}

/**
 * Vergibt den Schlüssel und hängt bei Kollision ein Zählsuffix an.
 *
 * Kein Feld darf zwei Botschaften unter einem Schlüssel führen — das wäre die
 * stille Zusammenführung, die dieses Modul gerade verhindern soll.
 */
function register(base: string, taken: Set<string>): string {
	if (!taken.has(base)) {
		taken.add(base);
		return base;
	}
	let counter = 2;
	while (taken.has(`${base}_${counter}`)) {
		counter++;
	}
	const key = `${base}_${counter}`;
	taken.add(key);
	return key;
}
```

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/messageKey.test.ts
```

Erwartet: PASS, 9 Tests.

- [ ] **Schritt 5: Gegenprobe am echten Bestand**

Belegt, dass der `then`-Fehler wirklich behoben ist — nicht nur an der Attrappe:

```bash
npx tsx -e "
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { resolveFieldName } from './src/tools/i18n-extract/messageKey.ts';
const p = 'src/lib/form/validation/sightingSchema.ts';
const sf = ts.createSourceFile(p, readFileSync(p,'utf-8'), ts.ScriptTarget.Latest, true);
const hits: string[] = [];
const visit = (n: ts.Node) => {
  if (ts.isStringLiteralLike(n) && n.text.includes('Breitengrad ist erforderlich')) {
    hits.push(String(resolveFieldName(n, sf)));
  }
  ts.forEachChild(n, visit);
};
visit(sf);
console.log(hits);
"
```

Erwartet: `[ 'latitude' ]`. **Nicht** `[ 'then' ]`.

- [ ] **Schritt 6: Wirksamkeit per Mutation belegen**

In `isShapeArgumentObject` die Bedingung `call.expression.name.text === 'shape'`
zu `=== 'meta'` ändern. Erwartet: die Tests „liest den Feldnamen an der direkten
shape()-Eigenschaft" und „steigt durch when()/then hindurch" werden **rot**.
Zurücksetzen, Grün bestätigen, Ergebnis in den Commit-Body.

- [ ] **Schritt 7: Commit**

```bash
git add src/tools/i18n-extract/messageKey.ts src/tools/i18n-extract/messageKey.test.ts && git commit
```

Betreff: `fix(build): resolve yup field names through when() and meta()`

---

## Aufgabe 1.3 — Fundstellen einsammeln (Schicht A)

**Dateien:**

- Anlegen: `src/tools/i18n-extract/collect.ts`
- Test: `src/tools/i18n-extract/collect.test.ts`

**Schnittstellen:**

- Verbraucht: `metaKeyDecision`, `messageArgumentIndex`, `checkValue`, `SkipReason`
  aus `./allowlist`; `resolveFieldName`, `schemaMessageKey`, `createKeyRegistry`
  aus `./messageKey`.
- Liefert: Typen `ExtractionSite`, `SkippedSite`, `CollectResult`;
  `collectSchemaSites(source: string, relativeFilePath: string, taken: Set<string>): CollectResult`.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`src/tools/i18n-extract/collect.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { collectSchemaSites } from './collect';
import { createKeyRegistry } from './messageKey';

function collect(source: string) {
	return collectSchemaSites(source, 'src/lib/form/validation/sightingSchema.ts', createKeyRegistry());
}

describe('collectSchemaSites', () => {
	it('sammelt label, meta-Text und Regelmeldung mit Schlüssel und Offsets', () => {
		const result = collect(`
			const s = yup.object().shape({
				waterway: yup
					.string()
					.max(255, 'Die Ortsbeschreibung ist zu lang')
					.label('Wo ungefähr?')
					.meta({ helpText: 'Seegebiet oder Fahrwasser', icon: Waves, type: 'text' })
			});
		`);
		expect(result.sites.map((s) => [s.key, s.text])).toEqual([
			['sighting_waterway_max', 'Die Ortsbeschreibung ist zu lang'],
			['sighting_waterway_label', 'Wo ungefähr?'],
			['sighting_waterway_meta_helptext', 'Seegebiet oder Fahrwasser']
		]);
	});

	// Die Reihenfolge ist nicht Kosmetik: An ihr hängt, an welcher Fundstelle das
	// Zählsuffix _2 landet. ts.forEachChild besucht bei einer Aufrufkette den
	// ÄUSSERSTEN Aufruf zuerst — ohne den zweiten Durchgang in collect.ts stünde
	// hier die umgekehrte Reihenfolge und das Suffix an der falschen Stelle.
	it('liefert Fundstellen in Quelltextreihenfolge, nicht in AST-Reihenfolge', () => {
		const result = collect(`
			const s = yup.object().shape({
				deadSize: yup
					.number()
					.max(300, 'zu groß')
					.max(400, 'auch zu groß')
					.label('Größe')
			});
		`);
		expect(result.sites.map((s) => [s.key, s.text])).toEqual([
			['sighting_deadsize_max', 'zu groß'],
			['sighting_deadsize_max_2', 'auch zu groß'],
			['sighting_deadsize_label', 'Größe']
		]);
	});

	it('markiert die Offsets so, dass genau das Literal samt Anführungszeichen ersetzbar ist', () => {
		const source = `const s = yup.object().shape({ a: yup.string().label('Titel') });`;
		const [site] = collect(source).sites;
		expect(source.slice(site!.start, site!.end)).toBe(`'Titel'`);
	});

	it('überspringt meta.type und meta.icon mit Begründung', () => {
		const result = collect(`
			const s = yup.object().shape({
				species: yup.number().meta({ type: 'select', icon: Porpoise })
			});
		`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['select', 'meta-key-denied']
		]);
	});

	// Argument 0 von .test() ist der Testname und wird maschinell ausgewertet.
	it('extrahiert aus test() die Meldung, nie den Testnamen', () => {
		const result = collect(`
			const s = yup.object().shape({
				species: yup.number().test('is-valid-species', 'Diese Tierart gibt es nicht', fn)
			});
		`);
		expect(result.sites.map((s) => s.text)).toEqual(['Diese Tierart gibt es nicht']);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['is-valid-species', 'test-name-argument']
		]);
	});

	// sightingSchema.ts:1400/1410 — adminSightingSchema benutzt diese Form.
	it('versteht die Objektform von test()', () => {
		const result = collect(`
			const s = base.shape({
				distance: field.test({
					name: 'is-valid-distance',
					exclusive: true,
					message: 'Bitte eine gültige Entfernung wählen.',
					test: fn
				})
			});
		`);
		expect(result.sites.map((s) => [s.key, s.text])).toEqual([
			['sighting_distance_test', 'Bitte eine gültige Entfernung wählen.']
		]);
		expect(result.skipped.map((s) => s.reason)).toEqual(['test-name-argument']);
	});

	it('überspringt eine leere Meldung in der Objektform', () => {
		const result = collect(`
			const s = base.shape({
				juvenileCount: field.test({ name: 'x', exclusive: true, message: '', test: fn })
			});
		`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => s.reason)).toContain('empty-string');
	});

	// sightingSchema.ts:1421 — das Literal ist ein ??-Rückfallwert.
	it('fasst nicht-literale Argumente nicht an und meldet sie', () => {
		const result = collect(`
			const s = base.shape({
				sightingFromText: yup.string().label(other.spec.label ?? 'Sonstiger Ort')
			});
		`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => s.reason)).toEqual(['non-literal-argument']);
	});

	// Gegenprobe zur Regel darüber: Bei .test('name', fn) steht an Position 1 eine
	// Funktion. Ein Literal aus ihrem Rumpf ist kein übergangenes Argument.
	it('meldet keine Literale aus einem Funktionsrumpf als übersprungen', () => {
		const result = collect(`
			const s = yup.object().shape({
				a: yup.string().test('is-x', (value) => value === 'roher Vergleichswert')
			});
		`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => [s.text, s.reason])).toEqual([
			['is-x', 'test-name-argument']
		]);
	});

	it('überspringt rein numerische Platzhalter', () => {
		const result = collect(`
			const s = yup.object().shape({
				totalCount: yup.number().meta({ placeholder: '1' })
			});
		`);
		expect(result.sites).toEqual([]);
		expect(result.skipped.map((s) => s.reason)).toEqual(['numeric-only']);
	});

	it('bricht bei einem unbekannten meta-Schlüssel ab, statt ihn zu übergehen', () => {
		expect(() =>
			collect(`
				const s = yup.object().shape({
					a: yup.string().meta({ tooltipText: 'Neu und unbekannt' })
				});
			`)
		).toThrow(/tooltipText/);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/collect.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./collect"`.

- [ ] **Schritt 3: `collect.ts` schreiben**

```ts
/**
 * Sammelt die Stellen in `sightingSchema.ts`, die zu Botschaften werden.
 *
 * Ergebnis sind Zeichen-Offsets, keine Textersetzungen: Wer den Diff baut
 * (`render.ts`), schneidet damit exakt das Literal samt Anführungszeichen aus.
 * Eine Ersetzung per Suchen-und-Ersetzen über den Rohtext wäre an den 19
 * Dubletten falsch.
 *
 * Was NICHT gesammelt wird, wird nicht verschwiegen: Jede übersprungene
 * Zeichenkette landet mit Grund in `skipped` und erscheint im Trockenlauf. Das
 * ist die einzige Stelle, an der ein Mensch eine zu enge Allowlist bemerken
 * kann.
 */
import ts from 'typescript';
import { checkValue, messageArgumentIndex, metaKeyDecision, type SkipReason } from './allowlist';
import { resolveFieldName, schemaMessageKey } from './messageKey';

export interface ExtractionSite {
	file: string;
	line: number;
	/** Zeichen-Offset des Literals, einschließlich Anführungszeichen. */
	start: number;
	end: number;
	text: string;
	key: string;
	aspect: string;
	field: string;
}

export interface SkippedSite {
	file: string;
	line: number;
	text: string;
	aspect: string;
	reason: SkipReason;
	explanation: string;
}

export interface CollectResult {
	sites: ExtractionSite[];
	skipped: SkippedSite[];
}

export function collectSchemaSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const sourceFile = ts.createSourceFile(
		relativeFilePath,
		source,
		ts.ScriptTarget.Latest,
		true
	);
	const skipped: SkippedSite[] = [];

	/**
	 * Fundstellen ohne Schlüssel. Die Vergabe passiert erst nach dem Sortieren.
	 *
	 * `ts.forEachChild` besucht bei einer Aufrufkette `.max().label().meta()` den
	 * ÄUSSERSTEN Aufruf zuerst — die Funde entstehen also in umgekehrter
	 * Quelltextreihenfolge. Würden die Schlüssel dabei vergeben, hinge das
	 * Zählsuffix `_2` an der im Quelltext FRÜHEREN Stelle, und der Diff läse sich
	 * rückwärts. Deshalb zwei Durchgänge.
	 */
	const candidates: Array<Omit<ExtractionSite, 'key'>> = [];

	const lineOf = (node: ts.Node): number =>
		sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

	const addSite = (literal: ts.StringLiteralLike, aspect: string): void => {
		const check = checkValue(literal.text);
		if (!check.ok) {
			skipped.push({
				file: relativeFilePath,
				line: lineOf(literal),
				text: literal.text,
				aspect,
				reason: check.reason,
				explanation: check.explanation
			});
			return;
		}
		candidates.push({
			file: relativeFilePath,
			line: lineOf(literal),
			start: literal.getStart(sourceFile),
			end: literal.getEnd(),
			text: literal.text,
			aspect,
			field: resolveFieldName(literal, sourceFile) ?? 'unbekanntesFeld'
		});
	};

	const addSkip = (
		node: ts.Node,
		text: string,
		aspect: string,
		reason: SkipReason,
		explanation: string
	): void => {
		skipped.push({
			file: relativeFilePath,
			line: lineOf(node),
			text,
			aspect,
			reason,
			explanation
		});
	};

	const visit = (node: ts.Node): void => {
		if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
			const method = node.expression.name.text;

			if (method === 'label') {
				handlePositional(node, 0, 'label');
			} else if (method === 'meta') {
				handleMeta(node);
			} else if (method === 'test' && isTestObjectForm(node)) {
				handleTestObjectForm(node);
			} else {
				const index = messageArgumentIndex(method);
				if (index !== undefined) {
					if (method === 'test') {
						const nameArg = node.arguments[0];
						if (nameArg && ts.isStringLiteralLike(nameArg)) {
							addSkip(
								nameArg,
								nameArg.text,
								'test.name',
								'test-name-argument',
								'Argument 0 von .test() ist der Testname (errors[field].type)'
							);
						}
					}
					handlePositional(node, index, method);
				}
			}
		}
		ts.forEachChild(node, visit);
	};

	function handlePositional(node: ts.CallExpression, index: number, aspect: string): void {
		const arg = node.arguments[index];
		if (!arg) {
			return;
		}
		if (ts.isStringLiteralLike(arg)) {
			addSite(arg, aspect);
			return;
		}
		// Ein Ausdruck mit einem Literal darin (z.B. `other.spec.label ?? 'Rückfall'`,
		// sightingSchema.ts:1421). Ihn zu ersetzen änderte die Bedeutung des `??`.
		const inner = firstStringLiteralWithin(arg);
		if (inner) {
			addSkip(
				inner,
				inner.text,
				aspect,
				'non-literal-argument',
				'Argument ist ein Ausdruck, nicht ein Literal — von Hand zu entscheiden'
			);
		}
	}

	function handleMeta(node: ts.CallExpression): void {
		const arg = node.arguments[0];
		if (!arg || !ts.isObjectLiteralExpression(arg)) {
			return;
		}
		for (const prop of arg.properties) {
			if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
				continue;
			}
			const key = prop.name.getText(sourceFile);
			const decision = metaKeyDecision(key);
			if (decision.kind === 'unknown') {
				throw new Error(
					`${relativeFilePath}:${lineOf(prop)} — ${decision.explanation}. ` +
						'Eintragen in TRANSLATABLE_META_KEYS oder META_DENY_REASONS (allowlist.ts), ' +
						'nicht raten.'
				);
			}
			if (decision.kind === 'skip') {
				if (ts.isStringLiteralLike(prop.initializer)) {
					addSkip(
						prop.initializer,
						prop.initializer.text,
						`meta.${key}`,
						decision.reason,
						decision.explanation
					);
				}
				continue;
			}
			if (ts.isStringLiteralLike(prop.initializer)) {
				addSite(prop.initializer, `meta.${key}`);
			}
		}
	}

	function isTestObjectForm(node: ts.CallExpression): boolean {
		const arg = node.arguments[0];
		return arg !== undefined && ts.isObjectLiteralExpression(arg);
	}

	function handleTestObjectForm(node: ts.CallExpression): void {
		const arg = node.arguments[0];
		if (!arg || !ts.isObjectLiteralExpression(arg)) {
			return;
		}
		for (const prop of arg.properties) {
			if (!ts.isPropertyAssignment(prop) || ts.isComputedPropertyName(prop.name)) {
				continue;
			}
			const key = prop.name.getText(sourceFile);
			if (!ts.isStringLiteralLike(prop.initializer)) {
				continue;
			}
			if (key === 'name') {
				addSkip(
					prop.initializer,
					prop.initializer.text,
					'test.name',
					'test-name-argument',
					'name in der Objektform von .test() ist der Testname'
				);
			} else if (key === 'message') {
				addSite(prop.initializer, 'test');
			}
		}
	}

	/**
	 * Das erste String-Literal in einem Ausdruck — für die Meldung „von Hand zu
	 * entscheiden".
	 *
	 * **Steigt nicht in Funktionsrümpfe ab.** Bei der zweiargumentigen Form
	 * `.test('name', (value) => …)` stünde an Position 1 eine Funktion; ein
	 * Literal aus deren Rumpf wäre kein „nicht ersetztes Argument", sondern
	 * irgendein Zeichenkettenvergleich im Prüfcode. Es zu melden füllte den
	 * Abschnitt „Übersprungen" mit Rauschen — genau den Abschnitt, den ein
	 * Mensch Zeile für Zeile lesen soll (Aufgabe 1.5, Schritt 10).
	 */
	function firstStringLiteralWithin(node: ts.Node): ts.StringLiteralLike | undefined {
		if (
			ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node) ||
			ts.isFunctionDeclaration(node)
		) {
			return undefined;
		}
		let found: ts.StringLiteralLike | undefined;
		const walk = (n: ts.Node): void => {
			if (found) {
				return;
			}
			if (ts.isStringLiteralLike(n)) {
				found = n;
				return;
			}
			if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) {
				return;
			}
			ts.forEachChild(n, walk);
		};
		walk(node);
		return found;
	}

	visit(sourceFile);

	// Zweiter Durchgang: erst jetzt, in Quelltextreihenfolge, die Schlüssel.
	const sites: ExtractionSite[] = candidates
		.sort((a, b) => a.start - b.start)
		.map((candidate) => ({
			...candidate,
			key: schemaMessageKey(candidate.field, candidate.aspect, taken)
		}));

	skipped.sort((a, b) => a.line - b.line);
	return { sites, skipped };
}
```

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/collect.test.ts
```

Erwartet: PASS, 11 Tests.

- [ ] **Schritt 5: Gegen den echten Bestand laufen lassen**

```bash
npx tsx -e "
import { readFileSync } from 'node:fs';
import { collectSchemaSites } from './src/tools/i18n-extract/collect.ts';
import { createKeyRegistry } from './src/tools/i18n-extract/messageKey.ts';
const p = 'src/lib/form/validation/sightingSchema.ts';
const r = collectSchemaSites(readFileSync(p,'utf-8'), p, createKeyRegistry());
console.log('Botschaften:', r.sites.length, '— übersprungen:', r.skipped.length);
console.log('Schlüssel eindeutig:', new Set(r.sites.map(s=>s.key)).size === r.sites.length);
console.log('kein Schlüssel mit _then_:', r.sites.every(s=>!s.key.includes('_then_')));
"
```

Erwartet: rund **259** Botschaften (Entwurf 2.1), `Schlüssel eindeutig: true`,
`kein Schlüssel mit _then_: true`. Weicht die Zahl um mehr als ±5 ab, **nicht**
weitermachen — die Abweichung gegen die Aspekt-Tabelle in Entwurf 2.1 aufklären
und im Commit-Body festhalten.

- [ ] **Schritt 6: Wirksamkeit per Mutation belegen**

Zuerst: In `collect.ts` die Sortierung des zweiten Durchgangs auf `b.start - a.start`
drehen. Erwartet: der Reihenfolge-Test wird rot. Zurücksetzen.

Dann: In `visit` den `test`-Sonderfall entfernen, sodass `.test()` über
`handlePositional(node, 1, …)` läuft **und** Argument 0 nicht mehr übersprungen
wird. Erwartet: „extrahiert aus test() die Meldung, nie den Testnamen" wird rot.
Zurücksetzen, Grün bestätigen, Ergebnis in den Commit-Body.

- [ ] **Schritt 7: Commit**

```bash
git add src/tools/i18n-extract/collect.ts src/tools/i18n-extract/collect.test.ts && git commit
```

Betreff: `feat(build): collect translatable sites from the sighting schema`

---

## Aufgabe 1.4 — Fundstellen einsammeln (Schicht B)

**Dateien:**

- Ändern: `src/tools/i18n-extract/collect.ts` (ergänzen, nichts ersetzen)
- Ändern: `src/tools/i18n-extract/collect.test.ts` (ergänzen)

**Schnittstellen:**

- Verbraucht: `formOptionsMessageKey` aus `./messageKey`, `checkValue` aus `./allowlist`.
- Liefert: `collectFormOptionsSites(source: string, relativeFilePath: string, taken: Set<string>): CollectResult`.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

An `collect.test.ts` anhängen:

```ts
import { collectFormOptionsSites } from './collect';

describe('collectFormOptionsSites', () => {
	it('sammelt die Werte eines Record<Enum, string>', () => {
		const result = collectFormOptionsSites(
			`
			export const speciesLabels: Record<SpeciesEnum, string> = {
				[SpeciesEnum.HARBOR_PORPOISE]: 'Schweinswal',
				[SpeciesEnum.GREY_SEAL]: 'Kegelrobbe'
			};
			`,
			'src/lib/report/formOptions/species.ts',
			createKeyRegistry()
		);
		expect(result.sites.map((s) => [s.key, s.text])).toEqual([
			['formoptions_species_harbor_porpoise', 'Schweinswal'],
			['formoptions_species_grey_seal', 'Kegelrobbe']
		]);
	});

	// Diese beiden führt das Inventar als `technisch` — das MIME-Muster
	// (i18n-inventory.ts:93) ist case-insensitiv und trifft jedes deutsche
	// Wortpaar mit Schrägstrich. Die strukturelle Regel kennt die Ausnahme nicht:
	// Was in einem Labels-Record steht, ist Anzeigetext.
	it('sammelt auch Werte, die das Inventar für MIME-Typen hält', () => {
		const result = collectFormOptionsSites(
			`
			export const mediaTypeLabels: Record<MediaTypeEnum, string> = {
				[MediaTypeEnum.DRAWING]: 'Zeichnung/Skizze'
			};
			`,
			'src/lib/report/formOptions/mediaType.ts',
			createKeyRegistry()
		);
		expect(result.sites.map((s) => s.text)).toEqual(['Zeichnung/Skizze']);
	});

	it('lässt Records ohne Record<…, string>-Annotation unangetastet', () => {
		const result = collectFormOptionsSites(
			`export const speciesGroups = { Kleinwale: [0, 3] };`,
			'src/lib/report/formOptions/species.ts',
			createKeyRegistry()
		);
		expect(result.sites).toEqual([]);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/collect.test.ts -t collectFormOptionsSites
```

Erwartet: FAIL, `collectFormOptionsSites is not a function`.

- [ ] **Schritt 3: `collectFormOptionsSites` in `collect.ts` ergänzen**

```ts
/**
 * Sammelt die Werte der `export const xLabels: Record<Enum, string>`-Literale.
 *
 * Bewusst dasselbe strenge Muster wie `analyzeFormOptionsSource`
 * (i18n-inventory.ts:518) — nicht mehr. Die drei Gruppennamen in `speciesGroups`
 * sind Objekt-SCHLÜSSEL und zugleich Anzeigetext; sie brauchen eine Trennung von
 * Schlüssel und Text, die ein Werkzeug nicht raten kann. Sie stehen deshalb in
 * Entwurf Abschnitt 5 als benannte Handarbeit, nicht hier.
 */
export function collectFormOptionsSites(
	source: string,
	relativeFilePath: string,
	taken: Set<string>
): CollectResult {
	const sourceFile = ts.createSourceFile(relativeFilePath, source, ts.ScriptTarget.Latest, true);
	const sites: ExtractionSite[] = [];
	const skipped: SkippedSite[] = [];
	const fileBaseName = relativeFilePath.replace(/^.*[/\\]/, '').replace(/\.ts$/, '');

	const visit = (node: ts.Node): void => {
		if (ts.isVariableStatement(node)) {
			for (const decl of node.declarationList.declarations) {
				if (!isStringRecordDeclaration(decl, sourceFile) || !decl.initializer) {
					continue;
				}
				if (!ts.isObjectLiteralExpression(decl.initializer)) {
					continue;
				}
				const recordName = decl.name.getText(sourceFile);
				for (const prop of decl.initializer.properties) {
					if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteralLike(prop.initializer)) {
						continue;
					}
					const enumKey = ts.isComputedPropertyName(prop.name)
						? prop.name.expression.getText(sourceFile)
						: prop.name.getText(sourceFile);
					const line =
						sourceFile.getLineAndCharacterOfPosition(prop.initializer.getStart(sourceFile))
							.line + 1;
					const check = checkValue(prop.initializer.text);
					if (!check.ok) {
						skipped.push({
							file: relativeFilePath,
							line,
							text: prop.initializer.text,
							aspect: `${recordName}[${enumKey}]`,
							reason: check.reason,
							explanation: check.explanation
						});
						continue;
					}
					sites.push({
						file: relativeFilePath,
						line,
						start: prop.initializer.getStart(sourceFile),
						end: prop.initializer.getEnd(),
						text: prop.initializer.text,
						key: formOptionsMessageKey(fileBaseName, enumKey, taken),
						aspect: `${recordName}[${enumKey}]`,
						field: recordName
					});
				}
			}
		}
		ts.forEachChild(node, visit);
	};

	visit(sourceFile);
	return { sites, skipped };
}

function isStringRecordDeclaration(
	decl: ts.VariableDeclaration,
	sourceFile: ts.SourceFile
): boolean {
	return (
		decl.type !== undefined &&
		ts.isTypeReferenceNode(decl.type) &&
		decl.type.typeName.getText(sourceFile) === 'Record' &&
		decl.type.typeArguments?.length === 2 &&
		decl.type.typeArguments[1]?.kind === ts.SyntaxKind.StringKeyword
	);
}
```

Dazu den Import in `collect.ts` erweitern:

```ts
import { formOptionsMessageKey, resolveFieldName, schemaMessageKey } from './messageKey';
```

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/collect.test.ts
```

Erwartet: PASS, 14 Tests.

- [ ] **Schritt 5: Gegen den echten Bestand laufen lassen**

```bash
npx tsx -e "
import { readFileSync, readdirSync } from 'node:fs';
import { collectFormOptionsSites } from './src/tools/i18n-extract/collect.ts';
import { createKeyRegistry } from './src/tools/i18n-extract/messageKey.ts';
const dir = 'src/lib/report/formOptions';
const taken = createKeyRegistry();
let total = 0, files = 0;
for (const f of readdirSync(dir).filter(f=>f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
  const r = collectFormOptionsSites(readFileSync(dir+'/'+f,'utf-8'), dir+'/'+f, taken);
  if (r.sites.length) { files++; total += r.sites.length; }
}
console.log('Dateien mit Funden:', files, '— Botschaften:', total);
"
```

Erwartet: `Dateien mit Funden: 17 — Botschaften: 120` (Entwurf Abschnitt 5).

- [ ] **Schritt 6: Commit**

```bash
git add src/tools/i18n-extract/collect.ts src/tools/i18n-extract/collect.test.ts && git commit
```

Betreff: `feat(build): collect translatable labels from form options`

---

## Aufgabe 1.5 — Trockenlauf und CLI

**Dateien:**

- Anlegen: `src/tools/i18n-extract/render.ts`
- Test: `src/tools/i18n-extract/render.test.ts`
- Anlegen: `src/tools/i18n-extract-cli.ts`
- Test: `src/tools/i18n-extract-cli.test.ts`
- Ändern: `package.json` (Skript `i18n:extract`)

**Schnittstellen:**

- Verbraucht: `collectSchemaSites`, `collectFormOptionsSites`, `ExtractionSite`,
  `SkippedSite`, `CollectResult` aus `./collect`; `createKeyRegistry` aus `./messageKey`.
- Liefert: `applySitesToSource(source: string, sites: ExtractionSite[]): string`,
  `renderUnifiedDiff(relativeFilePath, before, after): string`,
  `renderDryRunReport(plan: ExtractionPlan): string`,
  `planExtraction(root: string, fs?: ExtractFileSystem): ExtractionPlan`,
  Typ `ExtractionPlan`.

- [ ] **Schritt 1: Den fehlschlagenden Test für `render.ts` schreiben**

`src/tools/i18n-extract/render.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { collectSchemaSites } from './collect';
import { createKeyRegistry } from './messageKey';
import { applySitesToSource, renderUnifiedDiff } from './render';

describe('applySitesToSource', () => {
	it('ersetzt das Literal durch den Botschaftsaufruf', () => {
		const source = `const s = yup.object().shape({ a: yup.string().label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		expect(applySitesToSource(source, sites)).toBe(
			`const s = yup.object().shape({ a: yup.string().label(m.sighting_a_label({}, { locale })) });`
		);
	});

	// Von hinten nach vorn ersetzen: Sonst verschieben frühere Ersetzungen die
	// Offsets aller späteren. Zwei Literale im selben Aufruf machen das sichtbar.
	it('hält die Offsets bei mehreren Ersetzungen in einer Zeile', () => {
		const source = `const s = yup.object().shape({ a: yup.string().max(9, 'zu lang').label('Titel') });`;
		const { sites } = collectSchemaSites(source, 'probe.ts', createKeyRegistry());
		const result = applySitesToSource(source, sites);
		expect(result).toContain('m.sighting_a_max({}, { locale })');
		expect(result).toContain('m.sighting_a_label({}, { locale })');
		expect(result).not.toContain(`'zu lang'`);
		expect(result).not.toContain(`'Titel'`);
	});

	it('lässt die Quelle unverändert, wenn es keine Fundstellen gibt', () => {
		const source = `const x = 1;`;
		expect(applySitesToSource(source, [])).toBe(source);
	});
});

describe('renderUnifiedDiff', () => {
	it('zeigt geänderte Zeilen mit - und + und nennt die Datei', () => {
		const diff = renderUnifiedDiff('a/b.ts', `eins\nzwei\n`, `eins\nZWEI\n`);
		expect(diff).toContain('--- a/b.ts');
		expect(diff).toContain('+++ a/b.ts');
		expect(diff).toContain('-zwei');
		expect(diff).toContain('+ZWEI');
	});

	it('liefert Leertext, wenn nichts geändert wurde', () => {
		expect(renderUnifiedDiff('a/b.ts', `eins\n`, `eins\n`)).toBe('');
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/render.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./render"`.

- [ ] **Schritt 3: `render.ts` schreiben**

```ts
/**
 * Baut aus den Fundstellen den Vorschlag: geänderte Quelle, Diff, Bericht.
 *
 * **Diese Datei schreibt nichts.** Sie gibt Zeichenketten zurück; ob und wann
 * etwas auf die Platte kommt, entscheiden Aufgabe 3 und 4.
 */
import type { ExtractionSite, SkippedSite } from './collect';

/** Der Aufruf, der an die Stelle des Literals tritt. */
function messageCall(key: string): string {
	return `m.${key}({}, { locale })`;
}

/**
 * Ersetzt alle Fundstellen einer Datei.
 *
 * **Von hinten nach vorn.** Jede Ersetzung ändert die Länge des Textes; würde
 * vorn begonnen, zeigten alle späteren Offsets ins Leere. Das ist auch der
 * Grund, warum `collect.ts` Offsets liefert und keine Suchtexte: Bei 19
 * Dubletten träfe ein Suchen-und-Ersetzen die falsche Stelle.
 */
export function applySitesToSource(source: string, sites: ExtractionSite[]): string {
	const ordered = [...sites].sort((a, b) => b.start - a.start);
	let result = source;
	for (const site of ordered) {
		result = result.slice(0, site.start) + messageCall(site.key) + result.slice(site.end);
	}
	return result;
}

/**
 * Ein knapper Unified Diff — nur geänderte Zeilen, keine Hunk-Kopfzeilen.
 *
 * Bewusst keine Diff-Bibliothek: Die Änderungen sind zeilenweise 1:1 (eine
 * Zeile geht rein, eine Zeile kommt raus), weil ein Literal nie eine Zeile
 * hinzufügt oder entfernt. Ein Zeilenvergleich ist dafür vollständig — und
 * lesbar, ohne dass jemand eine weitere Abhängigkeit prüfen muss.
 */
export function renderUnifiedDiff(
	relativeFilePath: string,
	before: string,
	after: string
): string {
	if (before === after) {
		return '';
	}
	const beforeLines = before.split('\n');
	const afterLines = after.split('\n');
	const lines: string[] = [`--- ${relativeFilePath}`, `+++ ${relativeFilePath}`];
	for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
		const b = beforeLines[i];
		const a = afterLines[i];
		if (b === a) {
			continue;
		}
		if (b !== undefined) {
			lines.push(`-${b}`);
		}
		if (a !== undefined) {
			lines.push(`+${a}`);
		}
	}
	return lines.join('\n');
}

export interface ExtractionPlan {
	files: Array<{
		file: string;
		before: string;
		after: string;
		sites: ExtractionSite[];
	}>;
	skipped: SkippedSite[];
}

export function renderDryRunReport(plan: ExtractionPlan): string {
	const lines: string[] = [];
	const totalSites = plan.files.reduce((sum, f) => sum + f.sites.length, 0);

	lines.push('# i18n-Extraktion — TROCKENLAUF (es wurde nichts geschrieben)');
	lines.push('');
	lines.push(`Botschaften: ${totalSites} — übersprungen: ${plan.skipped.length}`);
	lines.push('');

	lines.push('## Botschaften je Datei');
	lines.push('');
	for (const f of plan.files) {
		lines.push(`- ${f.file}: ${f.sites.length}`);
	}
	lines.push('');

	lines.push('## Geplante Diffs');
	lines.push('');
	for (const f of plan.files) {
		const diff = renderUnifiedDiff(f.file, f.before, f.after);
		if (diff) {
			lines.push('```diff');
			lines.push(diff);
			lines.push('```');
			lines.push('');
		}
	}

	lines.push('## Geplante Einträge für messages/de.json und messages/en.json');
	lines.push('');
	lines.push('```json');
	const messages: Record<string, string> = {};
	for (const f of plan.files) {
		for (const site of f.sites) {
			messages[site.key] = site.text;
		}
	}
	lines.push(JSON.stringify(messages, null, '\t'));
	lines.push('```');
	lines.push('');
	lines.push(
		'`en.json` bekommt denselben deutschen Wortlaut — Etappe 1 liefert die Mechanik, ' +
			'nicht die Übersetzung (Entwurf Abschnitt 1).'
	);
	lines.push('');

	// Der wichtigste Abschnitt des Berichts: die einzige Stelle, an der ein
	// Mensch eine zu enge Allowlist bemerken kann.
	lines.push('## Übersprungen — bitte durchsehen');
	lines.push('');
	for (const s of plan.skipped) {
		lines.push(`- ${s.file}:${s.line} (${s.aspect}) \`${s.text}\` — ${s.explanation}`);
	}
	lines.push('');

	return lines.join('\n');
}
```

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract/render.test.ts
```

Erwartet: PASS, 5 Tests.

- [ ] **Schritt 5: Den fehlschlagenden Test für die CLI schreiben**

`src/tools/i18n-extract-cli.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planExtraction, type ExtractFileSystem } from './i18n-extract-cli';

const SCHEMA_SOURCE = `
	const s = yup.object().shape({
		waterway: yup.string().label('Wo ungefähr?')
	});
`;
const OPTIONS_SOURCE = `
	export const sexLabels: Record<SexEnum, string> = {
		[SexEnum.FEMALE]: 'Weiblich'
	};
`;

function fakeFs(): ExtractFileSystem {
	return {
		readFile: (path: string) =>
			path.includes('formOptions') ? OPTIONS_SOURCE : SCHEMA_SOURCE,
		listFormOptionFiles: () => ['src/lib/report/formOptions/sex.ts']
	};
}

describe('planExtraction', () => {
	it('plant Schema und formOptions gemeinsam, mit gemeinsamem Schlüsselregister', () => {
		const plan = planExtraction('/repo', fakeFs());
		const keys = plan.files.flatMap((f) => f.sites.map((s) => s.key));
		expect(keys).toEqual(['sighting_waterway_label', 'formoptions_sex_female']);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('liefert für jede Datei die unveränderte und die geplante Fassung', () => {
		const plan = planExtraction('/repo', fakeFs());
		const schemaFile = plan.files.find((f) => f.file.includes('sightingSchema'));
		expect(schemaFile?.before).toBe(SCHEMA_SOURCE);
		expect(schemaFile?.after).toContain('m.sighting_waterway_label({}, { locale })');
	});
});

// Die Kernauflage von Aufgabe 1: In diesem Schritt wird nichts geschrieben.
//
// Ein Spion auf `writeFileSync` wäre hier WERTLOS: `planExtraction` bekommt im
// Test ein Attrappen-Dateisystem und fasst `node:fs` ohnehin nie an — die
// Zusicherung wäre auch dann grün, wenn die CLI munter schriebe. Das ist genau
// die Fehlerklasse, die in Etappe 0 achtmal auftrat (ARBEITSPROTOKOLL_ETAPPE0.md).
// Die beiden Tests unten prüfen deshalb den Quelltext selbst und den echten Lauf.
describe('Trockenlauf schreibt nicht', () => {
	it('nennt in keiner Werkzeugdatei eine schreibende fs-Funktion', async () => {
		const { readFileSync, readdirSync } = await import('node:fs');
		const files = [
			'src/tools/i18n-extract-cli.ts',
			...readdirSync('src/tools/i18n-extract')
				.filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))
				.map((n) => `src/tools/i18n-extract/${n}`)
		];
		for (const file of files) {
			const source = readFileSync(file, 'utf-8');
			for (const forbidden of ['writeFileSync', 'mkdirSync', 'appendFileSync', 'rmSync']) {
				expect(source, `${file} darf nicht schreiben`).not.toContain(forbidden);
			}
		}
	});

	it('kennt keine --apply-Option', async () => {
		const { readFileSync } = await import('node:fs');
		const source = readFileSync('src/tools/i18n-extract-cli.ts', 'utf-8');
		expect(source).not.toContain('--apply');
		expect(source).not.toContain('writeFileSync');
	});
});
```

- [ ] **Schritt 6: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract-cli.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./i18n-extract-cli"`.

- [ ] **Schritt 7: `i18n-extract-cli.ts` schreiben**

```ts
/**
 * CLI für den i18n-Extraktor.
 *
 * **Diese Betriebsart ist der Trockenlauf, und in Aufgabe 1 die einzige.** Es
 * gibt kein `--apply`, keinen Schreibpfad und keinen Schalter, der einen
 * erzeugt. Der Bericht geht nach stdout; wer ihn behalten will, leitet um.
 *
 * Der Grund steht im Auftrag: erst ein Trockenlauf mit Diff-Vorschau, dann die
 * Anwendung. Ein Werkzeug, das beides von Anfang an kann, wird beim ersten
 * ungeduldigen Lauf mit `--apply` benutzt, bevor jemand den Diff gelesen hat.
 *
 * Ausführung: `npm run i18n:extract`
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectFormOptionsSites, collectSchemaSites } from './i18n-extract/collect';
import { createKeyRegistry } from './i18n-extract/messageKey';
import {
	applySitesToSource,
	renderDryRunReport,
	type ExtractionPlan
} from './i18n-extract/render';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..');

const SCHEMA_FILE = 'src/lib/form/validation/sightingSchema.ts';
const FORM_OPTIONS_DIR = 'src/lib/report/formOptions';

/** Minimal-Schnittstelle für Dateizugriff — austauschbar für Tests. */
export interface ExtractFileSystem {
	readFile(relativePath: string): string;
	listFormOptionFiles(): string[];
}

export function createNodeFileSystem(root: string): ExtractFileSystem {
	return {
		readFile: (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf-8'),
		listFormOptionFiles: () =>
			readdirSync(resolve(root, FORM_OPTIONS_DIR))
				.filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
				.sort()
				.map((name) => `${FORM_OPTIONS_DIR}/${name}`)
	};
}

/**
 * Plant die Extraktion. Liest, rechnet, gibt zurück — schreibt nichts.
 *
 * Schema und formOptions teilen sich EIN Schlüsselregister. Sonst könnten
 * `sighting_…` und `formoptions_…` zwar nicht kollidieren, aber der
 * Kollisionszähler liefe je Quelle getrennt und wäre nicht mehr reproduzierbar.
 */
export function planExtraction(
	root: string,
	fs: ExtractFileSystem = createNodeFileSystem(root)
): ExtractionPlan {
	const taken = createKeyRegistry();
	const files: ExtractionPlan['files'] = [];
	const skipped: ExtractionPlan['skipped'] = [];

	const schemaSource = fs.readFile(SCHEMA_FILE);
	const schemaResult = collectSchemaSites(schemaSource, SCHEMA_FILE, taken);
	files.push({
		file: SCHEMA_FILE,
		before: schemaSource,
		after: applySitesToSource(schemaSource, schemaResult.sites),
		sites: schemaResult.sites
	});
	skipped.push(...schemaResult.skipped);

	for (const relativePath of fs.listFormOptionFiles()) {
		const source = fs.readFile(relativePath);
		const result = collectFormOptionsSites(source, relativePath, taken);
		if (result.sites.length === 0 && result.skipped.length === 0) {
			continue;
		}
		files.push({
			file: relativePath,
			before: source,
			after: applySitesToSource(source, result.sites),
			sites: result.sites
		});
		skipped.push(...result.skipped);
	}

	return { files, skipped };
}

export function main(argv: string[]): void {
	const rootArg = argv.find((arg) => arg.startsWith('--root='));
	const root = rootArg ? resolve(rootArg.slice('--root='.length)) : DEFAULT_ROOT;
	console.log(renderDryRunReport(planExtraction(root)));
}

const isMainModule =
	typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
	main(process.argv.slice(2));
}
```

- [ ] **Schritt 8: Test laufen lassen, Grün bestätigen**

```bash
npx vitest run --project server src/tools/i18n-extract-cli.test.ts
```

Erwartet: PASS, 4 Tests.

- [ ] **Schritt 9: `package.json` ergänzen**

Neben `"i18n:inventory"` einfügen:

```json
"i18n:extract": "tsx src/tools/i18n-extract-cli.ts",
```

- [ ] **Schritt 10: Den echten Trockenlauf fahren und lesen**

```bash
npm run i18n:extract > /tmp/i18n-extract-dryrun.md && head -40 /tmp/i18n-extract-dryrun.md
```

Dann **den Abschnitt „Übersprungen — bitte durchsehen" vollständig lesen**:

```bash
sed -n '/## Übersprungen/,$p' /tmp/i18n-extract-dryrun.md
```

Erwartet dort: rund 27 × `meta.type`, 7 × `meta.autocomplete`, 52 × `meta.icon`
(nur soweit String-Literale), 13 × Testname, 3 × rein numerisch, 1 × leer,
1 × nicht-literal (`sightingFromText.label`). **Jede Zeile, die dort steht und
sprachlich aussieht, ist ein Befund** — nicht weitermachen, sondern die Allowlist
korrigieren und Aufgabe 1.1 erneut fahren.

Prüfen, dass der Arbeitsbaum unberührt ist:

```bash
git status --short
```

Erwartet: nur die neuen Werkzeugdateien und `package.json`. **Keine Änderung an
`sightingSchema.ts`, an `src/lib/report/formOptions/` oder an `messages/`.**

- [ ] **Schritt 11: Wirksamkeit per Mutation belegen**

In `render.ts` die Sortierung in `applySitesToSource` von `b.start - a.start` auf
`a.start - b.start` drehen (also von vorn statt von hinten ersetzen). Erwartet:
„hält die Offsets bei mehreren Ersetzungen in einer Zeile" wird **rot**.
Zurücksetzen, Grün bestätigen, Ergebnis in den Commit-Body.

- [ ] **Schritt 12: Das Gate fahren**

```bash
npm run test:quick
```

Erwartet: grün. `test:quick` enthält keine E2E-Tests — für Aufgabe 1 ist das in
Ordnung, weil nichts an der Anwendung geändert wurde. Ab Aufgabe 3 gilt das nicht
mehr.

- [ ] **Schritt 13: Commit**

```bash
git add src/tools/i18n-extract/render.ts src/tools/i18n-extract/render.test.ts \
        src/tools/i18n-extract-cli.ts src/tools/i18n-extract-cli.test.ts package.json && git commit
```

Betreff: `feat(build): add dry-run i18n extraction cli`

---

## Abnahme von Aufgabe 1

Erfüllt, wenn alle vier Punkte belegt sind:

1. `npm run i18n:extract` gibt einen Bericht aus und **verändert keine Datei**
   (`git status --short` unberührt) — abgesichert durch zwei Tests, die weder
   `writeFileSync` noch die Zeichenkette `--apply` in der CLI dulden.
2. Der Bericht meldet rund **259** Botschaften aus `sightingSchema.ts` und **120**
   aus `formOptions/` — die Zahlen aus Entwurf Abschnitt 2.1 und 5. Abweichung
   über ±5 ist aufzuklären, nicht zu übernehmen.
3. Kein Schlüssel kommt doppelt vor, keiner enthält `_then_`, und jeder ist ein
   gültiger inlang-Bezeichner. Nachweis:

   ```bash
   npx tsx -e "
   import { planExtraction } from './src/tools/i18n-extract-cli.ts';
   const keys = planExtraction(process.cwd()).files.flatMap(f => f.sites.map(s => s.key));
   console.log('eindeutig:', new Set(keys).size === keys.length);
   console.log('kein _then_:', keys.every(k => !k.includes('_then_')));
   console.log('gültige Bezeichner:', keys.every(k => /^[a-z][a-z0-9_]*\$/.test(k)));
   "
   ```

   Erwartet: dreimal `true`. Die dritte Zeile ist nicht Kosmetik — Paraglide
   erzeugt aus jedem Schlüssel einen JS-Funktionsnamen; ein Schlüssel mit
   führender Ziffer oder Bindestrich bricht erst beim `i18n:compile` in Aufgabe 3,
   also lange nach der Ursache.
4. Für jedes der fünf Teilstücke steht im Commit-Body eine Mutation mit ihrem
   Ergebnis — „X entfernt, Test Y rot, zurückgesetzt", nicht „Tests grün".

**Nicht Teil von Aufgabe 1** und ausdrücklich nicht vorwegzunehmen: der
Charakterisierungs-Schnappschuss (Aufgabe 2), das Schreiben (Aufgabe 3 und 4),
`getSightingSchema` (Aufgabe 4), der Hartcodiert-Scan (Aufgabe 5). Der von
`applySitesToSource` erzeugte Text nennt `m` und `locale`, ohne dass es sie schon
gäbe — das ist richtig so: In Aufgabe 1 ist er ein Vorschlag zum Lesen, kein Code
zum Übersetzen.

---

## Nachträge nach der Ausführung (2026-08-11)

Aufgabe 1 ist abgenommen: 379 Botschaften (259 + 120), 89 begründet übersprungen,
`test:quick` grün, die Anwendung unberührt. 16 Commits über `3d28f95c`.

**Vier Fehler in diesem Plan**, gefunden beim Ausführen. Sie stehen hier, weil ein
Plan, dessen Fehler nur im Arbeitsprotokoll landen, beim nächsten Lesen wieder
dieselben erzeugt:

1. **Aufgabe 1.5, Schritt 7:** Der vorgegebene Docstring der CLI enthielt wörtlich
   `--apply`, während der Test desselben Schritts genau diese Zeichenkette in der
   Datei verbietet. Wörtliche Übernahme wäre rot geblieben. Der Umsetzer hat die
   Formulierung sinnwahrend geändert — richtig, aber der Plan hätte es nicht
   fordern dürfen.
2. **Aufgabe 1.5, Schritt 10:** Erwartet wurden „52 × `meta.icon`" unter den
   Übersprungenen. Real: 0. `icon: Wind` ist ein Identifier, kein String-Literal —
   solche Werte erzeugen gar keinen Skip-Eintrag. Die Erwartung war aus der
   Vorkommenszählung des Inventars abgeleitet, das nur String-Literale zählt.
3. **Aufgabe 1.5 hatte keinen Test für `renderDryRunReport`** — ausgerechnet für die
   Funktion, die den einzigen menschlichen Kontrollpunkt des Werkzeugs rendert. Das
   Task-Review fand es per Mutation: den ganzen Übersprungen-Abschnitt entfernen ließ
   alle neun Tests grün.
4. **Aufgabe 1.4 sah keine Mutation vor.** Die ad hoc angeordnete deckte sofort eine
   echte Testlücke auf (der `StringKeyword`-Zweig war von keinem Test erreicht, weil
   der Nachbartest über eine andere Klausel abbiegt). **Jede Teilaufgabe braucht ihre
   Mutation** — auch die, die nur eine bestehende Datei ergänzt.

**Veraltet im Text oben:** Der Prüfschnipsel in Abnahmekriterium 3 importiert
`planExtraction` aus `./src/tools/i18n-extract-cli.ts`. Nach dem Abschluss-Review
liegt sie in `./src/tools/i18n-extract/plan.ts` (die CLI ist eine dünne Hülle).

**Der größte Einzelbefund kam nicht aus dem Plan**, sondern aus dem Abschluss-Review:
Das Werkzeug meldete nicht, was es *nicht* getroffen hatte. Nachdem es das lernte,
trat `formOptions/speciesIdentification.ts:66` mit **316 String-Literalen** hervor —
zuvor stand für die Datei die Zahl „7" im Bericht. Der Inhalt gehört nach Etappe 4,
die Zahl war dort aber nie veranschlagt.
