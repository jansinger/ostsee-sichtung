# Etappe 1 der Mehrsprachigkeit — Entwurf (2026-08-11)

> **Was das ist.** Der abgestimmte Entwurf für Etappe 1 (Schichten A und B) aus
> `docs/DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md`. Er ersetzt jenes Dokument nicht,
> sondern schärft dessen Abschnitte 3, 5.1 und 5.2 an vier Stellen nach, an denen
> die Messung von der Annahme abweicht — jede Abweichung ist unten mit Fundstelle
> belegt.
>
> **Kein Umsetzungsplan.** Die Arbeitsschritte mit Tests folgen separat
> (`docs/superpowers/plans/`).

---

## 1. Ziel

Die Texte der Schichten A (`sightingSchema.ts`) und B (`src/lib/report/formOptions/`)
werden zu Paraglide-Botschaften. Das deckt laut Entwurf Abschnitt 3 zugleich
Meldeformular, Admin-Maske, Karte, Popups und Listenansicht ab, weil alle vier
Flächen dieselben Quellen lesen.

**Lieferzustand:** `messages/de.json` und `messages/en.json` tragen beide alle
Schlüssel; der englische Wert ist zunächst der deutsche Text. Etappe 1 liefert die
Mechanik, nicht die Übersetzung. Das ist Absicht:

- Die englischen Artnamen sind ein **ungeprüfter Vorschlag**
  (`docs/I18N_ARTNAMEN_VORSCHLAG.md`), keine freigegebene Fassung. Struktur bauen
  ja, als freigegeben behandeln nein.
- `/en` trägt weiterhin `X-Robots-Tag: noindex, follow`, weil
  `TRANSLATION_ROLLOUT_COMPLETE` (`src/lib/i18n/translationRolloutStage.ts`)
  `false` bleibt. Ein sichtbar deutscher englischer Pfad ist damit ein erkennbarer
  Zwischenstand, kein stiller Rückfall.
- Die eigentliche Übersetzung wird dadurch ein **eigener, prüfbarer Schritt**: ein
  Diff auf genau einer Datei (`messages/en.json`), ohne Quelltextänderung.

Die Alternative, `en.json` leer zu lassen und Paraglides Laufzeit-Fallback auf
`de` zu nutzen, ist verworfen. Sie kaschiert später echte Lücken: Ein nie
extrahierter Schlüssel und ein absichtlich unübersetzter Schlüssel sähen identisch
aus — genau der Fall, den Entwurf Abschnitt 8 als „nur ein Scan findet"
beschreibt.

---

## 2. Vier Korrekturen am Entwurf vom 2026-08-10

### 2.1 Schicht A umfasst ~259 Botschaften, nicht 286

> Die Tabelle unten zählt 258 aus den 308 Inventar-Funden. Eine weitere Botschaft
> steht in einer Form, die das Inventar nicht sieht (3.1.1) — daher ~259.

Die Zahl 286 im Entwurf Abschnitt 3 ist die Summe aus `uebersetzbar` und `unklar`
im Inventar. Sie zählt Funde, nicht Botschaften. Aufgeschlüsselt nach Aufrufstelle
(gemessen über `docs/i18n-inventory.json`, 308 Funde in `sightingSchema.ts`):

| Aspekt              | Funde | übersetzbar |
| ------------------- | ----: | ----------- |
| `.label()`          |    55 | ja          |
| `meta.helpText`     |    53 | ja          |
| `meta.valueText`    |    52 | ja          |
| `meta.placeholder`  |    29 | ja, bis auf drei rein numerische |
| `.max()`            |    32 | ja (Argument 1) |
| `.min()`            |     8 | ja (Argument 1) |
| `.required()`       |    16 | ja (Argument 0) |
| `.matches()`        |     1 | ja (Argument 1) |
| `.oneOf()`          |     1 | ja (Argument 1) |
| `.email()`          |     1 | ja (Argument 0) |
| `.test()`           |    26 | **nur die Hälfte** — siehe 2.2 |
| `meta.type`         |    27 | **nein** |
| `meta.autocomplete` |     7 | **nein** |

