---
paths:
  - '**/*.svelte'
  - '**/*.svelte.ts'
---

# Svelte 5 — Vertiefende Patterns

Ergänzt `architecture.md` (immer geladen). Hier stehen die Patterns, die nur beim
Arbeiten an Komponenten und reaktiven Modulen relevant sind.

---

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

### Snippets — bevorzugtes Muster für neue Komponenten

`<slot />` funktioniert in Svelte 5 weiterhin (Compatibility Mode). Für **neue Komponenten** sind `{#snippet}` + `{@render}` das native Svelte-5-Muster und werden empfohlen. Bestehende Slot-Komponenten müssen nicht migriert werden.

```svelte
<!-- Button.svelte: children-Prop für Standard-Content -->
<script lang="ts">
	import type { Snippet } from 'svelte';
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
<svelte:head><title>{page.data.title}</title></svelte:head>
{#if navigating.to}<span>Lade...</span>{/if}
```

```typescript
// ❌ ALT: $app/stores (deprecated, wird in SvelteKit 3 entfernt)
import { page } from '$app/stores';
// $page.data — Store mit $-Prefix
```

**Migration:** `npx sv migrate app-state` migriert `.svelte`-Dateien automatisch.

---
