# Empfehlung für die 44 „unklar"-Fälle im i18n-Inventar

Unabhängiger Abgleich zu `docs/i18n-inventory-unklar.md` / `docs/i18n-inventory.json`
(Kategorie `unklar`). Jeder Fall wurde im Quellkontext geöffnet — Rohtext allein hat
nicht gereicht, siehe Begründungen unten. Diese Datei überschreibt die parallel von
Hand geprüfte Liste **nicht**.

## Summen

| Empfehlung    | Anzahl | Anteil |
| ------------- | -----: | -----: |
| `übersetzen`  |     12 |   27 % |
| `technisch`   |     32 |   73 % |
| `entscheiden` |      0 |    0 % |
| **Gesamt**    | **44** |  100 % |

**Auswirkung auf die Übersetzungsplanung:** Von den 44 unklaren Fällen kommen 12 zu
den 1078 bereits als `uebersetzbar`/`unklar` gezählten Botschaften hinzu (neue
Zielzahl für tatsächlich zu übersetzende Strings), 32 bleiben unangetastet.

Zwei Fälle drehen die Erst-Einschätzung des Werkzeugs um sein eigenes Kriterium
(„einzelnes Wort ohne Sprachsignal" → hier eher „Label ohne Rendering-Pfad"):
`referenceId.label` und `weatherData.label` sehen aus wie Fließtext-Label, werden
aber laut `formConfig.ts` (Kommentar zu `hiddenFormFields`) in **keinem** Formular-
Schritt gerendert — dazu unten mehr.

---

## Gruppe 1 — „einzelnes Wort ohne Sprachsignal" (35 Fälle)

Alle Fälle liegen in `src/lib/form/validation/sightingSchema.ts` (33), plus je ein
Duplikat-Paar in `FormSteps.svelte`/`StepProgressCompact.svelte` und ein Eintrag in
`entryChannel.ts`.

### 1a. `technisch` — `.meta.type` und `.meta.autocomplete` (31 Fälle)

**Begründung (gilt für alle 29 `.meta.type`/`.meta.autocomplete`-Einträge
gemeinsam):** `FieldRenderer.svelte` liest `meta.type` ausschließlich als
Diskriminator, der bestimmt, welche Feld-Komponente gerendert wird
(`type: typeOverride ?? meta.type ?? fieldConfig.type`, Zeile 190) — der String
selbst erscheint nie als sichtbarer Text. `.meta.autocomplete` ist ein
HTML-`autocomplete`-Token (WHATWG-Spezifikation, sprachneutral) — dieselbe
Fallgruppe, die für `given-name`/`family-name`/`street-address`/`postal-code`
bereits unter `technisch` einsortiert ist (Zeilen 1622–1627 der
`i18n-inventory.md`). `email`/`tel` bei `email.meta.autocomplete` /
`phone.meta.autocomplete` gehören konsistent dazu.

| Datei:Zeile            | Feld (`context`)                  | Text       |
| ---------------------- | --------------------------------- | ---------- |
| sightingSchema.ts:216  | `hasPosition.meta.type`           | `toggle`   |
| sightingSchema.ts:245  | `latitude.meta.type`              | `number`   |
| sightingSchema.ts:270  | `longitude.meta.type`             | `number`   |
| sightingSchema.ts:350  | `sightingDate.meta.type`          | `date`     |
| sightingSchema.ts:371  | `sightingTime.meta.type`          | `time`     |
| sightingSchema.ts:396  | `species.meta.type`               | `select`   |
| sightingSchema.ts:503  | `deadCondition.meta.type`         | `select`   |
| sightingSchema.ts:526  | `deadSex.meta.type`               | `select`   |
| sightingSchema.ts:601  | `sightingFrom.meta.type`          | `select`   |
| sightingSchema.ts:669  | `distance.meta.type`              | `select`   |
| sightingSchema.ts:690  | `distribution.meta.type`          | `select`   |
| sightingSchema.ts:730  | `behavior.meta.type`              | `select`   |
| sightingSchema.ts:798  | `seaState.meta.type`              | `select`   |
| sightingSchema.ts:821  | `visibility.meta.type`            | `select`   |
| sightingSchema.ts:842  | `windDirection.meta.type`         | `select`   |
| sightingSchema.ts:863  | `windForce.meta.type`             | `select`   |
| sightingSchema.ts:880  | `weatherData.meta.type`           | `hidden`   |
| sightingSchema.ts:1029 | `boatDrive.meta.type`             | `select`   |
| sightingSchema.ts:1071 | `shipNameConsent.meta.type`       | `checkbox` |
| sightingSchema.ts:1127 | `email.meta.type`                 | `email`    |
| sightingSchema.ts:1128 | `email.meta.autocomplete`         | `email`    |
| sightingSchema.ts:1162 | `phone.meta.type`                 | `tel`      |
| sightingSchema.ts:1163 | `phone.meta.autocomplete`         | `tel`      |
| sightingSchema.ts:1231 | `nameConsent.meta.type`           | `checkbox` |
| sightingSchema.ts:1252 | `notes.meta.type`                 | `textarea` |
| sightingSchema.ts:1283 | `privacyConsent.meta.type`        | `checkbox` |
| sightingSchema.ts:1298 | `persistentDataConsent.meta.type` | `checkbox` |
| sightingSchema.ts:1329 | `internalComment.meta.type`       | `textarea` |
| sightingSchema.ts:1345 | `entryChannel.meta.type`          | `select`   |

