---
paths:
  - "src/lib/map/**"
  - "src/lib/components/map/**"
  - "src/routes/map/**"
  - "src/routes/api/map/**"
  - "src/routes/api/geo/**"
---

# Karten & OpenLayers

Regeln für Karten-Integration mit OpenLayers und PostGIS.

---

## Tech Stack

| Bibliothek | Zweck |
|------------|-------|
| OpenLayers | Interaktive Karten |
| PostGIS | Geografische Queries |
| OpenStreetMap | Tile Layer |

---

## Projektstruktur

```
src/lib/map/
├── Map.svelte           # Haupt-Karten-Komponente
├── controls/            # Karten-Controls
├── layers/              # Layer Definitionen
├── interactions/        # Click, Draw, etc.
└── utils/               # Koordinaten-Utilities
```

---

## Karten-Komponente

```svelte
<script lang="ts">
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';

let mapContainer: HTMLDivElement;
let map: Map;

$effect(() => {
    if (mapContainer && !map) {
        map = new Map({
            target: mapContainer,
            layers: [
                new TileLayer({ source: new OSM() })
            ],
            view: new View({
                center: fromLonLat([11.5, 54.5]), // Ostsee
                zoom: 7
            })
        });
    }

    return () => map?.dispose();
});
</script>

<div bind:this={mapContainer} class="w-full h-96"></div>
```

---

## Coordinate Capture

```typescript
import { toLonLat } from 'ol/proj';

function setupClickHandler(map: Map, onSelect: (coords: [number, number]) => void) {
    map.on('click', (event) => {
        const [lng, lat] = toLonLat(event.coordinate);
        onSelect([lat, lng]);
    });
}
```

### Reverse Geocoding
```typescript
async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await response.json();
    return data.display_name;
}
```

---

## GeoJSON Layer

```typescript
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const sightingsLayer = new VectorLayer({
    source: new VectorSource({
        url: '/api/sightings/geojson',
        format: new GeoJSON()
    }),
    style: sightingStyle
});

map.addLayer(sightingsLayer);
```

### Styling
```typescript
import { Style, Circle, Fill, Stroke } from 'ol/style';

const sightingStyle = new Style({
    image: new Circle({
        radius: 8,
        fill: new Fill({ color: '#3b82f6' }),
        stroke: new Stroke({ color: '#1d4ed8', width: 2 })
    })
});
```

---

## Ostsee-Grenzen

### Bounding Box
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
```

### View Constraint
```typescript
import { boundingExtent } from 'ol/extent';
import { fromLonLat } from 'ol/proj';

const balticExtent = boundingExtent([
    fromLonLat([9.0, 53.5]),
    fromLonLat([30.0, 66.0])
]);

new View({
    extent: balticExtent,
    constrainOnlyCenter: true
});
```

---

## PostGIS Integration

### API Endpoint für GeoJSON
```typescript
// src/routes/api/sightings/geojson/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    const result = await db.execute(sql`
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(
                json_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(location)::json,
                    'properties', json_build_object(
                        'id', id,
                        'species', species,
                        'count', count,
                        'date', date
                    )
                )
            ), '[]'::json)
        ) as geojson
        FROM sichtungen
        WHERE approved = true
    `);

    return json(result[0].geojson);
}
```

### Nearby Query
```typescript
export async function findNearby(lat: number, lng: number, radiusKm: number) {
    return await db.execute(sql`
        SELECT *,
            ST_Distance(
                location::geography,
                ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography
            ) / 1000 as distance_km
        FROM sichtungen
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography,
            ${radiusKm * 1000}
        )
        ORDER BY distance_km
    `);
}
```

---

## CSP für Tiles

In `svelte.config.js`:
```javascript
csp: {
    directives: {
        'img-src': ["'self'", 'https://*.tile.openstreetmap.org'],
        'connect-src': ["'self'", 'https://nominatim.openstreetmap.org']
    }
}
```

---

## Mobile Optimierung

```svelte
<div class="relative">
    <div bind:this={mapContainer} class="w-full h-[50vh] md:h-96 touch-none"></div>

    <!-- Mobile: Fullscreen Button -->
    <button
        class="absolute top-2 right-2 btn btn-circle btn-sm md:hidden"
        onclick={toggleFullscreen}
    >
        <ExpandIcon />
    </button>
</div>
```

---

## Best Practices

### Do's
- Ostsee-Grenzen validieren vor Speichern
- Cluster für viele Marker verwenden
- Touch-Events auf Mobile optimieren
- Loading State während GeoJSON-Laden

### Don'ts
- Keine externen Tile-Server ohne CSP
- Keine synchronen API-Calls in Map Events
- Kein direkter PostGIS-Zugriff aus Frontend
