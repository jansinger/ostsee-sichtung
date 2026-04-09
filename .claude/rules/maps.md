---
paths:
  - 'src/lib/map/**'
  - 'src/lib/components/map/**'
  - 'src/routes/map/**'
  - 'src/routes/api/map/**'
  - 'src/routes/api/geo/**'
---

# Karten & OpenLayers

Regeln für Karten-Integration mit OpenLayers und PostGIS.

---

## Tech Stack

| Bibliothek    | Zweck                |
| ------------- | -------------------- |
| OpenLayers    | Interaktive Karten   |
| PostGIS       | Geografische Queries |
| OpenStreetMap | Tile Layer           |

---

## Projektstruktur

```
src/lib/
├── map/                              # Map Utilities & Controller
│   ├── optimizedMapController.ts     # Performance-optimierter Controller
│   ├── simpleMapController.ts        # Einfacher Controller
│   ├── mapStyles.ts                  # Style-Definitionen
│   ├── dataLoader.ts                 # Daten-Laden
│   ├── popup.ts                      # Popup-Handling
│   └── mapUtils.ts                   # Koordinaten-Utilities
└── components/map/
    ├── OLMap.svelte                  # Haupt-Karten-Komponente
    ├── SightingsMapView.svelte       # Sichtungs-Kartenansicht
    ├── LazyMapWrapper.svelte         # Lazy Loading Wrapper
    ├── LoadingOverlay.svelte         # Lade-Overlay
    └── Panel/
        ├── FilterPanel.svelte        # Filter-Panel
        └── LegendPanel.svelte        # Legenden-Panel
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
				layers: [new TileLayer({ source: new OSM() })],
				view: new View({
					center: fromLonLat([11.5, 54.5]), // Ostsee
					zoom: 7
				})
			});
		}

		return () => map?.dispose();
	});
</script>

<div bind:this={mapContainer} class="h-96 w-full"></div>
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

**Hinweis:** Kein Reverse Geocoding implementiert. Positionen werden nur als Koordinaten gespeichert.

---

## GeoJSON Layer

```typescript
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';

const sightingsLayer = new VectorLayer({
	source: new VectorSource({
		url: '/api/map/sightings',
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
// src/lib/utils/geo/checkBalticSea.ts
export const BALTIC_SEA_BBOX: BoundingBox = {
	minLongitude: 9.4,
	maxLongitude: 30.2,
	minLatitude: 53.0,
	maxLatitude: 66.0
};

export function isInBalticArea(longitude: number, latitude: number): boolean {
	return (
		longitude >= BALTIC_SEA_BBOX.minLongitude &&
		longitude <= BALTIC_SEA_BBOX.maxLongitude &&
		latitude >= BALTIC_SEA_BBOX.minLatitude &&
		latitude <= BALTIC_SEA_BBOX.maxLatitude
	);
}
```

### View Constraint

```typescript
import { boundingExtent } from 'ol/extent';
import { fromLonLat } from 'ol/proj';

const balticExtent = boundingExtent([fromLonLat([9.4, 53.0]), fromLonLat([30.2, 66.0])]);

new View({
	extent: balticExtent,
	constrainOnlyCenter: true
});
```

---

## PostGIS Integration

### API Endpoint für GeoJSON

```typescript
// src/routes/api/map/sightings/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sightings as sightingsTable } from '$lib/server/db/schema';
import { sightingsToGeoJSON } from '$lib/map/mapUtils';
import { eq } from 'drizzle-orm';

export async function GET() {
	const sightingsFromDB = await db
		.select({
			id: sightingsTable.id,
			sightingDate: sightingsTable.sightingDate,
			longitude: sightingsTable.longitude,
			latitude: sightingsTable.latitude,
			species: sightingsTable.species,
			totalCount: sightingsTable.totalCount,
			juvenileCount: sightingsTable.juvenileCount,
			isDead: sightingsTable.isDead
		})
		.from(sightingsTable)
		.where(eq(sightingsTable.verified, 1))
		.orderBy(sightingsTable.sightingDate);

	return json(sightingsToGeoJSON(sightingsFromDB));
}
```

### Nearby Query (Pattern)

```typescript
// Beispiel-Pattern für Umkreissuche (nicht als fertige Funktion im Projekt vorhanden)
const nearby = await db.execute(sql`
    SELECT *, ST_Distance(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) / 1000 as distance_km
    FROM sichtungen
    WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radiusMeters}
    )
    ORDER BY distance_km
`);
```

---

## CSP für Tiles

In `svelte.config.js`:

```javascript
csp: {
    directives: {
        'img-src': ["'self'", 'data:', 'blob:',
            'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org',
            'https://tiles.openseamap.org',
            'https://4i7mo0wwc3lp8d1e.public.blob.vercel-storage.com',
            'https://blob.vercel-storage.com'],
        'connect-src': ["'self'",
            'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org',
            'https://api.openstreetmap.org', 'https://archive-api.open-meteo.com',
            'https://4i7mo0wwc3lp8d1e.public.blob.vercel-storage.com',
            'https://blob.vercel-storage.com']
    }
}
```

**Hinweis:** Auszug der kartenrelevanten CSP-Einträge. Vollständige Konfiguration in `svelte.config.js`.

---

## Mobile Optimierung

```svelte
<div class="relative">
	<div bind:this={mapContainer} class="h-[50vh] w-full touch-none md:h-96"></div>

	<!-- Mobile: Fullscreen Button -->
	<button class="btn btn-circle btn-sm absolute top-2 right-2 md:hidden" onclick={toggleFullscreen}>
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
