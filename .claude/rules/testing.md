# Testing Patterns

Regeln für Unit Tests (Vitest) und E2E Tests (Playwright).

---

## Test-First Entwicklung - PFLICHT

**Bei allen Code-Änderungen gilt Test-First (TDD):**

### Workflow für neue Features

```
1. Test schreiben (RED)     → Test schlägt fehl
2. Code implementieren      → Minimaler Code für grünen Test
3. Test läuft durch (GREEN) → Funktionalität verifiziert
4. Refactoring              → Code verbessern, Tests bleiben grün
```

### Workflow für Bugfixes

```
1. Reproduzierenden Test schreiben → Test zeigt den Bug
2. Bug beheben                     → Test wird grün
3. Regression verhindert           → Test bleibt im Projekt
```

### Workflow für Änderungen an bestehendem Code

```
1. Bestehende Tests prüfen         → Verstehen was abgedeckt ist
2. Tests anpassen/erweitern        → Neue Anforderungen abbilden
3. Code ändern                     → Tests werden grün
4. Alle Tests durchlaufen lassen   → Keine Regression
```

### Verpflichtende Regeln

| Regel                      | Beschreibung                                        |
| -------------------------- | --------------------------------------------------- |
| **Kein Feature ohne Test** | Neue Funktionalität muss durch Tests abgedeckt sein |
| **Kein Bugfix ohne Test**  | Jeder Bug bekommt einen reproduzierenden Test       |
| **Tests vor Code**         | Test zuerst schreiben, dann implementieren          |
| **Grüne Tests vor Commit** | `npm run test:quick` muss durchlaufen               |

### Ausnahmen (mit Begründung)

- Reine UI-Styling-Änderungen (CSS)
- Dokumentations-Updates
- Konfigurationsänderungen ohne Logik

**Bei Ausnahmen:** Explizit im Commit dokumentieren warum kein Test nötig ist.

---

## Test-Befehle

```bash
npm run test:unit         # Server Unit Tests (schnell, kein Browser)
npm run test:unit:client  # Browser-Komponenten-Tests (Playwright)
npm run test:unit:all     # Alle Unit Tests (Server + Browser)
npm run test:unit:watch   # Server Unit Tests im Watch-Modus
npm run test:e2e          # E2E Tests (Playwright)
npm run test:quick        # Schnell-Test (lint + type-check + unit)
```

---

## Dateistruktur

```
src/**/*.test.ts             # Unit Tests (co-located mit Source)
e2e/                         # Playwright E2E Tests (Root-Level)
├── *.spec.ts
└── *.test.ts
vitest-setup-client.ts       # Client Test Setup
vitest-setup-server.ts       # Server Test Setup
```

**Hinweis:** Unit Tests liegen direkt neben den Source-Dateien, nicht in einem separaten `tests/` Verzeichnis.

---

## Vitest Unit Tests

### Grundstruktur

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatDate } from '$lib/utils/date';

describe('formatDate', () => {
	it('formatiert deutsches Datum korrekt', () => {
		const result = formatDate(new Date('2024-01-15'));
		expect(result).toBe('15.01.2024');
	});

	it('gibt leeren String bei null zurück', () => {
		expect(formatDate(null)).toBe('');
	});
});
```

### Svelte Component Tests

```typescript
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Button from '$lib/components/Button.svelte';

describe('Button', () => {
	it('zeigt Label an', async () => {
		render(Button, { props: { label: 'Absenden' } });
		await expect.element(page.getByText('Absenden')).toBeVisible();
	});

	it('ruft onClick auf', async () => {
		const onClick = vi.fn();
		render(Button, { props: { label: 'Klick', onClick } });

		await page.getByRole('button').click();
		expect(onClick).toHaveBeenCalled();
	});
});
```

**Hinweis:** Projekt nutzt `vitest-browser-svelte` + `page` API, NICHT `@testing-library/svelte`.

### Mocking

```typescript
// Mock eines Moduls
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn().mockReturnValue({
			from: vi.fn().mockResolvedValue([])
		})
	}
}));

// Mock von fetch
global.fetch = vi.fn().mockResolvedValue({
	ok: true,
	json: () => Promise.resolve({ data: [] })
});
```

---

## Playwright E2E Tests

### Grundstruktur

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sichtung melden', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('zeigt Multi-Step Form', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Sichtung/i })).toBeVisible();
		await expect(page.getByText('Schritt 1')).toBeVisible();
	});

	test('navigiert zum nächsten Schritt', async ({ page }) => {
		await page.fill('[name="date"]', '2024-01-15');
		await page.fill('[name="time"]', '14:30');
		await page.click('button:has-text("Weiter")');

		await expect(page.getByText('Schritt 2')).toBeVisible();
	});
});
```

### Page Object Pattern

```typescript
// e2e/pages/SightingFormPage.ts
export class SightingFormPage {
	constructor(private page: Page) {}

	async fillStep1(data: { date: string; time: string }) {
		await this.page.fill('[name="date"]', data.date);
		await this.page.fill('[name="time"]', data.time);
	}

	async nextStep() {
		await this.page.click('button:has-text("Weiter")');
	}

	async getCurrentStep(): Promise<number> {
		const text = await this.page.textContent('.step-indicator');
		return parseInt(text?.match(/\d+/)?.[0] ?? '1');
	}
}
```

### Map-Interaktion testen

```typescript
test('wählt Position auf Karte', async ({ page }) => {
	await page.goto('/');

	// Karte laden
	await page.waitForSelector('.ol-viewport');

	// Klick auf Karte simulieren
	const map = page.locator('.ol-viewport');
	await map.click({ position: { x: 200, y: 200 } });

	// Koordinaten prüfen
	await expect(page.locator('[name="lat"]')).not.toBeEmpty();
	await expect(page.locator('[name="lng"]')).not.toBeEmpty();
});
```

---

## Mocking-Strategien

### Drizzle DB Mock

```typescript
import { vi } from 'vitest';

export const mockDb = {
	select: vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue([{ id: 1, species: 'Schweinswal' }])
		})
	}),
	insert: vi.fn().mockReturnValue({
		values: vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue([{ id: 1 }])
		})
	})
};

vi.mock('$lib/server/db', () => ({ db: mockDb }));
```

---

## Best Practices

### Do's

- Tests vor dem Commit ausführen (`npm run test:quick`)
- Aussagekräftige Test-Namen auf Deutsch
- Arrange-Act-Assert Pattern verwenden
- Jeden Edge Case testen

### Don'ts

- Keine Tests die von externen Services abhängen
- Keine sleep/timeout in Tests (waitFor verwenden)
- Keine Test-Daten in Produktion-DB

---

## CI Integration

Tests werden automatisch in GitHub Actions ausgeführt:

- Unit Tests bei jedem Push
- E2E Tests bei Pull Requests
- Coverage-Report wird generiert
