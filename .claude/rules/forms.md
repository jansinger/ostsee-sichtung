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

Das Hauptformular (`/src/routes/+page.svelte`) nutzt 4 Schritte:

1. **Position & Zeit** - Ort, Datum, Uhrzeit
2. **Sichtungsdetails** - Tierart, Anzahl, Entfernung
3. **Verhaltensbeobachtungen** - Optionale Details
4. **Kontaktdaten** - Beobachter-Information

### Struktur

```
src/
├── routes/+page.svelte                          # Multi-Step Container
└── lib/
    ├── form/validation/
    │   └── sightingSchema.ts                    # Yup Validation Schema
    ├── report/
    │   ├── components/
    │   │   ├── ModernReportForm.svelte           # Haupt-Formular
    │   │   ├── steps/                            # Step Components
    │   │   │   ├── Step1LocationTime.svelte      # Position & Zeit
    │   │   │   ├── Step2SightingDetails.svelte   # Details
    │   │   │   ├── Step3Observations.svelte      # Verhalten
    │   │   │   └── Step4Contact.svelte           # Kontakt
    │   │   ├── sections/                         # Wiederverwendbare Sections
    │   │   └── form/                             # Form Field Components
    │   └── formOptions/                          # Enum/Option Definitionen (16 Dateien)
    └── storage/
        └── localStorage.ts                       # GDPR-aware Browser Storage
```

---

## Validation mit Yup

Schema in `src/lib/form/validation/sightingSchema.ts`:

```typescript
import * as yup from 'yup';

export const sightingSchema = yup.object({
	// Pflichtfelder
	lat: yup.number().required('Position erforderlich').min(-90).max(90),
	lng: yup.number().required('Position erforderlich').min(-180).max(180),
	date: yup.string().required('Datum erforderlich'),
	species: yup.string().required('Tierart erforderlich'),
	count: yup.number().positive('Mindestens 1').integer().required(),

	// Optionale Felder
	behavior: yup.string().nullable(),
	notes: yup.string().nullable(),

	// Bedingte Felder
	isDead: yup.boolean(),
	deadCondition: yup.string().when('isDead', {
		is: true,
		then: (schema) => schema.required('Zustand erforderlich'),
		otherwise: (schema) => schema.nullable()
	})
});
```

---

## createForm Pattern (projekteigene Implementierung)

**Hinweis:** Das Projekt nutzt KEINE externe Form-Library. `src/lib/form/createForm.ts` ist eine eigene, schlanke Implementierung auf Basis von Svelte-Stores (`writable`/`derived`) + Yup. `$form`, `$errors`, `$touched`, `$isSubmitting`, `$isValid` sind Svelte-Stores und werden mit `$` abonniert.

- **`touched`** (`Record<string, boolean>`) wird von `handleChange`/`updateField` gesetzt und von `updateInitialValues` zurückgesetzt. Es steuert ausschließlich die Anzeige (grünes Häkchen nur an Feldern, die der Nutzer wirklich berührt hat) — nicht die Validierung.
- **Kein `validateField`**: Validiert wird beim Submit (`abortEarly: false`, sammelt alle Fehler) sowie schrittweise über `validateStep` (`src/lib/form/validation/stepValidation.ts`, nutzt `sightingSchema.pick(...)`). `updateField` löscht den Fehler des geänderten Feldes.
- **Fehler-Timing**: Fehler erscheinen erst nach einem gescheiterten „Weiter"-Versuch, nie beim Betreten eines Schritts (siehe `stepNavigationState.ts`).

API: `{ form, errors, isSubmitting, isValid, handleSubmit, handleChange, updateField, updateInitialValues }`

```svelte
<script lang="ts">
	import { createForm } from '$lib/form/createForm';
	import * as yup from 'yup';

	const { form, errors, isSubmitting, handleSubmit, updateField } = createForm({
		initialValues: {
			species: '',
			count: 1,
			date: ''
		},
		validationSchema: yup.object({
			species: yup.string().required(),
			count: yup.number().positive().required(),
			date: yup.string().required()
		}),
		onSubmit: async (values) => {
			await saveSighting(values);
		}
	});
</script>

<form onsubmit={handleSubmit}>
	<fieldset class="fieldset">
		<label class="label" for="species">Tierart</label>
		<input
			id="species"
			name="species"
			bind:value={$form.species}
			class="input w-full"
			class:input-error={$errors.species}
		/>
		{#if $errors.species}
			<p class="label text-error">{$errors.species}</p>
		{/if}
	</fieldset>
	<button class="btn btn-primary" disabled={$isSubmitting}>Absenden</button>
</form>
```

