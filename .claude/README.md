# Claude Code Dokumentation - Ostsee-Tiere

Diese Dokumentation ist modular aufgebaut für optimale Navigation und Wartbarkeit.

## Quick Navigation

| Aufgabe | Dokument |
|---------|----------|
| **Architektur verstehen** | [rules/architecture.md](rules/architecture.md) |
| **Tests schreiben** | [rules/testing.md](rules/testing.md) + [agents/testing.md](agents/testing.md) |
| **Datenbank-Arbeit** | [rules/database.md](rules/database.md) |
| **Formulare entwickeln** | [rules/forms.md](rules/forms.md) + [agents/form-development.md](agents/form-development.md) |
| **Karten-Features** | [rules/maps.md](rules/maps.md) + [agents/map-features.md](agents/map-features.md) |
| **Sicherheit** | [rules/security.md](rules/security.md) |
| **API-Entwicklung** | [rules/api.md](rules/api.md) |

---

## Struktur

```
/CLAUDE.md              # Haupt-Konfiguration (im Repository-Root)
.claude/
├── README.md           # Diese Datei
├── settings.json       # Projekt-Einstellungen
├── settings.local.json # Lokale Einstellungen (nicht committen)
├── rules/              # Themenspezifische Regeln
│   ├── architecture.md # Architektur & Clean Code (immer geladen)
│   ├── testing.md      # Test-Patterns (immer geladen)
│   ├── database.md     # Drizzle & PostGIS (immer geladen)
│   ├── forms.md        # Multi-Step Forms (conditional: Form-Dateien)
│   ├── maps.md         # OpenLayers (conditional: Map-Dateien)
│   ├── security.md     # Auth & GDPR (conditional: Auth/Security-Dateien)
│   ├── api.md          # REST API (conditional: API-Dateien)
│   └── docker.md       # Docker Deployment (conditional: Docker-Dateien)
├── agents/             # Spezialisierte Agents
│   ├── form-development.md
│   ├── testing.md
│   └── map-features.md
└── commands/           # Slash Commands
    ├── local-dev.md    # Lokale Entwicklungsumgebung
    ├── prepare-pr.md   # Pull Request vorbereiten
    ├── deploy.md       # Docker Deployment Referenz (on-demand)
    └── db-migrate.md   # Datenbank-Migration Referenz (on-demand)
```

---

## Conditional Loading

Rules mit `paths` Frontmatter werden nur geladen wenn passende Dateien bearbeitet werden:

| Rule | Geladen bei Dateien in... |
|------|--------------------------|
| forms.md | `src/lib/form/`, `src/lib/sightingSchema.ts`, `src/routes/+page.svelte`, `src/routes/components/steps/` |
| maps.md | `src/lib/map/`, `src/routes/map/` |
| security.md | `src/lib/server/auth/`, `src/hooks.server.ts`, `src/routes/api/files/` |
| api.md | `src/routes/api/`, `src/routes/rest_sichtungen/`, `src/routes/sichtungen/` |
| docker.md | `Dockerfile`, `docker-compose*.yml`, `.github/workflows/docker-release.yml` |

Rules **ohne** `paths` (immer geladen): architecture.md, testing.md, database.md

---

## On-Demand Dokumentation

Große Referenz-Dokumente werden nicht automatisch geladen, sondern on-demand via Skills:

| Skill | Lädt... |
|-------|---------|
| `/deploy` | docs/DOCKER_DEPLOYMENT.md, docs/PRODUCTION_DEPLOYMENT.md, docs/ENVIRONMENT.md |
| `/db-migrate` | docs/DATABASE_MIGRATION.md, docs/ENVIRONMENT.md |

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
