# Ostsee-Tiere 🌊

**Ostsee-Tiere** ist eine moderne SvelteKit-WebApp zur Erfassung und Verwaltung von Meerestier-Sichtungen in der Ostsee. Die Anwendung ermöglicht es Bürgern, Forschern und Naturbeobachtern, ihre Sichtungen von Walen, Robben und anderen Meerestieren zu melden und der Wissenschaft zur Verfügung zu stellen.

![Ostsee-Tiere](https://via.placeholder.com/800x400?text=Ostsee-Tiere+-+Baltic+Sea+Marine+Wildlife)

## 🐋 Projektübersicht

Ostsee-Tiere bietet eine benutzerfreundliche Plattform zur wissenschaftlichen Erfassung von Meerestier-Sichtungen mit:

- Ein intuitives, mehrstufiges Formular zur einfachen Dateneingabe
- Interaktive Kartenvisualisierung mit OpenLayers
- Filterung und Suche nach verschiedenen Kriterien
- Verwaltung und Überprüfung von Sichtungsmeldungen

## Technologie-Stack

- **Frontend**: SvelteKit (Svelte 5)
- **Styling**: TailwindCSS mit DaisyUI-Komponenten
- **Formularvalidierung**: svelte-forms-lib mit Yup
- **Datenbank**: PostgreSQL mit PostGIS-Erweiterung
- **ORM**: Drizzle
- **Karten**: OpenLayers

## Installation und Entwicklung

### Voraussetzungen

- Node.js (Version 18 oder höher)
- Docker und Docker Compose (für die Datenbank)

### Setup

```bash
# Repository klonen
git clone https://github.com/yourusername/sichtungen-webapp.git
cd sichtungen-webapp

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
sichtungen-webapp/
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
