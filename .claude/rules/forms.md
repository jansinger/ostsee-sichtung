---
paths:
  - 'src/lib/form/**'
  - 'src/lib/report/**'
  - 'src/lib/components/form/**'
  - 'src/routes/+page.svelte'
---

# Multi-Step Forms

Regeln für Formular-Entwicklung mit der projekteigenen `createForm`-Implementierung und Yup.

---

## Tech Stack

| Bibliothek                                  | Zweck                                      |
| ------------------------------------------- | ------------------------------------------ |
| `createForm` (`src/lib/form/createForm.ts`) | Form State Management (svelte/store + Yup) |
| Yup                                         | Schema Validation                          |
| DaisyUI                                     | Form Components                            |

---

## Multi-Step Architektur

Das Hauptformular (`/src/routes/+page.svelte`) nutzt 4 Schritte. Titel, Beschreibung und
die validierten Felder jedes Schritts stehen ausschließlich in `formStepsConfig`
(`src/lib/report/formConfig.ts`) — dort ändern, nicht hier:

| Index | Titel            | Inhalt                      |
| ----- | ---------------- | --------------------------- |
| `0`   | Position & Zeit  | Ort, Datum, Uhrzeit         |
| `1`   | Sichtungsdetails | Tierart, Anzahl, Entfernung |
| `2`   | Beobachtungen    | Optionale Details           |
| `3`   | Kontaktdaten     | Beobachter-Information      |

### Struktur

```
src/
├── routes/+page.svelte                           # Seiten-Container
└── lib/
    ├── form/
    │   ├── createForm.ts                         # Store-basierte Form-Impl.
    │   └── validation/
    │       ├── sightingSchema.ts                 # Yup Schema — Validierung + Feld-Meta
    │       ├── stepValidation.ts                 # isStepValid / validateStep
    │       └── stepNavigation.ts                 # Schritt-Erreichbarkeit
    ├── report/
    │   ├── formConfig.ts                         # formStepsConfig, initialFormState
    │   ├── formContext.ts                        # set/getFormContext
    │   ├── components/
    │   │   ├── ModernReportForm.svelte           # Haupt-Formular, hält currentStep
    │   │   ├── steps/                            # Step1…Step4 (Komposition)
    │   │   ├── sections/                         # Wiederverwendbare Sections
    │   │   └── form/
    │   │       ├── Form.svelte                   # createForm + setFormContext
    │   │       ├── StepNavigation.svelte         # Zurück/Weiter/Absenden
    │   │       └── fields/                       # FormField, FieldRenderer, Base*
    │   └── formOptions/                          # Enum/Option Definitionen (16 Dateien)
    └── storage/
        └── localStorage.ts                       # GDPR-aware Browser Storage
```

---

## Validation mit Yup

**Single Source of Truth: `src/lib/form/validation/sightingSchema.ts`.** Das Schema ist
nicht nur Validierung — es trägt über `.label()` und `.meta({ type, options, helpText,
icon, … })` auch die komplette Feld-Darstellung. `formConfig.ts` liest es per
`sightingSchema.describe()` aus und leitet daraus `initialFormState` und
`sightingSchemaFields` ab.

Konsequenz: **Ein neues Feld entsteht im Schema, nicht in einer Komponente.** Label,
Typ, Options und Hilfetext gehören in `.meta()`, nicht ins Markup.

### Feldnamen — keine Abkürzungen

Die Schema-Feldnamen sind ausgeschrieben und wandern unverändert durch
`formStepsConfig`, `FormField name={…}` und `data-testid="field-<name>"`. Verwechslungen
sind die häufigste Fehlerquelle:

| Richtig                         | Falsch (existiert nicht) |
| ------------------------------- | ------------------------ |
| `latitude` / `longitude`        | `lat` / `lng`            |
| `sightingDate` / `sightingTime` | `date` / `time`          |
| `totalCount`                    | `count`                  |

`species` ist eine **Zahl** (Artcode, `.default(0)`), kein String — siehe
`isValidSpecies` und `getSpeciesOptions` in `src/lib/report/formOptions/`.

Bedingte Pflichtfelder über `yup.when(...)` — Beispiel `deadCondition` abhängig von
`isDead` im Schema.

---

## createForm Pattern (projekteigene Implementierung)

**Hinweis:** Das Projekt nutzt KEINE externe Form-Library. `src/lib/form/createForm.ts` ist eine eigene, schlanke Implementierung auf Basis von Svelte-Stores (`writable`/`derived`) + Yup. `$form`, `$errors`, `$isSubmitting`, `$isValid` sind Svelte-Stores und werden mit `$` abonniert.

