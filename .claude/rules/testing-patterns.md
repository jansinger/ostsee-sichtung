---
paths:
  - '**/*.test.ts'
  - '**/*.svelte.test.ts'
  - 'e2e/**'
  - 'vitest.config.ts'
  - 'vitest-setup-*.ts'
  - 'playwright.config.ts'
---

# Test-Patterns — Vitest & Playwright

Ergänzt `testing.md` (immer geladen), wo die verbindliche Test-First-Regel und die
Datei-Konventionen stehen. Hier stehen die konkreten Rezepte.

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

### Svelte Component Tests (vitest-browser-svelte v2)

**Datei-Suffix:** `*.svelte.test.ts` (nicht `*.test.ts`!)

```typescript
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Button from '$lib/components/Button.svelte';

describe('Button', () => {
	it('zeigt Label an', async () => {
		// v2: Props direkt übergeben (KEIN { props: {...} } Wrapper!)
		render(Button, { label: 'Absenden' });
		await expect.element(page.getByText('Absenden')).toBeVisible();
	});

	it('ruft onClick auf', async () => {
		const onClick = vi.fn();
		render(Button, { label: 'Klick', onClick });

		await page.getByRole('button').click();
		expect(onClick).toHaveBeenCalled();
	});
});
```

**Hinweis:** Projekt nutzt `vitest-browser-svelte` v2 + `page` API, NICHT `@testing-library/svelte`.
In v2 werden Props direkt als zweites Argument übergeben — **kein `{ props: {...} }` Wrapper** (v1-Syntax).

**Ausnahme: sobald ein `context` mitgegeben wird.** Dann ist das zweite Argument das
Optionen-Objekt, und die Props müssen wieder unter den `props`-Schlüssel — sonst gelten
sie als unbekannte Svelte-Optionen und kommen nie an der Komponente an.

### Formular-Komponenten: `renderWithFormContext`

Jede Komponente unterhalb von `Form.svelte` braucht den Form-Context (`FormField` wirft
ohne ihn beim ersten Feld). Den Aufbau nicht abschreiben, sondern
`src/lib/report/components/testing/renderWithFormContext.testutil.ts` nutzen — er kapselt
auch die `props`-Ausnahme von oben:

```typescript
import { renderWithFormContext } from '$lib/report/components/testing/renderWithFormContext.testutil';

// Startwerte über `overrides`, Props typgeprüft über `props`
renderWithFormContext(DeadAnimal, { overrides: { isDead: true }, props: { adminMode: true } });

// Rückgabe ist der gebaute Context — für Tests, die danach `form`/`mediaStore` prüfen
const context = renderWithFormContext(DropzoneEnhanced, { props, mediaStore });
```

Der Helper heißt `.testutil.ts`, nicht `.ts`: `vitest.config.ts` nimmt `src/lib/**/*.ts`
in die Coverage auf und schließt nur `**/*.testutil.ts` aus. Ohne das Suffix zählt ein
Test-Helfer als ungedeckter Produktionscode (Präzedenz:
`src/lib/server/datetime/withTimeZone.testutil.ts`).

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

// Mock einer einzelnen Funktion (vi.spyOn)
import * as emailService from '$lib/server/services/emailService';
vi.spyOn(emailService, 'sendNotification').mockResolvedValue(undefined);

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
