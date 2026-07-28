---
description: Lädt die Datenbank-Migrations-Referenz. Nutze dies bei Schema-Migrationen, Drizzle-Migrations-Fragen, DB-Setup oder wenn ausstehende Migrationen geprüft werden sollen.
allowed-tools: Bash, Read
---

# Datenbank Migration

## Migrations-Strategie (Kurzreferenz)

Deployte Umgebungen werden ausschließlich über **generierte Migrationen**
aktualisiert (`drizzle/`-Verzeichnis, Journal `drizzle.__drizzle_migrations`):

- `npm run db:generate` — Migration aus Schema-Änderung generieren; die neue
  SQL-Datei in `drizzle/` MUSS mit committet werden.
- `npm run db:migrate` — Migrationen anwenden (`scripts/docker-migrate.ts`;
  läuft im Docker-Container automatisch beim Start, inkl. Baseline-Erkennung
  und Destruktiv-Guard). Benötigt Node ≥ 22.18.
- `npm run db:push` — nur für schnelle Iteration auf der lokalen Dev-DB.

Details: `.claude/rules/database.md`.

## Schritt 1: Dokumentation laden

Lies die relevanten Dokumente:

- `docs/DATABASE_MIGRATION.md` — Migrations-Anleitung (Datenübernahme Altsystem)
- `docs/ENVIRONMENT.md` — Umgebungsvariablen (DB-Konfiguration, RUN_MIGRATIONS)

## Schritt 2: Aktuellen DB-Status prüfen

Prüfe Schema-Status und ausstehende Migrationen (Journal-Tabelle
`drizzle.__drizzle_migrations` vs. `drizzle/meta/_journal.json`).

## Schritt 3: Migration durchführen

Unterstütze bei der Migration basierend auf den Docs.
