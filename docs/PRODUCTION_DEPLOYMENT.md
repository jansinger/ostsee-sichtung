# Production Deployment Guide

Schnellanleitung für das Deployment von Ostsee-Tiere in einer Produktionsumgebung.

> **Hinweis:** Diese Anleitung ist für erfahrene Administratoren gedacht, die Docker und Linux-Server verwalten. Für detaillierte Hintergrundinformationen siehe [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md).

> **Neu in v2.3.0:** Vite 8 mit Rolldown-Engine (10–30× schnellere Builds), @sveltejs/vite-plugin-svelte 7. Vorherige: PostgreSQL 18 mit PostGIS 3.6 Support, Node.js 24, Security Hardening.

---

## Inhaltsverzeichnis

1. [Voraussetzungen](#1-voraussetzungen)
2. [Server vorbereiten](#2-server-vorbereiten)
3. [Konfiguration erstellen](#3-konfiguration-erstellen)
4. [Anwendung starten](#4-anwendung-starten)
5. [Reverse Proxy einrichten](#5-reverse-proxy-einrichten)
6. [Datenbank initialisieren](#6-datenbank-initialisieren)
7. [Verifizierung](#7-verifizierung)
8. [Backup einrichten](#8-backup-einrichten)
9. [Updates durchführen](#9-updates-durchführen)

---

## 1. Voraussetzungen

### Server-Anforderungen

| Komponente | Minimum          | Empfohlen        |
| ---------- | ---------------- | ---------------- |
| CPU        | 2 Cores          | 4+ Cores         |
| RAM        | 4 GB             | 8+ GB            |
| Storage    | 20 GB SSD        | 50+ GB SSD       |
| OS         | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

### Software

- Docker 24.0+ mit Compose V2
- Reverse Proxy (Caddy empfohlen, oder Nginx)
- Domain mit DNS-Eintrag auf den Server

### Externe Dienste

- **Auth0 Account** mit konfigurierter Application
- **PostgreSQL Datenbank** (empfohlen: externer Managed Service)

---

## 2. Server vorbereiten

### Docker installieren

```bash
# Docker installieren (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Neu einloggen, dann testen
docker --version
docker compose version
```

### Projektverzeichnis erstellen

```bash
sudo mkdir -p /opt/ostsee-tiere
sudo chown $USER:$USER /opt/ostsee-tiere
cd /opt/ostsee-tiere

# Uploads-Verzeichnis erstellen
mkdir -p uploads
```

### Docker Compose herunterladen

```bash
# Nur die benötigten Dateien herunterladen
curl -fsSL https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/docker-compose.production.yml \
  -o docker-compose.yml

curl -fsSL https://raw.githubusercontent.com/jansinger/ostsee-sichtung/main/.env.docker \
  -o .env.example
```

---

## 3. Konfiguration erstellen

### Environment-Datei anlegen

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

### Pflicht-Konfiguration

Ersetze die Platzhalter mit deinen Werten:

```bash
# Datenbank (Option A: Inkludierte PostgreSQL-Instanz)
DATABASE_POSTGRES_URL="postgresql://postgres:DEIN_SICHERES_PASSWORT@db:5432/ostsee"
PGPASSWORD="DEIN_SICHERES_PASSWORT"

# Datenbank (Option B: Externe PostgreSQL - EMPFOHLEN)
# DATABASE_POSTGRES_URL="postgresql://user:pass@db.example.com:5432/ostsee"

# Security Keys (WICHTIG: Generiere diese mit den Befehlen unten!)
SESSION_SECRET="HIER_GENERIERTEN_WERT_EINFÜGEN"
ENCRYPTION_KEY="HIER_GENERIERTEN_WERT_EINFÜGEN"

# Token für den Aufräum-Cron (verwaiste Uploads). Ohne Wert bleibt der
# Endpunkt nur über eine Admin-Session erreichbar — siehe Abschnitt unten.
CLEANUP_TOKEN="HIER_GENERIERTEN_WERT_EINFÜGEN"

# Auth0 Konfiguration
AUTH0_CLIENT_ID="deine-client-id"
AUTH0_CLIENT_SECRET="dein-client-secret"
AUTH0_DOMAIN="dein-tenant.eu.auth0.com"
JWKS_URL="https://dein-tenant.eu.auth0.com/.well-known/jwks.json"
API_AUDIENCE="deine-api-audience"

# Anwendung
PUBLIC_SITE_URL="https://deine-domain.de"

# WICHTIG: Für Production spezifische Version pinnen!
IMAGE_TAG="v2.2.3"  # Nicht "latest" in Production!

# App nur über Reverse Proxy erreichbar machen
APP_HOST="127.0.0.1"
```

> **Vollständige Variablenreferenz:** Alle optionalen Einstellungen (E-Mail, Storage, Rate-Limiting etc.) siehe [ENVIRONMENT.md](./ENVIRONMENT.md).

### Security Keys generieren

```bash
# SESSION_SECRET (mindestens 32 Zeichen)
openssl rand -base64 32

# ENCRYPTION_KEY (64 Hex-Zeichen)
openssl rand -hex 32

# CLEANUP_TOKEN (mindestens 32 Zeichen)
openssl rand -hex 32
```

### Aufräum-Cron einrichten — Pflicht

Uploads werden übertragen, sobald ein Foto in der Dropzone landet; verknüpft
werden sie erst beim Absenden. Abgebrochene Formularläufe hinterlassen deshalb
Dateien samt EXIF-GPS. **Das Formular sagt Meldern zu, dass diese nach 24
Stunden gelöscht werden** — eingehalten wird das nur, wenn ein Job den Endpunkt
regelmäßig aufruft.

```bash
curl -fsS -X POST -H "Authorization: Bearer $CLEANUP_TOKEN" \
  "https://deine-domain.de/api/admin/cleanup-orphans?mode=execute"
```

Einmal täglich genügt. `-f` sorgt dafür, dass ein Fehlerstatus beim Cron-Dienst
als Fehlschlag ankommt. Ohne `mode=execute` läuft der Aufruf als reine Vorschau
und löscht nichts — ein Cron ohne dieses Flag sieht monatelang gesund aus und
räumt trotzdem nichts weg.

Vorschau zum Prüfen des Bestands:

```bash
curl -sk -X POST -H "Authorization: Bearer $CLEANUP_TOKEN" \
  "https://deine-domain.de/api/admin/cleanup-orphans"
```

---

## 4. Anwendung starten

### Container starten

```bash
cd /opt/ostsee-tiere

# Image herunterladen und starten
docker compose pull
docker compose up -d

# Logs prüfen
docker compose logs -f
```

### Health Check

```bash
# Warten bis Container healthy ist
docker compose ps

# Manueller Health Check
curl -f http://localhost:3000/health
```

---

## 5. Reverse Proxy einrichten

### Option A: Caddy (Empfohlen - Automatisches HTTPS)

```bash
# Caddy installieren
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Caddyfile erstellen:**

```bash
sudo nano /etc/caddy/Caddyfile
```

```
deine-domain.de {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

### Option B: Nginx mit Let's Encrypt

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

**Nginx-Konfiguration:**

```bash
sudo nano /etc/nginx/sites-available/ostsee-tiere
```

```nginx
server {
    listen 80;
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 50M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ostsee-tiere /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL-Zertifikat einrichten
sudo certbot --nginx -d deine-domain.de
```

---

## 6. Datenbank initialisieren

### PostGIS aktivieren (bei externer DB — VOR dem ersten Start)

Falls du eine externe PostgreSQL-Datenbank verwendest, muss PostGIS **vor dem
ersten Container-Start** aktiviert sein (die inkludierte `postgis/postgis`-DB
bringt das bereits mit):

```sql
-- Verbinde dich mit der Datenbank
psql -h db.example.com -U dein_user -d ostsee

-- PostGIS aktivieren
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### Schema-Migrationen (automatisch)

Das Datenbank-Schema wird **automatisch beim Container-Start** angelegt und
aktualisiert. Der Entrypoint führt die im Image enthaltenen, versionierten
SQL-Migrationen aus (`drizzle/`-Verzeichnis, Journal in
`drizzle.__drizzle_migrations`). Ein manueller Schritt ist nicht nötig.

```bash
# Migrations-Ausgabe des Starts prüfen
docker compose logs app | grep '\[migrate\]'
```

Eigenschaften des Migrationslaufs:

- **Idempotent:** Bereits angewendete Migrationen werden übersprungen; ein
  Neustart ohne Schema-Änderung ist ein No-op.
- **Transaktional:** Schlägt eine Migration fehl, wird zurückgerollt und der
  Container startet nicht (Fehler in den Logs).
- **Advisory Lock:** Mehrere gleichzeitig startende Container migrieren nie
  parallel.
- **Schutz vor Datenverlust:** Enthält eine ausstehende Migration destruktive
  Statements (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`), verweigert der
  Container den Start. Erst Backup erstellen (siehe Abschnitt 8), dann einmalig
  mit `ALLOW_DESTRUCTIVE_MIGRATIONS=true` starten.
- **Bestehende Datenbanken:** Eine früher per `db:push` aufgebaute DB wird beim
  ersten Start automatisch als Baseline übernommen (Migrationen werden markiert,
  nicht erneut ausgeführt) — vorausgesetzt, das DB-Schema entspricht dem
  Release des Images.
- Abschaltbar mit `RUN_MIGRATIONS=false` (dann muss das Schema extern gepflegt
  werden).

> **Migration von schweinswalsichtung.de** oder komplexe DB-Operationen (Permissions, Reference-IDs, Upload-Migration): Siehe [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md).

---

## 7. Verifizierung

### Checkliste

- [ ] `docker compose ps` zeigt alle Container als "healthy"
- [ ] `https://deine-domain.de` ist erreichbar
- [ ] `https://deine-domain.de/health` gibt `OK` zurück
- [ ] Login über Auth0 funktioniert
- [ ] Karte wird geladen
- [ ] Datei-Upload funktioniert
- [ ] Audit-Log-Eintrag nach erstem Admin-Login vorhanden: `SELECT * FROM audit_logs WHERE action = 'auth.login_success' LIMIT 1`

### Logs prüfen

```bash
# Alle Logs
docker compose logs

# Nur App-Logs (follow)
docker compose logs -f app

# Nur Fehler
docker compose logs app 2>&1 | grep -i error

# Security-Events (Rate Limit, Auth-Fehler)
docker compose logs app 2>&1 | grep '"event":"security.'
```

---

## 8. Backup einrichten

### Automatisches Datenbank-Backup

```bash
sudo nano /opt/ostsee-tiere/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/ostsee-tiere/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Datenbank-Backup (im Verzeichnis /opt/ostsee-tiere ausführen)
cd /opt/ostsee-tiere
docker compose -f docker-compose.production.yml exec -T db pg_dump -U postgres ostsee | \
  gzip > "$BACKUP_DIR/db-$DATE.sql.gz"

# Alte Backups löschen (älter als 30 Tage)
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +30 -delete

echo "Backup erstellt: db-$DATE.sql.gz"
```

```bash
chmod +x /opt/ostsee-tiere/backup.sh
```

### Cronjob einrichten (täglich 2 Uhr)

```bash
sudo crontab -e
```

```
0 2 * * * /opt/ostsee-tiere/backup.sh >> /var/log/ostsee-backup.log 2>&1
```

### Uploads sichern

```bash
# Uploads-Verzeichnis in Backup einbeziehen
tar czf /opt/ostsee-tiere/backups/uploads-$(date +%Y%m%d).tar.gz \
  /opt/ostsee-tiere/uploads
```

---

## 9. Audit Logging

Das System protokolliert kritische Admin-Aktionen in der `audit_logs` Tabelle und Security-Events als strukturierte JSON-Logs in stdout.

### Audit-Tabelle abfragen

**Drizzle Studio:**

```bash
npm run db:studio
# → Tabelle "audit_logs" öffnen
```

**Direkte SQL-Abfragen:**

```sql
-- Letzte 50 Admin-Aktionen
SELECT timestamp, user_email, action, resource_type, resource_id, details, status
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 50;

-- Alle Aktionen eines bestimmten Admins
SELECT * FROM audit_logs WHERE user_email = 'admin@example.com' ORDER BY timestamp DESC;

-- Fehlgeschlagene Logins
SELECT * FROM audit_logs WHERE action = 'auth.login_failure' ORDER BY timestamp DESC;

-- Gelöschte Sichtungen
SELECT * FROM audit_logs WHERE action = 'sighting.delete' ORDER BY timestamp DESC;

-- Manuelles Aufräumen (kein automatisches Löschen konfiguriert)
DELETE FROM audit_logs WHERE timestamp < now() - interval '2 years';
```

### Security-Events aus Docker-Logs lesen

```bash
# Alle Security-Events
docker compose logs app 2>&1 | grep '"event":"security.'

# Nur Rate Limit Überschreitungen
docker compose logs app 2>&1 | grep '"event":"security.rate_limit_hit"'

# Auth-Fehler (ungültige Cookies)
docker compose logs app 2>&1 | grep '"event":"security.auth_error"'
```

### Aufbewahrung

Unbegrenzt — kein automatisches Löschen. Manuelles Löschen via SQL wenn nötig (s.o.).

---

## 10. Updates durchführen

### Standard-Update

```bash
cd /opt/ostsee-tiere

# Backup erstellen
./backup.sh

# Neues Image herunterladen
docker compose pull

# Container neu starten (Zero-Downtime mit Health Checks)
# Schema-Migrationen des neuen Release laufen dabei automatisch
docker compose up -d

# Logs prüfen (inkl. Migrations-Ausgabe)
docker compose logs -f app
```

### Update auf spezifische Version

```bash
# In .env oder docker-compose.yml:
# image: ghcr.io/jansinger/ostsee-sichtung:v2.1.0

docker compose pull
docker compose up -d
```

### Aufräumen nach Update

```bash
# Alte Images entfernen
docker image prune -f
```

---

## Systemd Service (Optional)

Für automatischen Start beim Serverboot:

```bash
sudo nano /etc/systemd/system/ostsee-tiere.service
```

```ini
[Unit]
Description=Ostsee-Tiere Platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ostsee-tiere
# Note: Adjust path if docker compose is installed differently
ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ostsee-tiere
sudo systemctl start ostsee-tiere
```

---

## Troubleshooting

### Container startet nicht

```bash
# Detaillierte Logs anzeigen
docker compose logs app

# Container-Status prüfen
docker compose ps -a

# Häufige Ursachen:
# - DATABASE_POSTGRES_URL falsch
# - Auth0-Credentials fehlen
# - Port 3000 bereits belegt
```

### Datenbank-Verbindung fehlgeschlagen

```bash
# Datenbank-Container prüfen
docker compose exec db pg_isready

# Verbindung manuell testen
docker compose exec db psql -U postgres -d ostsee -c "SELECT 1"
```

### SSL-Zertifikat Probleme

```bash
# Caddy Logs
sudo journalctl -u caddy -f

# Nginx + Certbot
sudo certbot renew --dry-run
```

---

## Weiterführende Dokumentation

- [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Vollständige Docker-Dokumentation
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Alle Umgebungsvariablen
- [DATABASE_MIGRATION.md](./DATABASE_MIGRATION.md) - Datenbank-Migration

---

_Letzte Aktualisierung: April 2026_
