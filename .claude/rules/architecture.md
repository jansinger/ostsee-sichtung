# Architektur & Clean Code

Diese Regeln gelten für **jede** Code-Änderung im Projekt.

---

## Technology Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | SvelteKit 5 mit TypeScript |
| Datenbank | PostgreSQL + PostGIS |
| ORM | Drizzle (type-safe) |
| Styling | TailwindCSS + DaisyUI (Theme: `meeresmuseum`) |
| Karten | OpenLayers |
| Forms | svelte-forms-lib + Yup |
| Logging | Pino |
| Icons | unplugin-icons (lucide) |

---

## Projektstruktur

```
src/
├── lib/
│   ├── components/      # Wiederverwendbare UI-Komponenten
│   ├── constants/       # Enums, Konstanten (Tierarten, etc.)
│   ├── map/             # OpenLayers Funktionalität
│   ├── server/db/       # Schema, Repository Layer
│   ├── types/           # TypeScript Definitionen
│   ├── form/            # Form Utilities
│   ├── export/          # Daten-Export
│   ├── formState.ts     # Form State Management
│   └── sightingSchema.ts # Yup Validation Schema
└── routes/
    ├── api/             # Backend API Endpoints
    ├── map/             # Karten-Visualisierung
    ├── sichtungen/      # Sichtungs-Management
    └── components/      # Route-spezifische Komponenten
        ├── steps/       # Form Step Components
        └── conditional/ # Conditional Form Components
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

| Element | Konvention | Beispiel |
|---------|------------|----------|
| Components | PascalCase | `MediaGallery.svelte` |
| Funktionen | camelCase | `loadSightingFiles` |
| Konstanten | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase | `SightingFormData` |

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

### `.svelte.ts` Dateien für Shared State

```typescript
// stores/counter.svelte.ts - Reaktiver State außerhalb von Komponenten
export function createCounter(initial = 0) {
    let count = $state(initial);
    return {
        get value() { return count; },
        increment() { count++; },
        decrement() { count--; }
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
<i class="wi wi-day-sunny"></i>
<i class="wi wi-wind towards-n"></i>
```

---

## Context7 - IMMER verwenden

Vor der Arbeit mit Libraries context7 MCP Server nutzen für:
- DaisyUI v5 Patterns
- Svelte 5 Best Practices
- SvelteKit Routing
- Drizzle ORM Patterns
- OpenLayers Integration
