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
npm run test:e2e:shards   # Shard-Zuordnung prüfen — PFLICHT nach neuem E2E-Spec
npm run test:quick        # Gate vor dem Commit (siehe unten)
npm run test:coverage     # Coverage-Report (Server-Tests + v8)
```

### Was `test:quick` prüft — und was nicht

| Schritt            | Kommando           | Laufzeit  |
| ------------------ | ------------------ | --------- |
| E2E-Shard-Abgleich | `test:e2e:shards`  | ~2 s      |
| ESLint             | `lint`             |           |
| TypeScript         | `type-check`       | ~25 s     |
| svelte-check       | `check`            | zusammen  |
| Unit-Tests Server  | `test:unit`        | ~26 s     |
| Komponenten-Tests  | `test:unit:client` | ~18 s     |
| **Summe**          |                    | **~70 s** |

**Nicht enthalten:** die E2E-Suite (`npm run test:e2e`). Die braucht Dev-Server und
Datenbank und läuft in CI in drei Shards; `test:quick` prüft davon nur, ob jeder Spec
einem Shard zugeordnet ist.

Die Komponenten-Tests standen bis zum 2026-08-10 **nicht** in diesem Kommando: Es fuhr
nur `vitest run --project server`, und alle `*.svelte.test.ts` liegen im Projekt
`client`. Ein Branch legte sieben davon an, die als „grün" galten, ohne dass das Gate
sie je angefasst hätte — der Lauf meldete Erfolg für eine Prüfung, die nicht
stattgefunden hatte. Gemessen kostet das Browser-Projekt weniger als das
Server-Projekt (18 s gegen 26 s); das Laufzeit-Argument, das die Trennung getragen
hatte, hielt der Messung nicht stand.

Damit sich die Lücke nicht wiederholt, rechnet `scripts/testGate.test.ts` nach, ob
`test:quick` jedes in `vitest.config.ts` konfigurierte Vitest-Projekt fährt. Ein neues
Projekt bricht diesen Test, statt still unbeobachtet zu bleiben.

### Der Browser-Lauf endet mit „close timed out"

```
close timed out after 2000ms
Tests closed successfully but something prevents the main process from exiting
```

Das ist **kein** Fehlschlag. Nach dem letzten Test bleiben Dateihandles offen, die der
`hanging-process`-Reporter nur als „FILEHANDLE (unknown stack trace)" ausweist; danach
beendet sich der Prozess von selbst, und es bleibt nachweislich weder ein Port noch ein
Chromium zurück. Vitests Default von 10 s wurde deshalb in `vitest.config.ts` auf 2 s
gekürzt — reine Wartezeit, die bei jedem Gate anfiel. Abgeschaltet ist die Meldung
bewusst nicht: Bliebe eines Tages doch etwas zurück, ist sie der einzige Hinweis darauf.

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