`meta.type` trägt Werte wie `'toggle'`, `'select'`, `'date'`, `'hidden'`.
`FieldRenderer` schaltet daran den Feldtyp um; eine Übersetzung macht aus jedem
betroffenen Feld ein unbekanntes. `meta.autocomplete` trägt die HTML-Werte
`given-name`, `postal-code`, `address-level2` — normiert, nicht sprachlich.

Beide sind im Inventar als `unklar` einsortiert, nicht als `technisch`. Das ist
kein Fehler des Werkzeugs, sondern seine Grenze: `'toggle'` ist inhaltlich von
einem Wort nicht zu unterscheiden. **Daraus folgt Abschnitt 3.**

### 2.2 `.test()` trägt seinen Namen im ersten Argument

`yup`s Signatur ist `.test(name, message, fn)`. Das Inventar sammelt alle
String-Argumente und zählt deshalb 26, wo 13 Meldungen stehen. Die andere Hälfte
sind Testnamen wie `'is-valid-species'`, `'is-valid-date'`,
`'juveniles-within-total'`. Sie erscheinen in `errors[field].type` und werden
maschinell ausgewertet; sie zu übersetzen bricht die Validierung, ohne dass ein
Text falsch aussieht.

### 2.3 `createOptionsFactory` ist an Schicht B nicht beteiligt

Entwurf Abschnitt 5.2 sagt, `createOptionsFactory` bekomme statt eines
`Record<keyof T, string>` einen Record von Botschaftsfunktionen. **Keine der 17
Dateien unter `src/lib/report/formOptions/` ruft diese Funktion auf** (geprüft per
Grep über `src/`: die einzigen Fundstellen sind
`src/lib/utils/form/optionsFactory.ts` selbst, `src/lib/utils/index.ts` und der
zugehörige Test). Jede der 17 Dateien rollt ihre Optionsliste selbst aus und legt
sie als **Modulkonstante** ab, zum Beispiel:

```ts
// src/lib/report/formOptions/species.ts:62
const speciesOptions: Array<{ value: string; label: string }> = Object.entries(
	speciesLabels
).map(([value, label]) => ({ value: String(value), label }));
```

Schicht B hat damit dasselbe Problem wie Schicht A — Auswertung beim Modulladen,
nicht beim Aufruf —, nur an 17 Stellen statt an einer. Das ist der Grund, warum
Abschnitt 5 unten pro Datei eine Änderung vorsieht und nicht eine zentrale.

### 2.4 In Schicht A und B stehen keine Plurale

Der Auftrag verlangt ICU-Plurale von Anfang an. Geprüft: 76 der 428 Funde in A+B
enthalten eine Ziffer, **keiner davon ist eine variable Anzahl**. Jede Ziffer ist
eine feste Schranke, die im selben Satz genannt wird:

```
"Die Ortsbeschreibung ist zu lang (maximal 255 Zeichen)"
"Bei mehr als 15 Tieren bitte 15 eintragen"
"Bitte geben Sie mindestens 1 Tier an"
```

Die im Entwurf Abschnitt 5.6 genannten Pluralfälle — Tierzahlen in der Anzeige,
Trefferzahlen der Listenansicht, Dateizahlen im Dropzone — liegen alle in Schicht
C und damit in Etappe 2. **Etappe 1 baut keine ICU-Plurale.** Sie zu bauen, wo
keine gebraucht werden, wäre die Verkettung, vor der der Auftrag warnt, nur
andersherum.

Offener Nebenbefund, bewusst nicht Teil dieser Etappe: Die Schranken stehen
doppelt — einmal als Yup-Argument, einmal im Text (`.max(255, '… maximal 255
Zeichen')`). Eine Parametrisierung über ICU (`{max}`) wäre sauberer, ändert aber
den deutschen Text und damit die Grundlage von Abschnitt 6. Nach Etappe 1 zu
bewerten.

