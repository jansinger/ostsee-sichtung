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
npm run test:coverage     # Coverage-Report (Server-Tests + v8)
```

---

## Dateistruktur

```
src/**/*.test.ts             # Server Unit Tests (co-located mit Source)
src/**/*.svelte.test.ts      # Browser-Komponenten-Tests (vitest-browser-svelte)
e2e/                         # Playwright E2E Tests (Root-Level)
├── *.spec.ts
└── *.test.ts
vitest-setup-client.ts       # Client Test Setup
vitest-setup-server.ts       # Server Test Setup
```

**Wichtig:** Das Datei-Suffix entscheidet über die Ausführungsumgebung:

- `*.test.ts` → Node-Umgebung (Server-Tests, kein DOM)
- `*.svelte.test.ts` → Browser-Umgebung via Playwright (für Svelte-Komponenten)

---

## Konkrete Test-Patterns

Vitest-Grundstruktur, Svelte-Component-Tests, Mocking-Strategien (inkl. Drizzle-Mock),
Playwright-E2E und das Page-Object-Pattern stehen in `testing-patterns.md`. Diese Datei
lädt automatisch, sobald eine Testdatei bearbeitet wird.

Starter-Templates gibt es außerdem im `/tdd`-Skill und im `testing`-Agent.
