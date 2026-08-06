# Einstiegsseite des Meldeformulars — Konzept und Spezifikation

**Stand:** 2026-08-05 · **Fassung 2** (nach Review, siehe Abschnitt 14)
**Vorlage:** `Sichtungs-Webseite_SL.docx` des Deutschen Meeresmuseums, Punkt C1
**Status:** Umgesetzt (Branch `claude/bold-dhawan-5373e7`, 15 Tasks + Task 8b, Abschlussreview
2026-08-06 abgeschlossen).

---

## 1. Der Wunsch

Wörtlich aus dem Dokument:

> Auf der ersten Seite sollten nur zwei Buttons zur Auswahl stehen, über die man dann in
> 2 Formulare kommt, die etwas unterschiedlich sind
> **Was möchten Sie melden?**
> – Beobachtung eines lebenden Tieres
> – Fund eines toten Tieres

---

## 2. Zusammenfassung der Empfehlung

**Ein Formular mit einem Zweig, die Auswahl als eigener Bildschirm auf der bestehenden
Route `/`.** Keine zweite Route, kein Element auf Schritt 1.

Ein Direktlink ist über `/?meldung=totfund` möglich, ohne eine neue Route anzulegen.
Derselbe Parameter ist der Grund, warum die E2E-Anpassung klein bleibt.

**Aufwand: 2–3 Personentage.** Aufschlüsselung in Abschnitt 9.

### 2.1 Was der Zweig wirklich leistet — korrigiert in Fassung 2

Die erste Fassung dieser Spezifikation nahm an, der Totfund-Zweig könne **13 Felder**
ausblenden, und leitete daraus die Rechtfertigung für den zusätzlichen Klick ab. **Das
war falsch.** Die Prüfung gegen Schema und Datenbank (Abschnitt 6.3) ergibt:

- Genuin vom Totfund bestimmt sind **drei** Felder: `behavior`, `behaviorText`,
  `reaction`.
- Die übrigen zehn hängen nicht am Zustand des Tieres, sondern am **Beobachtungsort**
  (`sightingFrom`) — sie sind für eine Lebendsichtung _von Land_ genauso sinnlos wie für
  einen Strandfund.

Damit gilt:

1. Schritt 3 wird beim Totfund **nicht** leer. Der Totfund-Weg behält **vier Schritte**.
   Der entsprechende Befund der ersten Fassung ist gegenstandslos.
2. Die Einstiegsseite spart weniger Felder als angenommen. Ihre Rechtfertigung ruht
   deshalb auf einer breiteren Basis als nur der Feldzahl — siehe 4.4.
3. **Es gibt einen größeren, billigeren Gewinn daneben:** Die Boots- und
   Schiffsfelder an `sightingFrom` zu hängen betrifft **5.936 Meldungen** (29,8 % des
   Bestands) statt der 1.837 Totfunde. Das ist eine eigene Maßnahme, nicht Teil dieses
   Vorhabens — siehe Rückfrage **R6**.

---

## 3. Ausgangslage im Code

Stand 2026-08-05, Branch `main`, Commit `343fc883`.

| Ort                                                                                   | Zustand                                                                                  |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [src/routes/+page.svelte](../src/routes/+page.svelte)                                 | rendert direkt `ModernReportForm`; keine Zwischenseite                                   |
| [sections/AnimalInfo.svelte](../src/lib/report/components/sections/AnimalInfo.svelte) | `isDead` ist seit PR #746 erstes Feld der Karte „Tierinformationen" auf Schritt 2        |
| [src/lib/report/wording.ts](../src/lib/report/wording.ts)                             | trägt die Zuordnung Sichtung/Fund für drei Texte; ausdrücklich für diesen Umbau angelegt |
| [src/lib/report/formConfig.ts:49](../src/lib/report/formConfig.ts)                    | `formStepsConfig` — vier Schritte, index-basiert                                         |
| [stepValidation.ts](../src/lib/form/validation/stepValidation.ts)                     | **importiert** `formStepsConfig` selbst und liest `[currentStep].fields`                 |
| [findStepForErrors.ts](../src/lib/report/findStepForErrors.ts)                        | **reine Funktion** — bekommt `steps` als Parameter, importiert nichts                    |
| `resolveServerFieldErrors`                                                            | ebenso parametrisiert; wird aus `ModernReportForm` gefüttert                             |
| [localStorage.ts:41](../src/lib/storage/localStorage.ts)                              | `STORAGE_KEYS` — `CURRENT_STEP` und `FORM_DATA` getrennt persistiert                     |

`isDead` steuert im Schema drei bedingte Felder (`deadCondition`, `deadSize`,
`deadPhoneContact`). `deadSex` ist seit dem 2026-08-04 nur noch in der Admin-Maske.

### 3.1 Was heute blockiert ist

Diese Totfund-Texte liegen auf **Schritt 1**, wo `isDead` noch nicht beantwortet ist.
Sie haben keine Bedingung, an die sie sich hängen könnten:

| Datei                                                                                       | Heute                                     | Beim Totfund            |
| ------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------- |
| [PositionAndTime.svelte](../src/lib/report/components/sections/PositionAndTime.svelte)      | Kartentitel „Datum und Uhrzeit"           | „Funddatum"             |
| [VerifyLocation.svelte:~154](../src/lib/report/components/form/VerifyLocation.svelte)       | Ostsee-Hinweis in Lebendtier-Fassung      | eigener Text, siehe 7.3 |
| [PositionPanel.svelte:185](../src/lib/report/components/form/position/PositionPanel.svelte) | „Wo haben Sie das Tier gesehen?"          | „…gefunden?"            |
| [OLMap.svelte:55–63](../src/lib/components/map/OLMap.svelte)                                | Marker-Erklärung, zweimal „gesehen haben" | „gefunden haben"        |

**Korrektur vom 2026-08-05 (bei der Umsetzung aufgefallen):** Die erste Zeile nannte
ursprünglich `DateTime.svelte:7` mit dem Titel „Zeitpunkt der Sichtung". Diese Datei
importiert **ausschließlich** die Admin-Bearbeitungsmaske; der Bürger sieht seine
Datumskarte aus `PositionAndTime.svelte`, und sie heißt dort „Datum und Uhrzeit".
Wer der ursprünglichen Zeile folgt, ändert die Admin-Maske und lässt das Bürgerformular
unberührt — also genau das Gegenteil der Absicht. **Der Lebend-Zweig behält
„Datum und Uhrzeit"** (Entscheidung des Auftraggebers); nur der Totfund bekommt
„Funddatum" samt Einleitungszeile.

**Wichtig zu `OLMap.svelte`:** Der Text steht dort in einem `$derived.by`-Block fest
verdrahtet, und die Komponente wird auch von der Admin-Ansicht und der Foto-EXIF-Karte
benutzt. Der Totfund-Text darf deshalb **nicht** in `OLMap` verzweigt werden — er muss
als Prop hereinkommen. Siehe 6.5.

### 3.2 Feststehende Museumsentscheidungen — nicht neu aufgerollt

- Der Foto-GPS-Weg auf Schritt 1 bleibt wie umgesetzt (eingeklappt unter der Karte).
- Die Ankreuzfelder „Im Wasser treibend / liegend" werden **nicht** gebaut.
- Die Drei-Wege-Frage „Wurde das DMM informiert?" wird **nicht** gebaut; `deadPhoneContact`
  bleibt Ja/Nein.
- Geschlecht beim Totfund ist bereits aus dem Meldeformular entfernt.

---

## 4. Die UX-Abwägung: Ist der zusätzliche Klick ein Nachteil?

### 4.1 Die Datenlage

Am 2026-08-05 gegen die lokale Datenbank gemessen (`sichtungen`, n = 19.949):

