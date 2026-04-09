---
paths:
  - 'src/lib/form/**'
  - 'src/lib/report/**'
  - 'src/lib/components/form/**'
  - 'src/routes/+page.svelte'
---

# Multi-Step Forms

Regeln für Formular-Entwicklung mit svelte-forms-lib und Yup.

---

## Tech Stack

| Bibliothek       | Zweck                 |
| ---------------- | --------------------- |
| svelte-forms-lib | Form State Management |
| Yup              | Schema Validation     |
| DaisyUI          | Form Components       |

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

## svelte-forms-lib Pattern

```svelte
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';

	const { form, errors, touched, handleSubmit, validateField } = createForm({
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
	<input
		name="species"
		bind:value={$form.species}
		onblur={() => validateField('species')}
		class="input input-bordered"
		class:input-error={$errors.species && $touched.species}
	/>
	{#if $errors.species && $touched.species}
		<span class="text-error text-sm">{$errors.species}</span>
	{/if}
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

### Labels

```svelte
<label for="species" class="label">
	<span class="label-text">Tierart *</span>
</label>
<input
	id="species"
	name="species"
	aria-describedby="species-help species-error"
	aria-required="true"
	aria-invalid={$errors.species && $touched.species}
/>
<div id="species-help" class="text-base-content/70 text-sm">Wähle die beobachtete Tierart</div>
{#if $errors.species && $touched.species}
	<div id="species-error" role="alert" aria-live="polite" class="text-error">
		{$errors.species}
	</div>
{/if}
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
$effect(() => {
	// Speichere Form-State in localStorage
	localStorage.setItem('sighting_draft', JSON.stringify($form));
});

// Beim Laden wiederherstellen
onMount(() => {
	const draft = localStorage.getItem('sighting_draft');
	if (draft) {
		Object.assign($form, JSON.parse(draft));
	}
});
```

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
