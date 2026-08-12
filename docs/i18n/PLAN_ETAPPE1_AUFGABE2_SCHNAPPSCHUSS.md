# Etappe 1, Aufgabe 2 — Charakterisierungs-Schnappschuss Deutsch

> **Für agentische Bearbeiter:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development`.
> Schritte tragen Checkboxen (`- [ ]`).

**Ziel:** Ein eingecheckter Schnappschuss alles dessen, was ein deutscher Nutzer
aus Schicht A und B zu sehen bekommt — **bevor** irgendetwas ersetzt wird. Nach
dem Umbau in Aufgabe 3 und 4 muss er bitgleich bleiben. Er ist der Beleg, dass die
290 E2E-Selektoren, die über sichtbaren deutschen Text greifen, weiter tragen.

**Warum vor Aufgabe 3:** Ein Schnappschuss, der nach dem Umbau entsteht, hält den
umgebauten Zustand fest und belegt nichts.

**Architektur:** Ein Modul, das den Ist-Zustand einsammelt, plus eine Testdatei,
die ihn gegen eine eingecheckte JSON-Datei hält. Drei Quellen: die
Schema-Beschreibung, die Domänen-Labels, und — der aufwendige Teil — die
Validierungsmeldungen, die nur durch echtes Validieren herauskommen.

**Tech-Stack:** Vitest (Projekt `server`), Yup, TypeScript.

## Globale Randbedingungen

- **Kein Produktionscode wird geändert.** Aufgabe 2 fügt nur Test- und
  Schnappschuss-Dateien hinzu. Wird `sightingSchema.ts` oder `formOptions/`
  angefasst, ist die Aufgabe falsch verstanden.
- **Der Schnappschuss ist eine eingecheckte Datei**, kein `toMatchSnapshot()`.
  Vitest-Snapshots werden mit `-u` beiläufig überschrieben; genau das darf hier
  nicht passieren. Eine JSON-Datei im Repo zwingt jede Änderung in den Diff.
- Kein `any` in exportierten Signaturen. Explizite Rückgabetypen.
- Test zuerst. Bezeichner englisch, Kommentare und Testnamen deutsch.
- Commit-Format `<type>(<scope>): <beschreibung>`, Englisch, Subject kleingeschrieben.
- Testaufruf: `npx vitest run --project server <pfad>`.

## Bereits gemessen — nicht neu herleiten

- `sightingSchema.describe()` liefert **56 Felder** mit `label` und `meta`,
  **aber keine Validierungsmeldungen**. `latitude.tests` ist leer, weil `min`/`max`
  in `when()` stecken, das `describe()` ohne Kontext nicht auflöst.
- Der Extraktor aus Aufgabe 1 findet in Meldungspositionen (`max` 32, `min` 8,
  `required` 16, `matches` 1, `oneOf` 1, `email` 1, `test` 14) zusammen **73**
  Botschaften.
- Eine grobe Validierungs-Batterie provoziert davon **44**. Die Lücke ist der
  Kern von Aufgabe 2.2.

## Dateien

| Datei                                                          | Verantwortung                                  |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `src/lib/form/validation/germanBaseline.testutil.ts`           | sammelt den Ist-Zustand ein                    |
| `src/lib/form/validation/germanBaseline.json`                  | der eingecheckte Schnappschuss                 |
| `src/lib/form/validation/germanBaseline.test.ts`               | hält den Schnappschuss und prüft die Abdeckung |

---

## Aufgabe 2.1 — Beschriftungen, `meta` und Domänen-Labels

**Dateien:**
- Anlegen: `src/lib/form/validation/germanBaseline.testutil.ts`
- Anlegen: `src/lib/form/validation/germanBaseline.test.ts`
- Anlegen (erzeugt): `src/lib/form/validation/germanBaseline.json`

**Schnittstellen:**
- Liefert: `collectSchemaShape(): SchemaShapeSnapshot`,
  `collectDomainLabels(): DomainLabelSnapshot`,
  Typen `SchemaShapeSnapshot`, `DomainLabelSnapshot`.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

`germanBaseline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { collectDomainLabels, collectSchemaShape } from './germanBaseline.testutil';