| Zeitraum      | Totfunde         | Anteil |
| ------------- | ---------------- | ------ |
| Gesamtbestand | 1.837 von 19.949 | 9,2 %  |
| 2021          | 304 von 1.338    | 22,7 % |
| 2022          | 256 von 1.494    | 17,1 % |
| 2023          | 205 von 1.234    | 16,6 % |
| 2024          | 189 von 1.081    | 17,5 % |
| 2025          | 116 von 859      | 13,5 % |

In den letzten Jahren ist **etwa jede sechste Meldung ein Totfund**. Rund 85 % der
Meldenden zahlen also einen zusätzlichen Klick.

> **Vorbehalt zur Zahl.** Gemessen gegen die _lokale_ Entwicklungsdatenbank. Die weicht
> laut `memory/local-db-boat-drive-corrected-not-prod.md` in mindestens einer Spalte
> bewusst von der Produktion ab (`bootsantrieb`, 5.858 Zeilen). `isDead` war davon nicht
> betroffen, die Größenordnung ist belastbar — die Nachkommastelle sollte vor einer
> Veröffentlichung gegen die Produktion nachgezogen werden.

### 4.2 Was die Literatur sagt

**Baymard — die Zahl der Schritte ist nicht die relevante Größe.** Baymard bezeichnet die
verbreitete Annahme, mehr Schritte seien schlechter, ausdrücklich als „red herring".
Entscheidend sei, _was_ der Nutzer an jedem Schritt tun muss: „the number of form fields
in a checkout impacts overall usability far more than the number of steps." Kennzahlen
2024: Ø 5,1 Schritte (unverändert seit 2012), Ø 11,3 Felder, 17 % Abbruch wegen
Komplexität. ([Quelle](https://baymard.com/blog/checkout-flow-average-form-fields))

**NN/g — Verzweigungsfragen gehören nach vorn.** „Avoid asking users questions that don't
apply to them. Use conditional logic to guide users down different paths based on their
answers and keep each path as short as possible." Und: wenn die meisten Fragen bedingt
sind, „place the key branching questions early on to direct users to the right branch
from the start." ([Quelle](https://www.nngroup.com/articles/eas-framework-simplify-forms/))

**NN/g — Assistenten passen zu seltenen Aufgaben.** „use wizards for situations where the
users are likely to be unfamiliar with the process — either because they don't have a lot
of domain expertise or because they go through that process only rarely." Bürgerliche
Sichtungsmeldungen sind genau das. ([Quelle](https://www.nngroup.com/articles/wizards/))

**GOV.UK — „one thing per page".** Begründet mit Verständlichkeit, Mobilnutzung und damit,
dass das Muster „better at handling things like errors, branches, loops and saving
progress" sei. ([Service Manual](https://www.gov.uk/service-manual/design/form-structure),
[GDS Design Notes](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/))

> **Ehrlich zur Beweiskraft:** GOV.UK trifft in dieser Anleitung **keine** Aussage zur
> Abbruchrate. Die häufig zitierte Fallstudie „2 Millionen Bestellungen mehr pro Jahr"
> (Just Eat) sowie „Users don't mind clicking, as long as each step brings them closer to
> their goal" stammen aus einem Fachartikel, nicht aus einem kontrollierten Vergleich
> ([Smashing Magazine](https://www.smashingmagazine.com/2017/05/better-form-design-one-thing-per-page/)).
> Beides stützt die Richtung, beweist sie aber nicht.

### 4.3 Der Splash-Screen-Einwand

NN/g formuliert an anderer Stelle scharf gegen Zwischenseiten: „splash screens must die."
Der Einwand zielt aber auf etwas anderes. Ein Splash-Screen steht **vor** dem Inhalt und
fragt **nichts** — er ist reine Wegstrecke. Die hier vorgeschlagene Seite stellt eine
Frage, die das Formular ohnehin beantwortet haben muss (`isDead`).

**In Fassung 1 stand hier, die Seite rechtfertige sich allein durch die eingesparten
Felder. Das trägt nach der Korrektur in 6.3 nicht mehr** — es sind drei Felder, nicht
dreizehn. Die Rechtfertigung ruht deshalb auf vier Punkten zusammen (4.4), nicht auf
einem.

### 4.4 Die Abwägung

**Für die Lebendmelder (~85 %)** ist es ein echter Mehr-Klick. Nach Baymards Befund ist
das die billige Größe: Ein Schritt mehr wiegt wenig, solange die Felderzahl nicht steigt —
und sie steigt für diese Gruppe nicht.

**Für die Totfund-Melder (~15 %)** ist es kein Mehr-Klick, sondern eine **Verlagerung**.
Sie müssen `isDead` ohnehin beantworten.

Was die Seite konkret einbringt, in absteigender Bedeutung:

1. **Sie entsperrt die Schritt-1-Texte.** Das ist der eigentliche Auftrag aus dem
   Dokument und ohne sie technisch unmöglich (3.1). Vier Textstellen sprechen einen
   Totfund-Melder heute einen ganzen Schritt lang falsch an.
2. **Sie beseitigt eine stille Falschaussage.** `isDead` ist heute auf `false`
   vorbelegt und steht auf Schritt 2. Wer den Schalter übersieht, meldet einen Totfund
   als Lebendsichtung — ohne es zu merken. Das ist ein Datenqualitätsproblem, kein
   Komfortproblem, und es lässt sich im Nachhinein nicht von einer echten Lebendsichtung
   unterscheiden.
3. **Sie stellt die Verzweigungsfrage an der Stelle, an der NN/g sie verlangt** — vor
   dem Zweig, nicht mittendrin.
4. **Sie spart drei Felder** (`behavior`, `behaviorText`, `reaction`) und macht damit
   den Weg etwas kürzer. Kleiner Beitrag, nicht die Hauptbegründung.

**Fazit:** Die Empfehlung bleibt bestehen, ihre Begründung verschiebt sich von „kürzeres
Formular" auf **„richtige Ansprache und verlässlichere Daten"**. Punkt 2 allein trägt die
Maßnahme.

---

## 5. Varianten

### 5.1 Empfohlen — ein Formular mit Zweig, Auswahl als eigener Bildschirm auf `/`

Die Route bleibt `/`. Solange keine Auswahl getroffen wurde, rendert sie die
Auswahlseite; danach das Formular. Texte und Felder hängen an `isDead`.

**Dafür spricht:**

- **iframe.** Auf meeresmuseum.de läuft die App im iframe, Navbar und Footer sind dort
  ausgeblendet (`isNotIFrame`). Eine Seite auf der Formularroute ist im iframe erreichbar
  — anders als jede über die Navigation verlinkte Seite. Der Einbettungscode auf
  meeresmuseum.de bleibt unverändert. Siehe [docs/IFRAME_EINBETTUNG.md](IFRAME_EINBETTUNG.md).
- **`wording.ts` existiert bereits für diesen Weg.**
- **Die Admin-Maske bleibt unberührt.** `AdminSightingEditForm.svelte` bindet dieselben
  Sektionen mit `adminMode={true}` ein; `isDead` kommt dort aus dem Datensatz.
- **Der Schreibpfad bleibt unberührt.** Verifiziert in
  [field-mapping.ts:152](../src/lib/legacy-api/field-mapping.ts): Die Regel
  `anzahl_gesamt = 0` → Totfund wirkt **eingehend** (Legacy → Modell). Die
  Einstiegsseite setzt nur einen Formularwert und fasst diesen Pfad nicht an.

### 5.2 Verworfen — zwei echte Routen (`/melden/lebend`, `/melden/totfund`)

- `formStepsConfig` ist index-basiert und trägt `stepValidation`. Zwei Routen hieße, diese
  Kette zu duplizieren oder zu parametrisieren — im zweiten Fall hat man den Zweig aus
  5.1 gebaut und zusätzlich zwei Routen.
- Die Sektionen werden von der Admin-Maske mitbenutzt. Eine Aufspaltung müsste dort
  wieder zusammengeführt werden.
- Alle 18 E2E-Specs, die die Formularroute betreten, müssten aufgeteilt werden.

**Gegenwert: keiner, den der Nutzer bemerkt.** Was das Museum „zwei Formulare" nennt, ist
aus Nutzersicht erfüllt, sobald sich Texte und Felder unterscheiden. Verworfen.

### 5.3 Verworfen — Auswahl als erstes Element **auf** Schritt 1

- Die Schritt-1-Texte müssten sich beim Anklicken live umschreiben. Das ist ein
  Kontextwechsel bei Eingabe — WCAG 2.1 **3.2.2 (On Input)** — und unruhig zu lesen.
- Schritt 1 ist bereits der schwerste Schritt: Karte, GPS-Button, Ortsbeschreibung,
  Foto-Disclosure, Datum, Uhrzeit. Eine Verzweigungsfrage darüber geht darin unter.

### 5.4 Verworfen — Gegenthese: den Totfund-Schalter nur prominenter machen

`isDead` bleibt auf Schritt 1 unbeantwortet, egal wie auffällig der Schalter auf Schritt 2
ist. Die Gegenthese adressiert **Auffindbarkeit**, nicht **Reihenfolge** — und die
Reihenfolge ist der Blocker. Der Schalter ist seit PR #746 zudem bereits das erste Feld
seiner Karte; der billige Teil dieser Idee ist umgesetzt.

Als **Rückfallebene** bleibt sie brauchbar: Entscheidet das Museum gegen die
Einstiegsseite, ist „Schalter prominenter" die richtige kleine Maßnahme — dann aber ohne
die Schritt-1-Texte, die weiterhin blockiert wären.

### 5.5 Entscheidung zur URL

`/?meldung=lebend` und `/?meldung=totfund` setzen die Vorauswahl und überspringen die
Seite. Gewählt gegen eigene Routen, weil:

- Das Museum kann direkt ins passende Formular verlinken.
- Der iframe-Einbettungscode bleibt unverändert.
- **Es ist zugleich der E2E-Hebel** (9.3).

---

## 6. Technisches Konzept

### 6.1 Der dritte Zustand

`isDead` ist ein Boolean mit Default `false`. Er kann **„noch nicht gefragt"** nicht von
**„lebend"** unterscheiden. Genau diese Unterscheidung braucht die Einstiegsseite.

```ts
export type ReportKind = 'alive' | 'dead';

// STORAGE_KEYS ergänzen:
REPORT_KIND: 'sichtungen_report_kind'; // 'alive' | 'dead', fehlt = noch nicht gefragt
```

`reportKind` ist **kein zweites `isDead`**, sondern die Antwort auf „wurde die Frage
gestellt?". Beim Auswählen wird `isDead` daraus gesetzt; danach ist `isDead` weiterhin
die einzige Quelle für Texte, Felder und den Schreibpfad. Der Server sieht `reportKind`
nie.

### 6.2 Zustandsübergänge

| Situation                                        | Verhalten                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `reportKind` fehlt                               | Einstiegsseite                                                            |
| Auswahl bestätigt                                | setzt `reportKind` **und** `isDead`, persistiert beide, geht zu Schritt 1 |
| Wiederkehrer mit gespeichertem Stand             | direkt in den gespeicherten `currentStep` — **wird nie erneut gefragt**   |
| Altbestand: `FORM_DATA` da, `reportKind` fehlt   | aus gespeichertem `isDead` ableiten (`false` → `'alive'`)                 |
| `?meldung=totfund` / `?meldung=lebend`           | setzt `reportKind`, überspringt die Seite                                 |
| Query-Parameter widerspricht gespeichertem Stand | wie ein Wechsel behandeln (6.4)                                           |
| Zurücksetzen (`clearStorage`)                    | `reportKind` löschen → Seite erscheint wieder                             |
| Nach erfolgreichem Absenden („neue Meldung")     | `reportKind` löschen → Seite erscheint wieder                             |

Die **Migration** ist der Punkt, an dem still etwas kaputtgehen kann: Beim Deploy sitzen
Nutzer mitten im Formular. Ohne die Ableitung aus `isDead` würden sie auf die
Einstiegsseite zurückgeworfen. Sie gehört zwingend in die erste Version und in einen Test.

### 6.3 Feldausblendung — korrigiert in Fassung 2

**Sie darf nicht über `{#if}` im Markup laufen.** `stepValidation` liest seine Feldliste
aus `formStepsConfig`. Ein im Markup verstecktes Feld würde weiter validiert — eine
Sackgasse ohne sichtbare Fehlermeldung. Die Ausblendung gehört an die Stelle, aus der
validiert wird:

```ts
// Zwei Achsen, ein Seam — siehe 11.1: `reaction` hängt an beiden.
// Bewusst das ganze Formularobjekt statt zweier Flags: Kommt später eine
// dritte Bedingung dazu, ändert sich die Signatur nicht mehr.
export function getFormSteps(data: Pick<SightingFormData, 'isDead' | 'sightingFrom'>): FormStep[];
```

#### 6.3.1 Die drei Achsen — der Kern der Korrektur

Beim Review gegen Schema und Datenbank zeigte sich, dass die Feldliste der ersten Fassung
zwei verschiedene Ursachen vermischt hatte.

**Achse A — wirklich vom Totfund bestimmt.** Diese Felder gehören in den Zweig:

| Feld           | Beleg                                                          |
| -------------- | -------------------------------------------------------------- |
| `behavior`     | Sektion „Verhalten der Tiere" — ein totes Tier zeigt keines    |
| `behaviorText` | hängt an `behavior === OTHER`                                  |
| `reaction`     | Label: „Reaktion auf Ihr Boot" — ein totes Tier reagiert nicht |

**Achse B — vom Beobachtungsort bestimmt, nicht vom Zustand des Tieres.** Diese Felder
standen in Fassung 1 fälschlich im Totfund-Zweig:

| Feld                          | Beleg aus dem Schema                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `boatDrive`                   | „Bootsantrieb — welcher Antrieb wurde während der Sichtung verwendet?" |
| `boatType`                    | „Art **Ihres** Wasserfahrzeugs"                                        |
| `shipName`, `homePort`        | eigenes Schiff; `shipNameConsent` bezieht sich darauf                  |
| `reaction` (auch auf Achse A) | „Reaktion auf **Ihr Boot**", Hilfetext „auf Ihre Anwesenheit"          |

**Zwei Felder, die auf den ersten Blick hierher zu gehören scheinen, es aber nicht tun** —
beide standen in einem Zwischenstand fälschlich auf Achse B:

| Feld        | Label                                            | Warum es auf Achse C gehört                                     |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `shipCount` | „Anzahl **anderer** Schiffe in näherer Umgebung" | Störungskontext — von Land aus genauso beobachtbar wie von Bord |
| `distance`  | „Entfernung zum Tier"                            | Auch vom Strand aus sinnvoll (Tier weiter draußen)              |

**Der Beleg, dass Achse B nicht am Totfund hängt** — `vonwo` gegen `totfund`, gemessen am
2026-08-05 (n = 19.949):

| Beobachtungsort | Lebend    | Totfund   |
| --------------- | --------- | --------- |
| Segelschiff     | 10.323    | 38        |
| **Land**        | **4.606** | **1.330** |
| Sonstiges       | 1.463     | 430       |
| Motorboot       | 1.447     | 31        |
| Fähre           | 273       | 8         |

Zwei Zahlen entscheiden:

- **4.606 Lebendsichtungen wurden von Land aus gemeldet** (25,4 % aller
  Lebendsichtungen). Diese Melder sehen heute „Bootsantrieb", „Reaktion auf Ihr Boot" und
  die Karte „Boot-/Schiffsinformationen" — genauso sinnlos wie für einen Strandfund. Die
  Felder an `isDead` zu hängen würde das für 15 % der Melder beheben und für die anderen
  25 % bestehen lassen.
- **507 Totfunde wurden _nicht_ von Land gemeldet** (27,6 % aller Totfunde) — treibende
  Tiere, von Bord gesichtet. Für sie sind Entfernung, Seegang und Schiffsangaben **echte**
  Angaben. Sie im Totfund-Zweig auszublenden würde diesen gut einem Viertel der
  Totfund-Melder Felder wegnehmen, die sie hätten ausfüllen können.

Die Formulierung des Museums stützt das: „Totfunde werden **meist** an Stränden oder
Küstenabschnitten gefunden" — meist, nicht immer.

**Achse C — für beide Zweige relevant, bleibt stehen:**

| Feld                                  | Warum es bleibt                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| `seaState`, `visibility`, `windForce` | Wetterlage am Fundort ist auch für einen Strandfund aussagekräftig (Drift, Sturmereignisse) |
| `juvenileCount`                       | Massenstrandungen kommen vor; zusätzlich feldübergreifend an `totalCount` gebunden          |
| `totalCount`                          | Auch Totfunde können mehrere Tiere betreffen                                                |
| `sightingFrom`, `sightingFromText`    | Enthält „Land"; „Sonstiges" ist bei Totfunden mit 430 von 1.837 die zweithäufigste Angabe   |

> **Warum die Umweltkarte nicht entfallen darf — eigener Befund.**
> `Environment.svelte` enthält nicht nur drei Eingabefelder, sondern einen
> **automatischen Wetter-Abruf** (`WeatherDataFetcher`, ab Z. 106), der bei vorhandener
> Position und Datum von selbst anspringt und über `handleFullWeatherData` einen
> vollständigen Wetterdatensatz zur Speicherung aufbereitet. Die Karte auszublenden
> würde diese Daten für Totfunde **still** verlieren — und zwar Daten, die den Melder
> keinen einzigen Klick kosten. Das wäre der schlechteste denkbare Tausch.

#### 6.3.2 Konsequenzen

1. **Schritt 3 wird beim Totfund nicht leer.** Er verliert `behavior`, `behaviorText` und
   `reaction`; die Karten „Umweltbedingungen" und „Boot-/Schiffsinformationen" bleiben.
   Der Totfund-Weg behält **vier Schritte**.
2. Die Sonderbehandlung für eine abweichende Schrittzahl (`totalSteps` aus dem Zweig,
   `currentStep` klemmen) **entfällt** — sie war nur wegen der falschen Feldliste nötig.
   Die Klemmung bleibt trotzdem als billige Absicherung empfohlen.
3. Der Aufwand sinkt (Abschnitt 9).
4. Achse B ist ein **eigenes, größeres Vorhaben**: `sightingFrom`-Bedingung statt
   `isDead`-Bedingung, betrifft 5.936 statt 1.837 Meldungen. Siehe **R6**.

#### 6.3.3 Umzustellende Aufrufstellen

Verifiziert per `grep`, ohne Testdateien:

| Datei                                                   | Stellen                 |
| ------------------------------------------------------- | ----------------------- |
| `src/lib/form/validation/stepValidation.ts`             | Z. 2, 21, 52            |
| `src/lib/report/components/ModernReportForm.svelte`     | Z. 33, 268, 333, 418    |
| `src/lib/report/components/form/StepNavigation.svelte`  | Z. 13, 24, 43, 177, 256 |
| `src/lib/report/components/form/RequiredConsent.svelte` | Z. 4, 11                |

**Günstiger Befund, verifiziert:** `findStepForErrors` und `resolveServerFieldErrors` sind
bereits **reine Funktionen, die `steps` als Parameter entgegennehmen** — sie importieren
`formStepsConfig` nicht. An ihnen ist nichts zu ändern; es genügt, dass ihre Aufrufstellen
in `ModernReportForm.svelte` (Z. 268, 333) `getFormSteps(isDead)` übergeben. Die
Fehler-Navigation kann damit gar nicht auf eine veraltete Feldliste zugreifen.

### 6.4 Wechsel zwischen den Zweigen

Erreichbar über zwei Wege:

1. „Zurück" auf Schritt 1 führt auf die Einstiegsseite.
2. Auf Schritt 2 steht dort, wo bisher der `isDead`-Schalter war, eine Rückmeldung mit
   Änderungsmöglichkeit (6.6).

**Semantik (entschieden):** Gemeinsame Felder bleiben erhalten, Zweigfelder werden still
verworfen.

- Wechsel auf **lebend**: `deadCondition`, `deadSize`, `deadPhoneContact` werden geleert.
- Wechsel auf **totfund**: `behavior`, `behaviorText`, `reaction` werden geleert.
- Position, Datum, Uhrzeit, Art, Anzahl, Medien, Umweltbedingungen, Schiffsangaben und
  Kontaktdaten bleiben in **beiden** Richtungen erhalten. Das ist der teuerste Teil der
  Eingabe (Karte!) und darf nie verloren gehen.
- `currentStep` auf die Länge des Zweigs klemmen (`Math.min(currentStep, steps.length - 1)`)
  — nach der Korrektur in 6.3 kein aktiver Fall mehr, aber billige Absicherung.

Das Leeren ist **nicht optional**: Bliebe ein `behavior` bei `isDead = true` stehen, ginge
es mit ans Backend. Da das Feld aus `getFormSteps()` verschwindet, würde die
Schritt-Validierung es auch nicht mehr prüfen.

### 6.5 Texte am Zweig aufhängen

`wording.ts` wird erweitert — dieselbe Stelle, dieselbe `isDeadFinding`-Normalisierung,
keine Ternäre im Markup:

```ts
export function dateSectionTitle(isDead: unknown): string;
export function positionQuestion(isDead: unknown): string;
export function mapHint(isDead: unknown, hasPosition: boolean, enableGPS: boolean): string;
export function outsideBalticNotice(isDead: unknown): string;
```

**`OLMap.svelte` darf nicht verzweigen.** Der Marker-Hinweis steht dort fest verdrahtet
(Z. 55–63), und die Komponente wird auch von der Admin-Ansicht und der Foto-EXIF-Karte
benutzt. Der Text muss als optionales Prop hereinkommen; der bisherige Wortlaut bleibt
Default, damit die anderen beiden Aufrufstellen sich nicht ändern.

### 6.6 Der `isDead`-Schalter verlässt das Meldeformular

Er wird auf Schritt 2 durch eine Rückmeldung ersetzt:

> Sie melden: **Fund eines toten Tieres** · [Ändern]

- **Im Schema bleibt `isDead` unverändert.** Nur `formStepsConfig` zeigt es im
  Meldeformular nicht mehr als Bedienelement.
- **Die Admin-Maske behält den Schalter.** Dort kommt `isDead` aus dem Datensatz, und es
  gibt keine Einstiegsseite. `AnimalInfo.svelte` braucht dafür eine Fallunterscheidung
  über das bereits vorhandene `adminMode`.

### 6.7 Wo der Zustand lebt

**Kein globaler `$state` in einem `.ts`-Modul** — das leckt auf dem Server zwischen
Requests (`.claude/rules/architecture.md`).

- `src/lib/report/reportKind.ts` — **pure Funktionen, kein `$state`**:
  `resolveReportKind(searchParam, stored, savedFormData)`, `readReportKind()`,
  `writeReportKind()`, `clearReportKind()`. In Node testbar (`*.test.ts`), ohne Browser.
- Der reaktive Zustand lebt in `+page.svelte` als komponenten-lokaler `$state`.

### 6.8 Browser-Zurück

Weil die Auswahl UI-Zustand auf `/` ist und die URL nicht wechselt, würde der
Browser-Zurück-Knopf nach der Auswahl **die App verlassen**, statt zur Auswahl
zurückzuführen. Das ist im iframe besonders unangenehm, weil er dort die einbettende Seite
zurücknavigiert.

**Vorgabe:** Beim Bestätigen der Auswahl einen History-Eintrag mit dem passenden
Query-Parameter schreiben (`history.pushState` bzw. SvelteKits `replaceState`/`pushState`
aus `$app/navigation`), sodass „Zurück" auf die Einstiegsseite führt. Der Parameter ist
dafür ohnehin vorhanden (5.5).

---

## 7. Texte

Alle Nutzertexte auf Deutsch, Sie-Anrede, wie im übrigen Formular.

### 7.1 Einstiegsseite

| Element                 | Text                                                                           |
| ----------------------- | ------------------------------------------------------------------------------ |
| Überschrift (`<h1>`)    | Meerestier melden                                                              |
| Erläuterung             | Damit wir Ihnen die passenden Fragen stellen können.                           |
| Frage (`<legend>`)      | Was möchten Sie melden?                                                        |
| Option 1 — Label        | Beobachtung eines lebenden Tieres                                              |
| Option 1 — Beschreibung | Sie haben ein Tier im Wasser oder an Land gesehen.                             |
| Option 2 — Label        | Fund eines toten Tieres                                                        |
| Option 2 — Beschreibung | Sie haben ein totes Tier gefunden, meist an einem Strand oder Küstenabschnitt. |
| Primäraktion            | Weiter                                                                         |

Die Erläuterung ist nicht schmückend: Sie beantwortet die naheliegende Nutzerfrage „warum
werde ich das gefragt?" an genau der Stelle, an der sie anfällt.

### 7.2 Schritt 1 — Datum

|             | Sichtung (heute)  | Totfund (neu)                |
| ----------- | ----------------- | ---------------------------- |
| Kartentitel | Datum und Uhrzeit | Funddatum                    |
| Einleitung  | _(keine)_         | An welchem Tag war der Fund? |

> Ist-Zustand korrigiert gemäß 3.1: Der Lebend-Zweig behält „Datum und Uhrzeit" —
> „Zeitpunkt der Sichtung" stand nur in `DateTime.svelte` (Admin-Maske), nie im
> Bürgerformular.

> **Umsetzungshinweis:** `DateTime.svelte` hat heute **nur** einen `SectionCard`-Titel und
> keinen Platz für eine Einleitung (Z. 7). Die zweite Zeile ist also ein neues Element,
> kein Texttausch. Ob sie überhaupt gewünscht ist, klärt **R3**.

### 7.3 Schritt 1 — Ostsee-Hinweis

Heute (`VerifyLocation.svelte`, Zweig `inChartArea`, `alert-warning`):

> Die Koordinaten liegen scheinbar außerhalb der Ostsee. Bitte prüfen Sie die Position.
> Bei Sichtungen von Land und küstennahen Sichtungen kann dieser Hinweis erscheinen, die
> Daten werden trotzdem gespeichert.

Beim Totfund (Wortlaut des Museums):

> Bitte prüfen Sie die Position. Totfunde werden meist an Stränden oder Küstenabschnitten
> gefunden.

**Vorschlag zusätzlich: die Dringlichkeit senken.** Für einen Totfund ist eine Position
außerhalb des Ostsee-Polygons der **Normalfall**. Ein `alert-warning` behauptet dort ein
Problem, das keines ist, und trainiert Melder darauf, die Warnung wegzuklicken — dann
greift sie auch nicht mehr, wenn die Koordinaten wirklich falsch sind. Empfehlung: für den
Totfund `alert-info`, Text wie vom Museum vorgegeben. Siehe **R2**.

Die Zweige `inBaltic` und `else` bleiben unverändert. Beide Varianten brauchen ein Icon:
Die Alert-Textfarbe ist im Theme `base-content`, die Bedeutung trägt allein das Icon
(`.claude/rules/daisyui.md`).

### 7.4 Schritt 1 — Position und Marker

|                       | Sichtung (heute)                                                                                                          | Totfund (neu)                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `PositionPanel`       | Wo haben Sie das Tier gesehen?                                                                                            | Wo haben Sie das Tier gefunden?          |
| Marker, ohne Position | Noch keine Position gewählt. Tippen Sie auf die Karte, um die Stelle zu markieren, an der Sie das Tier **gesehen** haben. | …an der Sie das Tier **gefunden** haben. |
| Marker, mit Position  | Tippen Sie auf die Karte oder ziehen Sie den Marker an die Stelle, an der Sie das Tier **gesehen** haben.                 | …an der Sie das Tier **gefunden** haben. |

Der GPS-Zusatz („Der GPS-Button übernimmt Ihre aktuelle Position.") bleibt unverändert —
und ist für Totfunde sogar der häufigere Weg, weil der Melder typischerweise daneben steht.

**Zur „umgedrehten" Marker-Erklärung aus der Vorlage:** Der inhaltliche Kern („Tiere
liegen eher an Land als im Wasser") steckt in 7.3. Die Marker-Erklärung selbst enthält
keine Wasser/Land-Aussage, die sich umdrehen ließe; hier genügt „gesehen" → „gefunden".
Siehe **R3**.

### 7.5 Schritt 2 — Rückmeldung statt Schalter

> Sie melden: **Fund eines toten Tieres** · [Ändern]

bzw.

> Sie melden: **Beobachtung eines lebenden Tieres** · [Ändern]

---

## 8. Barrierefreiheit

**Die zwei Buttons werden eine Radiogruppe, keine zwei `<button>`.** Das weicht vom
Wortlaut der Vorlage ab („zwei Buttons") und ist bewusst:

- Zwei Buttons sind für einen Screenreader zwei unverbundene Aktionen. Eine
  `fieldset`/`legend`-Radiogruppe wird als **eine Frage mit zwei Antworten** angesagt,
  inklusive „1 von 2". Die Frage steht in der `<legend>` und wird dadurch überhaupt erst
  mit den Optionen verknüpft.
- Projektregel: „Radiogruppen als `fieldset`/`legend`, nicht als `label[for]` auf mehrere
  Inputs" (`.claude/rules/design-system.md`).
- Optisch bleibt es bei zwei großen, klickbaren Flächen — der Unterschied ist für sehende
  Nutzer nicht wahrnehmbar. Der Wunsch des Museums ist erfüllt.

Weitere Anforderungen:

- **`aria-required` und `aria-invalid` gehören an das `fieldset`**, nicht an die einzelnen
  Radios; das `fieldset` bekommt `role="radiogroup"` und `aria-labelledby` auf seine
  Legend — so wie in `FieldRenderer.svelte` bereits gelöst. Dieselbe Mechanik nutzen,
  keine eigene bauen.
- **44 px Trefferfläche** kommen zentral aus `app.css` (`label:has(> .radio)`). Kein
  `min-h-11` an der Aufrufstelle.
- **Genau eine Primäraktion** („Weiter", `btn btn-primary`). Die Auswahl selbst ist keine
  Primäraktion.
- **Fokusreihenfolge:** Überschrift → Erläuterung → Legend → Option 1 → Option 2 →
  Weiter. „Lebendes Tier" steht zuerst, weil es der häufigere Fall ist (~85 %).
- **Kein Auto-Advance.** Ein Klick auf eine Option darf nicht sofort weiternavigieren: Wer
  per Tastatur mit den Pfeiltasten durch eine Radiogruppe geht, wählt dabei zwangsläufig
  die erste Option aus und würde ungewollt weitergeschickt (WCAG 3.2.2). Deshalb der
  eigene „Weiter"-Button.
- **Browser-Zurück muss funktionieren** — siehe 6.8. Ein Zurück-Knopf, der die App
  verlässt, ist ein Orientierungsverlust (WCAG 2.4.5 / 3.2.3 im weiteren Sinne) und im
  iframe besonders schädlich.
- **Beim Schrittwechsel** Fokus setzen und die neue Überschrift ansagen — übernimmt die
  vorhandene Mechanik in `StepNavigation.svelte`.

---

## 9. Aufwandsschätzung

Grundlage: verifizierte Aufrufstellen. Angaben in Personentagen.
**Gegenüber Fassung 1 gesunken**, weil die Feldausblendung kleiner ausfällt (6.3).

### 9.1 Produktivcode — 1,2–1,7 Tage

| Aufgabe                                                                     | Aufwand |
| --------------------------------------------------------------------------- | ------- |
| `ReportKindChoice.svelte` (Radiogruppe, Texte, A11y)                        | 0,3     |
| `reportKind.ts` — Zustandsmaschine, Migration, Query-Parameter              | 0,3     |
| `+page.svelte` — Verzweigung, `$state`, Reset-Pfad, History (6.8)           | 0,25    |
| `formConfig.ts` — `formStepsConfig` → `getFormSteps(isDead)`                | 0,15    |
| 14 Fundstellen umstellen (4 Dateien, 6.3.3)                                 | 0,3     |
| `wording.ts` erweitern (4 Funktionen)                                       | 0,1     |
| Schritt-1-Texte anschließen (`DateTime`, `VerifyLocation`, `PositionPanel`) | 0,2     |
| `OLMap.svelte` — Hinweis als Prop                                           | 0,1     |
| `AnimalInfo.svelte` — Schalter → Rückmeldung, `adminMode`-Fall              | 0,2     |
| Wechsel-Logik (drei Felder leeren, `currentStep` klemmen)                   | 0,1     |

### 9.2 Unit-Tests — 0,5–0,8 Tage

Test-First ist Pflicht (`.claude/rules/testing.md`); der Test steht **vor** der
Implementierung.

| Testdatei                              | Was                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `reportKind.test.ts`                   | Zustandsmaschine, Migration aus `isDead`, Query-Parameter-Vorrang, Reset    |
| `formConfig.test.ts` (erweitern)       | `getFormSteps(true/false)` — genau drei Felder fehlen, Schrittzahl bleibt 4 |
| `stepValidation.test.ts` (erweitern)   | ausgeblendete Felder werden **nicht** validiert                             |
| `wording.test.ts` (erweitern)          | vier neue Funktionen, inkl. `undefined`/String-Fälle                        |
| `ReportKindChoice.svelte.test.ts`      | Radiogruppe, Legend-Verknüpfung, kein Auto-Advance                          |
| `AnimalInfo.svelte.test.ts` (anpassen) | Schalter weg im Meldeformular, da im `adminMode`                            |

### 9.3 E2E-Anpassung — 0,5 Tag

**Deutlich billiger als befürchtet.** Gezählt, nicht geschätzt: **18 der 35 Specs**
betreten die Formularroute.

| Gruppe                                 | Anzahl | Aufwand                                                                |
| -------------------------------------- | ------ | ---------------------------------------------------------------------- |
| über `FormPage.goto()` / `fillStep1()` | 12     | **eine Zeile** in [e2e/pages/FormPage.ts:29](../e2e/pages/FormPage.ts) |
| direktes `page.goto('/')`              | 6      | Parameter anhängen, je 1 Zeile                                         |
| neuer Spec für die Einstiegsseite      | 1      | 0,2 Tag                                                                |
| Durchsicht `form-autosave.spec.ts`     | —      | Migrationspfad, 0,1 Tag                                                |
| Durchsicht `form-a11y.spec.ts`         | —      | Radiogruppe, 0,1 Tag                                                   |

Der Hebel ist der Query-Parameter: `FormPage.goto()` navigiert künftig auf
`/?meldung=lebend` und umgeht die Einstiegsseite. Alle 12 Specs dieser Gruppe bleiben
inhaltlich unverändert.

Die 6 direkten Aufrufe: `auth.spec.ts`, `bestimmungshilfe.spec.ts`,
`footer-layout.spec.ts`, `form-field-mode.spec.ts`, `navbar-structure.spec.ts`,
`videoUpload.spec.ts`.

> **Hinweis für die Umsetzung:** E2E-Läufe nicht parallel zu einer zweiten Suite in einem
> anderen Worktree fahren — laut
> `memory/e2e-vollsuite-durch-parallele-worktrees-unbrauchbar.md` entstehen dabei bis zu
> 138 Fehlschläge als reine Lastartefakte.

### 9.4 Summe

| Block                                                          | Aufwand                            |
| -------------------------------------------------------------- | ---------------------------------- |
| Produktivcode                                                  | 1,2–1,7                            |
| Unit-Tests                                                     | 0,5–0,8                            |
| E2E                                                            | 0,5                                |
| Dokumentation (`wording.ts`-Kommentar, `IFRAME_EINBETTUNG.md`) | 0,2                                |
| **Gesamt**                                                     | **2,4–3,2 Tage**, gerundet **2–3** |

---

## 10. Risiken

| #   | Risiko                                                                                                                               | Wahrscheinlichkeit                           | Wirkung                                                       | Gegenmaßnahme                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Ausgeblendetes Feld wird weiter validiert** → Sackgasse ohne sichtbare Fehlermeldung                                               | **Hoch**, wenn über `{#if}` im Markup gelöst | Formular nicht absendbar                                      | Ausblendung ausschließlich über `getFormSteps()` (6.3); Test in `stepValidation.test.ts`                                                                                                      |
| 2   | **Wiederkehrer landet nach dem Deploy auf der Einstiegsseite**                                                                       | **Hoch** ohne Migration                      | Abbruch mitten im Formular                                    | Ableitung aus gespeichertem `isDead` (6.2), Test, Durchsicht `form-autosave.spec.ts`                                                                                                          |
| 3   | **Browser-Zurück verlässt die App** statt zur Auswahl zurückzuführen                                                                 | **Hoch** ohne History-Eintrag                | Orientierungsverlust; im iframe navigiert die Trägerseite weg | History-Eintrag beim Bestätigen (6.8); E2E-Fall im neuen Spec                                                                                                                                 |
| 4   | **Zweigfeld bleibt gefüllt und geht ans Backend** (`behavior` bei `isDead = true`)                                                   | **Mittel**                                   | Falsche Daten, für die Forschung schwer erkennbar             | Leeren beim Wechsel (6.4); Test auf den Submit-Payload nach Wechsel                                                                                                                           |
| 5   | **Umweltkarte wird mit ausgeblendet** und der automatische Wetter-Abruf verschwindet still                                           | **Mittel** — stand so in Fassung 1           | Verlust von Forschungsdaten, die nichts kosten                | Achse C in 6.3.1: `Environment` bleibt in beiden Zweigen; Test, der den Fetcher im Totfund-Zweig nachweist                                                                                    |
| 6   | **`juvenileCount` behält einen Wert > `totalCount`** und der feldübergreifende Test `juveniles-within-total` schlägt unsichtbar fehl | **Niedrig** (Feld bleibt jetzt sichtbar)     | Absenden scheitert ohne erkennbaren Grund                     | Feld bleibt in beiden Zweigen (Achse C); bei künftiger Ausblendung zwingend mit leeren                                                                                                        |
| 7   | **`OLMap.svelte` wird verzweigt statt parametrisiert**                                                                               | **Mittel**                                   | Admin-Ansicht und EXIF-Karte bekommen Totfund-Texte           | Prop statt Verzweigung (6.5); bisheriger Wortlaut bleibt Default                                                                                                                              |
| 8   | **Admin-Maske verliert den `isDead`-Schalter**                                                                                       | **Mittel**                                   | Admins können den Status nicht mehr korrigieren               | `adminMode`-Fallunterscheidung (6.6); bestehende Admin-E2E-Specs decken das ab                                                                                                                |
| 9   | **Lebendmelder empfinden den Klick als Hürde**                                                                                       | **Niedrig–mittel**                           | Höhere Abbruchrate auf Seite 1                                | Erläuterungssatz (7.1); nach Launch beobachten (**R4**)                                                                                                                                       |
| 10  | **iframe-Höhe springt**, weil die Einstiegsseite kürzer ist                                                                          | **Niedrig**                                  | Sichtbarer Sprung auf meeresmuseum.de                         | Vor dem Release im echten iframe prüfen; ggf. Mindesthöhe                                                                                                                                     |
| 11  | **Legacy-API-Schreibpfad berührt**                                                                                                   | **Sehr niedrig**                             | Datenverlust bei der angebundenen iOS-App                     | Verifiziert: `anzahl_gesamt = 0` → Totfund wirkt nur **eingehend** ([field-mapping.ts:152](../src/lib/legacy-api/field-mapping.ts)). Bei der Umsetzung `.claude/rules/legacy-api.md` beachten |

---

## 11. Rückfragen ans Museum — Stand 2026-08-05

**Alle Punkte sind geklärt. Es blockiert nichts.**

| #   | Thema                                         | Status                                                                         |
| --- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| R1  | Drei Felder im Totfund-Zweig weglassen        | **angenommen** (kein Widerspruch auf die Festlegung)                           |
| R2  | Ostsee-Hinweis als blauer Hinweis             | **angenommen** (kein Widerspruch)                                              |
| R3a | Zeile „An welchem Tag war der Fund?" ergänzen | **angenommen** (kein Widerspruch) — schwächste Zustimmung, siehe Hinweis unten |
| R3b | „gesehen" → „gefunden"                        | **ausdrücklich bestätigt:** „Ja, das passt!"                                   |
| R4  | Nach dem Start beobachten                     | **nicht gestellt** — interne Frage, siehe unten                                |
| R5  | Direktlink                                    | **angenommen** (kein Widerspruch)                                              |
| R6  | Bootsfelder an den Beobachtungsort hängen     | **ausdrücklich beauftragt:** „Wenn möglich, sehr gerne."                       |

> **Zur Belastbarkeit von R1, R2, R3a und R5:** Diese vier waren in der Mail als
> Festlegung mit Widerspruchsmöglichkeit formuliert („kurze Rückmeldung genügt, falls
> etwas nicht passt"). Die Antwort ging nur auf die zwei echten Fragen ein. Das ist eine
> **stillschweigende** Zustimmung, keine ausdrückliche. Bei R1, R2 und R5 ist das
> unkritisch. **R3a** ist der wackeligste Punkt — dort entsteht ein neues Textelement,
> das es heute gar nicht gibt. Sollte es dem Museum später nicht gefallen, ist es in
> Minuten wieder entfernt.

Der ursprüngliche Wortlaut der Fragen steht unten, damit nachvollziehbar bleibt, worauf
sich die Antworten beziehen.

---

**R1 — Feldausblendung: Umfang bestätigen.** _(in Fassung 2 stark reduziert)_

Vorschlag: Das Totfund-Formular lässt **drei** Felder weg, alle in „Weitere
Informationen":

| Feld                   | Warum                               |
| ---------------------- | ----------------------------------- |
| Verhalten des Tieres   | Ein totes Tier zeigt kein Verhalten |
| Freitext zum Verhalten | Gehört zum Verhalten                |
| Reaktion auf Ihr Boot  | Ein totes Tier reagiert nicht       |

Alles andere bleibt — insbesondere **Wetter, Seegang und Sicht** (auch bei einem
Strandfund aussagekräftig, und ein Teil davon wird automatisch ermittelt) sowie die
**Schiffsangaben** (gut ein Viertel der Totfunde wird nicht vom Strand, sondern von Bord
gemeldet).

_Einverstanden — oder sollen weitere Felder entfallen?_

**R2 — Ostsee-Hinweis beim Totfund: Warnung oder neutraler Hinweis?** Vorschlag: beim
Totfund einen blauen Hinweis statt einer gelben Warnung, weil eine Position am Strand dort
der Normalfall ist (7.3). Ihr Text bleibt unverändert. Einverstanden?

**R3 — Zwei Textdetails.**

- (a) Soll unter „Funddatum" zusätzlich die Zeile „An welchem Tag war der Fund?" stehen?
  Heute hat die Karte nur einen Titel und keine Einleitung — es wäre ein neues Element.
- (b) „Die Marker-Erklärung umdrehen": Die Erklärung enthält heute keine
  Wasser/Land-Aussage, die sich umdrehen ließe — nur „gesehen" → „gefunden". Der
  inhaltliche Punkt steckt im Ostsee-Hinweis aus R2. Ist das erfüllt, oder war ein
  anderer Satz gemeint? Dann bitte den Wortlaut.

**R4 — Nach dem Start beobachten?** Die Abwägung in Abschnitt 4 ist literaturgestützt,
nicht an Ihren Meldenden gemessen. Empfehlung: beobachten, wie viele Meldungen auf der
Einstiegsseite stehenbleiben. Sinkt der Totfund-Anteil deutlich unter die rund 15 % der
letzten Jahre, wäre das ein Warnsignal. Möchten Sie das verfolgen, und gibt es dafür ein
Werkzeug?

**R5 — Direktlink auf das Totfund-Formular?** `/?meldung=totfund` ist vorgesehen und
kostet nichts extra. Wollen Sie so einen Link einsetzen — etwa von einer Seite „Was tun,
wenn Sie ein totes Tier finden?"? Falls ja, gehört er vor dem Launch auch in der
iframe-Einbettung getestet.

**R6 — Eigener Vorschlag: Boots- und Schiffsfelder nur zeigen, wenn vom Boot gemeldet
wurde.** _(neu in Fassung 2, nicht Teil dieses Vorhabens)_

Beim Review fiel auf: Wer angibt, **von Land** aus beobachtet zu haben, bekommt heute
trotzdem „Bootsantrieb", „Reaktion auf Ihr Boot" und die ganze Karte
„Boot-/Schiffsinformationen" vorgelegt. Das betrifft **4.606 Lebendsichtungen und 1.330
Totfunde** — zusammen 29,8 % aller Meldungen im Bestand und damit gut dreimal so viele wie
das hier besprochene Vorhaben.

Diese Felder an die Frage „Von wo aus haben Sie beobachtet?" zu hängen, wäre eine eigene,
überschaubare Maßnahme mit größerem Nutzen als die Einstiegsseite. **Soll sie als eigener
Punkt aufgenommen werden?**

### 11.1 R6 — beauftragt, Umsetzungsregel

Antwort des Museums: „Wenn möglich, sehr gerne."

**Regel: ausblenden genau dann, wenn `sightingFrom === LAND` (3).** Nicht „wenn kein
Boot" — der Unterschied ist entscheidend:

> `sightingFrom` ist `integer default(0) notNull`, und `0` bedeutet **gleichzeitig**
> „noch nicht beantwortet" **und** „Sonstiges" (Kajak, SUP, Seebrücke, Mehrzweckschiff —
> 1.893 Zeilen im Bestand, davon 713 mit Freitext). Eine Regel „zeige Bootsfelder nur bei
> Segelschiff/Motorboot/Fähre" würde die Felder deshalb **vor** der Beantwortung
> ausblenden und für alle „Sonstiges"-Melder dauerhaft — darunter Kajak- und
> SUP-Fahrende, für die sie zutreffen. Nur `LAND` ist eine eindeutige Aussage.

**Betroffene Felder — fünf, nicht die ursprünglich vermuteten zehn:**

| Feld        | Label                     |
| ----------- | ------------------------- |
| `boatDrive` | Bootsantrieb              |
| `boatType`  | Art Ihres Wasserfahrzeugs |
| `shipName`  | Schiffsname               |
| `homePort`  | Heimathafen               |
| `reaction`  | Reaktion auf Ihr Boot     |

**Ausdrücklich nicht betroffen** (siehe die Korrektur in 6.3.1):

- `shipCount` — „Anzahl **anderer** Schiffe in näherer Umgebung": Störungskontext, von
  Land aus genauso beobachtbar.
- `distance` — „Entfernung zum Tier": auch vom Strand aus sinnvoll.

**Ein Detail, das die Einstiegsseite nicht hat:** `sightingFrom` und `boatDrive` stehen auf
**demselben** Schritt (2). Das Ausblenden von `boatDrive` passiert also live, während der
Nutzer die Auswahl trifft — anders als bei den Schritt-3-Feldern, wo die Antwort längst
vorliegt. Das ist die im Projekt übliche Progressive Disclosure (`.claude/rules/forms.md`)
und unkritisch, muss aber getestet werden.

**`reaction` liegt auf beiden Achsen.** Es entfällt beim Totfund (Achse A) **und** bei
Meldung von Land (Achse B). Die Bedingungen müssen sich verknüpfen lassen, nicht
gegenseitig überschreiben — das ist der Grund für den gemeinsamen Seam in 6.3.

**Aufwand: 0,8–1,2 Tage** zusätzlich, wenn zusammen mit der Einstiegsseite gebaut
(gemeinsamer Seam, siehe 13.1). Getrennt gebaut wären es 1,3–1,8 Tage, weil dieselben 12
Aufrufstellen zweimal angefasst würden.

---

## 12. Definition of Done

Die Umsetzung gilt als fertig, wenn:

1. Ein Erstbesucher auf `/` die Auswahlfrage sieht und ohne Auswahl nicht weiterkommt.
2. Ein Wiederkehrer mit gespeichertem Stand **nie** die Auswahlseite sieht — auch nicht
   nach dem Deploy mit Altbestand im `localStorage`.
3. `/?meldung=totfund` und `/?meldung=lebend` die Seite überspringen und den richtigen
   Zweig setzen.
4. Alle vier Textstellen aus 3.1 im Totfund-Zweig die Totfund-Fassung zeigen, im
   Lebend-Zweig unverändert die heutige.
5. Die drei Felder aus R1 im Totfund-Zweig weder sichtbar **noch validiert** sind.
6. Ein Wechsel zwischen den Zweigen Position, Datum, Art, Medien und Kontaktdaten
   erhält und nur die Zweigfelder leert.
7. Der Browser-Zurück-Knopf nach der Auswahl auf die Auswahlseite führt, nicht aus der
   App heraus.
8. Die Admin-Maske unverändert funktioniert, inklusive `isDead`-Schalter.
9. `npm run test:quick` und die E2E-Suite grün sind.
10. Der automatische Wetter-Abruf im Totfund-Zweig nachweislich weiterhin anspringt.

**Zusätzlich für R6 (Paket 2):**

11. Bei „Von wo: **Land**" sind `boatDrive`, `boatType`, `shipName`, `homePort` und
    `reaction` weder sichtbar noch validiert — bei jeder anderen Angabe **inklusive
    „Sonstiges"** sind sie es.
12. `shipCount` und `distance` bleiben in **allen** Fällen sichtbar.
13. `reaction` verschwindet, sobald **eine** der beiden Bedingungen zutrifft (Totfund
    _oder_ von Land) — die Bedingungen überschreiben sich nicht gegenseitig.
14. Das Umschalten von `sightingFrom` auf „Land" blendet `boatDrive` **im selben Schritt**
    live aus, ohne den Schritt ungültig zu machen.

**Zusätzlich für Paket 3 — Einwilligungen bündeln:**

15. `mediaConsent` steht auf Schritt 4 bei den übrigen Einwilligungen. Alle vier Felder
    mit Nachweisspalten (`nameConsent`, `shipNameConsent`, `mediaConsent`,
    `privacyConsent`) stehen damit an einer Stelle.
16. Die Datei-Felder `mediaFile` und `mediaUpload` stehen weiterhin auf **Schritt 2** —
    der Upload gehört unverändert vor die Tierangaben (Wunsch des Museums, 2026-08-04).
17. Ohne hochgeladene Aufnahme erscheint `mediaConsent` nicht und wird nicht validiert.
18. Wird die letzte Aufnahme entfernt, fällt `mediaConsent` auf `false` zurück, sodass
    `mapFormToSighting` keinen datierten, versionierten Nachweis ohne Bezugsgegenstand
    stempelt.

---

## 13. Nächste Schritte

Alle Rückfragen sind beantwortet (Abschnitt 11). **Nichts blockiert.**

1. Implementierungsplan schreiben (`superpowers:writing-plans`) — über **beide** Pakete,
   siehe 13.1.
2. Umsetzung nach Test-First: Tests aus 9.2 zuerst.

### 13.1 Zuschnitt: ein Seam, zwei Pakete

Die Einstiegsseite und R6 sind fachlich zwei Vorhaben, technisch aber **dieselbe
Mechanik**: bedingte Feldsichtbarkeit über `getFormSteps()`. `reaction` hängt sogar an
beiden Bedingungen (11.1).

**Empfehlung: den Seam einmal bauen, in zwei PRs ausliefern.**

|           | Inhalt                                                                              | Aufwand          |
| --------- | ----------------------------------------------------------------------------------- | ---------------- |
| **PR 1**  | `getFormSteps()`-Seam, Einstiegsseite, Texte, Zustandsmaschine, drei Totfund-Felder | 2,4–3,2 Tage     |
| **PR 2**  | R6 — fünf Felder an `sightingFrom === LAND`                                         | 0,8–1,2 Tage     |
| **Summe** |                                                                                     | **3,2–4,4 Tage** |

Warum nicht in einem PR: Die Einstiegsseite ist der Auftrag aus dem Museumsdokument und
sollte für sich prüfbar bleiben. R6 ist ein Zusatz, der die Nutzerführung an einer anderen
Stelle ändert — ein gemeinsamer PR machte beides schwerer zu bewerten und im Zweifel
schwerer zurückzunehmen.

Warum nicht getrennt entwickeln: Dieselben 14 Fundstellen (6.3.3) würden zweimal
angefasst, und die Verknüpfung der beiden Bedingungen an `reaction` würde nachträglich
eingezogen statt von vornherein vorgesehen. Das kostet laut Schätzung 0,5–0,6 Tage extra.

**Reihenfolge:** PR 1 zuerst. Er trägt den Seam; PR 2 nutzt ihn nur noch.

---

## 14. Änderungen gegenüber Fassung 1

| Was                               | Fassung 1                 | Fassung 2                                                                             |
| --------------------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| Ausgeblendete Felder beim Totfund | 13                        | **3** — die übrigen 10 hängen am Beobachtungsort, nicht am Zustand des Tieres (6.3.1) |
| Schrittzahl im Totfund-Zweig      | 3 (Schritt 3 wurde leer)  | **4** — Schritt 3 behält Umwelt- und Schiffsangaben                                   |
| Rechtfertigung des Klicks         | „spart Felder"            | **„richtige Ansprache und verlässlichere Daten"** (4.4)                               |
| Aufwand                           | 3–4 Tage                  | **2–3 Tage**                                                                          |
| Umweltkarte                       | zum Ausblenden vorgesehen | bleibt — sie trägt einen automatischen Wetter-Abruf (6.3.1)                           |
| Browser-Zurück                    | nicht behandelt           | eigener Abschnitt 6.8 + Risiko 3                                                      |
| R1                                | Blocker                   | kein Blocker mehr                                                                     |
| R6                                | —                         | neu: Schiffsfelder an `sightingFrom`, betrifft 29,8 % des Bestands                    |
| Definition of Done                | fehlte                    | Abschnitt 12                                                                          |

---

## 15. Quellen

- [GOV.UK Service Manual — Form structure](https://www.gov.uk/service-manual/design/form-structure)
- [GDS Design Notes — One thing per page](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/)
- [Baymard Institute — Checkout Flow: Average Form Fields](https://baymard.com/blog/checkout-flow-average-form-fields)
- [NN/g — Less Effort, More Completion: The EAS Framework for Simplifying Forms](https://www.nngroup.com/articles/eas-framework-simplify-forms/)
- [NN/g — Wizards: Definition and Design Recommendations](https://www.nngroup.com/articles/wizards/)
- [Smashing Magazine — Better Form Design: One Thing Per Page](https://www.smashingmagazine.com/2017/05/better-form-design-one-thing-per-page/)

**Projektinterne Bezüge:** [docs/IFRAME_EINBETTUNG.md](IFRAME_EINBETTUNG.md),
[docs/LEGACY_API_SPECIFICATION.md](LEGACY_API_SPECIFICATION.md),
`.claude/rules/design-system.md`, `.claude/rules/testing.md`, `.claude/rules/legacy-api.md`