**Zwei weitere `technisch`-Fälle, aber mit anderer Begründung** — es sind
`.label()`-Werte, keine `.meta.type`-Werte, und sie sähen für sich genommen wie
sichtbarer Text aus:

| Datei:Zeile           | Feld                | Text              |
| --------------------- | ------------------- | ----------------- |
| sightingSchema.ts:181 | `referenceId.label` | `Referenz-ID`     |
| sightingSchema.ts:876 | `weatherData.label` | `API-Wetterdaten` |

Begründung: `formConfig.ts` (Kommentar über `hiddenFormFields`, Zeile ~466) nennt
`referenceId`, `entryChannel` und `weatherData.*` explizit als Felder, die „in
KEINEM Schritt stehen" — anders als `entryChannel` (gerendert in
`Administrative.svelte` über `<FormField name="entryChannel" />`) taucht weder
`referenceId` noch `weatherData` an irgendeiner `<FormField name="…">`-Stelle im
Repository auf (geprüft per Grep über `src/`). Auch der CSV-Export
(`csvExport.ts`) zieht seine Header aus fest codierten deutschen Strings, nicht
aus `sightingSchema.describe()` — die beiden `.label()`-Werte werden also
nirgends gelesen. Die sichtbare „Referenz-ID"/„Referenz:"-Beschriftung, die
Nutzer tatsächlich sehen (`SubmitStatus.svelte`, `admin/[id]/+page.svelte`,
`admin/sichtungen/columns.ts`), sind eigenständige, fest codierte Strings an
anderer Stelle — vermutlich bereits unter `uebersetzbar` erfasst, jedenfalls
nicht identisch mit diesem `.label()`-Aufruf.

### 1b. `übersetzen` (4 Fälle)

| Datei:Zeile                   | Feld/Kontext                | Text                | Schlüssel (Vorschlag)                       | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | --------------------------- | ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sightingSchema.ts:1122        | `email.label`               | `E-Mail-Adresse`    | `sighting_email_label`                      | Im Unterschied zu `referenceId`/`weatherData`: `email` wird über `<FormField name="email" />` in `Step4Contact.svelte:151` gerendert — das Label erscheint im Kontaktschritt des Meldeformulars. Vorschlag Übersetzung: „Email address".                                                                                                                                                                                                        |
| FormSteps.svelte:50           | `nav[aria-label]`           | `Formular-Schritte` | `report_formsteps_aria_label_nav`           | Landmark-Label für die horizontale Schritt-Navigation ab `md` — für Screenreader-Nutzer immer hörbar, unabhängig von visueller Sichtbarkeit.                                                                                                                                                                                                                                                                                                    |
| StepProgressCompact.svelte:60 | `nav[aria-label]`           | `Formular-Schritte` | `report_stepprogresscompact_aria_label_nav` | Dieselbe Landmark-Rolle, nur für die mobile Zusammenfassung unterhalb `md` (`FormSteps.svelte` ist dort per `hidden md:block` ausgeblendet, beide existieren parallel im DOM). Gleicher Text wie oben — beide Aufrufstellen können denselben Schlüssel `report_formsteps_aria_label_nav` verwenden, wenn eine gemeinsame Botschaft gewünscht ist.                                                                                               |
| entryChannel.ts:19            | `entryChannelLabels[EMAIL]` | `E-Mail`            | `report_formoptions_entrychannel_email`     | Dubletten-Fall: alle fünf Geschwisterwerte desselben Records (`Web`, `Post`, `Fax`, `App`, `Telefon`, Zeilen 18/20–23) sind bereits als `uebersetzbar` erfasst (`i18n-inventory.md:1044-1048`). Nur `E-Mail` fiel unter `unklar`, weil das Wort für sich kein Sprachsignal trägt — im selben Objekt an derselben Rendering-Stelle (`getEntryChannelOptions`, Select-Optionen) ist die Einordnung aber eindeutig konsistent zu den Geschwistern. |

---

## Gruppe 2 — „enthält dynamische Interpolation" (9 Fälle)

Alle Botschaften sind ICU-Vorschläge mit benannten Parametern, keine
String-Konkatenation. Kein Fall hat eine echte Genus-Abhängigkeit; **ein** Fall
(LegendPanel L180) hat eine Zahl, bei der die deutsche Quelle „Sichtungen" schon
jetzt unabhängig vom Zählerstand im Plural steht — für die englische Fassung wird
das als ICU-Plural vorgeschlagen, damit „1 of 1 sighting" grammatisch korrekt
bleibt, statt den bestehenden (im Deutschen unauffälligen) Fehler mitzuschleppen.

