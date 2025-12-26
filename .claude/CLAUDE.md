# Ostsee-Tiere - Claude Code Konfiguration

> Meeressäuger-Sichtungsportal für die Ostsee

## Inhaltsverzeichnis

- [Projekt-Übersicht](#projekt-übersicht)
- [Kritische Regeln](#kritische-regeln)
- [Development Commands](#development-commands)
- [Commit Conventions](#commit-conventions)
- [Spezialisierte Dokumentation](#spezialisierte-dokumentation)

---

## Projekt-Übersicht

**Ostsee-Tiere** ist eine SvelteKit 5 Anwendung zur Erfassung von Meeressäuger-Sichtungen in der Ostsee. Bürger und Forscher können Wal-, Robben- und andere Meerestier-Sichtungen melden.

**Tech Stack:** SvelteKit 5 | Drizzle ORM | PostgreSQL + PostGIS | TailwindCSS + DaisyUI | OpenLayers

---

## Kritische Regeln

### Context7 MCP Server - IMMER verwenden

Vor der Arbeit mit externen Libraries IMMER context7 MCP Server für aktuelle Dokumentation nutzen:
- DaisyUI v5 Patterns
- Svelte 5 Runes Best Practices
- SvelteKit Routing und Load Functions
- Drizzle ORM Patterns
- OpenLayers Integration

### Svelte 5 Runes - PFLICHT

Immer Svelte 5 Runes verwenden:
- `$state()` statt `let variable`
- `$derived()` statt `$: derived`
- `$props()` statt `export let`
- `$effect()` statt `$: { sideEffect }`

### Legacy API - 100% Kompatibilität

Die Legacy REST API (`/api/legacy/`) MUSS 100% kompatibel mit der Original-Spezifikation bleiben.
Siehe: @docs/LEGACY_API_SPECIFICATION.md

---

## Development Commands

### Kern-Befehle
```bash
npm run dev          # Entwicklungsserver (https://localhost:4000)
npm run build        # Production Build
npm run preview      # Production Preview
```

### Datenbank
```bash
npm run db:start     # PostgreSQL starten (Docker, Port 5433)
npm run db:stop      # Datenbank stoppen
npm run db:push      # Schema pushen
npm run db:migrate   # Migrationen ausführen
npm run db:studio    # Drizzle Studio öffnen
```

### Code-Qualität
```bash
npm run lint         # ESLint ausführen
npm run format       # Prettier formatieren
npm run type-check   # TypeScript prüfen
npm run check        # Svelte-Check
```

### Tests
```bash
npm run test:unit    # Unit Tests (Vitest)
npm run test:e2e     # E2E Tests (Playwright)
npm run test:quick   # Schneller Test (lint + type-check + unit)
```

### Docker
```bash
npm run docker:build   # Docker Image bauen
npm run docker:run     # Container starten
npm run docker:compose # Docker Compose starten
```

---

## Commit Conventions

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Typen
- `feat` - Neue Funktion
- `fix` - Bugfix
- `docs` - Dokumentation
- `style` - Formatierung
- `refactor` - Code-Umstrukturierung
- `test` - Tests
- `chore` - Wartung

### Scopes
`deps`, `api`, `ui`, `db`, `auth`, `export`, `admin`, `report`, `map`, `config`, `build`, `ci`, `docs`, `test`, `types`, `style`, `perf`, `security`, `a11y`, `release`, `media`

### Sprache
- Commit Messages: **Englisch**
- Subject: **lowercase**

---

## Spezialisierte Dokumentation

### Rules (Themenspezifisch)
- @.claude/rules/architecture.md - Architektur, Clean Code, Projektstruktur
- @.claude/rules/testing.md - Vitest, Playwright Patterns
- @.claude/rules/database.md - Drizzle, PostGIS, Schema
- @.claude/rules/forms.md - Multi-Step Forms, Validation
- @.claude/rules/maps.md - OpenLayers, Geographic Data
- @.claude/rules/security.md - Auth0, GDPR, Sicherheit
- @.claude/rules/api.md - Legacy API, REST Endpoints

### Agents (Aufgabenspezifisch)
- @.claude/agents/form-development.md - Formular-Entwicklung
- @.claude/agents/testing.md - Test-Entwicklung
- @.claude/agents/map-features.md - Karten-Features

### Commands (Workflows)
- `/local-dev` - Lokale Entwicklungsumgebung starten
- `/prepare-pr` - Pull Request vorbereiten

### Projekt-Dokumentation
- @docs/DESIGN_GUIDE.md - Design-Richtlinien
- @docs/LEGACY_API_SPECIFICATION.md - Legacy API Spec
- @docs/DOCKER_DEPLOYMENT.md - Docker Deployment
- @docs/ENVIRONMENT.md - Umgebungsvariablen
- @docs/DATABASE_MIGRATION.md - DB Migrationen

---

## Datenbank-Verbindung

**Entwicklung:** Nutze die lokale DB aus `.env`

**Option 1 - Native PostgreSQL (empfohlen für macOS):**
```
postgresql://ostsee_app:ostsee_dev_password@localhost:5432/ostsee
```

**Option 2 - Docker PostgreSQL:**
```
postgresql://root:mysecretpassword@localhost:5433/local
```

---

## Release-Prozess

Das Projekt nutzt **release-please** für automatisierte Releases:

1. Commits auf `main` werden analysiert
2. Release PR wird automatisch erstellt/aktualisiert
3. Bei Merge: Tag, GitHub Release, Docker Build

**Wichtig:**
- KEINE manuellen Releases/Tags erstellen
- NICHT direkt auf `release` Branch pushen
- Release PR Titel NICHT ändern
