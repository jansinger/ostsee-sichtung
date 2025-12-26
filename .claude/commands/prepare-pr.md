---
name: prepare-pr
description: Bereitet einen Pull Request vor mit Tests, Linting und Commit-Erstellung.
allowed-tools: Bash, Read, Grep
---

# /prepare-pr

Bereitet einen Pull Request vor.

## Argumente

`$ARGUMENTS` - Optionale Beschreibung der Änderungen

## Workflow

### Schritt 1: Tests ausführen

```bash
npm run test:quick
```

Enthält:
- ESLint
- TypeScript Type-Check
- Svelte-Check
- Unit Tests

**Bei Fehler:** Stoppen und Fehler beheben lassen.

### Schritt 2: Git Status prüfen

```bash
git status
git diff --stat
```

### Schritt 3: Änderungen analysieren

Analysiere welche Dateien geändert wurden:
- Neue Features?
- Bug Fixes?
- Refactoring?
- Dokumentation?

### Schritt 4: Commit erstellen

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

### Schritt 5: Push und PR erstellen

```bash
# Push
git push -u origin $(git branch --show-current)

# PR erstellen
gh pr create --title "<type>(<scope>): <beschreibung>" --body "$(cat <<'EOF'
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

- [ ] Alle Tests bestanden
- [ ] Keine Linting-Fehler
- [ ] Commit Message folgt Conventional Commits
- [ ] PR-Beschreibung aussagekräftig
- [ ] Dokumentation aktualisiert (falls nötig)
