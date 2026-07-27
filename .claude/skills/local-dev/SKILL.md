---
description: Startet die lokale Entwicklungsumgebung mit Prüfung von .env, Dependencies, Datenbank und Dev-Server. Nur auf ausdrückliche Anfrage des Users verwenden.
allowed-tools: Bash, Read
disable-model-invocation: true
---

# Lokale Entwicklungsumgebung

Startet die lokale Entwicklungsumgebung.

## Workflow

### Schritt 1: Environment prüfen

Prüfe ob `.env` existiert und die notwendigen Variablen enthält:

```bash
# Prüfe .env Existenz
test -f .env && echo ".env vorhanden" || echo "FEHLER: .env fehlt"

# Prüfe kritische Variablen
grep -q "DATABASE_POSTGRES_URL" .env && echo "DB URL konfiguriert" || echo "FEHLER: DATABASE_POSTGRES_URL fehlt"
```

**Kritische Variablen:**

- `DATABASE_POSTGRES_URL` - Datenbankverbindung
- `AUTH0_CLIENT_ID` - Auth0 Client (falls Auth aktiv)
- `BLOB_READ_WRITE_TOKEN` - Blob Storage (falls aktiv)

### Schritt 2: Dependencies prüfen

```bash
# Node modules aktuell?
npm ls --depth=0 2>/dev/null || npm install
```

### Schritt 3: Datenbank prüfen

**Option A - Native PostgreSQL (Port 5432):**

```bash
pg_isready -h localhost -p 5432 && echo "PostgreSQL läuft" || echo "PostgreSQL nicht erreichbar"
```

**Option B - Docker PostgreSQL (Port 5433):**

```bash
docker ps | grep postgres || echo "Docker PostgreSQL nicht gestartet - npm run db:start ausführen"
```

### Schritt 4: Entwicklungsserver starten

```bash
npm run dev
```

**Server läuft auf:**

- URL: https://localhost:4000
- HTTPS: Automatische Zertifikate

## Ausgabe

Nach erfolgreichem Start:

```
Entwicklungsumgebung gestartet!

Server: https://localhost:4000
DB: [Native PostgreSQL | Docker PostgreSQL]

Nützliche Befehle:
- npm run db:studio  → Drizzle Studio
- npm run test:unit  → Unit Tests
- npm run lint       → Linting
```

## Fehlerbehebung

| Problem             | Lösung                                              |
| ------------------- | --------------------------------------------------- |
| `.env` fehlt        | Kopiere `.env.example` zu `.env`                    |
| DB nicht erreichbar | `npm run db:start` (Docker) oder PostgreSQL starten |
| Port 4000 belegt    | Prozess beenden: `lsof -i :4000`                    |
| SSL Fehler          | Zertifikate löschen: `rm -rf ./certs`               |