API — vollständig, das ist alles was `createForm` zurückgibt:

`{ form, errors, isSubmitting, isValid, handleSubmit, handleChange, updateField, updateInitialValues }`

Was es bewusst **nicht** gibt:

| Fehlt           | Konsequenz                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `touched`       | Kein Blur-Tracking. Feld-Zustände leiten sich aus Wert und Fehler ab — siehe Accessibility.            |
| `validateField` | Einzelfeld-Validierung existiert nicht. Pro Schritt validiert `stepValidation.ts`, nicht `createForm`. |
| `reset`         | Zurücksetzen läuft über `updateInitialValues(...)`.                                                    |

`updateField` schreibt den Wert und **löscht den Fehler des geänderten Feldes** — Fehler
verschwinden also beim Tippen, nicht beim Blur. `handleChange` fällt auf `target.id`
zurück, wenn kein `name` gesetzt ist (nötig für die Lat/Lon-Inputs in `LocationInput`).

`isValid` ist `Object.keys($errors).length === 0` — also **„keine Fehler bekannt"**, nicht
„Schema erfüllt". Direkt nach dem Laden ist `$errors` leer und `$isValid` damit `true`,
obwohl noch nichts ausgefüllt wurde. Für Navigations-Gates deshalb `isStepValid` /
`validateStep` verwenden, nie `$isValid`.

### Nicht direkt aufrufen — der Context-Weg

Im Sichtungsformular ruft **keine** Komponente `createForm` selbst auf. Das macht
genau eine Stelle:

`Form.svelte` → `createForm(...)` + `mediaStore` → `setFormContext(...)`
→ `FormField` liest per `getFormContext()`