describe('collectSchemaShape', () => {
	it('erfasst alle 56 Felder mit Beschriftung und meta', () => {
		const shape = collectSchemaShape();
		expect(Object.keys(shape).length).toBe(56);
		expect(shape.latitude).toEqual({
			label: 'Breitengrad',
			meta: {
				type: 'number',
				placeholder: 'z.B. 54.123456',
				helpText: 'Nördliche Position (N) - je mehr Nachkommastellen, desto genauer',
				valueText: 'GPS-Präzision: 6 Nachkommastellen = 11cm Genauigkeit'
			}
		});
	});

	// `icon` traegt einen Bezeichner, keinen Anzeigetext, und wuerde den
	// Schnappschuss bei jedem Icon-Wechsel rot machen, ohne dass sich ein
	// einziges sichtbares Wort geaendert haette.
	it('nimmt icon nicht in den Schnappschuss auf', () => {
		const shape = collectSchemaShape();
		expect(shape.latitude?.meta).not.toHaveProperty('icon');
	});
});

describe('collectDomainLabels', () => {
	it('erfasst je formOptions-Datei die Optionen in Reihenfolge', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].options).toEqual([
			{ value: '0', label: 'Schweinswal' },
			{ value: '1', label: 'Kegelrobbe' },
			{ value: '2', label: 'Seehund' },
			{ value: '3', label: 'Delfin' },
			{ value: '4', label: 'Beluga' },
			{ value: '5', label: 'Zwergwal' },
			{ value: '6', label: 'Finnwal' },
			{ value: '7', label: 'Buckelwal' },
			{ value: '8', label: 'Unbekannte Walart' },
			{ value: '9', label: 'Ringelrobbe' },
			{ value: '10', label: 'Unbekannte Robbenart' }
		]);
	});

	// Die Rueckfaelle sind nutzersichtbar und stehen ausserhalb des
	// Record<Enum, string>-Musters — der Extraktor meldet sie als nicht
	// getroffen. Der Schnappschuss deckt sie trotzdem ab, damit Aufgabe 3 sie
	// nicht unbemerkt veraendert.
	it('erfasst die Rückfalltexte der getXLabel-Funktionen', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].fallbacks).toEqual({
			nullish: 'Nicht angegeben',
			unknown: 'Unbekannt'
		});
	});

	it('erfasst die Gruppennamen der Artauswahl', () => {
		const labels = collectDomainLabels();
		expect(labels['species'].groups).toEqual(['Kleinwale', 'Großwale', 'Robben']);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

```bash
npx vitest run --project server src/lib/form/validation/germanBaseline.test.ts
```

Erwartet: FAIL, `Failed to resolve import "./germanBaseline.testutil"`.

- [ ] **Schritt 3: `germanBaseline.testutil.ts` implementieren**

Anforderungen an die Implementierung — Code selbst schreiben, die Werte
oben sind verbindlich:

- `collectSchemaShape()` liest `sightingSchema.describe().fields` und gibt je
  Feld `{ label, meta }` zurück. Aus `meta` werden **nur** `type`, `helpText`,
  `placeholder`, `valueText` übernommen — `icon`, `options`, `autocomplete`,
  `step` bleiben draußen. Begründung für `icon` steht im Test; `options` ist
  Schicht B und wird dort erfasst, sonst stünde es doppelt im Schnappschuss und
  ein Label-Wechsel machte zwei Stellen rot.
- `collectDomainLabels()` deckt **alle 17** Dateien unter
  `src/lib/report/formOptions/` ab, je Datei:
  - `options`: das Ergebnis der `get*Options()`-Funktion, unverändert in
    Reihenfolge;
  - `fallbacks`: `{ nullish, unknown }` — das Ergebnis der `get*Label()`-Funktion
    für `null` und für einen mit Sicherheit ungültigen Wert (z. B. `4242`);
  - `groups`: nur bei `species.ts` die Schlüssel von `speciesGroups`.
  Führe die 17 Dateien **namentlich** in einer Konstante auf, statt das
  Verzeichnis zur Laufzeit zu lesen. Eine neue Datei soll diesen Test brechen,
  nicht stillschweigend mitlaufen.
- Beide Rückgaben müssen **deterministisch sortiert** sein (Objektschlüssel
  alphabetisch), sonst erzeugt der Schnappschuss Diff-Rauschen.

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

Erwartet: PASS, 5 Tests. Passt eine der oben festgeschriebenen Erwartungen nicht
zum Ist-Zustand, ist das ein **Befund** — melde ihn, statt die Erwartung an den
Code anzupassen. Der Zweck dieser Aufgabe ist, den Ist-Zustand festzuhalten;
eine stillschweigend angepasste Erwartung hält nichts fest.

- [ ] **Schritt 5: Commit**

Betreff: `test(test): capture the german schema and label baseline`

---

## Aufgabe 2.2 — Validierungsmeldungen und Abdeckungsnachweis

**Dateien:**
- Ändern: `src/lib/form/validation/germanBaseline.testutil.ts`
- Ändern: `src/lib/form/validation/germanBaseline.test.ts`

**Schnittstellen:**
- Liefert: `collectValidationMessages(): Promise<string[]>`,
  `UNPROVOKABLE_MESSAGES: readonly string[]`.

**Der Kern dieser Teilaufgabe.** `describe()` enthält keine Meldungen; sie kommen
nur heraus, wenn wirklich validiert wird. Eine grobe Batterie erreicht 44 von 73.
Die übrigen 29 sind der eigentliche Auftrag — und jede, die sich partout nicht
provozieren lässt, ist ein Befund und keine Fußnote: Eine Meldung, die niemand
auslösen kann, ist eine, deren Übersetzung nie jemand prüft.

- [ ] **Schritt 1: Den fehlschlagenden Test schreiben**

An `germanBaseline.test.ts` anhängen:

```ts
import { collectValidationMessages, UNPROVOKABLE_MESSAGES } from './germanBaseline.testutil';
import { collectSchemaSites } from '../../../tools/i18n-extract/collect';
import { createKeyRegistry } from '../../../tools/i18n-extract/messageKey';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Die Aspekte, unter denen der Extraktor eine Validierungsmeldung fuehrt. */
const MESSAGE_ASPECTS = ['max', 'min', 'required', 'matches', 'oneOf', 'email', 'test'];

describe('collectValidationMessages', () => {
	it('provoziert jede Meldung mindestens einmal', async () => {
		const harvested = await collectValidationMessages();
		expect(harvested.length).toBeGreaterThan(0);
		expect(new Set(harvested).size).toBe(harvested.length);
	});

	// Die Kreuzpruefung: Der Extraktor aus Aufgabe 1 weiss, WELCHE Meldungen im
	// Quelltext stehen. Dieser Test haelt dagegen, welche davon im Betrieb
	// ueberhaupt erscheinen koennen. Was in keiner der beiden Mengen fehlt, ist
	// belegt; was nur der Extraktor kennt, ist toter Text oder eine Luecke in
	// der Batterie — beides muss benannt sein, nicht uebergangen.
	it('deckt jede vom Extraktor gefundene Validierungsmeldung ab', async () => {
		const path = 'src/lib/form/validation/sightingSchema.ts';
		const { sites } = collectSchemaSites(
			readFileSync(resolve(process.cwd(), path), 'utf-8'),
			path,
			createKeyRegistry()
		);
		const inSource = sites
			.filter((s) => MESSAGE_ASPECTS.includes(s.aspect))
			.map((s) => s.text);

		const harvested = new Set(await collectValidationMessages());
		const missing = inSource.filter(
			(text) => !harvested.has(text) && !UNPROVOKABLE_MESSAGES.includes(text)
		);

		expect(missing, `nicht provozierbar und nicht begründet: ${missing.join(' | ')}`).toEqual([]);
	});

	// Eine Ausnahmeliste ohne Pflege verrottet: Steht dort eine Meldung, die
	// inzwischen provozierbar ist, verdeckt der Eintrag kuenftig eine echte Luecke.
	it('führt keine Ausnahme, die inzwischen provozierbar ist', async () => {
		const harvested = new Set(await collectValidationMessages());
		const stale = UNPROVOKABLE_MESSAGES.filter((text) => harvested.has(text));
		expect(stale).toEqual([]);
	});
});
```

- [ ] **Schritt 2: Test laufen lassen, Rot bestätigen**

Erwartet: FAIL — `collectValidationMessages is not a function`.

- [ ] **Schritt 3: Implementieren**

- `collectValidationMessages()` validiert `sightingSchema` **und**
  `adminSightingSchema` mit einer Reihe gezielt ungültiger Eingaben
  (`{ abortEarly: false }`), sammelt `error.errors`, gibt sie **sortiert und
  dublettenfrei** zurück.
- Die Batterie muss die Zweige abdecken, die nur unter Bedingungen greifen:
  `hasPosition: true` und `hasPosition: false`, `isDead: true` und `false`,
  `sightingFrom` an Land und auf See, hochgeladene Medien vorhanden und nicht.
  Ohne diese Paare bleiben die `when()`-Zweige unerreicht — dort steckt der
  größte Teil der fehlenden 29.
- `UNPROVOKABLE_MESSAGES` listet, was sich **nachweislich** nicht auslösen lässt,
  je Eintrag mit einer Kommentarzeile, WARUM (z. B. eine Schranke, die eine
  vorgelagerte Regel nie durchlässt). Ein Eintrag ohne Begründung ist ein
  Review-Befund.

**Wenn eine Meldung nicht provozierbar ist, ist das ein Befund über die
Anwendung, nicht über den Test.** Melde jeden Eintrag der Ausnahmeliste im
Bericht ausdrücklich — er ist ein Kandidat für toten Code.

- [ ] **Schritt 4: Test laufen lassen, Grün bestätigen**

- [ ] **Schritt 5: Wirksamkeit per Mutation belegen**

Zwei Mutationen, je Ergebnis notieren und zurücksetzen:
1. In `sightingSchema.ts` eine Validierungsmeldung um ein Zeichen ändern
   (z. B. `'Das Datum ist erforderlich'` → `'Das Datum ist erforderlich.'`).
   Erwartet: der Abdeckungstest wird rot. **Danach zurücksetzen** — der Produktionscode
   muss unverändert bleiben.
2. Einen Eintrag aus `UNPROVOKABLE_MESSAGES` entfernen, der dort zu Recht steht.
   Erwartet: der Abdeckungstest wird rot.

- [ ] **Schritt 6: Commit**

Betreff: `test(test): cross-check german validation messages against the extractor`

---

## Aufgabe 2.3 — Der eingecheckte Schnappschuss

**Dateien:**
- Anlegen: `src/lib/form/validation/germanBaseline.json`
- Ändern: `src/lib/form/validation/germanBaseline.test.ts`

- [ ] **Schritt 1: Den Test schreiben, der gegen die Datei hält**

```ts
import baseline from './germanBaseline.json';

describe('germanBaseline.json', () => {
	// Bewusst KEIN toMatchSnapshot(): Vitest-Snapshots werden mit -u beilaeufig
	// ueberschrieben. Eine eingecheckte Datei zwingt jede Aenderung in den Diff
	// und damit ins Review — das ist der ganze Zweck dieser Aufgabe.
	it('hält Schema, Labels und Meldungen unverändert', async () => {
		expect({
			schema: collectSchemaShape(),
			labels: collectDomainLabels(),
			messages: await collectValidationMessages()
		}).toEqual(baseline);
	});
});
```

- [ ] **Schritt 2: Die Datei erzeugen**

Einmalig aus dem Ist-Zustand schreiben, mit `tsx`, nicht von Hand. Danach
`git diff` lesen und stichprobenartig gegen `sightingSchema.ts` prüfen: Steht
dort wirklich der deutsche Text, den die Anwendung heute zeigt?

- [ ] **Schritt 3: Grün bestätigen und die Wirksamkeit belegen**

Mutation: einen Wert in `germanBaseline.json` um ein Zeichen ändern → Test rot →
zurücksetzen. Und: `npm run test:quick` grün.

- [ ] **Schritt 4: Commit**

Betreff: `test(test): freeze the german baseline for stage 1`

---

## Abnahme von Aufgabe 2

1. `germanBaseline.json` liegt im Repo und deckt alle 56 Schema-Felder, alle 17
   formOptions-Dateien samt Rückfalltexten und Gruppennamen sowie die
   Validierungsmeldungen ab.
2. Der Abdeckungstest belegt, dass **jede** vom Extraktor in Meldungsposition
   gefundene Botschaft entweder provozierbar ist oder mit Begründung in
   `UNPROVOKABLE_MESSAGES` steht.
3. Kein Produktionscode geändert: `git diff --stat <basis>..HEAD -- src/lib/form/validation/sightingSchema.ts src/lib/report/formOptions/`
   ist leer.
4. Jede Teilaufgabe hat ihre Mutation im Commit-Body, mit Ergebnis.
5. `npm run test:quick` grün.

**Der Bericht muss die Ausnahmeliste vollständig aufführen.** Sie ist das
interessanteste Ergebnis dieser Aufgabe: Jede nicht provozierbare Meldung ist
entweder toter Code oder eine Lücke im Verständnis der Validierung — beides
gehört vor Aufgabe 3 auf den Tisch.
