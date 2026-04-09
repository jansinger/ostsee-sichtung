---
paths:
  - 'src/lib/server/db/**'
  - 'drizzle.config.ts'
  - 'src/routes/api/**'
  - 'drizzle/**'
---

# Datenbank & Drizzle ORM

Regeln für PostgreSQL, PostGIS und Drizzle ORM.

---

## Befehle

```bash
npm run db:start   # PostgreSQL starten (Docker, Port 5433)
npm run db:stop    # Datenbank stoppen
npm run db:push    # Schema pushen
npm run db:migrate # Migrationen ausführen
npm run db:studio  # Drizzle Studio öffnen
```

---

## Verbindung

**Entwicklung:** Nutze lokale DB aus `.env`

| Option            | Port | Verbindung                                                          |
| ----------------- | ---- | ------------------------------------------------------------------- |
| Native PostgreSQL | 5432 | `postgresql://ostsee_app:ostsee_dev_password@localhost:5432/ostsee` |
| Docker PostgreSQL | 5433 | `postgresql://root:mysecretpassword@localhost:5433/local`           |

---

## Lazy Initialization

Die DB-Verbindung nutzt Lazy Initialization via Proxy (`src/lib/server/db/index.ts`):

```typescript
// Verbindung wird erst bei erstem Zugriff hergestellt
import { db } from '$lib/server/db';

// Vorteile:
// - E2E Tests laufen ohne DB
// - Race Condition Schutz
// - Deferred Connection
```

---

## Schema

### Haupt-Tabelle: sichtungen

```typescript
export const sichtungen = pgTable('sichtungen', {
	id: serial('id').primaryKey(),

	// Geografische Daten (PostGIS)
	lat: doublePrecision('lat').notNull(),
	lng: doublePrecision('lng').notNull(),
	location: geometry('location', { type: 'point', srid: 4326 }),

	// Metadaten
	date: date('date').notNull(),
	time: time('time'),
	species: varchar('species', { length: 100 }),
	count: integer('count'),

	// Status
	approved: boolean('approved').default(false),
	createdAt: timestamp('created_at').defaultNow()
});
```

### Datei-Tabelle mit JSONB

```typescript
export const sichtungenDateien = pgTable('sichtungen_dateien', {
	id: serial('id').primaryKey(),
	sichtungId: integer('sichtung_id').references(() => sichtungen.id),
	url: varchar('url', { length: 500 }),

	// JSONB für flexible Metadaten
	metadata: jsonb('metadata').$type<{
		exif?: ExifData;
		mimeType?: string;
		size?: number;
	}>()
});
```

---

## Repository Pattern

Alle DB-Operationen via Repository (`src/lib/server/db/sightingRepository.ts`):

```typescript
// Beispiel: Sichtung erstellen
export async function createSighting(data: NewSighting) {
	return await db
		.insert(sichtungen)
		.values({
			...data,
			location: sql`ST_SetSRID(ST_Point(${data.lng}, ${data.lat}), 4326)`
		})
		.returning();
}

// Beispiel: Sichtungen in Umkreis
export async function findNearby(lat: number, lng: number, radiusKm: number) {
	return await db
		.select()
		.from(sichtungen)
		.where(
			sql`ST_DWithin(
                location::geography,
                ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography,
                ${radiusKm * 1000}
            )`
		);
}
```

---

## PostGIS Patterns

### Point erstellen

```typescript
sql`ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)`;
```

### Distanz berechnen

```typescript
sql`ST_Distance(
    location::geography,
    ST_SetSRID(ST_Point(${lng}, ${lat}), 4326)::geography
)`;
```

### GeoJSON exportieren

```typescript
sql`ST_AsGeoJSON(location)`;
```

### Ostsee-Bounding-Box prüfen

```typescript
// Vor dem Speichern Baltic Sea Grenzen validieren
import { checkBalticSeaFile } from '$lib/utils/geo';

if (!checkBalticSeaFile(lat, lng)) {
	throw new Error('Position außerhalb der Ostsee');
}
```

---

## JSONB Best Practices

```typescript
// Typisiertes JSONB
metadata: jsonb('metadata')
	.$type<MetadataType>()

	// Query in JSONB
	.where(sql`metadata->>'mimeType' = 'image/jpeg'`)

	// Update in JSONB
	.set({
		metadata: sql`metadata || ${JSON.stringify({ processed: true })}`
	});
```

---

## Transaktionen

```typescript
await db.transaction(async (tx) => {
	const [sighting] = await tx.insert(sichtungen).values(sightingData).returning();

	await tx.insert(sichtungenDateien).values(files.map((f) => ({ sichtungId: sighting.id, ...f })));
});
```

---

## Best Practices

### Do's

- Repository Pattern für alle DB-Operationen
- Transaktionen für Multi-Table Operations
- Indexes für häufig abgefragte Felder
- Schema-Änderungen versioniert halten

### Don'ts

- Keine Raw SQL ohne Parametrisierung
- Keine DB-Operationen in Komponenten
- Keine Secrets in Code committen