| Datei                                                    | Rolle                                                                    |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/report/components/form/Form.svelte`             | Einziger `createForm`-Aufruf; setzt Context, rendert `<form>` + Honeypot |
| `src/lib/report/formContext.ts`                          | `setFormContext` / `getFormContext` (Symbol-Key)                         |
| `src/lib/report/components/form/fields/FormField.svelte` | Holt `form`, `errors`, `handleChange` aus dem Context                    |

Eine Feld-Komponente braucht deshalb nur `<FormField name="species" />` — Wert, Fehler
und `onchange` kommen aus dem Context. `FormField` **wirft**, wenn es außerhalb von
`<Form>` verwendet wird.

---

## Validierung — drei Ebenen

Validiert wird an drei klar getrennten Stellen. Wer nur eine davon kennt, sucht Fehler an
der falschen Stelle:

| Ebene           | Wo                                          | Wann                                | Wirkung                                                      |
| --------------- | ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| **Pro Schritt** | `src/lib/form/validation/stepValidation.ts` | reaktiv, bei jeder Formularänderung | Gate für „Weiter"; blockiert Navigation                      |
| **Pre-Submit**  | `ModernReportForm.handleFinalSubmit`        | einmal beim Absenden                | **nur Logging** der fehlschlagenden Felder                   |
| **Submit**      | `createForm.handleSubmit`                   | beim Absenden                       | maßgeblich — setzt `$errors`, ruft `onSubmit` nur bei Erfolg |

**Pro Schritt:** `isStepValid(currentStep, formData)` und
`validateStep(currentStep, formData)` validieren über
`sightingSchema.pick(formStepsConfig[currentStep].fields)`. Beide nehmen **zwei**
Argumente — die Formulardaten, nicht `$errors`. `isStepValid` mutiert nichts und ist für
reaktive Kontexte gedacht; `validateStep` liefert zusätzlich die Fehler-Map.

**Pre-Submit:** Die Vorab-Prüfung in `handleFinalSubmit` validiert das **vollständige**
Schema mit `abortEarly: false` und schreibt die Ergebnisse ins Log.

> **Achtung:** Diese Stufe blockiert nichts. Die Log-Zeile lautet „submission blocked",
> danach läuft `formContext.handleSubmit(e)` trotzdem. Blockiert wird erst in Ebene 3.
> Wer die Meldung im Log sieht, hat einen Bug im Step-Gating gefunden — nicht einen
> abgewiesenen Submit.

**Submit:** `handleSubmit` validiert erneut gegen das ganze Schema (`abortEarly: false`,
sammelt alle Fehler in `$errors`) und nutzt das **transformierte** Ergebnis von
`.validate()` für `onSubmit` — Yup-`.transform()`-Regeln greifen also nur hier. Nicht-Yup-Fehler
aus `onSubmit` werden weitergeworfen, damit Aufrufer Feedback zeigen können.

---

## Progressive Disclosure

Zeige Felder nur wenn relevant — Bedingung gegen `$form` aus dem Context:

```svelte
{#if $form.isDead}
	<FormField name="deadCondition" />
	<FormField name="deadSex" />
	<FormField name="deadSize" />
{/if}
```

Echtes Beispiel: `src/lib/report/components/sections/AnimalInfo.svelte` (Totfund-Felder),
`sections/PositionAndTime.svelte` (Anzeige erst wenn `latitude` **und** `longitude` gesetzt).

`FormField` bekommt **kein** `label`- und kein `type`-Prop — beides kommt aus `.meta()` im
Schema. Übergeben werden nur `name`, optional `disabled`, `size`, `variant`.

Bei `species` gegen den **Artcode** vergleichen, nicht gegen einen Namen
(`$form.species === 'Schweinswal'` ist immer `false`). Codes und Helper liegen in
`src/lib/report/formOptions/`.

---

## Step Navigation

**`currentStep` ist 0-basiert.** Schritt 1 der UI ist Index `0`; `formStepsConfig` wird
direkt damit indiziert. Die Navigation ist fertig implementiert in
`src/lib/report/components/form/StepNavigation.svelte` — nicht nachbauen:

| Ausdruck                                     | Bedeutung                                  |
| -------------------------------------------- | ------------------------------------------ |
| `currentStep = $bindable(0)`                 | Startwert, per `bind:` vom Parent gehalten |
| `isFirstStep = currentStep <= 0`             | „Zurück" deaktiviert                       |
| `isLastStep = currentStep >= totalSteps - 1` | „Weiter" wird zu „Absenden"                |
| `formStepsConfig[currentStep]`               | Direkter Index — **kein** `- 1`            |
| `Schritt ${currentStep + 1}`                 | Nur für die **Anzeige** wird +1 gerechnet  |

`ModernReportForm.svelte` hält den State (`$state(loadFromStorage(STORAGE_KEYS.CURRENT_STEP, 0))`),
persistiert ihn per `$effect` und setzt bei Reset auf `0` zurück.

Bei ungültigem Schritt zeigt `StepNavigation` einen Inline-`alert-warning`, einen Toast und
scrollt per `scrollToFirstError` zum ersten Fehlerfeld — die Feldreihenfolge stammt aus
`formStepsConfig[currentStep].fields`.

---

## Accessibility

**ARIA-Markup wird zentral erzeugt — nicht in Feld-Komponenten wiederholen.**
`FieldRenderer.svelte` ist die einzige Stelle, die Label und ARIA-Attribute baut. Wer
Label, `aria-*` oder Fehlerausgabe von Hand schreibt, erzeugt Duplikate und driftet ab.

Der Weg: `FormField` (Context, Wert + Fehler) → `FieldRenderer` (Markup + ARIA) →
`BaseInput` / `BaseSelect` / `BaseTextarea` / `BaseRadio` / `BaseCheckbox` / `BaseToggle`.

Was `FieldRenderer` automatisch liefert:

| Element            | Herkunft / Regel                                                            |
| ------------------ | --------------------------------------------------------------------------- |
| Label-Text         | `.label()` aus dem Schema                                                   |
| Pflichtfeld-`*`    | `fieldConfig.optional === false`, mit `aria-label="Pflichtfeld"`            |
| `aria-required`    | dito                                                                        |
| `aria-invalid`     | `hasError`                                                                  |
| `aria-describedby` | zusammengesetzt aus Help-, Description- und Error-ID — nur existierende IDs |
| Fehlerausgabe      | `role="alert"` + `aria-live="polite"` + Icon                                |
| `data-testid`      | `field-<name>` (Basis der E2E-Selektoren)                                   |
| IDs                | `field-<name>` sowie `-help` / `-error` / `-desc`                           |

Statt-Indikator (Häkchen/Kreuz neben dem Label) hängt an `hasValue` und `hasError`,
**nicht** an `touched` — das gibt es nicht (siehe `createForm`-Abschnitt). Der grüne Haken
erscheint also sobald ein gültiger Wert vorliegt, nicht erst nach Blur. Der Indikator ist
`aria-hidden` — die Information steckt in `aria-invalid` und der Fehlermeldung.

Drei Markup-Varianten wählt `FieldRenderer` selbst, damit kein `label[for]` ins Leere zeigt:

- **Radiogruppe** (`radio` + Options) → `<fieldset>` + `<legend>`
- **Checkbox / Toggle** → Control rendert sein eigenes Label, kein zusätzliches Caption-Label
- **alles andere** → `<label for={fieldId}>`

Neue Feldtypen gehören deshalb in `FieldRenderer` + eine `Base*`-Komponente, nicht in eine
Step- oder Section-Datei.

### Keyboard Navigation

- Tab durch alle Felder
- Enter für Absenden
- Escape für Abbrechen
- Schrittwechsel setzt den Fokus auf die Schritt-Überschrift (`scrollAndFocusStep` in
  `StepNavigation.svelte`) — damit Screenreader den neuen Schritt ansagen

---

## Mobile-First

### Touch Targets & Schriftgröße

Größen kommen aus den DaisyUI-Komponentenklassen (`input`, `select`, `textarea`) und dem
Theme in `src/app.css` — **es gibt keine projekteigene Feld-Wrapper-Klasse.**

> **Achtung:** Eine Klasse `.form-field` existiert im Projekt nicht. Ältere Anleitungen mit
> `.form-field input { min-height: 48px }` beschreiben Code, den es nie gab — solche Regeln
> nicht „wiederherstellen". Der Wrapper, den `FieldRenderer` rendert, heißt `fieldset`
> (DaisyUI), das Feld selbst trägt `data-field="<name>"` über `FormField`.

Das einzige feldbezogene Größen-Override in `app.css` betrifft den iframe-Modus
(`.iframe-mode .input/.select/.textarea { font-size: 1rem }`) und hält dort die 16px-Grenze
gegen iOS-Auto-Zoom. Details und die übrigen bewussten Overrides:
`.claude/rules/daisyui.md`.

Wer Touch-Ziele oder Schriftgrößen ändern will, ändert Theme bzw. `app.css` — nicht einzelne
Komponenten.

### Input Types

Der Input-Typ wird **nicht** im Markup gesetzt, sondern über `.meta({ type })` im Schema;
`FieldRenderer` normalisiert ihn (`string` → `text`, `boolean` → `toggle`) und wählt die
`Base*`-Komponente. Unterstützt: `text`, `email`, `tel`, `number`, `url`, `password`,
`date`, `time`, `select`, `radio`, `checkbox`, `toggle`, `textarea`.

---

## Auto-Save

Implementiert in `ModernReportForm.svelte` über zwei getrennte `$effect`s — Formulardaten
(`STORAGE_KEYS.FORM_DATA`) und Schritt (`STORAGE_KEYS.CURRENT_STEP`). Die Trennung ist
Absicht: ein gemeinsamer Effect würde bei jedem Schrittwechsel doppelt feuern.

Wiederhergestellt wird beim Initialisieren — `loadFromStorage(STORAGE_KEYS.CURRENT_STEP, 0)`
für den Schritt, die Formulardaten über `initialValues` von `<Form>`.

**Hinweis:** Nutze immer `saveToStorage`/`loadFromStorage` aus `$lib/storage/localStorage` statt direktem `localStorage`-Zugriff. Siehe `.claude/rules/browser-storage.md` für GDPR-Details.

Kontaktdaten werden separat behandelt (`USER_CONTACT_FIELDS` in `formConfig.ts`), damit
`clearFormDataOnly()` die Sichtung leeren kann, ohne die gespeicherten Beobachterdaten zu
verlieren.

---

## Best Practices

### Do's

- Pflichtfelder mit \* markieren — passiert automatisch über `FieldRenderer`
- Fehlermeldungen auf Deutsch, im Schema am Validator hinterlegen (`.required('…')`)
- Neue Felder im Schema anlegen (`.label()` + `.meta()`), nicht im Markup
- Progress-Indicator für Steps (`FormSteps.svelte`)

### Don'ts

- Keine technischen Fehlermeldungen
- Keine zu langen Formulare pro Step (max 5-6 Felder)
- Kein Label-/ARIA-Markup von Hand — das erzeugt `FieldRenderer`
- Kein `$isValid` als Navigations-Gate — `isStepValid` / `validateStep` verwenden
- Kein `touched`/Blur-Gating erfinden: `createForm` trackt keinen Blur-Zustand. Fehler
  erscheinen wenn eine Validierungsebene sie setzt, und verschwinden bei der nächsten
  Änderung des Feldes.
