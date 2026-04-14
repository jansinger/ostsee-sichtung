# Architektur & Clean Code

Diese Regeln gelten für **jede** Code-Änderung im Projekt.

---

## Technology Stack

| Bereich   | Technologie                                   |
| --------- | --------------------------------------------- |
| Framework | SvelteKit 5 mit TypeScript                    |
| Datenbank | PostgreSQL + PostGIS                          |
| ORM       | Drizzle (type-safe)                           |
| Styling   | TailwindCSS + DaisyUI (Theme: `meeresmuseum`) |
| Karten    | OpenLayers                                    |
| Forms     | svelte-forms-lib + Yup                        |
| Logging   | Pino                                          |
| Icons     | unplugin-icons (lucide)                       |

---

## Projektstruktur

```
src/
├── lib/
│   ├── components/          # Wiederverwendbare UI-Komponenten
│   │   └── map/             # Karten-Komponenten (OLMap.svelte etc.)
│   ├── constants/           # Enums, Konstanten
│   ├── form/validation/     # Yup Validation Schema
│   ├── legacy-api/          # Legacy API Utilities (Field Mapping, Validation)
│   ├── map/                 # OpenLayers Controller & Utilities
│   ├── report/              # Sichtungsmeldung
│   │   ├── components/      # Form Steps, Sections, Fields
│   │   └── formOptions/     # Enum/Option Definitionen (16 Dateien)
│   ├── server/
│   │   ├── auth/            # JWT/Auth0 Authentication
│   │   ├── db/              # Schema, Repository Layer
│   │   ├── export/          # CSV, JSON, KML, XML Export
│   │   ├── geo/             # Baltic Sea Validation
│   │   ├── middleware/       # Security Headers, Rate Limit, Maintenance
│   │   ├── services/        # Email, Weather Services
│   │   └── storage/         # File Storage (Local, Vercel Blob)
│   ├── storage/             # Browser Storage (GDPR-aware)
│   └── types/               # TypeScript Definitionen
├── routes/
│   ├── admin/               # Admin-Interface
│   ├── api/                 # Backend API Endpoints
│   ├── map/                 # Karten-Visualisierung
│   ├── rest_sichtungen/     # Legacy REST API
│   └── sichtungen/          # Legacy Sichtungs-API
└── hooks.server.ts          # Middleware Chain (sequence)
e2e/                         # E2E Tests (Root-Level)
```

---

## Clean Code Prinzipien

### SOLID Grundlagen

- **DRY**: Wiederverwendbare Logik in Utility-Funktionen extrahieren
- **Single Responsibility**: Eine Funktion = ein Zweck
- **KISS**: Einfache Lösungen bevorzugen
- **YAGNI**: Keine Funktionen "auf Vorrat"

### TypeScript Standards

- **Keine `any` Typen** - immer typisieren
- **Explizite Return Types** für Funktionen
- **Type Guards** für Runtime-Sicherheit
- **Pure Functions** wo möglich

### Namenskonventionen

| Element          | Konvention       | Beispiel              |
| ---------------- | ---------------- | --------------------- |
| Components       | PascalCase       | `MediaGallery.svelte` |
| Funktionen       | camelCase        | `loadSightingFiles`   |
| Konstanten       | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`       |
| Types/Interfaces | PascalCase       | `SightingFormData`    |

---

## Svelte 5 Runes - PFLICHT

```typescript
// State
let count = $state(0);
let user = $state({ name: 'Max' });

// Derived - für berechnete Werte (pure, returns value)
let doubled = $derived(count * 2);
let fullName = $derived.by(() => `${user.firstName} ${user.lastName}`);

// Effects - für Side Effects (impure, no return value)
$effect(() => {
	console.log('Count changed:', count);
	return () => cleanup();
});

// Props
let { items, onSelect }: Props = $props();
```

### Event Handling

```svelte
<!-- Svelte 5 -->
<button onclick={handleClick}>Klick</button>

<!-- NICHT Svelte 4 -->
<button on:click={handleClick}>Klick</button>
```

### SSR-sicheres State Management

**KRITISCH:** Globaler `$state` auf dem Server führt zu Datenlecks zwischen Usern!

```typescript
// ❌ FALSCH - Shared State auf Server
// globals.svelte.ts
export const userState = $state({ name: '' }); // Leakt zwischen Requests!

// ✅ RICHTIG - Context API für SSR
// +layout.svelte
import { setContext } from 'svelte';
const state = $state({ name: '' });
setContext('app-state', state);