---

## 3. Das Werkzeug

`src/tools/i18n-extract.ts`, neu, nutzt die vorhandenen AST-Leser aus
`src/tools/i18n-inventory.ts` weiter (`analyzeSightingSchemaSource`,
`analyzeFormOptionsSource` und deren TypeScript-Compiler-Aufbau).

### 3.1 Der Extraktor benutzt `classifyText` nicht

Das ist die zentrale Entscheidung. `classifyText` (i18n-inventory.ts:221)
entscheidet nach **Inhalt** und liegt an den Stellen falsch, die zählen:

| Fund                                       | Kategorie   | richtig            |
| ------------------------------------------ | ----------- | ------------------ |
| `hasPosition.meta.type = "toggle"`         | `unklar`    | nicht extrahieren  |
| `mediaFile.label = "Foto-/Videobeschreibung"` | `technisch` | extrahieren        |
| `mediaTypeLabels[DRAWING] = "Zeichnung/Skizze"` | `technisch` | extrahieren        |
| `entryChannelLabels[EMAIL] = "E-Mail"`     | `unklar`    | extrahieren        |

Die zweite und dritte Zeile sind derselbe Fehler: Das MIME-Typ-Muster
(i18n-inventory.ts:93) ist mit `/i` case-insensitiv und trifft deshalb jedes
deutsche Wortpaar mit Schrägstrich.

Für das Inventar ist all das folgenlos — es schlägt vor, es ersetzt nicht. Für
einen Extraktor ist es der Unterschied zwischen einer heilen und einer kaputten
Anwendung. Der Extraktor entscheidet deshalb **strukturell**, nach Aufrufstelle und
Argumentposition:

| Aufrufstelle                                                   | extrahiert                    |
| -------------------------------------------------------------- | ----------------------------- |
| `.label(a0)`                                                   | `a0`                          |
| `.meta({ helpText, placeholder, valueText })`                  | genau diese drei Werte        |
| `.meta({ type, icon, autocomplete, options, … })`              | nichts                        |
| `.required(a0)`, `.email(a0)`, `.typeError(a0)`                | `a0`                          |
| `.min(n, a1)`, `.max(n, a1)`, `.matches(re, a1)`, `.oneOf(arr, a1)` | `a1`                     |
| `.test(name, msg, fn)`                                         | **nur `msg`**, nie `name`     |
| `.test({ name, message, test })`                               | **nur `message`**, siehe 3.1.1 |
| `export const xLabels: Record<Enum, string>`                   | die String-Werte              |

Die `meta`-Listen sind **vollständig aufgezählt**, nicht mit „…" abgekürzt. Acht
Schlüssel kommen in `sightingSchema.ts` vor:

| `meta`-Schlüssel | Vorkommen | extrahiert | warum nicht                        |
| ---------------- | --------: | ---------- | ---------------------------------- |
| `helpText`       |        53 | ja         |                                    |
| `valueText`      |        52 | ja         |                                    |
| `placeholder`    |        29 | ja         |                                    |
| `icon`           |        52 | nein       | Icon-Bezeichner (`lucide:anchor`)  |
| `type`           |        27 | nein       | Renderer-Steuerung                 |
| `options`        |        13 | nein       | Aufruf nach Schicht B, siehe 4.2   |
| `autocomplete`   |         7 | nein       | normierte HTML-Werte               |
| `step`           |         1 | nein       | Zahlenschrittweite                 |

`icon`, `options` und `step` tauchen im Inventar nicht auf, weil ihre Werte keine
String-Literale sind. Ohne diese Zeile führe die geschlossene Allowlist am ersten
Tag zum Abbruch — der Vollständigkeitscheck dieses Entwurfs hat genau das gefunden.

Zwei Zusatzregeln:

