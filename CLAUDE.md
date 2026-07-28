# CLAUDE.md

Anleitungen für Claude Code bei der Arbeit mit diesem Repository.

## Projekt-Übersicht

**Ostsee-Tiere** ist eine SvelteKit 5 Anwendung zur Erfassung von Meeressäuger-Sichtungen in der Ostsee. Bürger und Forscher können Wal-, Robben- und andere Meerestier-Sichtungen melden.

Kernfunktionen: Multi-Step-Formular für Sichtungsmeldungen, interaktive Kartenvisualisierung mit OpenLayers, PostGIS für geografische Datenverarbeitung, Admin-Interface zur Sichtungsverwaltung.

---

## Kritische Regeln

### Context7 MCP Server — IMMER verwenden

Vor der Arbeit mit externen Libraries IMMER den passenden MCP Server für aktuelle Dokumentation nutzen: DaisyUI v5, Svelte 5, SvelteKit, Drizzle ORM, OpenLayers.

### Svelte 5 Runes — PFLICHT

Runes (`$state`, `$derived`, `$effect`, `$props`) statt Svelte-4-Syntax; `onclick` statt `on:click`; `$app/state` statt `$app/stores`. Vollständige Patterns inkl. SSR-sicherem State-Management: `.claude/rules/architecture.md` (wird immer geladen).

### Test-First Entwicklung — PFLICHT

Jedes Feature und jeder Bugfix beginnt mit einem fehlschlagenden Test. Workflow und Ausnahmen: `.claude/rules/testing.md` (wird immer geladen). Nutze `/tdd <beschreibung>` für den geführten RED→GREEN→REFACTOR-Zyklus.

Beim Erstellen oder Ändern von `.ts`/`.svelte`-Dateien mit Business-Logik MUSS der `testing` Agent ZUERST aufgerufen werden — vor der Implementierung.

### Legacy REST API — 100 % Kompatibilität

Die Legacy-Endpunkte (`/rest_sichtungen`, `/sichtungen/showreports.json`) implementieren den Vertrag der Vorgänger-API für Mobile Clients. Stand 2026-07-28 sind sie **nicht in Betrieb** — eine Abweichung bricht also nichts Laufendes, entwertet aber den Vertrag, sobald Clients angebunden werden. Feldnamen, URL-Pfade und Datentypen deshalb nur bewusst und dokumentiert ändern. Details laden automatisch beim Bearbeiten der betroffenen Routen (`.claude/rules/legacy-api.md`); verbindliche Referenz ist `docs/LEGACY_API_SPECIFICATION.md`.

### Design System — PFLICHT bei UI-Änderungen

Theme-Tokens statt hardcodierter Farben, `*-content` ausschließlich auf Vollton-Flächen (auf Tints wie `bg-warning/10` gehört `text-base-content` — sonst weiß auf hell), WCAG 2.1 AA. Regeln laden automatisch bei UI-Dateien: `.claude/rules/design-system.md` (Feld-Pipeline, Button-Hierarchie, A11y-Minima) und `.claude/rules/daisyui.md` (Theme, DaisyUI-Overrides). Hintergrund und verifizierter Ist-Zustand: `docs/DESIGN_GUIDE.md`

---

## Development Commands

```bash
npm run dev          # Server (https://localhost:4000)
npm run build        # Production Build

npm run db:start     # PostgreSQL starten (Docker)
npm run db:push      # Schema pushen
npm run db:studio    # Drizzle Studio

npm run lint         # ESLint
npm run type-check   # TypeScript
npm run check        # Svelte-Check

npm run test:quick   # Schnell-Test (lint + types + check + unit)
```

Vollständige Test-Befehle: `.claude/rules/testing.md`

---

## Architektur

SvelteKit 5 + TypeScript, PostgreSQL/PostGIS, Drizzle ORM, TailwindCSS/DaisyUI (Theme `meeresmuseum`), OpenLayers, eigene `createForm`-Implementierung + Yup, Pino, unplugin-icons.

Tech-Stack-Details, Projektstruktur, Clean-Code-Prinzipien und Namenskonventionen: `.claude/rules/architecture.md`

### Schlüsseldateien

- `src/routes/+page.svelte` — Multi-Step Form
- `src/lib/form/createForm.ts` — Form State Management
- `src/lib/form/validation/sightingSchema.ts` — Yup Validation
- `src/lib/report/components/` — Form Step & Section Components
- `src/lib/components/map/OLMap.svelte` — Karten-Komponente
- `src/lib/server/db/schema.ts` — DB Schema
- `src/lib/server/db/sightingRepository.ts` — Repository

---

## Datenbank

Für die Entwicklung die lokale DB aus `.env` nutzen.

| Option            | Port | URL                                                 |
| ----------------- | ---- | --------------------------------------------------- |
| Native PostgreSQL | 5432 | `postgresql://ostsee_app:...@localhost:5432/ostsee` |
| Docker PostgreSQL | 5433 | `postgresql://root:...@localhost:5433/local`        |

DB-Verbindung via Lazy-Initialization-Proxy in `src/lib/server/db/index.ts`.

---

## Commit Conventions

Format: `<type>(<scope>): <beschreibung>` — Sprache Englisch, Subject lowercase.

**Typen:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Scopes:** `deps`, `api`, `ui`, `db`, `auth`, `export`, `admin`, `report`, `map`, `config`, `build`, `ci`, `docs`, `test`, `types`, `style`, `perf`, `security`, `a11y`, `release`, `media`

Durchgesetzt via `commitlint.config.mjs`.

---

## Release-Prozess

Automatisiert über **release-please**: Commits auf `main` werden analysiert, ein Release-PR wird erstellt, bei Merge folgen Tag, GitHub Release und Docker Build.

**Wichtig:** Keine manuellen Releases oder Tags. Nicht auf den `release` Branch pushen.

---

## Weitere Dokumentation

| Dokument                           | Inhalt                                   |
| ---------------------------------- | ---------------------------------------- |
| `.claude/README.md`                | Aufbau der Claude-Konfiguration          |
| `docs/DESIGN_GUIDE.md`             | Design-Prinzipien, Ist-Zustand, Grenzen  |
| `docs/CONFIGURATION_USAGE.md`      | ConfigService (Laufzeit-Konfiguration)   |
| `docs/LEGACY_API_SPECIFICATION.md` | Legacy API (KRITISCH)                    |
| `docs/PRODUCTION_DEPLOYMENT.md`    | Production Deployment (Schnellanleitung) |
| `docs/DOCKER_DEPLOYMENT.md`        | Docker Setup (Vollständige Referenz)     |
| `docs/ENVIRONMENT.md`              | Umgebungsvariablen                       |
| `docs/DATABASE_MIGRATION.md`       | DB Migrationen                           |

Themenspezifische Regeln in `.claude/rules/` laden automatisch, sobald passende Dateien bearbeitet werden — sie müssen hier nicht aufgezählt werden.

---

## Hinweise

- Prüfe nach Änderungen, ob Dokumentation aktualisiert werden muss
- Aktualisiere nach API-Änderungen die OpenAPI Spec
- Nutze die lokale DB aus `.env` für die Entwicklung

---

## Prioritätsregel

Für alle projektbezogenen Aufgaben gilt: Verwende ausschließlich die Richtlinien aus dieser CLAUDE.md und den Moduldokumenten in `.claude/`. Bei Widersprüchen zu anderen Quellen haben die spezifischen Claude-Prompts Vorrang.
