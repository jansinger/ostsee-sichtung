# Etappe 1, Aufgabe 3 — Schicht B (Domänen-Labels)

> **Für agentische Bearbeiter:** ERFORDERLICHE UNTER-SKILL: `superpowers:subagent-driven-development`.

**Ziel:** Die 17 Dateien unter `src/lib/report/formOptions/` liefern ihre
Anzeigetexte aus Paraglide-Botschaften statt aus deutschen Literalen — **ohne
dass sich ein einziges deutsches Wort ändert**.

**Umfang nach Entscheidung vom 2026-08-11:** die 120 `Record<Enum, string>`-Werte
**plus** `PUBLIC_BOAT_DRIVE_OPTIONS` (2) **plus** die `getXLabel`-Rückfälle
(„Nicht angegeben" / „Unbekannt") in allen 17 Dateien. Der Fließtext in
`speciesIdentification.ts` (316 Literale) bleibt bestätigt **außen vor** — Schicht
E, Etappe 4; die Grenze ist in `germanBaseline.testutil.ts` per Test markiert.

**Der Beweis liegt schon vor.** `src/lib/form/validation/germanBaseline.json`
friert 56 Schema-Felder, 17 Label-Dateien und 65 Meldungen im heutigen Wortlaut
ein. Aufgabe 3 ist genau dann richtig, wenn dieser Schnappschuss **unverändert
grün** bleibt. Belegt: Ein einzelnes geändertes Zeichen macht ihn rot.

## Globale Randbedingungen

- **`germanBaseline.json` wird nicht angefasst.** Muss der Schnappschuss
  angepasst werden, ist der Umbau falsch — nicht der Schnappschuss. Eine
  Änderung an dieser Datei ist ein Abbruchgrund, kein Arbeitsschritt.
- **`sightingSchema.ts` bleibt in dieser Aufgabe unberührt.** Das ist Aufgabe 4.
  Ausnahme: keine.
- Deutsche Texte werden **verschoben, nicht umformuliert**. Kein „bei der
  Gelegenheit" verbessertes Wording.
- `messages/en.json` bekommt denselben deutschen Wortlaut wie `de.json`. Etappe 1
  liefert die Mechanik, nicht die Übersetzung.
- Kein `any`, explizite Rückgabetypen. `noUncheckedIndexedAccess` ist aktiv.
- Bezeichner englisch, Kommentare und Testnamen deutsch.
- Commit-Format `<type>(<scope>): <beschreibung>`, Englisch, Subject kleingeschrieben.
- Nach jedem Commit: `npx vitest run --project server src/lib/form/validation/germanBaseline.test.ts` grün.

## Bereits gemessen — nicht neu herleiten

- **Null direkte Importe** der `*Labels`-Records außerhalb von `formOptions/`
  (geprüft über `src/`, ohne Testdateien). Jeder Verbraucher geht über
  `get*Options()` oder `get*Label()`. Die Records dürfen modul-intern werden,
  ohne eine Aufrufstelle anzufassen.
- `src/lib/paraglide/runtime` exportiert `getLocale(): Locale`, `type Locale`,
  `baseLocale = 'de'`.
- Der Extraktor liefert für Schicht B 120 Fundstellen mit fertigen Schlüsseln
  (`formoptions_<datei>_<enumschlüssel>`), alle eindeutig und gültige Bezeichner.

## Die eine Falle dieser Aufgabe

Der Trockenlauf des Extraktors schlägt für Schicht B diese Ersetzung vor:

```
-	[SexEnum.FEMALE]: 'Weiblich',
+	[SexEnum.FEMALE]: m.formoptions_sex_female({}, { locale }),
```

**Diese Form ist falsch und darf nicht angewendet werden.** Sie steht in einer
Modulkonstante und friert die Sprache beim Modulladen ein — genau der Defekt, den
der Entwurf in 2.3/4.1 beschreibt. Der Bericht trägt dazu seit Aufgabe 1 einen
Warnhinweis. **Fundstellen und Schlüssel aus dem Trockenlauf sind richtig und
werden gebraucht; die gezeigte Ersetzung ist es nicht.**

---

## Aufgabe 3.1 — Botschaftskatalog und Locale-Helfer

**Dateien:**
- Ändern: `src/tools/i18n-extract/plan.ts`, `src/tools/i18n-extract-cli.ts`
- Anlegen: `src/lib/i18n/localeMemo.ts` + `localeMemo.test.ts`
- Ändern: `messages/de.json`, `messages/en.json`
- Ändern: die beiden „schreibt nichts"-Tests

**Schnittstellen:**
- Liefert: `memoizePerLocale<T>(build: (locale: Locale) => T): (locale?: Locale) => T`
- Liefert: CLI-Schalter `--write-messages`

- [ ] **Schritt 1: Den Test für `memoizePerLocale` schreiben**

