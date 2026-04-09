# Claude Code Dokumentation - Ostsee-Tiere

Diese Dokumentation ist modular aufgebaut für optimale Navigation und Wartbarkeit.

## Quick Navigation

| Aufgabe                   | Dokument                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Architektur verstehen** | [rules/architecture.md](rules/architecture.md)                                              |
| **Tests schreiben**       | [rules/testing.md](rules/testing.md) + [agents/testing.md](agents/testing.md)               |
| **Datenbank-Arbeit**      | [rules/database.md](rules/database.md)                                                      |
| **Formulare entwickeln**  | [rules/forms.md](rules/forms.md) + [agents/form-development.md](agents/form-development.md) |
| **Karten-Features**       | [rules/maps.md](rules/maps.md) + [agents/map-features.md](agents/map-features.md)           |
| **Sicherheit**            | [rules/security.md](rules/security.md)                                                      |
| **API-Entwicklung**       | [rules/api.md](rules/api.md)                                                                |

---

## Struktur

```
/CLAUDE.md              # Haupt-Konfiguration (im Repository-Root)
.claude/
├── README.md           # Diese Datei
├── settings.json       # Projekt-Einstellungen (Hooks, shared config)
├── settings.local.json # Lokale Permissions (nicht committen)
├── rules/              # Themenspezifische Regeln
│   ├── architecture.md # Architektur & Clean Code (immer geladen)
│   ├── testing.md      # Test-Patterns (immer geladen)
│   ├── database.md     # Drizzle & PostGIS (conditional: DB/API-Dateien)
│   ├── forms.md        # Multi-Step Forms (conditional: Form-Dateien)
│   ├── maps.md         # OpenLayers (conditional: Map-Dateien)
│   ├── security.md     # Auth & GDPR (conditional: Auth/Security-Dateien)
│   ├── api.md          # REST API (conditional: API-Dateien)
│   └── docker.md       # Docker Deployment (conditional: Docker-Dateien)
├── agents/             # Spezialisierte Agents
│   ├── form-development.md
│   ├── testing.md
│   ├── map-features.md
│   └── architecture-review.md
└── commands/           # Slash Commands
    ├── local-dev.md    # Lokale Entwicklungsumgebung
    ├── prepare-pr.md   # Pull Request vorbereiten
    ├── review.md       # Code-Review mit Anti-Pattern Checks
    ├── deploy.md       # Docker Deployment Referenz (on-demand)
    └── db-migrate.md   # Datenbank-Migration Referenz (on-demand)
```

---

## Conditional Loading

Rules mit `paths` Frontmatter werden nur geladen wenn passende Dateien bearbeitet werden:

| Rule        | Geladen bei Dateien in...                                                                 |
| ----------- | ----------------------------------------------------------------------------------------- |
| forms.md    | `src/lib/form/`, `src/lib/report/`, `src/lib/components/form/`, `src/routes/+page.svelte` |
| maps.md     | `src/lib/map/`, `src/routes/map/`                                                         |
| security.md | `src/lib/server/auth/`, `src/hooks.server.ts`, `src/routes/api/files/`                    |
| api.md      | `src/routes/api/`, `src/routes/rest_sichtungen/`, `src/routes/sichtungen/`                |
| database.md | `src/lib/server/db/**`, `drizzle.config.ts`, `src/routes/api/**`                          |
| docker.md   | `Dockerfile`, `docker-compose*.yml`, `.github/workflows/docker-publish.yml`               |

Rules **ohne** `paths` (immer geladen): architecture.md, testing.md

---

## On-Demand Dokumentation

Große Referenz-Dokumente werden nicht automatisch geladen, sondern on-demand via Skills:

| Skill         | Lädt...                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `/deploy`     | docs/DOCKER_DEPLOYMENT.md, docs/PRODUCTION_DEPLOYMENT.md, docs/ENVIRONMENT.md |
| `/db-migrate` | docs/DATABASE_MIGRATION.md, docs/ENVIRONMENT.md                               |

Weitere Dokumente können jederzeit per `Read`-Tool gelesen werden:

- `docs/DESIGN_GUIDE.md` — Design-Richtlinien & UX
- `docs/LEGACY_API_SPECIFICATION.md` — Legacy API (wird via CLAUDE.md `@` immer geladen)

---

## Agents

Spezialisierte Agents für komplexe Aufgaben:

### form-development

**Trigger:** "Formular erstellen", "Form hinzufügen", "Validation"

- Multi-Step Form Patterns
- svelte-forms-lib + Yup
- Accessibility Checkliste

### testing

**Trigger:** "Tests schreiben", "Test hinzufügen", "E2E Test"

- Vitest Unit Tests
- Playwright E2E
- Mocking-Strategien

### map-features

**Trigger:** "Karte", "Map Feature", "OpenLayers"

- OpenLayers Patterns
- PostGIS Integration
- Coordinate Handling

### architecture-review

**Trigger:** "Architecture Review", "Code-Qualität prüfen", "Anti-Patterns"

- Systematische Anti-Pattern Erkennung
- Priorisierte Fix-Abarbeitung
- Test-First Bugfix-Workflow

---

## Empfohlene Plugins

Plugins im Terminal installieren (CLI-Befehle, keine Slash-Commands):

```bash
# Official Svelte 5 Plugin (Runes, SSR, Autofixer, MCP Server)
claude plugin marketplace add sveltejs/ai-tools
claude plugin install svelte

# Community Svelte Skills (optional, breitere Abdeckung)
claude plugin marketplace add spences10/svelte-skills-kit
claude plugin install svelte-skills
```

---

## MCP Server Setup

Folgende MCP Server sollten konfiguriert sein:

| Server          | Zweck                                           | Status  |
| --------------- | ----------------------------------------------- | ------- |
| **Context7**    | Allgemeine Library-Dokumentation                | Pflicht |
| **pg-aiguide**  | PostgreSQL/PostGIS Docs + Spatial Design Skills | Aktiv   |
| **GitHub**      | PR/Issue Management                             | Aktiv   |
| **daisyui**     | DaisyUI v5 Komponenten-Docs (GitMCP)            | Aktiv   |
| **openlayers**  | OpenLayers Docs (GitMCP)                        | Aktiv   |
| **drizzle-orm** | Drizzle ORM Docs (GitMCP)                       | Aktiv   |

GitMCP Server hinzufügen:

```bash
claude mcp add --transport http daisyui https://gitmcp.io/saadeghi/daisyui
claude mcp add --transport http openlayers https://gitmcp.io/openlayers/openlayers
claude mcp add --transport http drizzle-orm https://gitmcp.io/drizzle-team/drizzle-orm
```

---

## Hooks (settings.json)

Projekt-Hooks in `.claude/settings.json`:

| Hook     | Event                    | Aktion                           |
| -------- | ------------------------ | -------------------------------- |
| Prettier | PostToolUse (Write/Edit) | Auto-Format nach Dateiänderungen |
