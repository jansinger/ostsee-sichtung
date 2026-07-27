---
description: Bereitet einen Pull Request vor — Branch-Prüfung, Tests, Code-Qualität, Conventional Commit, Push und PR-Erstellung. Nur auf ausdrückliche Anfrage des Users verwenden.
argument-hint: '[optionale Beschreibung der Änderungen]'
allowed-tools: Bash, Read, Grep
disable-model-invocation: true
---

# Pull Request vorbereiten

Bereitet einen Pull Request vor.

## Argumente

`$ARGUMENTS` - Optionale Beschreibung der Änderungen

## Workflow

### Schritt 1: Branch prüfen

**WICHTIG:** Der `main` Branch ist geschützt. Änderungen müssen über Pull Requests erfolgen.

```bash
# Aktuellen Branch prüfen
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ Fehler: Du bist auf dem main Branch!"
    echo "Erstelle einen neuen Branch mit: git checkout -b <branch-name>"
    exit 1
fi
```

**Falls auf `main`:** Neuen Branch erstellen basierend auf den Änderungen:

```bash
# Branch-Name nach Konvention: <type>/<kurze-beschreibung>
# Beispiele: feat/add-export, fix/login-bug, docs/update-readme
git checkout -b <type>/<kurze-beschreibung>
```

**Branch-Typen:**

- `feat/` - Neue Features
- `fix/` - Bugfixes
- `docs/` - Dokumentation
- `refactor/` - Code-Umstrukturierung
- `test/` - Tests
- `chore/` - Wartung

### Schritt 2: TDD-Coverage-Hinweis (nicht blockierend)

Prüfe ob neue/geänderte Quelldateien ohne Test-Gegenstück existieren. Diese Prüfung ist ein **Hinweis**, kein harter Gate — die Entscheidung ob Tests nachgezogen werden liegt beim User.

```bash
# Geänderte Source-Dateien (ohne Tests, Config, Typen, Routing-Files)
git diff --name-only main...HEAD \
  | grep -E '\.(ts|svelte)$' \
  | grep -v '\.test\.' \
  | grep -v '\.spec\.' \
  | grep -v '\.config\.' \
  | grep -v '\.d\.ts$' \
  | grep -v 'types\.ts$' \
  | grep -v '+page\.svelte$' \
  | grep -v '+layout\.svelte$' \
  | grep -v '+error\.svelte$'
```

Für jede gefundene Datei prüfen ob eine entsprechende `.test.ts` Datei existiert:

- `src/lib/utils/foo.ts` → `src/lib/utils/foo.test.ts`
- `src/lib/components/Bar.svelte` → `src/lib/components/Bar.svelte.test.ts`
- `src/routes/api/*/+server.ts` → daneben als `+server.test.ts`

**Verbleibende Ausnahmen** (manuell prüfen, kein Test erforderlich):

- Reine Re-Exports / Barrel-Files (nur `export * from ...` — lässt sich nicht per grep filtern)
- Reine Styling-Änderungen

**Wenn Dateien ohne Tests gefunden:** Hinweis ausgeben, `/tdd` als Option anbieten. **Nicht blockieren.**

### Schritt 3: Tests ausführen

```bash
npm run test:quick
```

Enthält:

- ESLint
- TypeScript Type-Check
- Svelte-Check
- Unit Tests

**Bei Fehler:** Stoppen und Fehler beheben lassen.

### Schritt 4: Code-Qualität prüfen

Führe `/simplify` auf den geänderten Dateien aus, um Code-Qualität, Wiederverwendung und Effizienz zu prüfen. Behebe gefundene Probleme bevor du fortfährst.

### Schritt 5: A11y- und Design-System-Prüfung

Verbindliche Regeln: `.claude/rules/design-system.md`. Geänderte `.svelte`-Dateien auf verdächtige Muster durchsuchen:

```bash
git diff --name-only main...HEAD \
  | grep '\.svelte$' \
  | xargs grep -ln 'text-[a-z]*-content\|placeholder=\|onclick\|~icons/\|animate-in\|slide-in-from' 2>/dev/null
```

Für jeden Treffer prüfen:

