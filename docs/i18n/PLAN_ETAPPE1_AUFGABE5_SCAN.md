# Etappe 1, Aufgabe 5 — Hartcodiert-Scan für Schicht A und B

**Ziel:** Ein Guard, der rot wird, wenn jemand später wieder einen deutschen
Anzeigetext direkt in `sightingSchema.ts` oder `src/lib/report/formOptions/`
schreibt, statt eine Botschaft zu benutzen.

**Warum das nötig ist.** Paraglide meldet eine Botschaft, die extrahiert wurde
und deren englische Fassung fehlt — das ist ein Build-Fehler. Es kann prinzipiell
**nicht** melden, was nie ein Schlüssel wurde: Ein hartcodierter Text fehlt in
keiner Sprachdatei. Genau das ist der Zustand, in dem das englische Formular
deutsche Brocken zeigt, ohne dass irgendetwas rot wird.

Diese Etappe hat vier Belege dafür geliefert, dass Sorgfalt allein nicht reicht:
`.integer()` war für den Extraktor unsichtbar, `speciesIdentification` verbarg
316 Literale hinter der Zahl „7", der Bericht ertränkte seinen eigenen
Prüf-Abschnitt in 132 Fehlalarmen, und die gesamte Testmenge war in eine Richtung
blind.

## Die Entwurfsentscheidung, die zählt

**Der Scan darf den Extraktor nicht benutzen.** Naheliegend wäre,
`collectSchemaSites` wiederzuverwenden — es meldet für diese Dateien inzwischen
0 Funde, der Guard wäre eine Zeile. Aber dann wäre er für genau das blind, wofür
er gebaut wird: `.integer(message)` war für den Extraktor unsichtbar und wäre es
für einen darauf gestützten Scan ebenso gewesen.

Zwei **unabhängige** Mechanismen sind Redundanz. Einer, zweimal gezählt, ist
keine. Der Scan arbeitet deshalb wie die vier bestehenden Guards des Projekts
(`approvalPredicateScan`, `verifiedReadScan`, `statusLogWriteScan`,
`openQueueOrderScan`) über `src/lib/testing/sourceScan.testutil.ts` mit
Mustern auf dem Quelltext.

## Die Regel, und warum sie ohne Sprachheuristik auskommt

**Ein Zeichenketten-Literal, das Leerzeichen und mindestens zwei Buchstabengruppen
enthält, ist in diesen Dateien ein Befund.**

Gemessen am 2026-08-11: Außerhalb von `speciesIdentification.ts` gibt es davon
derzeit **null**. Der Guard ist also ab Tag eins grün und braucht **keine
Ausnahmeliste** — die Voraussetzung dafür, dass er nicht nach der ersten
Woche abgeschaltet wird.

Der Entwurf verbietet ausdrücklich eine Umlaut-Heuristik: Sie versagt dort, wo es
zählt, weil eine versehentlich englisch hartcodierte Zeichenkette keine Umlaute
hat. Die Mehrwort-Regel trifft `'Bitte wählen Sie eine Tierart'` und
`'Please select a species'` gleichermaßen, und sie trifft die technischen Tokens
nicht: `'select'`, `'given-name'`, `'is-valid-species'`, `'lucide:map-pin'`,
`'sv-SE'` haben alle kein Leerzeichen.

## Umfang

| Datei                                         | im Scan  | Begründung                                  |
| --------------------------------------------- | -------- | ------------------------------------------- |
| `src/lib/form/validation/sightingSchema.ts`   | ja       |                                             |
| `src/lib/report/formOptions/*.ts` (16)        | ja       |                                             |
| `formOptions/speciesIdentification.ts`        | **nein** | 316 Literale Fachtext, Schicht E / Etappe 4 |
| Admin-Bereich, Markup, `/docs`, `/styleguide` | nein     | Schicht C bzw. außerhalb (Entwurf 4.2)      |

`speciesIdentification.ts` ist die einzige Ausnahme und braucht eine Begründung
im Quelltext. Ihre beiden Label-Records (`observabilityLabels`,
`frequencyLabels`) sind nicht ungedeckt — sie stehen im deutschen Schnappschuss
`germanBaseline.json`, und die Grenze zu den elf Artdatensätzen ist in
`germanBaseline.testutil.ts` bereits per Test markiert. Wer die Datei später
umbaut, nimmt sie hier heraus.

