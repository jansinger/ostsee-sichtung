# Claude Code Konfiguration — Ostsee-Tiere

Diese Datei beschreibt den **Aufbau** der Claude-Konfiguration. Sie ist für Menschen
gedacht und wird nicht automatisch in den Kontext geladen.

Die inhaltlichen Regeln stehen in [`../CLAUDE.md`](../CLAUDE.md) und in `rules/`.

---

## Struktur

```
/CLAUDE.md              # Immer geladen — schlank halten!
/.mcp.json              # Projekt-MCP-Server (committet, ohne Secrets)
.claude/
├── README.md           # Diese Datei (nicht auto-geladen)
├── settings.json       # Projekt-Einstellungen (Hooks) — committet
├── settings.local.json # Lokale Permissions — NICHT committen
├── launch.json         # Dev-Server-Definition für die Preview
├── rules/              # Themenspezifische Regeln (19 Dateien)
├── agents/             # Spezialisierte Subagents (4)
└── skills/             # Slash-Commands & Workflows (6)
```

---

## Kontext-Budget

Bei jedem Session-Start werden geladen:

| Datei                   | Zeilen | Warum                    |
| ----------------------- | ------ | ------------------------ |
| `CLAUDE.md`             | ~138   | Projekt-Einstieg         |
| `rules/architecture.md` | ~187   | kein `paths`-Frontmatter |
| `rules/testing.md`      | ~96    | kein `paths`-Frontmatter |

Zusammen ~420 Zeilen. Die beiden Rules enthalten bewusst nur noch **Vorschriften**
(Test-First-Pflicht, Runes-Pflicht, Clean-Code-Standards, Datei-Konventionen). Die
zugehörigen **Rezepte** liegen in `testing-patterns.md` und `svelte-patterns.md` und
laden erst, wenn eine Test- bzw. Komponentendatei angefasst wird.

**Alles andere lädt bedarfsgesteuert.** Wer `CLAUDE.md` erweitert, verteuert
_jede_ Session — neue Inhalte gehören daher fast immer in eine path-scoped Rule,
nicht in die `CLAUDE.md`.

> **Keine `@`-Importe in `CLAUDE.md` einbauen.** `@datei.md` wird **eager**
> expandiert und kostet in jeder Session Tokens, auch wenn das Thema nie
> vorkommt. Für bedingte Inhalte stattdessen eine Rule mit `paths:` anlegen.

---

## Rules — bedingtes Laden