// Komponente
import { getContext } from 'svelte';
const state = getContext('app-state');
```

### `$bindable()` — Two-Way-Binding

Standardmäßig fließt Reaktivität nur **in** eine Komponente. Mit `$bindable()` kann der Elternteil auf Änderungen reagieren:

```typescript
// Kind-Komponente: Prop als bindable markieren
let { value = $bindable(''), oninput }: Props = $props();
```

```svelte
<!-- Elternteil: bind: verwenden -->
<InputField bind:value={formValue} />
```

**Wann verwenden:** Formular-Felder, Toggle-States — alles wo der Parent auf interne Änderungen reagieren muss.
**Nicht übertreiben:** Meist reicht ein `onchange`-Callback. `$bindable` nur wenn echtes Two-Way-Binding nötig ist.

---

### Snippets — Svelte 5 Ersatz für Slots

`<slot />` ist in Svelte 5 deprecated. Ersatz: `{#snippet}` + `{@render}`.

```svelte
<!-- Button.svelte: children-Prop für Standard-Content -->
<script lang="ts">
	let { children, onclick }: { children: Snippet; onclick?: () => void } = $props();
</script>

<button {onclick}>{@render children?.()}</button>

<!-- Verwendung -->
<Button onclick={save}>Speichern</Button>
```

```svelte
<!-- Card.svelte: Named Snippets für mehrere Slot-Bereiche -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	let { header, children }: { header: Snippet; children?: Snippet } = $props();
</script>

<div class="card">
	<div class="card-header">{@render header()}</div>
	<div class="card-body">{@render children?.()}</div>
</div>

<!-- Verwendung -->
<Card>
	{#snippet header()}<h2>Titel</h2>{/snippet}
	<p>Inhalt</p>
</Card>
```

**Regel:** `{@render name?.()}` mit optionalem Chaining wenn Snippet nicht zwingend übergeben wird.

---

### `.svelte.ts` Dateien für Shared State

```typescript
// stores/counter.svelte.ts - Reaktiver State außerhalb von Komponenten
export function createCounter(initial = 0) {
	let count = $state(initial);
	return {
		get value() {
			return count;
		},
		increment() {
			count++;
		},
		decrement() {
			count--;
		}
	};
}
```

### $effect Best Practices

```typescript
// ✅ GUT - Ein Effect, eine Aufgabe
$effect(() => {
	localStorage.setItem('count', count.toString());
});

// ✅ Browser-only Code absichern
$effect(() => {
	if (typeof window === 'undefined') return;
	// Browser-only logic
});

// ❌ SCHLECHT - Zu viel in einem Effect
$effect(() => {
	fetchData();
	updateDOM();
	saveToStorage();
});
```

---

## SvelteKit 2 — `$app/state`

Ab SvelteKit 2.12 ist `$app/stores` **deprecated**. Stattdessen `$app/state` verwenden:

```svelte
<script>
	// ✅ NEU: $app/state (SvelteKit 2.12+)
	import { page, navigating, updated } from '$app/state';
</script>

<!-- Zugriff ohne $-Prefix (kein Svelte-Store, sondern reaktives Objekt) -->
<title>{page.data.title}</title>
{#if navigating.to}<span>Lade...</span>{/if}
```

```typescript
// ❌ ALT: $app/stores (deprecated, wird in SvelteKit 3 entfernt)
import { page } from '$app/stores';
// $page.data — Store mit $-Prefix
```

**Migration:** `npx sv migrate app-state` migriert `.svelte`-Dateien automatisch.

---

## TypeScript 5.x — `satisfies`

Der `satisfies`-Operator prüft den Typ, ohne ihn zu widening — nützlich für Drizzle-Configs und Yup-Schemas:

```typescript
// satisfies: Typ prüfen, aber literal types behalten
const windDirections = ['N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'] satisfies string[];
// windDirections ist string[], NICHT ('N' | 'NW' | ...)[] — für Vergleiche

// Drizzle Insert-Objekte typsicher machen
const newSighting = {
	species: 0,
	totalCount: 1,
	sightingDate: new Date()
} satisfies typeof sightings.$inferInsert;
// → TypeScript-Fehler wenn Feld nicht im Schema, OHNE Typ zu weiten
```

---

## Imports

Immer `$lib` mit vollständigen Pfaden verwenden:

```typescript
// Korrekt
import { formatDate } from '$lib/utils/date';
import { sightingSchema } from '$lib/sightingSchema';

// Falsch
import { formatDate } from '../../../lib/utils/date';
```

---

## Accessibility (WCAG 2.1 AA)

- Alle interaktiven Elemente mit Keyboard bedienbar
- Aussagekräftige Labels für Form-Elemente
- ARIA-Attribute wo nötig
- Farbkontrast mindestens 4.5:1
- Focus-States sichtbar

---

## Icons

### unplugin-icons (Standard)

```svelte
<script>
	import MapPin from '~icons/lucide/map-pin';
	import Calendar from '~icons/lucide/calendar';
</script>

<MapPin width="20" height="20" class="text-primary" />
```

### Weather Icons (CSS-basiert)

```html
<i class="wi wi-day-sunny"></i> <i class="wi wi-wind towards-n"></i>
```

---

## Context7 - IMMER verwenden

Vor der Arbeit mit Libraries context7 MCP Server nutzen für:

- DaisyUI v5 Patterns
- Svelte 5 Best Practices
- SvelteKit Routing
- Drizzle ORM Patterns
- OpenLayers Integration