- **Rein numerische Zeichenketten werden nicht extrahiert.** Betroffen sind drei
  Platzhalter (`"1"`, `"0"`, `"12345"`). Ein Schlüssel dafür trägt nichts und
  erzeugt eine Botschaft, die in jeder Sprache gleich lautet.
- **Die Allowlist ist geschlossen.** Ein `meta`-Schlüssel, der weder in der
  Erlaubt- noch in der Verbotsliste steht, bricht den Lauf mit einer benannten
  Fehlermeldung ab, statt geraten zu werden. Ein neues `meta`-Feld ist damit eine
  bewusste Entscheidung, kein Zufall.

### 3.1.1 Zwei Formen, die das Inventar nicht kennt

**`.test()` in Objektform.** `adminSightingSchema` benutzt zweimal
`.test({ name, exclusive, message, test })` statt der Positionsform
(`sightingSchema.ts:1400` und `:1410`). Das Inventar sieht beide nicht: Sein
Leser prüft nur direkte String-Argumente. Folgen für diesen Entwurf:

- Die Zahl aus 2.1 ist um **eine** Botschaft zu niedrig
  (`'Bitte wählen Sie eine gültige Entfernungskategorie.'`). Schicht A umfasst
  damit ~259 statt ~258 Botschaften.
- Die zweite Fundstelle trägt `message: ''` — ein bewusst leerer Text, der nur
  einen gleichnamigen Test überschreibt (der Kommentar an Ort und Stelle erklärt
  das `exclusive: true`). **Leere Zeichenketten werden nicht extrahiert.** Eine
  Botschaft ohne Inhalt ist keine.

**Nicht-literale Argumente.** `sightingSchema.ts:1421` ruft
`.label(sightingFromTextBase.spec.label ?? 'Sonstiger Ort')` — ein Ausdruck mit
einem String-Literal darin. Der Extraktor fasst solche Aufrufe **nicht** an: Er
ersetzt nur, wo das Argument als Ganzes ein String-Literal ist. Das Literal hier
ist ein Rückfallwert für einen Wert, der aus einem anderen Feld stammt; es zu
ersetzen ändert die Bedeutung des `??`. Der Trockenlauf weist die Stelle unter
den übersprungenen aus, damit sie beim Umbau von Hand entschieden wird.

### 3.2 Zwei Fehler im Schlüsselvorschlag, die zu beheben sind

**Der `then`-Fehler.** `findEnclosingFieldName` (i18n-inventory.ts:589) läuft zum
nächstgelegenen `PropertyAssignment` hoch. Innerhalb von
`.when('hasPosition', { is: true, then: (schema) => … })` heißt das `then`, nicht
`latitude`. Ergebnis im aktuellen Inventar: **20 Schlüsselkollisionen**, darunter
`sighting_then_required` für sechs verschiedene Meldungen. Ein Extraktor, der das
übernimmt, führt sechs Botschaften still zu einer zusammen.

Behebung: Den Feldnamen nicht am nächsten, sondern am **richtigen** Knoten lesen —
an dem Objektliteral, das an `.shape(…)` übergeben wird. Alles darunter
(`then`, `otherwise`, `is`, `meta`) wird übersprungen.

**Gleiche Regel zweimal am selben Feld.** Wo ein Feld dieselbe Regel doppelt
trägt, bekommt die zweite Botschaft ein Zählsuffix (`_2`). Kein Feld darf zwei
Botschaften unter einem Schlüssel haben.

### 3.3 Schlüsselschema

Das Schema des Inventars, mit behobenen Kollisionen — damit bleibt
`docs/i18n-inventory.md` als Nachschlagewerk lesbar:

```
sighting_latitude_label
sighting_latitude_meta_helptext
sighting_latitude_required          ← statt sighting_then_required
sighting_latitude_min
formoptions_species_harbor_porpoise
```

