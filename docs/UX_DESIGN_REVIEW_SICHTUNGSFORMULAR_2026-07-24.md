# UX & Design System Review — Sichtungsformular

**Datum:** 2026-07-24
**Umfang:** Multi-Step-Sichtungsformular (`/`), Design System (DaisyUI-Theme `meeresmuseum`), `.claude`-Rules/Agents/Skills
**Methodik:** Code-Review aller Formular-Komponenten + Live-Durchgang im Browser (Mobile ~606 px und Desktop 1440 px, alle 4 Schritte)

---

## Gesamteindruck

Das Formular ist strukturell gut: klare 4-Schritt-Architektur, Positionsmethoden-Wahl (Foto/Karte/Beschreibung), Auto-Save, Wetter-Autovorschlag, durchdachte Consent-Trennung. Die Basis ist deutlich besser als der Durchschnitt von Meldeformularen.

**Aber:** Die im `DESIGN_GUIDE.md` behauptete „A-"-Qualität hält der Prüfung nicht stand. Es gibt **drei kritische Datenqualitäts-/A11y-Probleme**, eine Reihe von UX-Inkonsistenzen und ein Dokumentations-/Rules-Set, das an mehreren Stellen nicht mehr zum Code passt.

---

## 🔴 Kritische Befunde

### K1: Default-Koordinaten gaukeln eine echte Position vor (Datenqualität!)

`sightingSchema.ts` setzt als Schema-Defaults:

- `latitude: 54.5` (Zeile 214), `longitude: 13.5` (Zeile 246), `hasPosition: true` (Zeile 178)

Folgen (live verifiziert):

1. Ein **leeres, unberührtes Formular** zeigt bereits „✓ Die Koordinaten liegen innerhalb der Ostsee."
2. Schritt 1 ist ohne jede Nutzereingabe „gültig" — „Weiter" ist sofort aktiv.
3. Die Wetter-Sektion lädt **automatisch Wetterdaten für die Phantom-Position** „54° 30′ N 13° 30′ E".
4. Wer keine Position angibt, meldet unbemerkt eine Sichtung mitten in der Ostsee — wissenschaftlich wertlose bzw. verfälschende Daten.