### 2a. `technisch` (1 Fall)

| Datei:Zeile       | Attribut | Text                   | Begründung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | -------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Icon.svelte:277` | `title`  | `Missing icon: {icon}` | Der Rohtext ist **im Original bereits Englisch** — anders als jede andere Stelle im Projekt. Das ist kein Zufall: Der `$effect` direkt darüber loggt bei fehlendem Icon einen deutschsprachigen `console.error` („Unbekannter Icon-Name: … bitte in Icon.svelte importieren und in iconMap registrieren"), der HTML-Kommentar über dem Fallback lautet „Debug info for missing icons". Das `title`-Attribut ist derselbe Entwickler-Hinweis, nur als Tooltip statt als Konsolenausgabe — kein Produkttext für Endnutzer, sondern ein Hinweis auf einen Programmierfehler (falscher/nicht registrierter Icon-Name). Bleibt unverändert; bei Bedarf ließe sich der Platzhalter-Text technisch trotzdem lokalisieren, hat aber keine Priorität, weil der Zustand im korrekten Betrieb nicht auftritt. |

### 2b. `übersetzen` (8 Fälle)

Alle acht sind `aria-label`/`title` und damit im Sinne der Barrierefreiheit immer
nutzersichtbar — auch dort, wo der sichtbare Text (z. B. Icon-only-Button) keine
deutsche Zeichenkette zeigt.

| Datei:Zeile                   | Attribut     | Rohtext (Original)                                                                                                          | Schlüssel (Vorschlag)                              | ICU-Botschaftsvorschlag                                                                                                                                                                                                                                                                       |
| ----------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LegendPanel.svelte:180`      | `aria-label` | `Sichtbarkeit für {value} umschalten. Aktuell {counts.speciesCounts[key]?.visible \|\| 0} von {total} Sichtungen sichtbar.` | `map_legendpanel_toggle_species_visibility_aria`   | `Toggle visibility for {species}. Currently {visible} of {total} {total, plural, one {sighting} other {sightings}} visible.` — Parameter: `species` (Artgruppen-Label, String), `visible`/`total` (Zahlen). Plural auf `total`, nicht auf `visible`, weil „von {total}" das Bezugswort trägt. |
| `LegendPanel.svelte:215`      | `aria-label` | `Sichtungen der Gruppe {group.label} anzeigen/ausblenden`                                                                   | `map_legendpanel_toggle_color_group_aria`          | `Show/hide sightings in group {group}` — Parameter: `group` (Farbgruppen-Label, String).                                                                                                                                                                                                      |
| `MapPanel.svelte:139`         | `aria-label` | `{title} schließen`                                                                                                         | `map_panel_close_aria`                             | `Close {title}` — Parameter: `title` (Panel-Titel, String, kommt aus `Props.title`).                                                                                                                                                                                                          |
| `SightingsMapView.svelte:693` | `aria-label` | `Filter Jahr {activeFilters.year} entfernen und zum Standard-Jahr {apiDefaultYear} wechseln`                                | `map_sightingsmapview_remove_year_filter_aria`     | `Remove year filter {year} and switch to default year {defaultYear}` — Parameter: `year`, `defaultYear` (beide Jahreszahlen, kein Plural nötig — Jahre werden nie gezählt, nur benannt).                                                                                                      |
| `SightingsMapView.svelte:704` | `aria-label` | `Suchfilter {activeFilters.query} entfernen`                                                                                | `map_sightingsmapview_remove_search_filter_aria`   | `Remove search filter {query}` — Parameter: `query` (Freitext-Suchbegriff, String).                                                                                                                                                                                                           |
| `SightingsMapView.svelte:726` | `aria-label` | `{speciesLabel(speciesId)} wieder anzeigen`                                                                                 | `map_sightingsmapview_show_species_again_aria`     | `Show {species} again` — Parameter: `species` (Artname, String).                                                                                                                                                                                                                              |
| `SightingsMapView.svelte:737` | `aria-label` | `Gruppe {colorGroupLabel(colorGroup)} wieder anzeigen`                                                                      | `map_sightingsmapview_show_color_group_again_aria` | `Show group {group} again` — Parameter: `group` (Farbgruppen-Label, String).                                                                                                                                                                                                                  |
| `SightingsMapView.svelte:809` | `title`      | `Keine Sichtungen für {currentDisplayedYear} vorhanden`                                                                     | `map_sightingsmapview_no_sightings_for_year_title` | `No sightings for {year}` — Parameter: `year` (Jahreszahl, kein Plural nötig).                                                                                                                                                                                                                |

---

## Fälle mit `entscheiden`

Keine. Für alle 44 Fälle ließ sich im Quellkontext (Rendering-Pfad über
`FieldRenderer`, `hiddenFormFields`-Kommentar in `formConfig.ts`, tatsächliche
`<FormField name="…">`-Aufrufstellen, Sprache des Originaltexts bei `Icon.svelte`)
eine belastbare Entscheidung treffen.
