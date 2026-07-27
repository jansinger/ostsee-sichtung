---
description: Code-Review der geänderten Dateien mit projektspezifischen Anti-Pattern-Checks (Svelte-4-Syntax, any-Typen, unsanitisiertes HTML, globaler $state in .ts, nicht-parametrisierte SQL) plus /simplify. Nutze dies wenn der User ein Review, eine Qualitätsprüfung oder Anti-Pattern-Analyse der Änderungen möchte.
argument-hint: "[optionaler Scope, z.B. 'nur staged' oder ein Dateipfad]"
allowed-tools: Bash, Read, Grep, Glob
context: fork
---

# Code Review

Führt eine Code-Qualitätsprüfung auf geänderten Dateien durch.

## Argumente

`$ARGUMENTS` - Optionaler Scope (z.B. "nur staged", "alle Änderungen", spezifische Datei)

## Workflow

### Schritt 1: Geänderte Dateien ermitteln

```bash
# Staged + Unstaged Änderungen
git diff --name-only HEAD
# Falls keine Änderungen: Diff zum main Branch
git diff --name-only main...HEAD
```

### Schritt 2: Anti-Pattern Checks

Prüfe jede geänderte `.svelte` und `.ts` Datei auf diese projektspezifischen Anti-Patterns:

#### Svelte 4 Event Syntax (KRITISCH)

```bash
# In .svelte Dateien: on:click, on:submit, on:blur etc. sind Svelte 4
grep -n 'on:click\|on:submit\|on:blur\|on:change\|on:input\|on:keydown' <file>
```

**Fix:** `on:click` → `onclick`, `on:submit` → `onsubmit` etc.

#### TypeScript `any` Typen

```bash
grep -n ': any\b\|as any\b' <file>
```

**Fix:** Expliziten Typ verwenden.

#### Unsanitisiertes HTML (SICHERHEIT)

```bash
# {@html ...} ohne sanitizeHtml() ist ein XSS-Risiko
grep -n '{@html' <file>
```

**Fix:** Immer `sanitizeHtml()` aus `$lib/utils/sanitize` verwenden.

#### Globaler $state in .ts Dateien (SSR-Leak)

```bash
# $state in .ts (nicht .svelte.ts) Dateien leakt zwischen Usern
grep -n '\$state(' <file>
```

**Erlaubt in:** `.svelte` und `.svelte.ts` Dateien. **Verboten in:** regulären `.ts` Dateien.

#### Nicht-parametrisierte SQL

```bash
# Template Literals mit Variablen direkt in SQL
grep -n '`SELECT.*\${' <file>
```

**Fix:** Drizzle `sql` Tagged Template oder Repository Pattern verwenden.

### Schritt 3: /simplify ausführen

Führe `/simplify` auf den geänderten Dateien aus für allgemeine Code-Qualität:

- Wiederverwendung bestehender Utilities
- Effizienz und Lesbarkeit
- Unnötige Komplexität

### Schritt 4: Ergebnis zusammenfassen

Zeige einen strukturierten Report:

```
Code Review Ergebnis
====================

Geprüfte Dateien: N
Anti-Pattern gefunden: N

KRITISCH:
- [datei:zeile] Svelte 4 Event Syntax: on:click → onclick

WARNUNG:
- [datei:zeile] TypeScript any Typ gefunden

HINWEIS:
- [datei:zeile] Globaler $state in .ts Datei

/simplify Ergebnis:
- [Zusammenfassung der Findings]
```

## Checkliste

- [ ] Keine Svelte 4 Event Syntax
- [ ] Keine `any` Typen
- [ ] Kein `{@html}` ohne Sanitisierung
- [ ] Kein globaler `$state` in `.ts` Dateien
- [ ] Keine nicht-parametrisierte SQL
- [ ] Code-Qualität durch /simplify geprüft