Punkt-Namensräume (`sighting.latitude.label`) sind verworfen: Das
inlang-message-format-Plugin erzeugt flache JS-Bezeichner, ein Punkt erzwingt
`m['sighting.latitude.label']()` und kostet damit Autovervollständigung und den
Build-Fehler bei Tippfehlern.

**Dubletten werden nicht zusammengeführt.** 19 Rohtexte kommen in A+B mehrfach
vor. Jede Fundstelle bekommt ihren eigenen Schlüssel — dieselbe Begründung wie im
Inventar (i18n-inventory.ts:758): Was auf Deutsch gleich lautet, kann auf Englisch
auseinanderfallen.

### 3.4 Zwei Betriebsarten

```bash
npm run i18n:extract              # Trockenlauf — schreibt nichts
npm run i18n:extract -- --apply   # schreibt Quelldateien und messages/*.json
```

Der Trockenlauf ist der Default und gibt aus:

1. je Quelldatei einen Unified Diff der geplanten Ersetzungen,
2. die geplanten Einträge für `de.json` und `en.json`,
3. eine Zusammenfassung mit der Zahl der Botschaften je Datei,
4. jede **übersprungene** Zeichenkette mit Grund („`meta.type` ist Renderer-Steuerung",
   „Argument 0 von `.test()` ist der Testname").

Punkt 4 ist nicht Kosmetik: Er ist die einzige Stelle, an der ein Mensch sieht,
was das Werkzeug *nicht* anfasst, und damit die einzige Chance, eine zu enge
Allowlist zu bemerken.

`--apply` bricht bei unsauberem Arbeitsbaum ab. Der erzeugte Diff bleibt dadurch
in jedem Fall nachträglich prüfbar.

---

## 4. Schicht A — `getSightingSchema`

```ts
const cache = new Map<Locale, ObjectSchema<…>>();

export function getSightingSchema(locale: Locale = getLocale()) {
	let schema = cache.get(locale);
	if (!schema) {
		schema = buildSightingSchema(locale);
		cache.set(locale, schema);
	}
	return schema;
}
```

Der Entwurf Abschnitt 5.1 verlangt den Aufbau „pro Anfrage". Die Memoisierung je
Locale erfüllt dessen Zweck und ist zugleich genauer: Yup wertet die Botschaften
beim Aufbau aus, die Locale ist dabei die **einzige** Variable. Zwei Instanzen für
zwei Sprachen sind deshalb kein prozessweiter Zustand im Sinne der SSR-Regel
(`.claude/rules/architecture.md`) — das Schema für `de` ist für jede Anfrage
identisch. Der Nebeneffekt, den der Entwurf ausdrücklich will, tritt trotzdem ein:
Die Datei hält keine Modulkonstante mit deutschem Text mehr.

`buildSightingSchema` erhält die Locale und gibt sie an jeden `m.*()`-Aufruf
weiter (`m.sighting_latitude_label({}, { locale })`) — nicht über den ambienten
Paraglide-Zustand, weil die Fabrik auch mit explizitem Argument aufrufbar sein
muss (Tests, Export, Legacy-Pfade).

### 4.1 Schicht A liest Schicht B beim Aufbau — der Beleg

`meta.options` trägt keine Daten, sondern einen Aufruf:

```ts
// sightingSchema.ts:841
.meta({ …, type: 'select', options: getWindDirectionOptions(), icon: Wind })
```

Dreizehn Felder machen das. Die Auswahltexte jedes Select-Feldes im Formular sind
damit **beim Schema-Aufbau** aus Schicht B eingefroren. Zwei Folgerungen, die
nicht auf einer Annahme beruhen:

1. Der Umbau von Schicht A allein reicht nicht. Bliebe `getWindDirectionOptions()`
   eine Modulkonstante mit deutschen Texten, zeigte das englische Formular
   englische Beschriftungen über deutschen Auswahllisten.
2. Die Reihenfolge in Abschnitt 8 (B vor A) ist erzwungen, nicht bevorzugt.
   `getWindDirectionOptions()` muss die Locale schon annehmen können, wenn
   `buildSightingSchema(locale)` sie durchreicht.

### 4.2 Betroffene Aufrufstellen

`sightingSchema`, `sightingSchemaBase` und `adminSightingSchema` sind heute
Modulkonstanten. Sie werden zu `getSightingSchema()`, `getSightingSchemaBase()`,
`getAdminSightingSchema()`. Gelesen wird von:

| Datei                                            | Nutzung                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `src/lib/report/formConfig.ts:16`                | `sightingSchema.describe()` **auf Modulebene**   |
| `src/lib/types/Form.ts:6`                        | nur `yup.InferType` — Typ, keine Laufzeit        |
| `src/lib/server/validation/requestValidation.ts` | `sightingSchemaBase`                             |
| `src/routes/api/sightings/+server.ts`            | `sightingSchema`                                 |
| `src/routes/api/sightings/[id]/+server.ts`       | `adminSightingSchema`                            |
| `src/lib/report/components/ModernReportForm.svelte` | `sightingSchema`                              |
| `src/lib/components/admin/AdminSightingEditForm.svelte` | `adminSightingSchema`                     |
| Tests (7 Dateien)                                | teils per `vi.mock`                              |

`formConfig.ts:16` ist die eigentliche Arbeit. `sightingSchemaDescription`,
`initialFormState` und `sightingSchemaFields` sind dort Modulkonstanten aus
`describe()`. Zwei davon tragen Text und werden zu Funktionen
(`getSightingSchemaFields(locale)`); `initialFormState` trägt nur Vorgabewerte und
**bleibt eine Konstante** — es aus der deutschen Beschreibung abzuleiten wäre
zufällig richtig, aus einer locale-abhängigen dagegen ein Fehler in Wartestellung.
Ob `describe()` locale-frei berechenbar ist, entscheidet sich beim Umbau; falls
nicht, wird `initialFormState` aus `getSightingSchema(baseLocale)` abgeleitet und
das im Quelltext begründet.

`sightingSchemaBase` wird von `requestValidation.ts` serverseitig benutzt. Es
bleibt bei der aktiven Locale der Anfrage — ein englischer Melder bekommt
englische Validierungsfehler. Das ist gewollt und berührt Abschnitt 6 des
Entwurfs nicht: Der **Wertevertrag** der Legacy-API ändert sich nicht, nur der
Meldungstext einer abgelehnten Eingabe.

---

## 5. Schicht B — 17 Dateien plus sechs benannte Handgriffe

Alle **120** `Record<Enum, string>`-Werte werden extrahiert, nicht 118. Die
Differenz sind `mediaTypeLabels[DRAWING]` (`Zeichnung/Skizze`) und
`reactionToBoatLabels[AVOIDANCE]` (`Vermeidung/Flucht`), die das Inventar durch
den case-insensitiven MIME-Vergleich als `technisch` führt (3.1). Beide sind
Auswahltexte im Formular. Die strukturelle Regel greift hier ohne Ausnahme: Was in
einem Labels-Record steht, ist Anzeigetext.


Je Datei wird aus

```ts
export const speciesLabels: Record<SpeciesEnum, string> = { … };
const speciesOptions = Object.entries(speciesLabels).map(…);   // Modulkonstante
export const getSpeciesOptions = () => speciesOptions;
```

ein Record von Botschaftsfunktionen plus eine je Locale memoisierte Options-Liste,
nach demselben Muster wie Abschnitt 4. `getSpeciesLabel(value)` und
`isValidSpecies(value)` behalten ihre Signatur — `isValid*` fasst ohnehin keinen
Text an.

Sechs nutzersichtbare Zeichenketten liegen außerhalb des
`Record<Enum, string>`-Musters und damit außerhalb dessen, was das Werkzeug
findet. Sie werden **von Hand** und namentlich mitgenommen, weil sonst unter `/en`
deutsche Reste stehen bleiben, die kein Guard sieht:

| Fundstelle                                        | Text                                    |
| ------------------------------------------------- | --------------------------------------- |
| `formOptions/species.ts:44` `speciesGroups`-Schlüssel | `Kleinwale`, `Großwale`, `Robben` — sie rendern als `<optgroup>`-Beschriftung |
| `getXLabel`-Rückfälle in **allen 17** Dateien     | `Nicht angegeben`, `Unbekannt`          |
| `formOptions/boatDrive.ts:89` `PUBLIC_BOAT_DRIVE_OPTIONS` | `Motor lief`, `Motor lief nicht` — öffentlicher Formulartext |
| `utils/form/optionsFactory.ts:56`                 | `Unbekannt`                             |

**Korrigiert am 2026-08-11.** Diese Liste hieß zuerst „sechs Handgriffe" und nannte
die `getXLabel`-Rückfälle nur für `species.ts`. Tatsächlich stehen sie in allen 17
Dateien, und `PUBLIC_BOAT_DRIVE_OPTIONS` fehlte ganz. Gefunden hat das nicht ein
Mensch beim Nachlesen, sondern das Werkzeug, nachdem es gelernt hatte, **nicht
getroffene Exporte zu melden** statt sie zu übergehen (Aufgabe 1, Abschluss-Review).

Derselbe Mechanismus deckte den größeren Fall auf: `formOptions/speciesIdentification.ts:66`
trägt in `speciesIdentification: Record<SpeciesEnum, SpeciesIdentificationEntry>`
**316 String-Literale** deutschen Fachtexts. Die sind Schicht E und gehören nach
Etappe 4 — die Datei erschien im Bericht aber mit „7 Botschaften", was sich wie
erledigt las. Sie steht jetzt als unbesehener Bestand im Übersprungen-Abschnitt.
**Das ist kein Handgriff für Etappe 1**, sondern eine Zahl, die Etappe 4 vorher
niemand genannt hatte.

Die `speciesGroups`-Schlüssel sind zugleich Objektschlüssel und Anzeigetext. Der
Umbau trennt beides: Der Schlüssel wird ein stabiler Bezeichner, der Text kommt
aus einer Botschaft. Ohne diese Trennung wäre die Gruppierung sprachabhängig
verschlüsselt.

`createConsentOptionsFactory` (`optionsFactory.ts:100`, `Einverstanden` /
`Nicht einverstanden`) bleibt **unangetastet**: Einwilligungstexte sind Etappe 3
und hängen an einer Datenschutz-Abnahme (Entwurf Abschnitt 7).

---

## 6. Nachweis, dass Deutsch unverändert bleibt

290 E2E-Selektoren greifen über sichtbaren deutschen Text. Der Auftrag verlangt,
das zu **prüfen**, nicht vorauszusetzen.

**Charakterisierungstest, geschrieben und grün bevor irgendetwas extrahiert wird.**
Er serialisiert unter Locale `de`

- `getSightingSchema().describe()` — Beschriftungen, `meta`, Pflichtangaben,
- das Ergebnis jeder `get*Options()`-Funktion der 17 `formOptions/`-Dateien,
- die Meldung jeder Validierungsregel, erzwungen über eine Beispieleingabe je Regel

gegen einen eingecheckten Schnappschuss. Vor dem Umbau hält er den Ist-Zustand
fest; nach dem Umbau ist er der Beleg. Ein falsch zugeordneter Schlüssel, ein
verlorener Umlaut oder eine versehentlich zusammengeführte Dublette macht ihn rot.

Die Validierungsmeldungen gehören ausdrücklich dazu: Sie stehen in `describe()`
nicht drin, sind aber der größere Teil dessen, was ein Melder zu sehen bekommt.

**Mutation, mit der die Wirksamkeit belegt wird:** einen Wert in `messages/de.json`
ändern → Test rot → zurücksetzen. Ein Test, der nur „läuft durch" meldet, ist nach
der Erfahrung aus Etappe 0 (achtmal grün ohne Sicht auf die geschützte Funktion,
`docs/i18n/ARBEITSPROTOKOLL_ETAPPE0.md`) kein Nachweis.

**E2E:** `npm run test:quick` enthält keine E2E-Tests. Nach dem Umbau laufen die
betroffenen Shards vollständig, nicht nur einzelne Dateien — und isoliert, weil
parallele Worktree-Läufe Fehlschläge erzeugen, die wie Defekte aussehen
(`docs/WORKTREES.md`).

---

## 7. Guard gegen Rückfall

`hardcodedStringScan.test.ts` nach dem Muster der vier bestehenden Scans
(`approvalPredicateScan`, `verifiedReadScan`, `statusLogWriteScan`,
`openQueueOrderScan`) über die geteilte
`src/lib/testing/sourceScan.testutil.ts`. Zuschnitt für Etappe 1 bewusst **eng**:
nur `sightingSchema.ts` und `formOptions/`, nur die Aufrufstellen aus der
Allowlist in Abschnitt 3.1.

Der Grund für den engen Zuschnitt steht im Entwurf Abschnitt 8.3: Ein Guard, der
ab Tag eins rot ist, wird abgeschaltet und schützt danach nichts. Schicht C kommt
mit Etappe 2 dazu.

Der Scan bekommt konstruierte Positiv- und Gegenproben im Test selbst. Ein Lauf
über einen konformen Bestand belegt nichts über die Regel.

---

## 8. Reihenfolge

Fünf Aufgaben. Jede endet mit ihrem per Mutation belegten Guard.

| # | Inhalt                                                                     | Guard                                    |
| - | -------------------------------------------------------------------------- | ---------------------------------------- |
| 1 | Extraktor mit Trockenlauf; schreibt nichts                                 | Unit-Tests über Allowlist und Schlüssel  |
| 2 | Charakterisierungs-Schnappschuss Deutsch                                   | Mutation in `de.json`                    |
| 3 | Schicht B — 17 Dateien, 120 Botschaften, plus die sechs Handgriffe         | Schnappschuss bleibt grün                |
| 4 | Schicht A — ~259 Botschaften, `getSightingSchema`, ~10 Aufrufstellen       | Schnappschuss bleibt grün; E2E-Shards    |
| 5 | `hardcodedStringScan` für A+B                                              | konstruierte Positiv-/Gegenprobe         |

Aufgabe 2 steht **vor** 3 und 4 und nicht daneben: Ein Schnappschuss, der nach dem
Umbau entsteht, hält den umgebauten Zustand fest und belegt nichts.

Aufgabe 3 vor 4, weil Schicht A aus Schicht B liest (`getSpeciesOptions` und
Geschwister werden in `sightingSchema.ts` importiert, Zeilen 16–42) — die
umgekehrte Reihenfolge erzwänge eine Zwischenfassung.

---

## 9. Was hier nicht steht

- **Keine englischen Texte.** `en.json` trägt den deutschen Wortlaut. Die
  Übersetzung ist ein eigener Schritt auf genau dieser einen Datei.
- **Keine ICU-Plurale.** In A+B gibt es keine (2.4). In Etappe 2 gibt es welche.
- **Keine Schicht C.** Markup bleibt unangetastet.
- **Keine Änderung an `en-GB`.** Die Entscheidung steht im Entwurf Abschnitt 2.2;
  der Charakterisierungstest in `src/lib/utils/format/dateTime.test.ts` hält
  weiterhin US-Format fest. Er gehört zu Etappe 2 (Formatierung), nicht hierher —
  Etappe 1 fasst keine Datums- oder Zahlenformatierung an.
- **Keine Parametrisierung der Schranken.** Die doppelt genannten Zahlen
  (`.max(255, '… 255 Zeichen')`) bleiben, siehe 2.4.
