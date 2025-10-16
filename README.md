![Ostsee-Tiere](https://ostsee-tiere.de/ostsee-tiere-192.png)

# Ostsee-Tiere 

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/jansinger/ostsee-sichtung/release.yml?style=flat-square&logo=github&label=Build)
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
# Deployment-Package herunterladen
wget https://github.com/jansinger/ostsee-sichtung/releases/latest/download/ostsee-tiere-docker-latest.tar.gz

# Entpacken
tar -xzf ostsee-tiere-docker-latest.tar.gz
cd ostsee-tiere-docker

# Konfigurieren
cp .env.docker .env
nano .env  # Umgebungsvariablen anpassen

# Starten (mit Monitoring)
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

**Zugriff:**
- Anwendung: http://localhost:3000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090

📖 **Vollständige Dokumentation**: [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)

### Option 2: Lokale Entwicklung

## Installation und Entwicklung

### Voraussetzungen

- Node.js (Version 18 oder höher)
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

# E2E-Tests ausführen
npm run test:e2e

# Schnelle Tests (Lint + Unit-Tests)
npm run test

# Vollständige Produktions-Tests
npm run test:production

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
│   │   ├── components/     # UI-Komponenten (Form, Map, Media, Admin)
│   │   ├── constants/      # Konstanten und Enumerationen
│   │   ├── form/           # Formular-Logik und Validierung
│   │   ├── legacy-api/     # Legacy REST API Kompatibilität
│   │   ├── map/            # OpenLayers Karten-Funktionalitäten
│   │   ├── report/         # Sichtungsmeldung-Komponenten und -Logik
│   │   ├── server/         # Server-seitige Logik
│   │   │   ├── auth/       # Authentifizierung
│   │   │   ├── db/         # Datenbankzugriff und Schema
│   │   │   ├── export/     # Datenexport (CSV, JSON, KML, XML)
│   │   │   ├── storage/    # Datei-Speicher Abstraktion
│   │   │   └── validation/ # Server-seitige Validierung
│   │   ├── stores/         # Svelte Stores
│   │   ├── types/          # TypeScript Typen
│   │   └── utils/          # Hilfsfunktionen
│   └── routes/             # SvelteKit-Routen
│       ├── api/            # API-Endpunkte
│       │   └── legacy/     # Legacy REST API
│       ├── admin/          # Admin-Interface
│       ├── map/            # Karten-Visualisierung
│       └── sichtungen/     # Sichtungsformular und -verwaltung
├── static/                 # Statische Assets
├── docs/                   # Dokumentation
└── e2e/                    # End-to-End Tests
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

### Verfügbare Deployment-Optionen

Das Projekt unterstützt zwei Deployment-Modelle:

1. **Vercel (Cloud-Native)**: Automatisches Deployment via GitHub Actions
2. **Docker (Self-Hosted)**: Vollständige Kontrolle über Infrastruktur und Daten

### Docker-Features

- ✅ **Multi-Stage Build** für optimierte Image-Größe (~150-200 MB)
- ✅ **ARM64-Architektur** (Raspberry Pi 4/5, AWS Graviton, Apple Silicon)
- ✅ **Integriertes Monitoring** (Prometheus + Grafana)
- ✅ **Multi-Storage Support** (Local, Vercel Blob, AWS S3, Google Cloud Storage)
- ✅ **Production-Ready** mit Health Checks und Auto-Restart
- ✅ **Security-Hardened** (Non-root user, read-only filesystem)

### Docker Commands

```bash
# Lokalen Build testen
npm run docker:build

# Container lokal ausführen
npm run docker:run

# Mit Docker Compose starten
npm run docker:compose

# Monitoring aktivieren
docker compose -f docker-compose.production.yml --profile monitoring up -d
```

### Images auf GitHub Container Registry

```bash
# Neueste Version ziehen
docker pull ghcr.io/jansinger/ostsee-sichtung:latest

# Spezifische Version
docker pull ghcr.io/jansinger/ostsee-sichtung:v1.30.5

# Mit Tag ausführen
docker run -p 3000:3000 --env-file .env ghcr.io/jansinger/ostsee-sichtung:latest
```

### Dokumentation

- 📘 [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md) - Vollständige Deployment-Anleitung
- 📗 [Environment Variables Reference](docs/ENVIRONMENT.md) - Alle Umgebungsvariablen
- 📙 [Design Guide](docs/DESIGN_GUIDE.md) - UI/UX Best Practices

## Beitragen

Beiträge zum Projekt sind willkommen! Bitte erstellen Sie einen Fork des Repositories und reichen Sie Pull Requests ein.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
