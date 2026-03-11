---
paths:
  - "src/routes/api/**"
  - "src/routes/rest_sichtungen/**"
  - "src/routes/sichtungen/**"
  - "docs/LEGACY_API_SPECIFICATION.md"
---

# REST API & Legacy Kompatibilität

Regeln für API-Entwicklung, insbesondere Legacy API.

---

## API Struktur

```
src/routes/api/
├── legacy/              # Legacy REST API (KRITISCH)
│   ├── rest_sichtungen/
│   └── sichtungen/
├── sightings/           # Moderne API
├── files/               # Datei-Upload
└── admin/               # Admin API
```

---

## Legacy API - KRITISCH

### 100% Kompatibilität erforderlich

Die Legacy API MUSS exakt mit der Original-Spezifikation übereinstimmen.
Mobile Apps hängen davon ab!

**Referenz:** docs/LEGACY_API_SPECIFICATION.md

### Kritische Anforderungen

| Aspekt | Anforderung |
|--------|-------------|
| URL-Pfade | Exakt wie spezifiziert |
| Feldnamen | Exakt wie spezifiziert |
| Datentypen | Strings, nicht Numbers |
| Booleans | 0/1, nicht true/false |
| Datumsformate | DD.MM.YY, YYYY-MM-DD HH:MI |

### Beispiel: showreports.json

```typescript
// Korrekte Feldnamen (abgekürzt)
const response = {
    ts: timestamp,
    id: sighting.id,
    dt: formatDate(sighting.date, 'DD.MM.YY'),
    ti: sighting.time,
    lat: String(sighting.lat),  // String!
    lon: String(sighting.lng),  // String!
    ct: String(sighting.count),
    yo: sighting.young ? '1' : '0',  // 0/1!
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

## OpenAPI Dokumentation

Nach API-Änderungen OpenAPI Spec aktualisieren:

```yaml
# openapi.yaml
paths:
  /api/sightings:
    get:
      summary: Liste aller Sichtungen
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Erfolg
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SightingListResponse'
```

---

## CORS

```typescript
// src/hooks.server.ts
export const handle = async ({ event, resolve }) => {
    const response = await resolve(event);

    // CORS für Legacy API
    if (event.url.pathname.startsWith('/api/legacy')) {
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST');
    }

    return response;
};
```

---

## Best Practices

### Do's
- Legacy API NIEMALS ändern ohne Spec-Prüfung
- OpenAPI Spec aktuell halten
- Konsistente Response-Formate
- Pagination für Listen

### Don'ts
- Keine Breaking Changes in Legacy API
- Keine neuen Felder in Legacy Responses
- Keine Änderung der Datentypen
