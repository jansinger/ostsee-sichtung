# Git Worktrees — Setup und Betrieb

Claude Code legt Worktrees unter `.claude/worktrees/<name>/` an, manuelle liegen in
`.worktrees/`. Beide Verzeichnisse sind gitignoriert.

## Einrichtung

```bash
npm run worktree:setup
```

Das Skript ([`scripts/setup-worktree.sh`](../scripts/setup-worktree.sh)) ist idempotent
und im Haupt-Repo ein No-Op. Es läuft zusätzlich automatisch über den
`SessionStart`-Hook in [`.claude/settings.json`](../.claude/settings.json), ein
frischer Worktree ist also ohne Zutun einsatzbereit.

| Schritt                 | Warum                                                                      |
| ----------------------- | -------------------------------------------------------------------------- |
| `.env` → Haupt-Repo     | Symlink statt Kopie: keine driftenden Zweitfassungen der Secrets           |
| `uploads/` → Haupt-Repo | `UPLOAD_PATH` ist relativ, die DB teilen sich aber alle Worktrees          |
| `svelte-kit sync`       | ohne `.svelte-kit/tsconfig.json` bricht `npm run type-check` mit TS5083 ab |
| Lockfile-Vergleich      | warnt, wenn der Branch andere Abhängigkeiten braucht als das Haupt-Repo    |

## Kein `npm install` im Worktree

Node und npm suchen `node_modules` in **allen übergeordneten Verzeichnissen**. Weil die
Worktrees unter `<repo>/.claude/worktrees/` liegen, greifen sie automatisch auf
`<repo>/node_modules` zu — inklusive `node_modules/.bin`, also auch `npm run …`.

Verifiziert in einem Worktree ganz ohne eigenes `node_modules`: `npm run lint`,
`npx svelte-kit sync` und `npm run test:unit` (2038 Tests) liefen durch.

Eine eigene Installation kostet ~800 MB pro Worktree ohne Gegenwert. Nötig ist sie nur
in zwei Fällen:

- der Branch ändert `package.json`/`package-lock.json` — dann `npm install` **im
  Worktree** (das lokale `node_modules` verdeckt das des Haupt-Repos)
- der Worktree liegt außerhalb des Repo-Baums — dann greift die Auflösung nach oben nicht

## Was von selbst funktioniert

| Thema           | Warum kein Setup nötig                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| TLS-Zertifikate | `npm run dev` ruft `scripts/setup-dev-certs.mjs` auf und stellt sie pro Worktree aus (mkcert-CA ist global) |
| Git-Hooks       | `core.hooksPath = .husky/_` löst gegen das Haupt-Repo auf — prüfbar mit `git rev-parse --git-path hooks`    |
| MCP-Server      | `.mcp.json` ist committet und wird mit ausgecheckt                                                          |
| Rules & Skills  | `.claude/rules/`, `.claude/agents/`, `.claude/skills/` sind committet                                       |
| Playwright      | Browser liegen global in `~/Library/Caches/ms-playwright`                                                   |

Nicht mit übernommen wird `.claude/settings.local.json` (global gitignoriert) — lokale
Permissions gelten pro Worktree neu. Bei Bedarf verlinken:

```bash
ln -s ../../settings.local.json .claude/settings.local.json
```

## Dev-Server: nur einer auf Port 4000

`PUBLIC_SITE_URL` steht in `.env` fest auf `https://localhost:4000` und baut daraus die
Auth0-Callback-URL (`src/routes/api/auth/login/+server.ts`). Ein Dev-Server auf einem
anderen Port schickt Auth0 deshalb zurück auf 4000 — verifiziert: mit
`VITE_DEV_PORT=4005` enthält der `/api/auth/login`-Redirect weiterhin
`redirect_uri=https://localhost:4000/…`.

Für einen zweiten Server parallel:

```bash
echo 'PUBLIC_SITE_URL="https://localhost:4005"' > .env.local   # überschreibt .env
VITE_DEV_PORT=4005 npm run dev
```

`.env.local` hat in Vite Vorrang vor `.env` und ist gitignoriert (verifiziert: der
Redirect zeigt danach auf 4005). **Login funktioniert trotzdem nur**, wenn genau diese
Callback-URL in den Auth0-Einstellungen als _Allowed Callback URL_ hinterlegt ist.
Ohne Auth0-Eintrag: Dev-Server auf 4000 lassen und immer nur einen laufen lassen.

E2E-Tests nutzen ohnehin Port 4001 (`npm run test:e2e`).

## Geteilte Ressourcen — Vorsicht

Alle Worktrees zeigen über den `.env`-Symlink auf **dieselbe** Datenbank und dieselben
Uploads.

- `npm run db:push` aus einem Worktree ändert das Schema für alle
- `npm run media:cleanup-orphans` löscht Dateien für alle
- Migrations-Branches deshalb bevorzugt gegen die Docker-DB (Port 5433) testen

## Code-Graph-Tools

`.tokensave/` und `.codegraph/` liegen nur im Haupt-Repo und sind nicht committet.
Abfragen aus einem Worktree beantworten sie aus dem Index des Haupt-Repos — Symbole,
die es nur auf dem Branch gibt, fehlen dort. `tokensave` warnt in dem Fall selbst.
Bei branch-spezifischen Fragen mit Read/Grep gegenprüfen.

## Aufräumen

```bash
git worktree list                         # Übersicht
git worktree remove .claude/worktrees/<name>
git worktree prune                        # verwaiste Einträge
```

Alte Worktrees mit eigenem `node_modules` (aus der Zeit vor diesem Setup) lassen sich
gefahrlos verschlanken:

```bash
du -sh .claude/worktrees/*/node_modules   # Kandidaten finden
rm -rf .claude/worktrees/<name>/node_modules
```
