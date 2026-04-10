![Ostsee-Tiere](https://ostsee-tiere.de/ostsee-tiere-192.png)

# Ostsee-Tiere

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/jansinger/ostsee-sichtung/ci.yml?style=flat-square&logo=github&label=CI)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub last commit](https://img.shields.io/github/last-commit/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub issues](https://img.shields.io/github/issues/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub pull requests](https://img.shields.io/github/issues-pr/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub](https://img.shields.io/github/license/jansinger/ostsee-sichtung?style=flat-square)
![GitHub package.json version](https://img.shields.io/github/package-json/v/jansinger/ostsee-sichtung?style=flat-square&logo=npm)

**Ostsee-Tiere** ist eine moderne SvelteKit-WebApp zur Erfassung und Verwaltung von Meerestier-Sichtungen in der Ostsee. Die Anwendung ermöglicht es Bürgern, Forschern und Naturbeobachtern, ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden und der Wissenschaft zur Verfügung zu stellen.

## 🐋 Projektübersicht

Ostsee-Tiere bietet eine benutzerfreundliche Plattform zur wissenschaftlichen Erfassung von Meerestier-Sichtungen mit:

- Ein intuitives, mehrstufiges Formular zur einfachen Dateneingabe
- Interaktive Kartenvisualisierung mit OpenLayers
- Filterung und Suche nach verschiedenen Kriterien
- Verwaltung und Überprüfung von Sichtungsmeldungen

## 🛠️ Technologie-Stack

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=flat-square&logo=svelte&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![PostGIS](https://img.shields.io/badge/PostGIS-59A14F?style=flat-square&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![OpenLayers](https://img.shields.io/badge/OpenLayers-1F6B75?style=flat-square&logo=openlayers&logoColor=white)

- **Frontend**: SvelteKit (Svelte 5 mit Runes) mit TypeScript
- **Styling**: TailwindCSS mit DaisyUI-Komponenten
- **Formularvalidierung**: svelte-forms-lib mit Yup
- **Datenbank**: PostgreSQL mit PostGIS-Erweiterung
- **ORM**: Drizzle
- **Karten**: OpenLayers
- **Build Tool**: Vite
- **Deployment**: Vercel (Cloud) oder Docker (Self-Hosted)

## 🚀 Quick Start

### Option 1: Docker (Empfohlen für Production)

```bash
# Repository klonen
git clone https://github.com/jansinger/ostsee-sichtung.git
cd ostsee-sichtung

# Konfigurieren
cp .env.docker .env
nano .env  # Passwörter und Auth0-Credentials anpassen

# Starten
docker compose -f docker-compose.production.yml up -d

# Optional: Mit Monitoring (Prometheus + Grafana)
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

**Zugriff:**

- Anwendung: http://localhost:3000
- Grafana: http://localhost:3001 (mit `--profile monitoring`)
- Prometheus: http://localhost:9090 (mit `--profile monitoring`)

📖 **Vollständige Dokumentation**: [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)

### Option 2: Lokale Entwicklung

## Installation und Entwicklung

### Voraussetzungen

- Node.js 20.19+, 22.12+ oder 24+ (LTS-Versionen empfohlen, Docker verwendet Node.js 24)
- Docker und Docker Compose (für die Datenbank)

### Setup

```bash
# Repository klonen
git clone https://github.com/jansinger/ostsee-sichtung.git
cd ostsee-sichtung

# Abhängigkeiten installieren
npm install

# Datenbank starten
npm run db:start

# Entwicklungsserver starten
npm run dev
```

Die Anwendung ist dann unter https://localhost:4000 verfügbar.

**HTTPS Development Server:**

- Automatische SSL-Zertifikatsgenerierung
- Sichere iframe-Einbettung möglich
- Unterstützt moderne Web-APIs

### Datenbankbefehle

```bash
# Datenbank starten (Docker, Port 5433)
npm run db:start

# Datenbank stoppen
npm run db:stop

# Schema-Änderungen anwenden
npm run db:push

# Migration erstellen
npm run db:migrate

# Drizzle Studio öffnen (UI zur Datenverwaltung)
npm run db:studio
```

### Tests und Code-Qualität

```bash
# Unit-Tests ausführen
npm run test:unit

# Unit-Tests im Watch-Modus
npm run test:unit:watch

# E2E-Tests ausführen (Playwright)
npm run test:e2e

# Schnelle Tests (Lint + Type-Check + Unit-Tests)
npm run test:quick

# Code-Qualität
npm run lint
npm run type-check
npm run format
npm run check
```

## Projektstruktur

```
ostsee-sichtung/
├── src/
│   ├── lib/
│   │   ├── components/     # UI-Komponenten (Form, Map, Media, Admin, Weather)
│   │   ├── constants/      # Konstanten und Enumerationen
│   │   ├── form/           # Formular-Logik und Validierung
│   │   ├── legacy-api/     # Legacy REST API Kompatibilität
│   │   ├── logger/         # Pino Logging (Client + Server)
│   │   ├── map/            # OpenLayers Karten-Funktionalitäten
│   │   ├── report/         # Sichtungsmeldung-Komponenten und -Logik
│   │   ├── server/         # Server-seitige Logik
│   │   │   ├── auth/       # Auth0 + JWT Authentifizierung
│   │   │   ├── config/     # Access Control Konfiguration
│   │   │   ├── db/         # Datenbankzugriff und Schema
│   │   │   ├── export/     # Datenexport (CSV, JSON, KML, XML)
│   │   │   ├── geo/        # PostGIS / Baltic Sea Validation
│   │   │   ├── media/      # EXIF-Metadaten-Extraktion
│   │   │   ├── middleware/  # DB-Check, Maintenance, Rate Limit, Security Headers
│   │   │   ├── services/   # Email, Config Init, Weather
│   │   │   ├── storage/    # Datei-Speicher (Local, Vercel Blob)
│   │   │   ├── templates/  # E-Mail HTML-Templates
│   │   │   └── validation/ # Magic Bytes, Request Validation
│   │   ├── services/       # Client/Server Services (Config, Weather)
│   │   ├── storage/        # Browser Storage (GDPR-aware)
│   │   ├── stores/         # Svelte Stores
│   │   ├── types/          # TypeScript Typen
│   │   └── utils/          # Hilfsfunktionen
│   └── routes/             # SvelteKit-Routen
│       ├── api/            # API-Endpunkte
│       ├── admin/          # Admin-Interface
│       ├── map/            # Karten-Visualisierung
│       ├── rest_sichtungen/ # Legacy REST API (POST, antworten, inBaltic)
│       └── sichtungen/     # Legacy Sichtungs-API (showreports)
├── static/                 # Statische Assets
├── docs/                   # Dokumentation
└── e2e/                    # End-to-End Tests (Playwright)
```

## Hauptfunktionen

### Multi-Step-Formular mit progressiver Offenlegung

Das Herzstück der Anwendung ist ein mehrstufiges Formular mit intelligenter Navigation:

- Dynamische Schritte basierend auf Benutzereingaben
- Conditional Logic und progressive Offenlegung
- Yup-basierte Validierung mit svelte-forms-lib
- Automatische GPS-Koordinaten-Erfassung

### Interaktive Kartenvisualisierung

Moderne OpenLayers-Integration mit erweiterten Features:

- Präzise Koordinaten-Erfassung durch Klick
- Filterbare Sichtungsanzeige
- PostGIS-basierte geografische Validierung (Ostsee-Grenzen)
- Zeit-Slider für historische Daten
- Export-Funktionen (CSV, JSON, KML, XML)

### Legacy REST API Kompatibilität

100% kompatible REST API für bestehende mobile Apps:

- Exakte Feld-Mappings der Original-API
- Backward-kompatible Antwortformate
- Unterstützung aller ursprünglichen Endpunkte

### Erweiterte Medienverwaltung

- EXIF-Metadaten-Extraktion für automatische GPS-Daten
- Cloud- und lokale Speicher-Unterstützung
- Responsive Bildergalerien
- Automatische Thumbnail-Generierung

### Umfassendes Datenmodell

Detaillierte Erfassung von Meerestier-Sichtungen:

- PostGIS Point-Geometrie für präzise Lokalisierung
- Umweltbedingungen (Seegang, Wind, Sichtweite)
- Tierverhalten und -zustand
- Totfund-spezifische Datenfelder
- Administrative Freigabe- und Verifizierungsprozesse

## 🐳 Docker Deployment

Docker ist die **primäre Deployment-Methode** für Self-Hosted-Installationen.

### Verfügbare Deployment-Optionen

1. **Docker (Self-Hosted)**: Vollständige Kontrolle über Infrastruktur und Daten (empfohlen)
2. **Vercel (Cloud-Native)**: Automatisches Deployment via GitHub Actions

### Docker-Features

- ✅ **Multi-Stage Build** für optimierte Image-Größe (~150-200 MB)
- ✅ **Multi-Architektur** (AMD64 + ARM64: Raspberry Pi 4/5, AWS Graviton, Apple Silicon)
- ✅ **Integriertes Monitoring** (Prometheus + Grafana)
- ✅ **Multi-Storage Support** (Local, Vercel Blob)
- ✅ **Production-Ready** mit Health Checks und Auto-Restart
- ✅ **Security-Hardened** (Non-root user, read-only filesystem möglich)

### Docker Commands

```bash
# Lokalen Build testen
npm run docker:build

# Container lokal ausführen (mit gemounteten Uploads)
npm run docker:run

# Mit Docker Compose starten (inkl. Datenbank)
npm run docker:compose

# Monitoring aktivieren
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

**Hinweis zu `docker:run`:**

- Das npm-Skript erstellt automatisch `./uploads` und mountet es nach `/app/uploads`
- Hochgeladene Dateien bleiben nach Container-Neustarts erhalten
- **Linux**: Bei Permission-Problemen: `sudo chown -R 1001:1001 ./uploads`
- **macOS/Windows**: Docker Desktop handhabt Berechtigungen automatisch

### Images auf GitHub Container Registry

```bash
# Neueste Version ziehen
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Oder spezifische Version (siehe GitHub Releases)
docker pull ghcr.io/jansinger/ostsee-sichtung:v1.0.0

# Mit Tag ausführen
docker run -p 3000:3000 --env-file .env ghcr.io/jansinger/ostsee-sichtung:latest
```

### Dokumentation

- 📘 [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md) - Vollständige Deployment-Anleitung
- 📗 [Production Deployment Guide](docs/PRODUCTION_DEPLOYMENT.md) - Schnellanleitung für Production
- 📙 [Environment Variables Reference](docs/ENVIRONMENT.md) - Alle Umgebungsvariablen
- 📕 [Database Migration Guide](docs/DATABASE_MIGRATION.md) - Migration von bestehenden Installationen
- 📒 [Design Guide](docs/DESIGN_GUIDE.md) - UI/UX Best Practices

## Beitragen

Beiträge zum Projekt sind willkommen! Bitte erstellen Sie einen Fork des Repositories und reichen Sie Pull Requests ein.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
