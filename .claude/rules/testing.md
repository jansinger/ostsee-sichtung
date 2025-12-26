# Testing Patterns

Regeln für Unit Tests (Vitest) und E2E Tests (Playwright).

---

## Test-Befehle

```bash
npm run test:unit        # Unit Tests ausführen
npm run test:unit:watch  # Unit Tests im Watch-Modus
npm run test:e2e         # E2E Tests (Playwright)
npm run test:quick       # Schnell-Test (lint + type-check + unit)
```

---

## Dateistruktur

```
tests/
├── unit/                    # Vitest Unit Tests
│   ├── lib/
│   │   ├── utils/
│   │   └── components/
│   └── setup.ts             # Test Setup
├── e2e/                     # Playwright E2E Tests
│   ├── fixtures/
│   ├── pages/
│   └── *.spec.ts
└── mocks/                   # Shared Mocks
```

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
import { render, screen, fireEvent } from '@testing-library/svelte';
import Button from '$lib/components/Button.svelte';

describe('Button', () => {
    it('zeigt Label an', () => {
        render(Button, { props: { label: 'Absenden' } });
        expect(screen.getByText('Absenden')).toBeInTheDocument();
    });

    it('ruft onClick auf', async () => {
        const onClick = vi.fn();
        render(Button, { props: { label: 'Klick', onClick } });

        await fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalled();
    });
});
```

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
// tests/e2e/pages/SightingFormPage.ts
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
            where: vi.fn().mockResolvedValue([
                { id: 1, species: 'Schweinswal' }
            ])
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

### PostGIS Mock
```typescript
// Für geografische Funktionen
export const mockPostGIS = {
    ST_Point: (lng: number, lat: number) => `POINT(${lng} ${lat})`,
    ST_DWithin: () => true,
    ST_AsGeoJSON: () => '{"type":"Point","coordinates":[10.5,54.3]}'
};
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
