---
name: map-features
description: Spezialist für Karten-Features. Nutze diesen Agent für OpenLayers, PostGIS Queries und geografische Funktionen.
tools: Read, Grep, Glob, Edit, Write
model: inherit
---

# Map Features Agent

**Priorität:** MITTEL
**Trigger-Phrasen:** "Karte", "Map Feature", "OpenLayers", "Geographic", "PostGIS", "Koordinaten"

---

## Fähigkeiten

- OpenLayers Karten-Integration
- PostGIS Spatial Queries
- Coordinate Capture & Validation
- GeoJSON Handling
- Ostsee-Bounding-Box

---

## Benötigte Informationen

| # | Information | Beispiel |
|---|-------------|----------|
| 1 | Feature-Typ | "Marker hinzufügen", "Cluster", "Heatmap" |
| 2 | Datenquelle | "API Endpoint", "PostGIS Query" |
| 3 | Interaktion | "Klick für Details", "Hover Info" |
| 4 | Styling | "Farbcodierung nach Tierart" |

---

## Relevante Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/map/` | OpenLayers Komponenten |
| `src/lib/map/Map.svelte` | Haupt-Karten-Komponente |
| `src/routes/map/` | Karten-Seite |
| `src/routes/api/sightings/geojson/` | GeoJSON API |
| `src/lib/server/db/schema.ts` | PostGIS Schema |
| `src/lib/utils/geo/` | Geo-Utilities |

---

## Implementierungs-Pattern

### Neue Layer hinzufügen

```typescript
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Circle, Fill, Stroke } from 'ol/style';

const newLayer = new VectorLayer({
    source: new VectorSource({
        url: '/api/data/geojson',
        format: new GeoJSON()
    }),
    style: new Style({
        image: new Circle({
            radius: 6,
            fill: new Fill({ color: '#3b82f6' }),
            stroke: new Stroke({ color: '#1d4ed8', width: 2 })
        })
    })
});

map.addLayer(newLayer);
```

### PostGIS Query

```typescript
import { sql } from 'drizzle-orm';

// Sichtungen in Radius
const nearby = await db.execute(sql`
    SELECT *,
        ST_Distance(
            location::geography,
            ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography
        ) / 1000 as distance_km
    FROM sichtungen
    WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
    )
    AND approved = true
    ORDER BY distance_km
    LIMIT ${limit}
`);
```

### Click Handler

```typescript
map.on('click', async (event) => {
    const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature
    );

    if (feature) {
        const props = feature.getProperties();
        showPopup(props);
    } else {
        // Neue Position auswählen
        const [lng, lat] = toLonLat(event.coordinate);
        onPositionSelect({ lat, lng });
    }
});
```

---

## Ostsee Validation

```typescript
const BALTIC_SEA_BOUNDS = {
    minLat: 53.5,
    maxLat: 66.0,
    minLng: 9.0,
    maxLng: 30.0
};

function isInBalticSea(lat: number, lng: number): boolean {
    return (
        lat >= BALTIC_SEA_BOUNDS.minLat &&
        lat <= BALTIC_SEA_BOUNDS.maxLat &&
        lng >= BALTIC_SEA_BOUNDS.minLng &&
        lng <= BALTIC_SEA_BOUNDS.maxLng
    );
}

// View Constraint
import { boundingExtent } from 'ol/extent';
import { fromLonLat } from 'ol/proj';

const balticExtent = boundingExtent([
    fromLonLat([BALTIC_SEA_BOUNDS.minLng, BALTIC_SEA_BOUNDS.minLat]),
    fromLonLat([BALTIC_SEA_BOUNDS.maxLng, BALTIC_SEA_BOUNDS.maxLat])
]);
```

---

## Schritt-für-Schritt Workflow

### Schritt 1: Feature-Anforderungen
- Welche Daten visualisieren?
- Welche Interaktionen?
- Welches Styling?

### Schritt 2: Datenquelle
- Neue API Route falls nötig
- PostGIS Query optimieren
- GeoJSON Format sicherstellen

### Schritt 3: Layer implementieren
- VectorSource mit URL
- Styling definieren
- Layer zur Map hinzufügen

### Schritt 4: Interaktionen
- Click Handler
- Hover Effekte
- Popups/Tooltips

### Schritt 5: Mobile optimieren
- Touch Events
- Responsive Größe
- Performance

---

## Erfolgs-Kriterien

- [ ] Layer zeigt Daten korrekt an
- [ ] Styling entspricht Design
- [ ] Interaktionen funktionieren
- [ ] Ostsee-Grenzen werden respektiert
- [ ] Mobile-tauglich
- [ ] Performance OK (keine Lags)
- [ ] CSP für Tiles konfiguriert

---

## GeoJSON API Template

```typescript
// src/routes/api/[feature]/geojson/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export async function GET({ url }) {
    const result = await db.execute(sql`
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(location)::json,
                    'properties', json_build_object(
                        'id', id,
                        'name', name,
                        'value', value
                    )
                )
            ), '[]'::json)
        ) as geojson
        FROM table_name
        WHERE active = true
    `);

    return json(result[0].geojson);
}
```

---

## CSP Konfiguration

```javascript
// svelte.config.js
csp: {
    directives: {
        'img-src': ["'self'", 'https://*.tile.openstreetmap.org'],
        'connect-src': ["'self'", 'https://nominatim.openstreetmap.org']
    }
}
```