```ts
import { describe, expect, it } from 'vitest';
import { memoizePerLocale } from './localeMemo';

describe('memoizePerLocale', () => {
	it('baut je Locale genau einmal', () => {
		let calls = 0;
		const get = memoizePerLocale((locale) => {
			calls++;
			return `gebaut für ${locale}`;
		});
		expect(get('de')).toBe('gebaut für de');
		expect(get('de')).toBe('gebaut für de');
		expect(calls).toBe(1);
		expect(get('en')).toBe('gebaut für en');
		expect(calls).toBe(2);
	});

	it('hält die Locales auseinander', () => {
		const get = memoizePerLocale((locale) => ({ locale }));
		expect(get('de')).not.toBe(get('en'));
		expect(get('de')).toBe(get('de'));
	});

	// Ohne Argument gilt die aktive Locale. Das ist der Normalfall im Betrieb;
	// die Tests und der Schnappschuss geben sie dagegen ausdrücklich an.
	it('fällt ohne Argument auf die aktive Locale zurück', () => {
		const get = memoizePerLocale((locale) => locale);
		expect(get()).toBe('de');
	});
});
```

- [ ] **Schritt 2: Rot bestätigen, dann implementieren**

`src/lib/i18n/localeMemo.ts`: eine `Map<Locale, T>`, Aufbau bei Bedarf,
Default-Argument `getLocale()`. Dateikommentar deutsch, mit der Begründung aus
dem Entwurf: Yup und die Options-Listen werten beim Aufbau aus, die Locale ist
dabei die einzige Variable — zwei Instanzen für zwei Sprachen sind deshalb kein
prozessweiter Zustand im Sinne von `.claude/rules/architecture.md`.

- [ ] **Schritt 3: `--write-messages` in die CLI**

Der Extraktor darf ab jetzt **genau zwei Dateien** schreiben: `messages/de.json`
und `messages/en.json`. Nichts sonst. Quelldateien werden weiterhin **nicht**
angefasst — der strukturelle Umbau der 17 Module ist Handarbeit (Aufgabe 3.2/3.3),
weil er sich nicht mechanisch ableiten lässt.

- Neuer Schalter `--write-messages`. Ohne ihn bleibt der Trockenlauf die
  Voreinstellung.
- Geschrieben werden die Schlüssel beider Schichten aus `planExtraction()`,
  einsortiert in die vorhandenen Dateien (der Schlüssel `i18n_selbsttest` und
  `$schema` bleiben erhalten), Schlüssel alphabetisch sortiert.
- `de.json` bekommt den deutschen Text, `en.json` **denselben** Text.
- Bestehende Schlüssel mit abweichendem Wert werden **nicht** überschrieben,
  sondern gemeldet und der Lauf bricht ab. Ein stilles Überschreiben wäre der
  Weg, auf dem eine spätere Übersetzung in `en.json` verlorengeht.

- [ ] **Schritt 4: Die beiden „schreibt nichts"-Tests nachziehen**

Sie verbieten heute jeden schreibenden `fs`-Aufruf in Werkzeugdateien. Das war
für Aufgabe 1 richtig und ist jetzt zu eng. Zieh sie auf die Aussage nach, die
weiter gilt: **außer `messages/de.json` und `messages/en.json` wird nichts
geschrieben** — insbesondere keine Quelldatei unter `src/lib/`.

Der Test muss diese Zusicherung wirklich prüfen, nicht nur die Zeichenkette
`writeFileSync` zählen. Belege ihn per Mutation: einen Schreibaufruf auf einen
anderen Pfad einbauen → Test rot → zurücksetzen.

- [ ] **Schritt 5: Katalog erzeugen und prüfen**

```bash
npm run i18n:extract -- --write-messages
git diff --stat messages/
```

Erwartet: `de.json` und `en.json` wachsen um dieselbe Zahl Schlüssel (Schicht A
und B zusammen, rund 379). **`git diff` beider Dateien lesen**, nicht nur die
Statistik: Steht dort deutscher Text, und in `en.json` derselbe?

Prüfen, dass Paraglide den Katalog übersetzt:

```bash
npm run i18n:compile
```

Erwartet: erfolgreich. Bricht es ab, liegt es an einem Schlüssel, der kein
gültiger Bezeichner ist — der Guard aus Aufgabe 1 sollte das ausschließen.

- [ ] **Schritt 6: Commit**

Betreff: `feat(build): write the paraglide message catalogue from the extractor`

---

## Aufgabe 3.2 — Pilotmodul `species.ts`

`species.ts` ist bewusst das erste: Es ist das komplizierteste der 17 (Gruppen,
gruppierte Optionen, zwei Rückfalltexte). Was hier trägt, trägt überall.

**Dateien:**
- Ändern: `src/lib/report/formOptions/species.ts`
- Ggf. ändern: `src/lib/report/formOptions/speciesIdentification.test.ts` u. a.

- [ ] **Schritt 1: Den Schnappschuss vorher laufen lassen**

```bash
npx vitest run --project server src/lib/form/validation/germanBaseline.test.ts
```

Erwartet: grün. Das ist der Ausgangspunkt, gegen den alles Folgende gemessen wird.

