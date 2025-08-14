# Ostsee-Tiere 🌊

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/jansinger/ostsee-sichtung/release.yml?style=flat-square&logo=github&label=Build)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub last commit](https://img.shields.io/github/last-commit/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub issues](https://img.shields.io/github/issues/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub pull requests](https://img.shields.io/github/issues-pr/jansinger/ostsee-sichtung?style=flat-square&logo=github)
![GitHub](https://img.shields.io/github/license/jansinger/ostsee-sichtung?style=flat-square)
![GitHub package.json version](https://img.shields.io/github/package-json/v/jansinger/ostsee-sichtung?style=flat-square&logo=npm)

**Ostsee-Tiere** ist eine moderne SvelteKit-WebApp zur Erfassung und Verwaltung von Meerestier-Sichtungen in der Ostsee. Die Anwendung ermöglicht es Bürgern, Forschern und Naturbeobachtern, ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden und der Wissenschaft zur Verfügung zu stellen.

![Ostsee-Tiere](https://ostsee-tiere.de)

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

- **Frontend**: SvelteKit (Svelte 5) mit TypeScript
- **Styling**: TailwindCSS mit DaisyUI-Komponenten
- **Formularvalidierung**: svelte-forms-lib mit Yup
- **Datenbank**: PostgreSQL mit PostGIS-Erweiterung
- **ORM**: Drizzle
- **Karten**: OpenLayers
- **Build Tool**: Vite
- **Deployment**: Vercel

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
# Datenbank starten
npm run db:start

# Schema-Änderungen anwenden
npm run db:push

# Migration erstellen
npm run db:migrate

# Drizzle Studio öffnen (UI zur Datenverwaltung)
npm run db:studio
```

### Tests ausführen

```bash
# Unit-Tests ausführen
npm run test:unit

# E2E-Tests ausführen
npm run test:e2e

# Alle Tests ausführen
npm run test
```

## Projektstruktur

```
ostsee-sichtung/
├── src/
│   ├── lib/                # Wiederverwendbare Komponenten und Funktionen
│   │   ├── components/     # UI-Komponenten
│   │   ├── constants/      # Konstanten und Enumerationen
│   │   ├── map/            # Karten-Funktionalitäten
│   │   ├── db/             # Datenbankzugriff
│   │   ├── server/         # Drizzle Schema uns Serverkomponenten
│   └── routes/             # SvelteKit-Routen
│       └── api/            # Backend-API-Endpunkte
└── static/                 # Statische Assets
```

## Hauptfunktionen

### Multi-Step-Formular

Das Herzstück der Anwendung ist ein mehrstufiges Formular, das Benutzer durch den Prozess der Sichtungsmeldung führt. Je nach Benutzereingaben werden relevante Schritte angezeigt oder übersprungen.

### Kartenintegration

Die Anwendung nutzt OpenLayers für die Kartenintegration und PostGIS für geografische Abfragen. Benutzer können:

- Sichtungspunkte auf der Karte platzieren
- Vorhandene Sichtungen nach verschiedenen Kriterien filtern
- Geografische Informationen visualisieren

### Datenmodell

Das Datenmodell unterstützt umfangreiche Informationen zu Tiersichtungen, einschließlich:

- Geografische Koordinaten (Längen- und Breitengrad)
- Zeitstempel und Datumsinformationen
- Tierart und Anzahl
- Umgebungsbedingungen (Seegang, Windrichtung, etc.)
- Kontaktinformationen des Melders

## Beitragen

Beiträge zum Projekt sind willkommen! Bitte erstellen Sie einen Fork des Repositories und reichen Sie Pull Requests ein.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.
