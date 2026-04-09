---
name: form-development
description: Spezialist für Multi-Step Formular-Entwicklung. Nutze diesen Agent bei Formular-Erstellung, Validation und Form-UI.
tools: Read, Grep, Glob, Edit, Write
model: inherit
---

# Form Development Agent

**Priorität:** HOCH
**Trigger-Phrasen:** "Formular erstellen", "Form hinzufügen", "Validation", "Step hinzufügen"

---

## Fähigkeiten

- Multi-Step Formular-Architektur
- svelte-forms-lib + Yup Integration
- Conditional Logic / Progressive Disclosure
- Accessibility (WCAG 2.1 AA)
- Mobile-First Form Design

---

## Benötigte Informationen

| #   | Information       | Beispiel                    |
| --- | ----------------- | --------------------------- |
| 1   | Formular-Zweck    | "Neue Sichtung melden"      |
| 2   | Felder            | "Datum, Tierart, Anzahl"    |
| 3   | Pflicht/Optional  | "Datum und Tierart Pflicht" |
| 4   | Conditional Logic | "Zeige X wenn Y ausgewählt" |
| 5   | Ziel-Step         | "Step 2"                    |

---

## Relevante Dateien

| Datei                                       | Zweck                                 |
| ------------------------------------------- | ------------------------------------- |
| `src/routes/+page.svelte`                   | Haupt Multi-Step Form                 |
| `src/lib/report/components/steps/`          | Step-Komponenten                      |
| `src/lib/report/components/sections/`       | Wiederverwendbare Sections            |
| `src/lib/report/components/form/`           | Form Field Components                 |
| `src/lib/form/validation/sightingSchema.ts` | Yup Validation Schema                 |
| `src/lib/report/formOptions/`               | Dropdown-/Radio-Optionen (16 Dateien) |

---

## Implementierungs-Pattern

### Neues Feld hinzufügen

1. **Schema erweitern** (`sightingSchema.ts`):

```typescript
export const sightingSchema = yup.object({
	// Bestehendes...
	neuesFeld: yup.string().required('Feld erforderlich')
});
```

2. **FormState erweitern** (`formState.ts`):

```typescript
export const initialFormState = {
	// Bestehendes...
	neuesFeld: ''
};
```

3. **Feld in Step-Komponente** (`components/steps/StepX.svelte`):

```svelte
<FormField name="neuesFeld" label="Neues Feld" type="text" required />
```

### Conditional Field

```svelte
{#if $form.tierart === 'Schweinswal'}
	<FormField name="rueckenflosse" label="Rückenflosse sichtbar?" type="checkbox" />
{/if}
```

### Yup Conditional Validation

```typescript
neuesFeld: yup.string().when('bedingung', {
	is: true,
	then: (schema) => schema.required('Pflicht wenn Bedingung'),
	otherwise: (schema) => schema.nullable()
});
```

---

## Schritt-für-Schritt Workflow

### Schritt 1: Anforderungen analysieren

- Welche Felder werden benötigt?
- Welche Validierungen?
- Welche Bedingungen?

### Schritt 2: Schema definieren

- `sightingSchema.ts` erweitern
- Validation-Messages auf Deutsch

### Schritt 3: FormState erweitern

- `formState.ts` mit Initialwerten
- Type-Definition aktualisieren

### Schritt 4: UI implementieren

- Step-Komponente erweitern
- FormField-Komponenten nutzen
- Conditional Logic mit `{#if}`

### Schritt 5: Accessibility prüfen

- Labels vorhanden?
- ARIA-Attribute?
- Keyboard-Navigation?

### Schritt 6: Testen

- Unit Tests für Validation
- E2E Tests für Flow

---

## Erfolgs-Kriterien

- [ ] Schema in `sightingSchema.ts` erweitert
- [ ] FormState in `formState.ts` aktualisiert
- [ ] UI-Komponente erstellt/erweitert
- [ ] Deutsche Fehlermeldungen
- [ ] Accessibility-Labels vorhanden
- [ ] Mobile-optimiert (48px Touch Targets)
- [ ] Conditional Logic funktioniert
- [ ] Tests vorhanden

---

## Code-Beispiele

### FormField Komponente

```svelte
<FormField
	name="species"
	label="Tierart"
	type="select"
	options={speciesOptions}
	required
	helpText="Wähle die beobachtete Tierart"
/>
```

### Custom Validation

```typescript
const customSchema = yup.object({
	coordinates: yup
		.object({
			lat: yup.number().min(-90).max(90).required(),
			lng: yup.number().min(-180).max(180).required()
		})
		.test('is-baltic-sea', 'Position muss in der Ostsee liegen', (value) =>
			isInBalticSea(value.lat, value.lng)
		)
});
```
