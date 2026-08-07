---
paths:
  - 'src/routes/api/**'
  - 'src/routes/rest_sichtungen/**'
  - 'src/routes/sichtungen/**'
  - 'src/routes/health/**'
  - 'docs/LEGACY_API_SPECIFICATION.md'
  - 'static/openapi.yml'
---

# REST API & Legacy Kompatibilität

Regeln für API-Entwicklung, insbesondere Legacy API.

---

## API Struktur

```
src/routes/
├── rest_sichtungen/     # Legacy REST API (KRITISCH) — /rest_sichtungen
├── sichtungen/          # Legacy Sichtungs-API — /sichtungen
└── api/
    ├── sightings/       # Moderne API
    ├── files/           # Datei-Upload
    └── admin/           # Admin API
```

---

## Prüfstatus einer Sichtung — verbindlich

**Eine Sichtung kennt genau zwei Zustände: ungeprüft und geprüft. Geprüft heißt
veröffentlicht.** Einen dritten Zustand „geprüft, aber nicht freigegeben" gibt es
fachlich nicht und er darf nicht eingeführt werden.

Die Datenbank führt aus historischen Gründen zwei Spalten. Sie sind **kein**
Ausdruck zweier Arbeitsschritte, sondern zwei Felder desselben Vorgangs:

| Spalte           | Drizzle      | Rolle                                        |
| ---------------- | ------------ | -------------------------------------------- |
| `geprueft`       | `verified`   | Kennzeichen 0/1                              |
| `freigegeben_am` | `approvedAt` | Zeitpunkt der Prüfung, `null` wenn ungeprüft |

### Daraus folgende Regeln

- **Ein Endpunkt** schreibt diese Spalten: `PATCH /api/sightings/[id]/verify`.
  Er setzt beide immer gemeinsam in **einem** `db.update(...).set(...)`.
  Es gibt bewusst keinen zweiten Endpunkt dafür — ein früherer
  `/api/sightings/[id]/approve` wurde 2026-07 ersatzlos entfernt.
- **Ein Bedienelement** in der Admin-UI: der Toggle „Geprüft".
- **Öffentliche Grundmenge ist `approvedAt IS NOT NULL`** — sowohl in der
  Legacy-API (`/sichtungen/showreports.json`) als auch auf der modernen Karte
  (`/api/map/sightings`). Nicht auf `verified` filtern: die Legacy-API ist an
  `freigegeben_am` vertraglich gebunden, und zwei verschiedene Spalten als Filter
  für zwei öffentliche Flächen laufen zwangsläufig auseinander.

### Hintergrund

Bis 2025-11 pflegte das Altsystem (schweinswalsichtung.de, gleiche Datenbank)
beide Spalten mit einem einzigen Bedienelement. In 19.262 Freigaben über 13 Jahre
gibt es **keinen einzigen** Datensatz, der geprüft, aber nicht freigegeben ist.
Beim Neubau entstand kurzzeitig je ein Endpunkt pro Spalte — eine mechanische
Abbildung der Tabelle, die den Fachprozess falsch modellierte und dazu führte,
dass die Admin-UI nur noch `geprueft` schrieb und damit nichts mehr veröffentlichte.

### Triage „abgelehnt" (seit 2026-08)

Zusätzlich zur Prüfung gibt es die Triage-Entscheidung **abgelehnt** =
gesichtet und bewusst nicht veröffentlicht (Spam, Testeintrag, unplausibel).
Sie ist **kein dritter Freigabe-Zustand**: `abgelehnt_am`/`abgelehnt_von`
(Drizzle `rejectedAt`/`rejectedBy`) sind nie gleichzeitig mit `freigegeben_am`
gesetzt, und die öffentliche Grundmenge bleibt unverändert
`freigegeben_am IS NOT NULL`.

- Geschrieben werden auch diese Spalten **nur** von
  `PATCH /api/sightings/[id]/verify` (Body `{ verdict: 'approve' | 'reject'
| 'reset' }`; der alte Body `{ verified: 0|1 }` bleibt Alias für
  approve/reset). Alle Status-Spalten in **einem** Update.
- Grundmenge der Eingangsseite (`/admin`): `openOnly()` = weder freigegeben
  noch abgelehnt. `pendingOnly()` bedeutet weiterhin „nicht freigegeben"
  (inkl. abgelehnter) und bleibt die Gegenmenge der Statistik.

---

## Legacy API - KRITISCH

### 100% Kompatibilität erforderlich