- [ ] **Schritt 2: Umbau**

Zielform — **die Records werden modul-intern**, weil sie nachweislich niemand von
außen importiert:

```ts
const speciesLabelBuilders: Record<SpeciesEnum, (locale: Locale) => string> = {
	[SpeciesEnum.HARBOR_PORPOISE]: (locale) => m.formoptions_species_harbor_porpoise({}, { locale }),
	// … alle elf
};

const speciesLabelsFor = memoizePerLocale(
	(locale) =>
		Object.fromEntries(
			Object.entries(speciesLabelBuilders).map(([value, build]) => [value, build(locale)])
		) as Record<SpeciesEnum, string>
);
```

Regeln für den Umbau:

- **Jede öffentliche Signatur bekommt einen optionalen `locale`-Parameter am
  Ende** (`getSpeciesOptions(grouped = false, locale: Locale = getLocale())`).
  Bestehende Aufrufstellen bleiben dadurch unverändert gültig.
- **Die Reihenfolge der Optionen bleibt exakt erhalten.** Der Schnappschuss
  vergleicht Arrays, nicht Mengen.
- **Die Gruppennamen** (`Kleinwale`, `Großwale`, `Robben`) sind heute zugleich
  Objektschlüssel und Anzeigetext. Trenne beides: Der Schlüssel wird ein stabiler
  Bezeichner, der Text kommt aus einer Botschaft. Ohne diese Trennung ist die
  Gruppierung sprachabhängig verschlüsselt.
- **Die Rückfälle** `'Nicht angegeben'` und `'Unbekannt'` in `getSpeciesLabel`
  werden ebenfalls Botschaften (Entscheidung vom 2026-08-11).
- `isValidSpecies` und `toSpeciesEnum` fassen keinen Text an und bleiben unverändert.

- [ ] **Schritt 3: Der Schnappschuss muss unverändert grün sein**

```bash
npx vitest run --project server src/lib/form/validation/germanBaseline.test.ts
git diff --stat src/lib/form/validation/germanBaseline.json
```

Erwartet: grün **und** die zweite Zeile leer. Ist der Schnappschuss rot, ist der
Umbau falsch — **die Datei nicht anpassen**, sondern die Abweichung im Bericht
benennen und den Umbau korrigieren.

- [ ] **Schritt 4: Wirksamkeit per Mutation belegen**

Einen Botschaftswert in `messages/de.json` ändern, der zu `species.ts` gehört →
Schnappschuss rot → zurücksetzen. Das belegt, dass die Labels jetzt wirklich aus
dem Katalog kommen und nicht mehr aus einem übriggebliebenen Literal.

- [ ] **Schritt 5: `npm run test:quick`, dann Commit**

Betreff: `refactor(i18n): serve species labels from paraglide messages`

---

## Aufgabe 3.3 — die übrigen 16 Dateien

Nach demselben Muster, in Gruppen zu vier Dateien mit je einem Commit — nicht
alle sechzehn in einem Zug, damit ein Fehlschlag lokalisierbar bleibt.

Reihenfolge (einfach nach schwer): `sex`, `visibility`, `seaState`,
`windStrength` — `windDirection`, `distance`, `distribution`, `mediaType` —
`animalBehavior`, `animalCondition`, `reactionToBoat`, `boatType` —
`sightingFrom`, `entryChannel`, `boatDrive`, `speciesIdentification`.

Zwei Sonderfälle in der letzten Gruppe:

- **`boatDrive.ts`** trägt zusätzlich `PUBLIC_BOAT_DRIVE_OPTIONS` (`Motor lief` /
  `Motor lief nicht`). Nach Entscheidung vom 2026-08-11 mit im Umfang.
- **`speciesIdentification.ts`**: nur `observabilityLabels` und
  `frequencyLabels`. Die elf Artdatensätze bleiben unberührt — die Grenze ist in
  `germanBaseline.testutil.ts` per Test markiert. Wer sie verschiebt, muss den
  Test anfassen.

Nach **jeder** Gruppe: Schnappschuss grün, `germanBaseline.json` unverändert.

---

## Abnahme von Aufgabe 3

1. `germanBaseline.json` ist **bitgleich** zum Stand vor Aufgabe 3
   (`git diff 3d28f95c..HEAD -- src/lib/form/validation/germanBaseline.json` leer).
2. Alle 17 Dateien liefern ihre Texte aus dem Botschaftskatalog; kein deutsches
   Anzeigetext-Literal mehr in `formOptions/`, ausgenommen die elf Artdatensätze
   in `speciesIdentification.ts`.
3. `messages/de.json` und `en.json` tragen dieselben Schlüssel, `en` mit
   deutschem Wortlaut.
4. `npm run test:quick` grün **und** die betroffenen E2E-Shards vollständig
   gefahren — `test:quick` enthält keine E2E, und Schicht B speist Formular,
   Karte, Popups und Listenansicht.
5. Jede Teilaufgabe hat ihre Mutation im Commit-Body.
