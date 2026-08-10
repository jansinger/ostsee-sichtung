#!/usr/bin/env bash
#
# Richtet einen frisch angelegten git-Worktree für die lokale Entwicklung ein.
#
# Idempotent und im Haupt-Repo ein No-Op — deshalb kann das Skript gefahrlos bei
# jedem Session-Start laufen (SessionStart-Hook in .claude/settings.json).
#
#   bash scripts/setup-worktree.sh            # mit Ausgabe
#   bash scripts/setup-worktree.sh --quiet    # nur Warnungen (Hook-Modus)
#
# Was es NICHT tut — und warum:
#   * kein `npm install`: Node und npm suchen node_modules in allen übergeordneten
#     Verzeichnissen. Weil die Worktrees unter <repo>/.claude/worktrees/ liegen,
#     greifen sie automatisch auf <repo>/node_modules zu. Eine eigene Installation
#     kostet ~800 MB pro Worktree ohne Gegenwert.
#   * keine Zertifikate: `npm run dev` ruft scripts/setup-dev-certs.mjs selbst auf.
#   * kein husky-Setup: core.hooksPath ist relativ und löst gegen das Haupt-Repo
#     auf (`git rev-parse --git-path hooks`), die Hooks greifen also ohnehin.
#
set -euo pipefail

QUIET=0
[ "${1:-}" = "--quiet" ] && QUIET=1

say() { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }
warn() { printf 'worktree-setup: %s\n' "$*" >&2; }

# --- Nur in verlinkten Worktrees arbeiten ------------------------------------
# Im Haupt-Repo sind git-dir und git-common-dir identisch, im Worktree nicht.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
[ "$(git rev-parse --git-dir)" != "$(git rev-parse --git-common-dir)" ] || exit 0

cd "$(git rev-parse --show-toplevel)"
MAIN="$(git worktree list --porcelain | sed -n '1s/^worktree //p')"
[ -n "$MAIN" ] && [ -d "$MAIN" ] || { warn "Haupt-Worktree nicht gefunden"; exit 0; }

DID_SOMETHING=0

# --- .env verlinken ----------------------------------------------------------
# Symlink statt Kopie: Credentials-Änderungen im Haupt-Repo gelten sofort überall,
# und es entstehen keine driftenden Zweitfassungen der Secrets.
if [ ! -e .env ]; then
	if [ -f "$MAIN/.env" ]; then
		ln -s "$MAIN/.env" .env
		say "worktree-setup: .env → $MAIN/.env verlinkt"
		DID_SOMETHING=1
	else
		warn ".env fehlt auch im Haupt-Repo — aus .env.example anlegen"
	fi
fi

# --- uploads/ verlinken ------------------------------------------------------
# UPLOAD_PATH ist relativ ("uploads"), die Datenbank teilen sich aber alle
# Worktrees. Ohne Symlink zeigen Medien-Datensätze auf lokal fehlende Dateien.
if [ ! -e uploads ] && [ -d "$MAIN/uploads" ]; then
	ln -s "$MAIN/uploads" uploads
	say "worktree-setup: uploads → $MAIN/uploads verlinkt"
	DID_SOMETHING=1
fi

# --- SvelteKit-Typen erzeugen ------------------------------------------------
# `npm run check`, `build` und `dev` synchronisieren selbst; `npm run type-check`
# (tsc --noEmit) nicht — ohne .svelte-kit/tsconfig.json bricht es mit TS5083 ab.
if [ ! -f .svelte-kit/tsconfig.json ]; then
	if npx --no-install svelte-kit sync >/dev/null 2>&1; then
		say "worktree-setup: .svelte-kit/ erzeugt (svelte-kit sync)"
		DID_SOMETHING=1
	else
		warn "svelte-kit sync fehlgeschlagen — 'npm install' im Haupt-Repo nötig?"
	fi
fi

# Paraglide erzeugt src/lib/paraglide/ — nicht im Repository, aber von
# type-check, lint und check vorausgesetzt. Ohne diesen Schritt ist ein frischer
# Worktree rot, und zwar mit Fehlern, die nach kaputtem Setup aussehen.
if npx --no-install paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide >/dev/null 2>&1; then
	say "worktree-setup: src/lib/paraglide/ erzeugt (paraglide-js compile)"
else
	warn "paraglide-js compile fehlgeschlagen — 'npm install' im Haupt-Repo nötig?"
fi

# --- Abhängigkeiten prüfen ---------------------------------------------------
if [ ! -d node_modules ] && [ ! -d "$MAIN/node_modules" ]; then
	warn "weder hier noch im Haupt-Repo liegt node_modules — bitte 'npm install' in $MAIN"
elif [ ! -d node_modules ] && ! cmp -s package-lock.json "$MAIN/package-lock.json"; then
	warn "package-lock.json weicht vom Haupt-Repo ab — für diesen Branch 'npm install' in diesem Worktree ausführen"
fi

# --- Portlage melden ---------------------------------------------------------
# PUBLIC_SITE_URL ist auf https://localhost:4000 festgenagelt und baut die
# Auth0-Callback-URL. Ein zweiter Dev-Server braucht deshalb mehr als nur
# VITE_DEV_PORT — siehe docs/WORKTREES.md.
if [ "$QUIET" -eq 0 ] && command -v lsof >/dev/null 2>&1 && lsof -ti:4000 >/dev/null 2>&1; then
	say "worktree-setup: Port 4000 ist belegt — anderer Dev-Server läuft (siehe docs/WORKTREES.md)"
fi

[ "$DID_SOMETHING" -eq 1 ] || say "worktree-setup: nichts zu tun, Worktree ist eingerichtet"