1. **Kontrast:** `*-content`-Text auf `bg-*/10`/`/20`-Tint? Im Theme `meeresmuseum` (`src/app.css`) sind `*-content`-Farben fast durchgängig Weiß — auf hellem Tint unlesbar (Praxisfall: gemessen 1,3:1). Messen im Dev-Server: `getComputedStyle` liefert `oklch(...)`-Strings; per Canvas-2D (`ctx.fillStyle = wert`, dann `ctx.getImageData`) nach sRGB konvertieren und die WCAG-Kontrastformel anwenden. Ziel: Text ≥ 4.5:1, große Schrift/Icons ≥ 3:1.
2. **Formularfelder:** Pflicht-Sternchen und `aria-required` aus derselben Quelle, Fehler mit `role="alert"` + `aria-describedby`, sichtbares Label statt reinem `placeholder`.
3. **Interaktive Elemente:** echte `<button>`/`<a>` statt klickbarer `<div>`/`<li>`; unvollständige ARIA-Rollen (z.B. `role="tab"` ohne `tabpanel`) sind ein Fail; Tastaturbedienbarkeit und sichtbarer Fokus; Touch-Target ≥ 44px.
4. **Dekorative Icons:** ohne eigene Bedeutung → `aria-hidden="true"`.
5. **Tote Utilities:** `animate-in`/`slide-in-from-*` etc. greifen hier nicht (kein Animations-Plugin installiert) — entfernen oder ersetzen.

**Bei eindeutigem Kontrast-Fail oder fehlendem `aria-required`/`role="alert"`:** beheben, bevor fortgefahren wird. Bei Grenzfällen: unter "Testplan" im PR-Body vermerken statt zu blockieren.

### Schritt 6: Git Status prüfen

```bash
git status
git diff --stat
```

### Schritt 7: Änderungen analysieren

Analysiere welche Dateien geändert wurden:

- Neue Features?
- Bug Fixes?
- Refactoring?
- Dokumentation?

### Schritt 8: Commit erstellen

Nutze Conventional Commits Format:

```bash
git add .
git commit -m "$(cat <<'EOF'
<type>(<scope>): <beschreibung>

[Optionaler Body mit Details]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Typen:**

- `feat` - Neue Funktion
- `fix` - Bugfix
- `docs` - Dokumentation
- `refactor` - Code-Umstrukturierung
- `test` - Tests
- `chore` - Wartung

**Scopes:**
`deps`, `api`, `ui`, `db`, `auth`, `export`, `admin`, `report`, `map`, `config`, `build`, `ci`, `docs`, `test`, `types`, `style`, `perf`, `security`, `a11y`, `release`, `media`

### Schritt 9: Push und PR erstellen

```bash
# Push (mit Upstream-Tracking)
git push -u origin $(git branch --show-current)

# PR erstellen gegen main
gh pr create --base main --title "<type>(<scope>): <beschreibung>" --body "$(cat <<'EOF'
## Zusammenfassung

<1-3 Bullet Points>

## Änderungen

- [ ] Änderung 1
- [ ] Änderung 2

## Testplan

- [ ] Tests laufen durch
- [ ] Manuelle Prüfung durchgeführt

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Ausgabe

Nach erfolgreichem Abschluss:

```
Pull Request vorbereitet!

Tests: ✅ Bestanden
Commit: <commit-hash>
Branch: <branch-name>
PR: <pr-url>

Nächste Schritte:
1. PR-Beschreibung prüfen
2. Reviewer hinzufügen
3. Auf CI warten
```

## Checkliste

- [ ] Nicht auf main Branch
- [ ] Alle Tests bestanden
- [ ] Keine Linting-Fehler
- [ ] A11y-/Design-System-Prüfung durchgeführt (Kontrast, Formularfelder, ARIA) — siehe `.claude/rules/design-system.md`
- [ ] Commit Message folgt Conventional Commits
- [ ] PR-Beschreibung aussagekräftig
- [ ] Dokumentation aktualisiert (falls nötig)

## Hinweise

- **Protected Branch:** Der `main` Branch ist geschützt und akzeptiert keine direkten Pushes
- **Branch-Konvention:** Nutze `<type>/<beschreibung>` für Branch-Namen
- **PR-Basis:** PRs werden immer gegen `main` erstellt