---

## Progressive Disclosure

Zeige Felder nur wenn relevant:

```svelte
{#if $form.isDead}
	<div class="space-y-4">
		<FormField name="deadCondition" label="Zustand des Tieres" />
		<FormField name="deadSex" label="Geschlecht" />
		<FormField name="deadSize" label="Größe (cm)" />
	</div>
{/if}

{#if $form.species === 'Schweinswal'}
	<FormField name="dorsal" label="Rückenflosse sichtbar?" type="checkbox" />
{/if}
```

---

## Step Navigation

```typescript
let currentStep = $state(1);

function canGoNext(): boolean {
	return isStepValid(currentStep, $form, $errors);
}

function nextStep() {
	if (canGoNext()) {
		currentStep++;
		focusFirstField();
	}
}

function prevStep() {
	if (currentStep > 1) {
		currentStep--;
	}
}
```

---

## Accessibility

### Labels und ARIA kommen aus der Feld-Pipeline

**Kein handgeschriebenes ARIA in Formular-Sections.** Felder laufen über `FormField` → `FieldRenderer`
(`src/lib/report/components/form/fields/`). Diese Pipeline erzeugt zentral: Label, Pflicht-Sternchen,
`aria-required`, `aria-describedby` (Hilfetext/Beschreibung/Fehler), `aria-invalid`, `role="alert"` an der
Fehlermeldung und `data-testid="field-<name>"` für E2E-Tests.

```svelte
<!-- Richtig: Label, Hilfetext, Fehler und ARIA kommen aus dem Schema-`meta` -->
<FormField name="species" />
```

Beschriftung, Hilfetext, Platzhalter, Icon und Feldtyp werden im Yup-Schema unter `.meta({...})` gepflegt,
nicht in der Komponente.

**Konditionale Pflichtfelder:** `FieldRenderer` leitet `required` aus der statischen Schema-Beschreibung ab —
ein Yup-`when()` ist dort nicht sichtbar. Für Felder, die nur unter Bedingungen Pflicht sind, den
`required`-Override setzen, damit Sternchen und `aria-required` mit der Validierung übereinstimmen:

```svelte
<FormField name="waterway" required={$form.hasPosition !== true} />
```

### Keyboard Navigation

- Tab durch alle Felder
- Enter für Absenden
- Escape für Abbrechen

---

## Mobile-First

### Touch Targets

```css
.form-field input,
.form-field select {
	min-height: 48px;
	font-size: 16px; /* Verhindert iOS Zoom */
}
```

### Input Types

```svelte
<input type="date" name="date" />
<input type="time" name="time" />
<input type="tel" name="phone" />
<input type="email" name="email" />
<input type="number" name="count" inputmode="numeric" />
```

---

## Auto-Save

```typescript
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '$lib/storage/localStorage';

// Auto-Save via $effect (reaktiv)
$effect(() => {
	saveToStorage(STORAGE_KEYS.FORM_DATA, $form);
});

// Beim Laden wiederherstellen
const savedData = loadFromStorage(STORAGE_KEYS.FORM_DATA, null);
if (savedData) {
	Object.assign($form, savedData);
}
```

**Hinweis:** Nutze immer `saveToStorage`/`loadFromStorage` aus `$lib/storage/localStorage` statt direktem `localStorage`-Zugriff. Siehe `.claude/rules/browser-storage.md` für GDPR-Details.

---

## Best Practices

### Do's

- Pflichtfelder mit \* markieren
- Inline-Validierung erst nach Blur
- Hilfreiche Fehlermeldungen auf Deutsch
- Progress-Indicator für Steps

### Don'ts

- Keine Validierung bei Focus
- Keine technischen Fehlermeldungen
- Keine zu langen Formulare pro Step (max 5-6 Felder)
