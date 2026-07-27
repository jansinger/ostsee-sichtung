---
paths:
  - 'src/lib/server/db/**'
  - 'drizzle.config.ts'
  - 'src/lib/server/geo/**'
---

# Datenbank & Drizzle ORM

Regeln für PostgreSQL, PostGIS und Drizzle ORM.

---

## Befehle

```bash
npm run db:start   # PostgreSQL starten (Docker, Port 5433)
npm run db:stop    # Datenbank stoppen
npm run db:push    # Schema direkt auf DB pushen (kein drizzle/-Verzeichnis nötig)
npm run db:migrate # drizzle-kit migrate — läuft mangels drizzle/-Verzeichnis derzeit ins Leere
npm run db:studio  # Drizzle Studio öffnen
```

> **Migrations-Strategie:** Dieses Projekt nutzt `db:push` (Drizzle Kit Push) statt file-basierter Migrationen. Es gibt kein `drizzle/` Migrations-Verzeichnis im Repository. Schemaänderungen werden direkt via `npm run db:push` auf die Datenbank angewendet.

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
export const sightings = pgTable('sichtungen', {
	id: bigint({ mode: 'number' }).primaryKey().notNull(),

	// Geografische Daten (PostGIS)
	latitude: numeric('gps_breite', { precision: 8, scale: 6 }),
	longitude: numeric('gps_laenge', { precision: 8, scale: 6 }),
	location: geometry('location', { type: 'point', srid: 4326 }),

	// Metadaten
	sightingDate: timestamp('sichtungsdatum', { mode: 'date' }).notNull(),
	species: smallint('tierart').default(0).notNull(),
	totalCount: integer('anzahl_gesamt').default(0).notNull(),
	juvenileCount: integer('anzahl_jung').default(0).notNull(),

	// Status
	approvedAt: timestamp('freigegeben_am', { mode: 'date' }),
	verified: integer('geprueft').default(0).notNull(),
	created: timestamp('created', { mode: 'date' }).notNull(),

	// Wetterdaten (JSONB)
	weatherData: jsonb('weather_data')
	// ... 50+ weitere Felder (siehe schema.ts)
});
```

**Hinweis:** DB-Spalten nutzen deutsche Legacy-Namen (`gps_breite`, `sichtungsdatum`, `anzahl_gesamt`). Drizzle mappt diese auf englische TypeScript-Properties.

### Datei-Tabelle mit JSONB

```typescript
export const sightingFiles = pgTable('sichtungen_dateien', {
	id: serial().primaryKey().notNull(),
	uid: varchar('uid', { length: 64 }).notNull(),
	sightingId: bigint('sichtung_id', { mode: 'number' }).references(() => sightings.id, {
		onDelete: 'cascade'
	}),
	referenceId: varchar('referenz_id', { length: 64 }).notNull(),
	originalName: varchar('original_name', { length: 255 }).notNull(),
	fileName: varchar('datei_name', { length: 255 }).notNull(),
	filePath: varchar('datei_pfad', { length: 500 }).notNull(),
	mimeType: varchar('mime_typ', { length: 100 }).notNull(),
	size: bigint({ mode: 'number' }).notNull(),
	url: varchar('url', { length: 1000 }),
	exifData: jsonb('exif_daten') // EXIF-Metadaten als JSONB
	// ...
});
```

---

## Repository Pattern

Alle DB-Operationen via Repository (`src/lib/server/db/sightingRepository.ts`):

```typescript
// Sichtung speichern (Hauptfunktion)
export const saveSighting = async (
	formData: SightingFormValues,
	weatherData?: StoredWeatherData
): Promise<{ id: number | undefined }> => {
	const sightingData: NewSighting = mapFormToSighting(formData);
	// ... transaktionale Speicherung mit Mediendateien
};
```

**Hinweis:** `mapFormToSighting()` in `mapFormToSighting.ts` konvertiert Formulardaten → DB-Schema (PostGIS Point, Datum-Kombination, Ostsee-Validierung).

---

## PostGIS Patterns

### Point erstellen

```typescript
sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
```

### Distanz berechnen

```typescript
sql`ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
)`;
```

### GeoJSON exportieren

```typescript
sql`ST_AsGeoJSON(location)`;
```

### Ostsee-Bounding-Box prüfen

```typescript
// Vor dem Speichern Baltic Sea Grenzen validieren
import { checkBalticSeaFile } from '$lib/server/geo/checkBalticSeaFile';

if (!checkBalticSeaFile(lng, lat).inBaltic) {
	throw new Error('Position außerhalb der Ostsee');
}
```

---

## JSONB Best Practices

```typescript
// Typisiertes JSONB (Beispiel: weatherData in sightings)
weatherData: jsonb('weather_data')
	// Query in JSONB
	.where(sql`weather_data->>'provider' = 'open-meteo'`)

	// JSONB Merge-Update
	.set({
		weatherData: sql`weather_data || ${JSON.stringify({ refreshed: true })}`
	});
```

**Vorhandene JSONB-Felder:** `sightings.weatherData`, `sightingFiles.exifData`, `appConfig.value`

---

## Transaktionen

```typescript
await db.transaction(async (tx) => {
	const [sighting] = await tx.insert(sightings).values(sightingData).returning();

	await tx.insert(sightingFiles).values(files.map((f) => ({ sightingId: sighting.id, ...f })));
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
