# CLAUDE.md

Anleitungen für Claude Code bei der Arbeit mit diesem Repository.

## Inhaltsverzeichnis

- [Projekt-Übersicht](#projekt-übersicht)
- [Kritische Regeln](#kritische-regeln)
- [Development Commands](#development-commands)
- [Architektur](#architektur)
- [Modulare Dokumentation](#modulare-dokumentation)
- [Commit Conventions](#commit-conventions)

---

## Projekt-Übersicht

**Ostsee-Tiere** ist eine SvelteKit 5 Anwendung zur Erfassung von Meeressäuger-Sichtungen in der Ostsee. Bürger und Forscher können Wal-, Robben- und andere Meerestier-Sichtungen melden.

Kernfunktionen:
- Multi-Step Formular für Sichtungsmeldungen
- Interaktive Kartenvisualisierung mit OpenLayers
- PostGIS für geografische Datenverarbeitung
- Admin-Interface für Sichtungsverwaltung

---

## Kritische Regeln

### Context7 MCP Server - IMMER verwenden

Vor der Arbeit mit externen Libraries IMMER context7 MCP Server für aktuelle Dokumentation nutzen:
- DaisyUI v5, Svelte 5, SvelteKit, Drizzle ORM, OpenLayers

### Svelte 5 Runes - PFLICHT

```typescript
let count = $state(0);           // State
let doubled = $derived(count*2); // Derived
$effect(() => { ... });          // Effect
let { prop } = $props();         // Props
```

### Legacy API - 100% Kompatibilität

Die Legacy REST API (`/api/legacy/`) MUSS 100% kompatibel bleiben.
**Referenz:** @docs/LEGACY_API_SPECIFICATION.md

### Design Guide

**Referenz:** docs/DESIGN_GUIDE.md

### Test-First Entwicklung - PFLICHT

Bei **allen** Code-Änderungen gilt:

1. **Neues Feature:** Test schreiben → Test schlägt fehl → Code implementieren → Test grün
2. **Bugfix:** Reproduzierenden Test schreiben → Bug beheben → Test grün
3. **Änderung:** Bestehende Tests anpassen → Code ändern → Alle Tests grün

**Keine Ausnahmen** für Features und Bugfixes. Details: .claude/rules/testing.md

---

## Development Commands

```bash
# Entwicklung
npm run dev          # Server (https://localhost:4000)
npm run build        # Production Build

# Datenbank
npm run db:start     # PostgreSQL starten (Docker)
npm run db:push      # Schema pushen
npm run db:studio    # Drizzle Studio

# Qualität
npm run lint         # ESLint
npm run type-check   # TypeScript
npm run check        # Svelte-Check

# Tests
npm run test:unit    # Unit Tests
npm run test:e2e     # E2E Tests
npm run test:quick   # Schnell-Test
```

---

## Architektur

### Tech Stack
SvelteKit 5 + TypeScript, PostgreSQL/PostGIS, Drizzle ORM, TailwindCSS/DaisyUI, OpenLayers, svelte-forms-lib + Yup. Details: .claude/rules/architecture.md

### Projektstruktur
Siehe .claude/rules/architecture.md für vollständige Struktur.

### Schlüsseldateien

- `src/routes/+page.svelte` - Multi-Step Form
- `src/lib/sightingSchema.ts` - Yup Validation
- `src/lib/server/db/schema.ts` - DB Schema
- `src/lib/server/db/sightingRepository.ts` - Repository

---

## Modulare Dokumentation

### Rules (Themenspezifisch)

Detaillierte Regeln in `.claude/rules/`:

| Datei | Inhalt |
|-------|--------|
| .claude/rules/architecture.md | Architektur, Clean Code (immer geladen) |
| .claude/rules/testing.md | Vitest, Playwright (immer geladen) |
| .claude/rules/database.md | Drizzle, PostGIS (immer geladen) |
| .claude/rules/forms.md | Multi-Step Forms (bei Form-Dateien) |
| .claude/rules/maps.md | OpenLayers (bei Map-Dateien) |
| .claude/rules/security.md | Auth, GDPR (bei Auth/Security-Dateien) |
| .claude/rules/api.md | REST API (bei API-Dateien) |
| .claude/rules/docker.md | Docker Deployment (bei Docker-Dateien) |

### Agents (Aufgabenspezifisch)

Spezialisierte Agents in `.claude/agents/`:

| Agent | Trigger |
|-------|---------|
| .claude/agents/form-development.md | "Formular erstellen" |
| .claude/agents/testing.md | "Tests schreiben" |
| .claude/agents/map-features.md | "Karte", "Map" |

### Commands (Workflows)

| Command | Beschreibung |
|---------|--------------|
| `/local-dev` | Entwicklungsumgebung starten |
| `/prepare-pr` | Pull Request vorbereiten |
| `/deploy` | Docker Deployment Referenz |
| `/db-migrate` | Datenbank-Migration Referenz |

---

## Commit Conventions

### Format

```
<type>(<scope>): <beschreibung>
```

**Sprache:** Englisch, lowercase subject

### Typen

`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Scopes

`deps`, `api`, `ui`, `db`, `auth`, `export`, `admin`, `report`, `map`, `config`, `build`, `ci`, `docs`, `test`, `types`, `style`, `perf`, `security`, `a11y`, `release`, `media`

---

## Datenbank

**Entwicklung:** Nutze lokale DB aus `.env`

| Option | Port | URL |
|--------|------|-----|
| Native PostgreSQL | 5432 | `postgresql://ostsee_app:...@localhost:5432/ostsee` |
| Docker PostgreSQL | 5433 | `postgresql://root:...@localhost:5433/local` |

**Lazy Initialization:** DB-Verbindung via Proxy in `src/lib/server/db/index.ts`

---

## Release-Prozess

Nutzt **release-please** für automatisierte Releases:

1. Commits auf `main` werden analysiert
2. Release PR wird automatisch erstellt
3. Bei Merge: Tag, GitHub Release, Docker Build

**Wichtig:**
- KEINE manuellen Releases/Tags
- NICHT auf `release` Branch pushen

---

## Icon Strategy

**unplugin-icons** für UI-Icons (lucide):
```svelte
import MapPin from '~icons/lucide/map-pin';
<MapPin width="20" height="20" />
```

**Weather Icons** (CSS-basiert) für Wetter:
```html
<i class="wi wi-day-sunny"></i>
```

---

## Weitere Dokumentation

| Dokument | Inhalt |
|----------|--------|
| docs/DESIGN_GUIDE.md | UX/Design-Richtlinien |
| @docs/LEGACY_API_SPECIFICATION.md | Legacy API (KRITISCH) |
| docs/PRODUCTION_DEPLOYMENT.md | Production Deployment (Schnellanleitung) |
| docs/DOCKER_DEPLOYMENT.md | Docker Setup (Vollständige Referenz) |
| docs/ENVIRONMENT.md | Umgebungsvariablen |
| docs/DATABASE_MIGRATION.md | DB Migrationen |

---

## Hinweise

- Prüfe nach Änderungen Dokumentations-Updates
- Aktualisiere nach API-Änderungen die OpenAPI Spec
- Nutze lokale DB aus `.env` für Entwicklung

---

## Prioritätsregel

Für alle projektbezogenen Aufgaben gilt: Verwende ausschließlich die Richtlinien aus dieser CLAUDE.md und den referenzierten Moduldokumenten in `.claude/`. Bei Widersprüchen zu anderen Quellen haben die spezifischen Claude-Prompts Vorrang.