Die Legacy API MUSS exakt mit der Original-Spezifikation übereinstimmen.
Stand 2026-07-30 ist ein Client angebunden: die iOS-App `OstSeeTiere/8` sendet
über `POST /rest_sichtungen`. Eine Abweichung bricht damit etwas Laufendes und
kostet echte Daten. Einordnung und Umgang mit offensichtlichen Fehlern:
`.claude/rules/legacy-api.md`.

**Referenz:** docs/LEGACY_API_SPECIFICATION.md

### Kritische Anforderungen

| Aspekt        | Anforderung                |
| ------------- | -------------------------- |
| URL-Pfade     | Exakt wie spezifiziert     |
| Feldnamen     | Exakt wie spezifiziert     |
| Datentypen    | Strings, nicht Numbers     |
| Booleans      | 0/1, nicht true/false      |
| Datumsformate | DD.MM.YY, YYYY-MM-DD HH:MI |

### Beispiel: showreports.json

```typescript
// Korrekte Feldnamen (abgekürzt)
const response = {
	ts: timestamp,
	id: sighting.id,
	dt: formatDate(sighting.date, 'DD.MM.YY'),
	ti: sighting.time,
	lat: String(sighting.lat), // String!
	lon: String(sighting.lng), // String!
	ct: String(sighting.count),
	yo: sighting.young ? '1' : '0', // 0/1!
	sh: sighting.ship ? '1' : '0',
	na: sighting.name || '',
	ar: sighting.area || ''
};
```

### Windrichtungen

```typescript
// Alle müssen unterstützt werden
const WIND_DIRECTIONS = ['N', 'NW', 'W', 'SW', 'S', 'SO', 'O', 'NO'];
```

---

## Moderne API Patterns

### SvelteKit API Route

```typescript
// src/routes/api/sightings/+server.ts
import { json, error } from '@sveltejs/kit';
import { sightingRepository } from '$lib/server/db/sightingRepository';

export async function GET({ url }) {
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');

	const sightings = await sightingRepository.findAll({ page, limit });

	return json({
		data: sightings,
		meta: { page, limit, total: sightings.length }
	});
}

export async function POST({ request }) {
	const data = await request.json();

	// Validation
	const validated = await sichtungSchema.validate(data);

	const sighting = await sightingRepository.create(validated);

	return json({ data: sighting }, { status: 201 });
}
```

### Error Handling

```typescript
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	const sighting = await sightingRepository.findById(params.id);

	if (!sighting) {
		throw error(404, { message: 'Sichtung nicht gefunden' });
	}

	return json({ data: sighting });
}
```

---

## Response Formate

### Erfolg

```json
{
    "data": { ... },
    "meta": {
        "page": 1,
        "limit": 20,
        "total": 150
    }
}
```

### Fehler

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Ungültige Koordinaten",
		"details": {
			"lat": "Muss zwischen -90 und 90 sein"
		}
	}
}
```

---

## OpenAPI Dokumentation — PFLICHT

**Bei jeder Änderung an einer API-Route MUSS `static/openapi.yml` aktualisiert werden.**

Checkliste (vor jedem Commit mit API-Änderungen):

- Neuer Endpoint → Eintrag in `paths` hinzufügen (inkl. Tags, Parameter, Request Body, Responses)
- Neues Schema → Eintrag in `components/schemas` hinzufügen
- Parameter geändert → Spec-Parameter aktualisieren
- Response-Struktur geändert → Schema aktualisieren
- Endpoint entfernt → Aus Spec löschen

YAML-Syntax nach Änderungen immer validieren:

```bash
node --input-type=commonjs -e "const yaml = require('js-yaml'); const fs = require('fs'); yaml.load(fs.readFileSync('static/openapi.yml', 'utf8')); console.log('OK')"
```

Ergebnis in der Scalar UI prüfen: `https://localhost:4000/docs/api/scalar`

---

## CORS

CORS wird in `securityHeaders.ts` nur für Development aktiviert (`Access-Control-Allow-Origin: *`).
Legacy API Routes (`/rest_sichtungen`, `/sichtungen`) haben **kein** separates CORS-Handling.

**Hinweis:** Es gibt keine `/api/legacy` Route -- Legacy Endpoints liegen direkt unter `/rest_sichtungen/` und `/sichtungen/`.

---

## Best Practices

### Do's

- Legacy API NIEMALS ändern ohne Spec-Prüfung
- **OpenAPI Spec bei jeder API-Änderung aktualisieren** (siehe Abschnitt oben)
- Konsistente Response-Formate
- Pagination für Listen

### Don'ts

- Keine Breaking Changes in Legacy API
- Keine neuen Felder in Legacy Responses
- Keine Änderung der Datentypen