**Empfehlung:** Defaults auf `undefined`/`null` + `hasPosition: false`; Position (oder explizit „Beschreibung statt GPS") als bewusste Nutzeraktion validieren. VerifyLocation und Wetter-Fetch nur nach echter Eingabe rendern.

### K2: Tierart „Schweinswal" und Anzahl „1" sind vorausgefüllt und grün abgehakt

`species` default `0` (= Schweinswal), `totalCount` default `1`. In Schritt 2 erscheint die Tierart-Auswahl **vorbelegt mit grünem Häkchen**, als hätte der Nutzer sie bestätigt. Wer eine Robbe meldet und das Feld übersieht, meldet einen Schweinswal. Gleiches Muster: grüne Häkchen an allen Feldern mit Default-Wert (Häkchen = „hat Wert", nicht „vom Nutzer bestätigt").

**Empfehlung:** `species` ohne Default („Bitte wählen…"), Validitäts-Häkchen nur für _berührte_ Felder anzeigen (touched-State existiert im eigenen `createForm` nicht — ergänzen oder Häkchen-Logik entfernen).

### K3: WCAG-Kontrastbruch im Totfund-Bereich (weiß auf hellgelb)

`DeadAnimal.svelte` nutzt `text-warning-content` auf `bg-warning/10`. Das Theme definiert `--color-warning-content: oklch(1 0 0)` (weiß). Ergebnis (live gemessen): **weißer Text auf ~90 % hellem Hintergrund, Kontrast ≈ 1,1:1** — praktisch unlesbar, klarer WCAG-2.x-Fail in einem inhaltlich wichtigen Bereich (Verhaltensregeln bei Totfund!).

**Empfehlung:** `text-base-content` bzw. eine `warning`-Textfarbe mit dunklem Ton verwenden (analog zum Alert-Override in `app.css`, der genau dieses Problem für `.alert-warning` bereits löst). Grundsatzfrage: `*-content`-Farben sind für Text _auf_ der Vollton-Farbe gedacht, nicht auf `/10`-Tints — als Regel ins Design-System aufnehmen.

---

## 🟡 UX-Befunde (moderat)

| #   | Befund                                                                                                                                                                                                                                                                                                                                                        | Beleg                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| U1  | **Vorzeitige Fehleranzeige:** Beim Betreten von Schritt 2 und 4 erscheint sofort ein Warn-Alert („Bitte geben Sie eine Entfernung an." / „Vorname erforderlich"), obwohl der Nutzer nichts berührt hat. Widerspricht dem eigenen Design Guide („Optimal validation timing without premature error states").                                                   | StepNavigation.svelte:33–35 (`stepErrorMessages` ohne touched-Check)                 |
| U2  | **Deaktivierter Weiter-Button + Fehler-Whack-a-mole:** „Weiter" ist disabled, solange der Schritt invalide ist; der Alert zeigt nur den **ersten** Fehler. Der aufwendige `showValidationError()`-Flow (Toast, Fehlerzähler, Scroll-zum-Feld) ist **toter Code**, weil der Button bei Invalidität gar nicht klickbar ist.                                     | StepNavigation.svelte:56–59 vs. 169                                                  |
| U3  | **Bootsantrieb blockiert Land-Melder:** Pflichtfeld ohne Konditionallogik — auch bei „Sichtung von: Land" muss ein Bootsantrieb gewählt werden; es gibt keine Option „Kein Boot". Schema-Kommentar sagt „Optional", Code sagt `.required()` **ohne deutsche Fehlermeldung** → es erscheint der englische Yup-Fallback **„Bootsantrieb is a required field"**. | sightingSchema.ts:889–907                                                            |
| U4  | **Toter „Abbrechen"-Button:** `handleCancel` macht `goto('/')` — das Formular _ist_ Seite `/`. Der Button tut effektiv nichts. Zudem wirkt er als `btn-ghost` wie einfacher Text.                                                                                                                                                                             | +page.svelte:32–35, FormActions.svelte:80–89                                         |
| U5  | **Doppelte „Kontaktdaten löschen"-Funktion** mit unterschiedlichen Confirm-Texten und Feedback (Toast vs. Logger) in Step4Contact **und** FormActions; beide mit nativem `confirm()` statt DaisyUI-Modal.                                                                                                                                                     | Step4Contact.svelte:24–37, FormActions.svelte:26–43                                  |
| U6  | **Stepper ohne Labels:** Nur Kreise „1 2 3 4" — Schritte 3/4 zudem kontrastschwach. Nutzer sehen nicht, was kommt (Design Guide fordert benannte Schritte). A11y: `role="tablist"`/`role="tab"` ohne `tabpanel` ist falsche Semantik; interaktives `<li>` mit `tabindex`/`onclick` statt `<button>`.                                                          | FormSteps.svelte:36–58                                                               |
| U7  | **Doppelte Labels bei Toggles/Checkboxen:** Label erscheint zweimal („Handelt es sich um einen Totfund?" ×2, „Einverständnis zur Mediennutzung" ×2) — FieldRenderer rendert das Label, BaseToggle/BaseCheckbox wiederholen es.                                                                                                                                | FieldRenderer.svelte:237–272 + 291–293                                               |
| U8  | **Copy-Fehler / inkonsistente Sprache:** „Handel**tete** es sich um **L**ebende Tiere…" (Tippfehler); „Reaktion auf **Ihr Boot**" auch bei Land-Sichtung; Medien-Sektion bewirbt „Fotos/**Videos**", akzeptiert aber nur Bildformate (JPG/PNG/GIF/WEBP); „max 10MB" vs. 30-MB-Cap im GPS-Upload-Code.                                                         | sightingSchema (isDead helpText), Behavior/Media-Sections, PositionAndTime.svelte:32 |
| U9  | **Scroll/Fokus nach Schrittwechsel landet unterhalb des Step-Headers** (Badge „Schritt X von 4" und Überschrift werden übersprungen; live mehrfach mitten im Formular gelandet).                                                                                                                                                                              | StepNavigation.svelte:41–51 (`#form-content` beginnt unter dem Header)               |
| U10 | **Positionsmethode nicht persistiert:** Nach Reload steht die Auswahl wieder auf „Foto mit GPS", auch wenn der Nutzer Karte/Beschreibung gewählt hatte; Methodenwechsel setzt bereits gesetzte Koordinaten nicht zurück. — **Gegenstandslos seit #590:** es gibt keine Positionsmethode mehr (siehe Nachtrag 2026-07-29).                                     | Damals `PositionAndTime.svelte:14, 39–48` — Code existiert nicht mehr                |
| U11 | **Fehlermeldungs-Stil inkonsistent:** teils freundlich-deutsch („Wie viele Tiere haben Sie gesehen?"), teils technisch-englisch (U3), teils Feldname-Präfix („GPS-Position: Breitengrad ist erforderlich").                                                                                                                                                   | sightingSchema.ts passim                                                             |

---

## 🎨 Design-System-Befunde

**Positiv:** Ein echtes Theme (`meeresmuseum`) als DaisyUI-v5-Plugin mit OKLCH-Tokens, dokumentierten Radius-/Border-Variablen, Alert-Soft-Override, Fokus-Indikatoren, `prefers-reduced-motion`-Fallback. Lucide-Icons konsequent über `Icon.svelte`/unplugin-icons. Die Basis-Feldkomponenten (BaseInput/Select/…) nutzen sauber DaisyUI-Klassen.

Schwächen:

| #   | Befund                                                                                                                                                                                                                                                                                                                      | Beleg                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D1  | **`animate-in`/`slide-in-from-top-1`/`duration-200` sind tote Klassen** — kein `tailwindcss-animate`/`tw-animate-css` in `package.json`. Die Fehler-„Animation" existiert nicht.                                                                                                                                            | FieldRenderer.svelte:309, SpeciesIdentificationHelp.svelte |
| D2  | **`*-content`-Farben auf Tints** (K3) — Regel fehlt, wann `text-warning-content` erlaubt ist.                                                                                                                                                                                                                               | DeadAnimal.svelte                                          |
| D3  | **Button-Hierarchie uneinheitlich:** „Zurück" = `btn-secondary` (Vollton, wirkt fast disabled neben dem grauen Container), „Formular zurücksetzen" = `btn-outline btn-sm`, „Abbrechen" = `btn-ghost`, „Kontaktdaten löschen" = `btn-warning btn-sm` bzw. `btn-ghost btn-xs text-error` — fünf Stile für sekundäre Aktionen. | StepNavigation/FormActions/Step4Contact                    |
| D4  | **Inline-Styles statt Utilities** (`style="word-wrap: break-word; …"`).                                                                                                                                                                                                                                                     | FieldRenderer.svelte:240                                   |
| D5  | **Step-4-Markup:** sämtliche Sections sind _im_ zentrierten Step-Header verschachtelt → `text-center` muss überall per `text-left` zurückgedreht werden; Heading-Hierarchie springt (h4 „Erforderliche Zustimmung" ohne h3-Kontext in RequiredConsent).                                                                     | Step4Contact.svelte:42–207                                 |
| D6  | **Nur Light-Theme** (`prefersdark: false`, kein dunkles Pendant) — bewusste Entscheidung? Für Feldnutzung nachts (Totfund-Meldung) wäre Dark Mode sinnvoll.                                                                                                                                                                 | app.css:26–30                                              |
| D7  | Section-Icons doppelt vergeben (`lucide:activity` für „Sichtungsdetails" **und** „Weitere Sichtungsdetails").                                                                                                                                                                                                               | SightingDetails/OptionalSightingDetails                    |

---

## 📚 Rules-, Skills- & Doku-Audit

### Veraltet / falsch

| Dokument                             | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/forms.md`             | Beschreibt **svelte-forms-lib** als Form-Stack inkl. Codebeispiel `import { createForm } from 'svelte-forms-lib'`. Das Paket ist **nicht mehr in `package.json`** — das Projekt hat eine eigene `createForm`-Implementierung (`src/lib/form/createForm.ts`). Ein Agent, der dieser Rule folgt, schreibt falschen Code. Auch das Schema-Beispiel (`lat`, `lng`, `date`, `count`) entspricht nicht den echten Feldnamen (`latitude`, `sightingDate`, `totalCount`, …). |
| `.claude/rules/architecture.md`      | Tech-Stack-Tabelle: „Forms \| svelte-forms-lib + Yup" — stale.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.claude/agents/form-development.md` | „svelte-forms-lib + Yup Integration" als Kernfähigkeit — stale.                                                                                                                                                                                                                                                                                                                                                                                                      |
| `.claude/README.md`                  | Ebenfalls svelte-forms-lib-Referenz (Zeile 109).                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `CLAUDE.md` (Root)                   | Übernimmt den Stack-Einzeiler mit svelte-forms-lib.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `docs/DESIGN_GUIDE.md`               | Größtes Problem: liest sich als Erfolgsbilanz („A- grade", lauter ✅), enthält aber **nachweislich falsche Behauptungen**: zitierte CSS-Regeln (`.form-field`, `.form-navigation`) existieren nicht in `app.css`; „Service worker ✅" — es gibt keinen; „keine premature errors ✅" — live widerlegt (U1); Schema-/Code-Snippets entsprechen nicht dem echten Code. Als Referenz für Design-Entscheidungen derzeit irreführend.                                      |

### Lücken (fehlende Skills/Rules für den genutzten Stack)

1. **Eigenes Form-Framework undokumentiert:** `createForm`-API, `FormContext`, `FieldRenderer`/`FormField`-Pattern, Schema-`meta`-Konventionen (`helpText`, `valueText`, `icon`, `type`, options) — nirgends beschrieben. Genau hier halluzinieren Agents sonst svelte-forms-lib. → `forms.md` komplett neu auf die hauseigene API schreiben (höchste Priorität im Doku-Bereich).
2. **Kein Design-System-Dokument mit Verbindlichkeit:** Es fehlt eine kompakte Rule (`.claude/rules/design-system.md` o.ä.) mit: Theme-Tokens, Button-Hierarchie, Alert-/Tint-Regeln (wann `*-content`), Label/Toggle-Pattern, Icon-Konventionen. `DESIGN_GUIDE.md` ersetzt das nicht (siehe oben). |
3. **Kein A11y-Check im Workflow:** architecture.md fordert WCAG 2.1 AA, aber weder `/review` noch `/prepare-pr` enthalten einen Kontrast-/ARIA-Check (K3, U6 wären sonst aufgefallen). Plugin-Skills wie `design:accessibility-review` bzw. `ecc:a11y-architect` sind vorhanden, werden aber nirgends referenziert.
4. **Vorhandene Framework-Abdeckung ist gut:** Svelte-5-Plugin (svelte-file-editor Agent + Autofixer-MCP), Context7, dedizierte Doku-MCPs für DaisyUI, Drizzle, OpenLayers. Hier fehlt nichts Wesentliches — die Lücke liegt bei den **projekteigenen** Patterns, nicht bei den Frameworks.

---

## Was gut funktioniert

- 4-Schritt-Struktur mit optionalem Schritt 3 inkl. prominentem „Schritt überspringen"
- Positionsmethoden-Auswahl (Foto-GPS bevorzugt) — starke, feldtaugliche Idee
- Auto-Save (Session) + Consent-basierte Kontaktdaten-Persistenz (GDPR-sauber differenziert)
- Wetter-Autovorschlag mit Quellenangabe und Forecast/Historie-Unterscheidung
- Datum default = heute, Zeit optional — richtige Priorisierung
- Durchgängige Icon-Sprache, ordentliche Fokus-Stile, `prefers-reduced-motion`
- Klare, zweckgebundene Datenschutz-Kommunikation vor dem Absenden

---

## Priorisierte Empfehlungen

1. **K1/K2 sofort:** Defaults für `latitude`/`longitude`/`hasPosition`/`species` entfernen; „gültig"-Häkchen an touched koppeln. (Kleiner Eingriff, größter Effekt auf Datenqualität.)
2. **K3 + D1:** Totfund-Kontrast fixen; tote `animate-in`-Klassen entfernen oder Plugin nachrüsten.
3. **U1/U2:** Fehler-Alert erst nach Interaktionsversuch zeigen; „Weiter" immer klickbar lassen und beim Klick den vorhandenen `showValidationError()`-Flow nutzen (Toast + Scroll zum ersten Fehlerfeld) — der Code existiert bereits.
4. **U3:** `boatDrive` konditional auf `sightingFrom` (Boot-Typen) machen, deutsche Fehlermeldung ergänzen, Option „Kein Boot" bzw. Feld bei Land ausblenden.
5. **forms.md & Co. aktualisieren:** svelte-forms-lib-Referenzen in 5 Dateien ersetzen durch die dokumentierte hauseigene `createForm`-API; `DESIGN_GUIDE.md` durch ein ehrliches, kompaktes Design-System-Dokument ersetzen.
6. **Stepper:** Labels unter die Punkte, `tablist`-Semantik durch Buttons ersetzen (U6).
7. Kleinigkeiten: Copy-Fixes (U8), doppelte Labels (U7), toten Abbrechen-Button entfernen oder mit Reset zusammenführen (U4/U5).

---

_Review erstellt mit Live-Verifikation; Screenshots der Befunde K1 (grüne Ostsee-Bestätigung auf leerem Formular), K3 (weißer Text auf hellem Grund), U1/U3 (premature Errors, englische Fehlermeldung) wurden im Browser-Durchgang erhoben._

---

## Update nach Rebase auf main (Commit `acce0d2`, Pre-Launch-Review #558)

Neubewertung aller Befunde gegen den aktuellen Stand (Code-Diff + erneuter Browser-Check):

### ✅ Durch #558 behoben

| Befund                                                                        | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **U6** Stepper ohne Labels / falsche Semantik                                 | **Behoben.** Sichtbare Schritt-Titel unter den Punkten, echte `<button>` statt klickbarer `<li>`, `role="tablist"` entfernt (live verifiziert). Rest-Punkt: inaktive Kreise weiterhin kontrastschwach.                                                                                                                                                                                                                                                                   |
| **U7** Doppelte Labels bei Toggles/Checkboxen                                 | **Behoben.** FieldRenderer überspringt das Caption-Label für Checkbox/Toggle (`isSingleControl`); Radio-Gruppen jetzt korrekt mit `fieldset`/`legend`.                                                                                                                                                                                                                                                                                                                   |
| **U8 (teilweise)** Copy-Fehler                                                | „Handeltete"-Tippfehler und „Junge Tiere" korrigiert; SubmissionSuccess-Texte gefixt. **Offen:** Medien-Sektion bewirbt weiter „Fotos/Videos", akzeptiert aber nur Bildformate; 10 MB vs. 30 MB.                                                                                                                                                                                                                                                                         |
| **U9 (teilweise)** Fokus nach Schrittwechsel                                  | „Schritt überspringen" setzt jetzt den Fokus auf den Step-Header. **Offen:** regulärer Schrittwechsel scrollt weiterhin zu `#form-content` (unterhalb von Badge/Überschrift).                                                                                                                                                                                                                                                                                            |
| **Doku: forms.md / architecture.md / CLAUDE.md / agents/form-development.md** | **Behoben.** forms.md dokumentiert jetzt die hauseigene `createForm`-API (inkl. „kein touched/validateField"-Hinweis), Tech-Stack-Tabellen aktualisiert. ~~**Offen:** `.claude/README.md:109` nennt weiterhin svelte-forms-lib.~~ — inzwischen erledigt: An Zeile 109 steht heute die Skill-Tabelle, in `.claude/` und `CLAUDE.md` kommt `svelte-forms-lib` nicht mehr vor. Übersehen wurde damals das **Root-`README.md`** (Z. 38 und 215) — am 2026-07-29 nachgezogen. |
| Bonus (nicht im Original-Review)                                              | Autocomplete-Attribute auf Kontaktfeldern, Confirm vor „Formular zurücksetzen", Info-Tooltips tastaturerreichbar, Skip-Link/Landmarks.                                                                                                                                                                                                                                                                                                                                   |

### 🔴 Weiterhin offen (kritisch) — _Momentaufnahme bei `acce0d2`, inzwischen erledigt_

> **Diese Tabelle ist historisch.** Sie beschreibt den Stand vor der Umsetzung vom
> 2026-07-24. Alle drei Befunde sind behoben; die Spalte „Heute" nennt die Belegstelle
> im aktuellen Code. Der aktuelle Backlog steht unter
> „[Offene Punkte — Stand 2026-07-29](#offene-punkte--stand-2026-07-29)".

| Befund                                                                | Damals (`acce0d2`)                                                                                                                                 | Heute                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **K1** Default-Koordinaten / Phantom-Position                         | `sightingSchema.ts`: `hasPosition .default(true)` (Z. 178), `latitude .default(54.5)` (Z. 214), `longitude .default(13.5)` (Z. 246) — unverändert. | ✅ **Behoben (#567, ergänzt durch #590).** `latitude`/`longitude` haben kein `.default()` mehr und sind nur bei `hasPosition === true` Pflicht; `hasPosition` steht auf `.default(false)`, `waterway` wird stattdessen Pflicht. Zusätzlich seit #590: `OLMap.svelte` zeichnet den Marker nur bei `hasPosition`, ein `singleclick` setzt die Position. |
| **K2** Tierart/Anzahl vorbelegt + grüne Haken auf unberührten Feldern | Defaults und `hasValue`-basierte Häkchen unverändert.                                                                                              | ✅ **Behoben (#567).** `species` hat kein `.default()` mehr, sondern `.required('Bitte wählen Sie eine Tierart aus')`. Das grüne Häkchen ist an `touched` gekoppelt (`FieldRenderer.svelte`: `isValid = touched && hasValue && !hasError`). `totalCount` behält bewusst `.default(1)` — ohne Häkchen ist das ein Vorschlag, keine Scheinbestätigung.  |
| **K3** Totfund-Kontrast (weiß auf hellgelb)                           | `DeadAnimal.svelte` nutzt weiter `text-warning-content` auf `bg-warning/10`.                                                                       | ✅ **Behoben (#567).** Kein `text-*-content` liegt mehr auf einem Tint; die verbliebenen Vorkommen (Dropzones, Karten-Badge, Fehlerseite) sitzen auf Vollton-Flächen. Als Regel festgehalten in `.claude/rules/design-system.md`.                                                                                                                     |

### 🟡 Weiterhin offen (moderat) — _Momentaufnahme bei `acce0d2`, größtenteils erledigt_

> **Auch diese Liste ist historisch.** Der Status hinter jedem Punkt gibt den am
> 2026-07-29 gegen `main` nachgeprüften Stand wieder. Was hier noch offen ist, steht
> gesammelt unter „[Offene Punkte — Stand 2026-07-29](#offene-punkte--stand-2026-07-29)".

- **U1/U2:** Premature-Error-Alert + disabled „Weiter" unverändert (`StepNavigation.svelte:33–35, 169`); `showValidationError()`-Flow bleibt toter Code. — ✅ **Behoben (#567).** `shouldShowStepAlert()` in `stepNavigationState.ts` verlangt `attemptedStep === currentStep`, der Alert erscheint also erst nach einem gescheiterten „Weiter". Der Button ist nur noch bei `$isSubmitting` deaktiviert; `showValidationError()` ist damit der aktive Pfad, nicht toter Code. Seit #590 öffnet das darin aufgerufene `scrollToFirstError()` zusätzlich geschlossene `<details>`-Vorfahren.
- **U3:** `boatDrive` weiter unconditional `.required()` ohne deutsche Meldung (englischer Yup-Fallback), Schema-Kommentar sagt „Optional"; keine Konditionallogik auf `sightingFrom`. — ✅ **Behoben (#567).** `boatDrive` hat `.when('sightingFrom', …)` und ist nur bei Segelschiff/Motorboot Pflicht, mit deutscher Meldung „Bitte wählen Sie den Bootsantrieb aus.".
- **U4:** „Abbrechen" → `goto('/')` auf Seite `/` — toter Button. — ✅ **Behoben (#567).** Button entfernt; `FormActions.svelte` hält die Begründung als Kommentar fest.
- **U5:** Doppelte „Kontaktdaten löschen"-Funktion (Step4Contact + FormActions) mit unterschiedlichen Texten; native `confirm()`. — ✅ **Behoben (#567).** Konsolidiert in `src/lib/report/clearContactData.ts`, einziger Aufrufer ist `Step4Contact.svelte`.
- **U10:** Positionsmethode nicht persistiert; Methodenwechsel setzt Koordinaten nicht zurück. — ⚪️ **Gegenstandslos (#590)**, siehe Nachtrag 2026-07-29 unten.
- **U11:** Fehlermeldungs-Stil weiter inkonsistent. — 🟡 **Teilweise offen.** Der englische Yup-Fallback ist mit U3 verschwunden; alle nutzersichtbaren Pflichtfelder haben deutsche Meldungen. Der Stil-Mix bleibt: `latitude`/`longitude` melden mit Feldnamen-Präfix („GPS-Position: Breitengrad ist erforderlich"), andere Felder in Frageform („Wie viele Tiere haben Sie gesehen?").
- **D1:** `animate-in`-Klassen weiter tot (kein Animations-Plugin in package.json), jetzt `FieldRenderer.svelte:331`. — ✅ **Behoben (#567).** `animate-in`/`slide-in-from-*`/`fade-in` kommen in `src/` nicht mehr vor; als Regel in `.claude/rules/design-system.md` („Keine toten Utility-Klassen") festgehalten.
- **D3–D7:** Button-Hierarchie, Inline-Styles, Step-4-Verschachtelung, nur Light-Theme, Icon-Duplikate — unverändert. — Aufgeteilt: **D3 ✅ behoben (#567)** (destruktive Aktionen einheitlich `btn btn-outline btn-error btn-sm min-h-11`), **D5 ✅ behoben (#567)** (Sections liegen nicht mehr im zentrierten Header), **D6 ⚪️ bewusste Produktentscheidung** (nur Light-Theme), **D4 🔴 offen** (Inline-`word-wrap`-Styles in 5 Dateien), **D7 🔴 offen** (`lucide:activity` doppelt vergeben).
- **`docs/DESIGN_GUIDE.md`:** unverändert veraltet (falsche CSS-Zitate, Service-Worker-Behauptung, „keine premature errors"). — ✅ **Behoben (#567).** Ersetzt durch Leitlinien + verifizierten Ist-Zustand; der fehlende Service Worker steht jetzt korrekt unter „Bekannte Einschränkungen".
- **Fehlende Rules:** Design-System-Rule (Tokens, `*-content`-Regel, Button-Hierarchie) und A11y-Check in `/review`//`prepare-pr` weiterhin offen — forms.md deckt jetzt nur das Form-State-Pattern ab. — ✅ **Behoben (#567).** `.claude/rules/design-system.md` existiert; der Kontrast-/ARIA-Prüfschritt inklusive `oklch`-Messmethode steht in `.claude/skills/review/SKILL.md`. `svelte-forms-lib` kommt weder in `.claude/` noch in `CLAUDE.md` noch vor; die zuletzt übersehene Stelle im Root-`README.md` (Z. 38, 215) wurde am 2026-07-29 nachgezogen.

### Umsetzung am 2026-07-24 (dieser Branch, uncommitted)

Die Top-Prioritäten wurden test-first umgesetzt und live im Browser verifiziert (alle 1654 Unit-Tests + 29 Browser-Komponententests grün, svelte-check 0 Fehler, Lint 0 Fehler):

- **K1 behoben:** Schema-Defaults `latitude`/`longitude` entfernt, `hasPosition` default `false`; `waterway` ist Pflicht, wenn keine GPS-Position vorliegt (leeres Formular kommt nicht mehr durch Schritt 1); `hasPosition` wird nur noch bei echten Koordinaten (Karte/GPS-Foto) gesetzt; Methodenwechsel zu „Beschreibung" setzt Koordinaten zurück. VerifyLocation/Wetter-Fetch rendern bei leerem Formular nicht mehr.
- **K2 behoben:** `species` ohne Default („Bitte wählen..."); `createForm` hat jetzt einen `touched`-Store, grüne Häkchen erscheinen nur noch an vom Nutzer berührten Feldern.
- **K3 behoben:** Totfund-Box nutzt `text-base-content`/`text-warning` statt weißem `text-warning-content`; dasselbe Muster an 5 weiteren Stellen in FormHelp.svelte gefixt.
- **U1/U2 behoben:** Kein Fehler-Alert mehr beim Betreten eines Schritts; „Weiter" immer klickbar; Klick bei invalidem Schritt zeigt Toast + alle Schrittfehler als Liste + Scroll zum ersten Fehlerfeld (Logik als pure Funktionen in `stepNavigationState.ts`, 12 neue Tests).
- **U3 behoben:** `boatDrive` nur noch Pflicht bei Segelschiff/Motorboot (deutsche Meldung „Bitte wählen Sie den Bootsantrieb aus."); UI blendet den Block bei Land/Fähre/Sonstiges aus und setzt versteckte Werte zurück (11 neue Schema-Tests).
- **D1 behoben:** Tote `animate-in`-Klassen entfernt. **U8 (Rest) behoben:** Medien-Copy ohne Video-Versprechen. **Doku:** letzte svelte-forms-lib-Referenz in `.claude/README.md` korrigiert.

Weiterhin offen (bewusst nicht in diesem Schwung): U4/U5 (Abbrechen/doppeltes Kontaktdaten-Löschen), U9-Rest (Scrollziel Schrittwechsel), U10, U11-Rest, D3–D7, DESIGN_GUIDE.md-Ersatz, Design-System-Rule, A11y-Check in `/review`.

### Nachtrag: Review der Umsetzung (2026-07-27)

Ein Code-/UX-Review der obigen Änderungen (inkl. unabhängigem Zweitgutachten und erstmaligem E2E-Lauf) fand vier Regressionen, die anschließend behoben wurden:

| Befund                                                  | Ursache                                                                                                                                                                                                                              | Behebung                                                                                                                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Datenverlust im Admin** (kritisch, nie in Produktion) | Der `$effect` zum Zurücksetzen von `boatDrive` lief auch beim Mount — beim Öffnen einer bestehenden Land-Sichtung wurde der gespeicherte Wert unsichtbar gelöscht und beim Speichern als 0 („Sonstiger Bootsantrieb") überschrieben. | `boatDriveReset.ts`: Reset nur beim echten Übergang Boot → kein Boot; der erste Durchlauf initialisiert nur den Merker.                                          |
| **E2E-Suite rot** (10/11 in `form-ux`)                  | `fillStep1`/`fillStep2` bauten auf den entfernten Phantom-Defaults bzw. dem immer sichtbaren Bootsantrieb auf.                                                                                                                       | Helper und Specs nachgezogen; komplette Suite läuft: **86 passed, 1 skipped** (DB-gated).                                                                        |
| **Sackgasse in Schritt 1**                              | `waterway` war Pflicht, aber nur in der Methode „Beschreibung" gerendert — Fehler ohne behebbares Feld.                                                                                                                              | Fahrwasser-Block in allen drei Methoden erreichbar („Kein GPS? Beschreiben Sie das Seegebiet"), dynamisches Pflicht-Sternchen + `aria-required`.                 |
| **Sichtbare Phantom-Koordinaten**                       | Anzeige-Fallback `?? 54.5/13.5` füllte die Koordinatenfelder, obwohl der State leer war.                                                                                                                                             | `defaultCenter`-Prop in `LocationInput`: Karte startet über der Ostsee, Eingabefelder bleiben leer. Gleiches im Admin-Pfad (`Location.svelte` + `toCoordinate`). |
| **Stiller Fehlschlag beim Absenden**                    | Immer klickbarer Button + `createForm` schluckt `ValidationError` → Klick ohne jede Reaktion.                                                                                                                                        | `findStepForErrors.ts`: Abbruch vor dem Submit, Fehler in den Store, Sprung zum frühesten betroffenen Schritt, Toast über die bestehende Fehlerbehandlung.       |

Stand nach der Nacharbeit: 1685 Unit-Tests, 74 Browser-Komponententests, 86 E2E-Tests grün; svelte-check 0 Fehler, ESLint 0 Fehler.

### Restliste abgearbeitet (2026-07-27)

| Befund                                       | Umsetzung                                                                                                                                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **U4** toter Abbrechen-Button                | Entfernt (`goto('/')` auf der eigenen Seite war nachweislich wirkungslos, auch im iFrame-Modus).                                                                                                                  |
| **U5** doppeltes „Kontaktdaten löschen"      | Konsolidiert in `src/lib/report/clearContactData.ts`, nur noch in Schritt 4 (fachlicher Kontext), ein Text, ein Toast.                                                                                            |
| **U9** Scrollziel beim Schrittwechsel        | `scrollToStepHeader()` in `fieldNavigation.ts` — der Kopf des neuen Schritts (Icon/Überschrift/Badge) ist jetzt sichtbar.                                                                                         |
| **U10** Positionsmethode nicht persistiert   | _(damals)_ `positionMethod.ts`: Methode wird beim Mount aus dem Formularzustand abgeleitet (Koordinaten → Karte, Fahrwasser → Beschreibung, sonst Foto). **Überholt durch #590 — siehe Nachtrag 2026-07-29.**     |
| **U11/U8** erfundene Statistiken in Tooltips | Vier unbelegte Zahlen („73 % der Sichtungen morgens", „5x mehr Tiere", „40 % durch Nordwind", „60 % mit Elektromotor") entfernt und durch nachprüfbare Aussagen ersetzt. Belegte Zahlen können mit Quelle zurück. |
| **D3** Button-Hierarchie                     | Eine Primäraktion pro Bereich; destruktive Aktionen einheitlich `btn-outline btn-error` mit 44 px Touch-Target; „Zurück" von Vollton auf `btn-outline`.                                                           |
| **D5** Step-4-Markup                         | Sections liegen nicht mehr im zentrierten Header; alle `text-left`-Gegensteuerungen entfallen.                                                                                                                    |
| **Stale Position**                           | `exifPositionReset.ts`: Beim Entfernen des GPS-Fotos werden nur die daraus gesetzten Koordinaten zurückgenommen — manuell geänderte Werte bleiben.                                                                |
| **OpenAPI-Spec**                             | `latitude`/`longitude` nicht mehr als Pflicht deklariert, „Position oder Fahrwasser"-Regel dokumentiert, `hasPosition` ergänzt, `species` `minimum: 0` (0 = Schweinswal).                                         |
| **Upload-Konfiguration**                     | Client-Fallback versprach Videos/50 MB, Server erlaubt anonym nur Bilder/10 MB — beide ziehen jetzt aus `src/lib/constants/uploadDefaults.ts`.                                                                    |
| **DESIGN_GUIDE.md**                          | Ersetzt: Leitlinien und verifizierter Ist-Zustand getrennt, alle erfundenen Metriken und falschen Code-Zitate raus, „Bekannte Einschränkungen" ergänzt.                                                           |
| **Design-System-Rule**                       | Neu: `.claude/rules/design-system.md` (Theme-Tokens, `*-content`-Regel, Alerts, Button-Hierarchie, Feld-Pipeline, A11y-Minima, tote Utilities).                                                                   |
| **A11y im Workflow**                         | Prüfschritt in `/review` und `/prepare-pr` verankert, inkl. Messmethode für `oklch`-Farben.                                                                                                                       |
| **forms.md**                                 | Behauptete „Es gibt KEIN `touched`" — seit der Umsetzung falsch; korrigiert, handgeschriebenes ARIA-Beispiel durch Verweis auf die `FormField`-Pipeline ersetzt.                                                  |

Endstand: **1703 Unit-Tests, 80 Browser-Komponententests, 86 E2E-Tests grün**; svelte-check 0 Fehler, ESLint 0 Fehler.

Weiterhin bewusst offen: nur Light-Theme (Produktentscheidung), `boatDrive` kann DB-bedingt (`notNull default 0`) kein „keine Angabe" abbilden, Karten-Neuaufbau bei jeder Koordinatenänderung (vorbestehend).

### Aktualisierte Prioritäten (Stand 2026-07-24 — vollständig abgearbeitet)

> Historisch. Alle vier Punkte sind erledigt: 1.–3. mit #567 (Schema-Defaults,
> Totfund-Kontrast, tote Animationsklassen, Fehler-Timing, Bootsantrieb-Konditionallogik), 4. ebenfalls mit #567 (`DESIGN_GUIDE.md` ersetzt, `.claude/rules/design-system.md`
> neu, A11y-Prüfschritt in `/review`); die letzten `svelte-forms-lib`-Referenzen im
> Root-`README.md` wurden am 2026-07-29 nachgezogen.
> Der aktuelle Backlog steht unten.

1. **K1/K2:** Schema-Defaults entfernen (unverändert wichtigster Fix).
2. **K3 + D1:** Totfund-Kontrast, tote Animationsklassen.
3. **U1/U2 + U3:** Fehler-Timing & Bootsantrieb-Konditionallogik.
4. Doku-Rest: `.claude/README.md`-Zeile, `DESIGN_GUIDE.md` ersetzen, Design-System-Rule + A11y-Check ergänzen.

### Nachtrag: U10 ist gegenstandslos (2026-07-29)

**U10 ist nicht behoben — die Frage stellt sich nicht mehr.** Mit
[#590](https://github.com/jansinger/ostsee-tiere/pull/590) (Commit `a7cbb2e`)
ist die Positionsmethoden-Wahl **ersatzlos entfallen**. Es gibt kein „Foto mit
GPS / Karte / Beschreibung" mehr, sondern genau ein Positions-Panel, in dem alle
Wege gleichzeitig erreichbar sind. Ohne Modus gibt es weder einen Zustand, der
über einen Reload zu persistieren wäre, noch einen Methodenwechsel, der
Koordinaten zurücksetzen müsste — der stille Datenverlust im damaligen
`selectMethod('manual')` ist damit ebenfalls weg.

Die im obigen Text und in der Restliste genannten Fundstellen existieren so nicht
mehr:

| Damals                                                    | Heute                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `sections/positionMethod.ts` (+ `positionMethod.test.ts`) | gelöscht                                                                                                   |
| `sections/PositionAndTime.svelte:14, 39–48`               | Datei auf 21 Zeilen reine Komposition geschrumpft (`<PositionPanel />` + Datum/Uhrzeit-Sektion)            |
| Radiogruppe / Kacheln der Methodenwahl                    | entfallen; stattdessen `form/position/PositionPanel.svelte` und `form/position/LocationDescription.svelte` |

Damit sind auch die beiden Stellen weiter oben überholt, die die
Methodenwahl als Stärke führen („Gesamteindruck", „Was gut funktioniert") — die
Begründung dafür steht in `docs/UX_POSITIONSANGABE_SCHRITT1_2026-07-28.md`
(Abschnitt „Problem"): Das Datenmodell ist binär, nicht ternär, und der dritte
Tab bot kein Feld, das der Fallback-Block nicht ohnehin schon zeigte.

Der Ist-Zustand samt der Abweichungen zwischen Spec und Umsetzung steht in
`docs/UX_POSITIONSANGABE_SCHRITT1_2026-07-28.md`.

---

## Offene Punkte — Stand 2026-07-29

Alle Befunde dieses Reviews wurden am 2026-07-29 einzeln gegen `main` (`d965edf`)
nachgeprüft. **Dies ist der maßgebliche Backlog** — die „Weiterhin offen"-Abschnitte
weiter oben sind Momentaufnahmen früherer Stände und größtenteils überholt.

### Noch offen

| Befund                               | Ist-Zustand                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D4** Inline-Styles statt Utilities | `style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto;"` steht identisch in fünf Dateien: `FieldRenderer.svelte`, `Checkbox.svelte` (2×), `BaseCheckbox.svelte`, `BaseToggle.svelte`. |
| **D7** Section-Icons doppelt         | `lucide:activity` in `SightingDetails.svelte` **und** `OptionalSightingDetails.svelte`.                                                                                                                 |
| **U11** Fehlermeldungs-Stil          | Rest von U11: `latitude`/`longitude` melden mit Feldnamen-Präfix („GPS-Position: Breitengrad ist erforderlich"), andere Felder in Frageform. Kein englischer Fallback mehr.                             |

### Bewusst offen (keine Aufgabe)

| Punkt                      | Begründung                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D6** nur Light-Theme     | Produktentscheidung (`prefersdark: false` in `src/app.css`).                                                                                                                  |
| `boatDrive` „keine Angabe" | DB-bedingt: `notNull default 0` lässt keinen dritten Zustand zu.                                                                                                              |
| `totalCount .default(1)`   | Bleibt bewusst. Seit dem `touched`-gekoppelten Häkchen (#567) wirkt der Wert als Vorschlag, nicht als bestätigte Nutzereingabe — der ursprüngliche K2-Einwand entfällt damit. |

### Erledigt seit dem Ursprungsreview

K1, K2, K3, U1–U9, U11 (englischer Fallback), D1, D3, D5 sowie der komplette
Doku-/Rules-Block (`DESIGN_GUIDE.md`, `.claude/rules/design-system.md`,
A11y-Prüfschritt in `/review`, `svelte-forms-lib`-Referenzen) — überwiegend mit
[#567](https://github.com/jansinger/ostsee-tiere/pull/567), ergänzt durch
[#590](https://github.com/jansinger/ostsee-tiere/pull/590) (Positions-Panel) und
[#599](https://github.com/jansinger/ostsee-tiere/pull/599) (Kontrast/Touch-Targets).
U10 ist mit #590 gegenstandslos. Belegstellen stehen jeweils am Befund.

Die `svelte-forms-lib`-Aufräumung war dabei bis 2026-07-29 unvollständig: Der
Doku-Sweep von #567 blieb auf `.claude/` und `CLAUDE.md` beschränkt, das
Root-`README.md` nannte das mit [#464](https://github.com/jansinger/ostsee-tiere/issues/464)
entfernte Paket weiter als Form-Stack (Z. 38 und 215). Beide Zeilen sind jetzt
korrigiert. Verbleibende Treffer im Repo sind legitim: `CHANGELOG.md` dokumentiert
die Ablösung, `THIRD-PARTY-NOTICES.md` ist generiert.
