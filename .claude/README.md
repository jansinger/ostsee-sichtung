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
│   ├── architecture.md # Architektur & Clean Code
│   ├── testing.md      # Test-Patterns
│   ├── database.md     # Drizzle & PostGIS
│   ├── forms.md        # Multi-Step Forms
│   ├── maps.md         # OpenLayers
│   ├── security.md     # Auth & GDPR
│   ├── api.md          # REST API
│   └── docker.md       # Docker Deployment
├── agents/             # Spezialisierte Agents
│   ├── form-development.md
│   ├── testing.md
│   └── map-features.md
└── commands/           # Slash Commands
    ├── local-dev.md
    └── prepare-pr.md
```

---

## Wann welches Dokument lesen?

| Dokument | Lesen bei... |
|----------|--------------|
| `rules/architecture.md` | **Jeder** Code-Änderung |
| `rules/testing.md` | Test-Entwicklung |
| `rules/database.md` | Schema-Änderungen, Queries |
| `rules/forms.md` | Formular-Arbeit |
| `rules/maps.md` | Karten-Features |
| `rules/security.md` | Auth, File Upload, User Data |
| `rules/api.md` | **KRITISCH** bei Legacy API Änderungen |

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

---

## Commands

| Command | Beschreibung |
|---------|--------------|
| `/local-dev` | Lokale Entwicklungsumgebung starten |
| `/prepare-pr` | Pull Request vorbereiten |

---

## Externe Dokumentation

| Dokument | Inhalt |
|----------|--------|
| `docs/DESIGN_GUIDE.md` | Design-Richtlinien & UX |
| `docs/LEGACY_API_SPECIFICATION.md` | Legacy API (KRITISCH) |
| `docs/DOCKER_DEPLOYMENT.md` | Docker Setup |
| `docs/ENVIRONMENT.md` | Umgebungsvariablen |
| `docs/DATABASE_MIGRATION.md` | DB Migrationen |