Der enge Zuschnitt ist Absicht (Entwurf Abschnitt 7): Ein Guard, der ab Tag eins
rot ist, wird abgeschaltet und schützt danach nichts. Schicht C kommt mit
Etappe 2 dazu.

---

## Aufgabe 5.1 — Der Scan

**Dateien:**

- Anlegen: `src/lib/form/validation/hardcodedStringScan.test.ts`

- [ ] **Schritt 1: Konstruierte Proben zuerst**

Das Vorbild verlangt es ausdrücklich: Ein Scan über einen konformen Bestand
belegt nichts über die Regel — er ist auch dann grün, wenn das Muster eine Lücke
hat. Also erst Positiv- und Gegenproben gegen **konstruierten** Quelltext,
dann der Lauf über den echten Bestand.

Positivproben (müssen gefunden werden):

- `.label('Wo ungefähr?')`
- `.max(255, 'Die Ortsbeschreibung ist zu lang')`
- `.meta({ helpText: 'Seegebiet oder Fahrwasser' })`
- `[SpeciesEnum.HARBOR_PORPOISE]: 'Unbekannte Walart'`
- **englisch**, ohne Umlaute: `.label('Please select a species')`
- über zwei Zeilen umbrochen — die vier bestehenden Guards decken diesen Fall
  jeweils ab, weil er in der Praxis vorkommt.

Gegenproben (dürfen **nicht** gefunden werden):

- `meta: { type: 'select' }`, `autocomplete: 'given-name'`
- `.test('is-valid-species', …)`
- `icon: 'lucide:map-pin'`
- `toLocaleDateString('sv-SE', …)`
- `placeholder: '12345'`
- ein Botschaftsaufruf `m.sighting_waterway_label({}, { locale })`
- ein deutscher Satz **im Kommentar** — `stripComments` behandelt sowohl `//`
  als auch `/* */`; dieses Projekt schreibt Begründungen konventionsgemäß in
  Kommentare, ein Scan ohne diesen Schritt wäre von Anfang an unbrauchbar.

- [ ] **Schritt 2: Der Lauf über den echten Bestand**

Ein Test, der die 17 Dateien scannt und `[]` erwartet. Die Fehlermeldung muss
sagen, **was stattdessen zu tun ist**, nicht nur was falsch war — nach dem
Vorbild von `statusLogWriteScan.test.ts`. Etwa:

> Hartcodierter Anzeigetext in Schicht A/B. Statt des Literals eine
> Paraglide-Botschaft benutzen: Schlüssel in `messages/de.json` **und**
> `messages/en.json` anlegen (beide zunächst mit dem deutschen Wortlaut), dann
> `m.<schlüssel>({}, { locale })` aufrufen. `npm run i18n:extract` zeigt
> Fundstelle und Schlüsselvorschlag. Danach `germanBaseline.json` prüfen — es
> muss unverändert bleiben.

- [ ] **Schritt 3: Wirksamkeit per Mutation belegen**

Zwei Mutationen, je Ergebnis wörtlich notieren und **zurücksetzen**:

1. In `src/lib/report/formOptions/sex.ts` einen Botschaftsaufruf durch das
   deutsche Literal ersetzen. Erwartet: der Bestandstest wird rot, und die
   Meldung nennt Datei, Zeile und den Text.
2. Die Mehrwort-Bedingung im Muster entfernen (also jedes Literal melden).
   Erwartet: der Bestandstest wird rot mit vielen Treffern — das belegt, dass
   die Bedingung überhaupt wirkt und der Test nicht aus einem anderen Grund
   grün ist.

- [ ] **Schritt 4: `npm run test:quick`, dann Commit**

Betreff: `test(test): guard layers A and B against hardcoded display text`

---

## Abnahme von Aufgabe 5

1. Positiv- und Gegenproben im Test selbst, gegen konstruierten Quelltext.
2. Bestandslauf grün, ohne Ausnahmeliste außer `speciesIdentification.ts`.
3. Beide Mutationen belegt.
4. Die Fehlermeldung nennt die Abhilfe, nicht nur den Fehler.
5. Der Scan importiert **nichts** aus `src/tools/i18n-extract/`.
6. `npm run test:quick` grün, `germanBaseline.json` unverändert.