Rules in `rules/` mit `paths:`-Frontmatter werden **nur** geladen, wenn Claude eine
passende Datei liest oder bearbeitet ([Doku](https://code.claude.com/docs/en/memory#path-specific-rules)).

```markdown
---
paths:
  - 'src/lib/server/db/**'
---

# Meine Regel
```

Rules **ohne** `paths` werden immer geladen: `architecture.md`, `testing.md`.
Beide sind bewusst kurz — neue Inhalte gehören in eine der path-scoped Rules.

| Rule                  | Lädt bei Dateien in …                                                             |
| --------------------- | --------------------------------------------------------------------------------- |
| `admin.md`            | `src/routes/admin/`, `src/lib/components/admin/`                                  |
| `api.md`              | `src/routes/api/`, `rest_sichtungen/`, `sichtungen/`, `health/`                   |
| `browser-storage.md`  | `src/lib/storage/`                                                                |
| `daisyui.md`          | `**/*.svelte`, `src/app.css`, `src/css/`, `tailwind.config.js`                    |
| `database.md`         | `src/lib/server/db/`, `drizzle.config.ts`, `src/lib/server/geo/`, `routes/api/`   |
| `docker.md`           | `Dockerfile`, `docker-compose*.yml`, `.env.docker`, `run-release.sh`              |
| `email.md`            | `emailService.ts`, `src/lib/server/templates/`, `api/admin/test-email/`           |
| `export.md`           | `src/lib/server/export/`, `api/sightings/export/`, `ExportModal.svelte`           |
| `forms.md`            | `src/lib/form/`, `src/lib/report/`, `components/form/`, `routes/+page.svelte`     |
| `geo.md`              | `src/lib/server/geo/`, `src/lib/utils/geo/`, `api/geo/`                           |
| `legacy-api.md`       | `routes/rest_sichtungen/`, `routes/sichtungen/`, `src/lib/legacy-api/`            |
| `maps.md`             | `src/lib/map/`, `components/map/`, `routes/map/`, `api/map/`                      |
| `middleware.md`       | `src/lib/server/middleware/`, `src/hooks.server.ts`                               |
| `security.md`         | `src/lib/server/auth/`, `src/lib/server/storage/`, `hooks.server.ts`, `api/auth/` |
| `svelte-patterns.md`  | `**/*.svelte`, `**/*.svelte.ts`                                                   |
| `testing-patterns.md` | `**/*.test.ts`, `**/*.svelte.test.ts`, `e2e/`, `vitest*`, `playwright.config.ts`  |
| `upload.md`           | `src/lib/server/storage/`, `src/lib/server/media/`, `uploads.ts`, `api/files/`    |
| `weather.md`          | `components/weather/`, `services/weather*.ts`, `utils/weather/`, `api/weather/`   |

Die Tabelle ist Doku für Menschen — die Wahrheit steht im Frontmatter der Datei.

---

## Skills

Slash-Commands sind in Claude Code in **Skills** aufgegangen. `skills/<name>/SKILL.md`
erzeugt `/<name>` und kann zusätzlich Begleitdateien, bedingtes Laden per `paths:`
und einen eigenen Kontext (`context: fork`) nutzen.

| Skill         | Aufruf        | Besonderheit                                             |
| ------------- | ------------- | -------------------------------------------------------- |
| `/tdd`        | User + Modell | RED → GREEN → REFACTOR, im Projekt verpflichtend         |
| `/review`     | User + Modell | `context: fork` — Checkliste belastet Hauptkontext nicht |
| `/prepare-pr` | nur User      | erzeugt Commits und PRs                                  |
| `/local-dev`  | nur User      | startet Server und Datenbank                             |
| `/deploy`     | User + Modell | lädt Deployment-Doku on demand                           |
| `/db-migrate` | User + Modell | lädt Migrations-Doku on demand                           |

`disable-model-invocation: true` verhindert, dass Claude einen Skill selbst startet —
gesetzt bei allem mit Seiteneffekten (`/prepare-pr`, `/local-dev`).

---

## Agents

Subagents in `agents/` werden über ihre `description` automatisch delegiert.

| Agent                 | Zweck                                                        |
| --------------------- | ------------------------------------------------------------ |
| `testing`             | Unit- und E2E-Tests. **Proaktiv vor** jeder Implementierung. |
| `form-development`    | Multi-Step-Formulare, `createForm` + Yup, Accessibility      |
| `map-features`        | OpenLayers, PostGIS-Queries, Koordinaten                     |
| `architecture-review` | Anti-Pattern-Erkennung, priorisierte Fixes                   |

---

## MCP Server

Projekt-Server stehen in [`../.mcp.json`](../.mcp.json) und werden **mitcommittet**,
damit das Team und neue Worktrees sie automatisch erben.

| Server        | Zweck                     | Credentials        |
| ------------- | ------------------------- | ------------------ |
| `drizzle-orm` | Drizzle ORM Docs (GitMCP) | keine              |
| `github`      | PR-/Issue-Management      | `GITHUB_MCP_TOKEN` |

**Secrets gehören nicht in `.mcp.json`.** Der GitHub-Server liest sein Token aus der
Umgebungsvariablen `GITHUB_MCP_TOKEN`; wer sie nicht gesetzt hat, verliert nur diesen
einen Server. Setzen z. B. via Shell-Profil:

```bash
export GITHUB_MCP_TOKEN="ghp_..."
```

Zusätzlich verfügbar, aber nicht projekt-konfiguriert: **Context7** (allgemeine
Library-Doku) läuft als User-Connector.

> **Warum kein `daisyui`- und kein `openlayers`-Server?** Beide GitMCP-Server wurden
> getestet und lieferten auf konkrete Fachfragen _keine_ Doku, sondern nur die
> GitHub-README des Repos. Grund: GitMCP indexiert das **Repository**, aber DaisyUI
> (daisyui.com) und OpenLayers (generiertes apidoc auf openlayers.org) halten ihre
> Doku außerhalb. Für beide stattdessen **Context7** nutzen. Siehe `rules/daisyui.md`.

`drizzle-orm` wurde ebenfalls getestet und **funktioniert** — es liefert echte Treffer
aus `docs/*.md` und `llms.txt` im Repo. Die Abdeckung ist allerdings schmal
(Custom Types, Joins, Table-Introspect); die Haupt-Doku liegt auf orm.drizzle.team.
Für breitere Fragen bleibt Context7 die bessere Quelle.

### Kandidat: PostgreSQL / PostGIS

Aktuell ist **kein** Postgres-MCP konfiguriert, obwohl PostGIS Kerntechnologie ist.
Geprüfte Option: [`pg-aiguide`](https://github.com/timescale/pg-aiguide) von TigerData —
semantische Suche über PostgreSQL- **und PostGIS**-Doku, bringt eine
`design-postgis-tables`-Skill mit (SRID, GiST-Indizes, `ST_DWithin`,
GEOMETRY-vs-GEOGRAPHY). Verbindet sich **nie** mit einer Datenbank, braucht keine
Credentials:

```bash
claude mcp add --transport http --scope project pg-aiguide https://mcp.tigerdata.com/docs
```

Für Query-Tuning gegen die lokale DB gäbe es zusätzlich `crystaldba/postgres-mcp`
(EXPLAIN, hypothetische Indizes) — der braucht aber volle DB-Credentials und müsste
für PostGIS-Queries im `unrestricted`-Modus laufen (Schreibrechte). Nur mit
`--scope local` und ausschließlich gegen die Dev-DB sinnvoll.

---

## Plugins

Das offizielle Svelte-Plugin liefert Runes-/SSR-Doku, einen Autofixer und einen
`svelte-file-editor`-Agent:

```bash
claude plugin marketplace add sveltejs/ai-tools
claude plugin install svelte
```

**Plugins lassen sich nicht über committete Projekt-Settings verteilen.** Der
`enabledPlugins`-Schlüssel in `settings.json` schaltet nur bereits installierte
Plugins frei, er installiert sie nicht. Jede:r im Team muss die beiden Befehle
oben einmal selbst ausführen — anders als bei `.mcp.json`, das automatisch greift.

---

## Hooks

In [`settings.json`](settings.json):

| Hook     | Event                    | Aktion                           |
| -------- | ------------------------ | -------------------------------- |
| Prettier | PostToolUse (Write/Edit) | Auto-Format nach Dateiänderungen |

---

## Konfiguration erweitern — Faustregeln

1. **Neue Regel?** → `rules/<thema>.md` mit `paths:`. Nur in `CLAUDE.md`, wenn sie
   wirklich für _jede_ Datei gilt.
2. **Neuer Workflow?** → `skills/<name>/SKILL.md`. Seiteneffekte ⇒
   `disable-model-invocation: true`. Lange Checkliste ⇒ `context: fork`.
3. **Neuer MCP-Server?** → `.mcp.json`, wenn credential-frei; sonst
   `claude mcp add --scope local`.
4. **Etwas geändert?** → diese README und die Pfad-Tabelle nachziehen. Sie ist
   schon einmal auseinandergelaufen.

---

## Projektstruktur

```
src/
├── lib/
│   ├── components/          # Wiederverwendbare UI-Komponenten
│   │   ├── admin/           # Admin-UI-Komponenten
│   │   ├── docs/            # API-Doku-Komponenten
│   │   ├── form/            # Generische Form-Komponenten
│   │   ├── map/             # Karten-Komponenten (OLMap.svelte etc.)
│   │   ├── media/           # Medien-Anzeige (Galerie etc.)
│   │   ├── ui/              # Basis-UI (Dialog, Toast etc.)
│   │   └── weather/         # Wetter-Anzeige
│   ├── constants/           # Enums, Konstanten
│   ├── form/                # createForm.ts + validation/ (Yup Schema)
│   ├── legacy-api/          # Legacy API Utilities (Field Mapping, Validation)
│   ├── logger/              # Pino Logger (Server + Client)
│   ├── map/                 # OpenLayers Controller & Utilities
│   ├── report/              # Sichtungsmeldung
│   │   ├── components/      # Form Steps, Sections, Fields
│   │   └── formOptions/     # Enum/Option Definitionen (16 Dateien)
│   ├── server/
│   │   ├── audit/           # Audit-Logging
│   │   ├── auth/            # JWT/Auth0 Authentication
│   │   ├── config/          # ConfigService, Access Control
│   │   ├── datetime/        # Server-Datums-Utilities
│   │   ├── db/              # Schema, Repository Layer
│   │   ├── export/          # CSV, JSON, KML, XML Export
│   │   ├── geo/             # Baltic Sea Validation
│   │   ├── media/           # Medien-Verarbeitung
│   │   ├── middleware/      # Security Headers, Rate Limit, Maintenance, DB-Check
│   │   ├── services/        # Email, Weather Services
│   │   ├── spam/            # Spam-Erkennung
│   │   ├── storage/         # File Storage (Local, Vercel Blob)
│   │   ├── templates/       # Email-Templates (Handlebars)
│   │   ├── utils/           # Server-Utilities (z.B. getClientIp)
│   │   └── validation/      # Request-Validierung, Magic Bytes
│   ├── services/            # Client-Services (configService, weatherService)
│   ├── storage/             # Browser Storage (GDPR-aware)
│   ├── stores/              # Svelte Stores (Toast, Config)
│   ├── types/               # TypeScript Definitionen
│   └── utils/               # Client/Shared Utilities (date, geo, media, upload, ...)
├── routes/
│   ├── about/               # Über-Seite
│   ├── admin/               # Admin-Interface
│   ├── api/                 # Backend API Endpoints
│   ├── docs/                # API-Dokumentation (Scalar)
│   ├── health/              # Health-Check-Endpoint
│   ├── maintenance/         # Wartungsmodus-Seite
│   ├── map/                 # Karten-Visualisierung
│   ├── rest_sichtungen/     # Legacy REST API
│   ├── sichtungen/          # Legacy Sichtungs-API
│   └── uploads/             # Ausgelieferte Uploads (Local Storage)
└── hooks.server.ts          # Middleware Chain (sequence)
e2e/                         # E2E Tests (Root-Level)
monitoring/                  # Prometheus + Grafana Konfiguration
```

---
