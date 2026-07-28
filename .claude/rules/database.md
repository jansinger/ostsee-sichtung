---
paths:
  - 'src/lib/server/db/**'
  - 'drizzle.config.ts'
  - 'src/lib/server/geo/**'
  # API-Routen bleiben bewusst drin: 14 Endpunkte importieren den `db`-Client
  # direkt und 23 das Schema, schreiben dort also echte Drizzle-Queries.
  - 'src/routes/api/**'
---

# Datenbank & Drizzle ORM

Regeln für PostgreSQL, PostGIS und Drizzle ORM.

---

## Befehle

```bash
npm run db:start    # PostgreSQL starten (Docker, Port 5433)
npm run db:stop     # Datenbank stoppen
npm run db:push     # Schema direkt auf lokale Dev-DB pushen (nur Entwicklung!)
npm run db:generate # Migration aus Schema-Änderung generieren (drizzle-kit generate)
npm run db:migrate  # Migrationen anwenden (scripts/docker-migrate.ts, wie im Container)
npm run db:studio   # Drizzle Studio öffnen
```

> **Migrations-Strategie (seit 2026-07-28):** Deployte Umgebungen werden
> ausschließlich über **generierte Migrationen** aktualisiert: Nach jeder
> Schema-Änderung `npm run db:generate` ausführen und die neue SQL-Datei in
> `drizzle/` **mit committen** (wird im PR reviewt). Der Container wendet die
> Migrationen beim Start automatisch an (`scripts/docker-migrate.ts`: Advisory
> Lock, Baseline-Erkennung für alte push-DBs, Verweigerung destruktiver
> Statements ohne `ALLOW_DESTRUCTIVE_MIGRATIONS=true`).
> `db:push` bleibt nur für schnelle Iteration auf der lokalen Dev-DB —
> **eine Schema-Änderung ohne zugehörige Migrationsdatei darf nicht gemergt
> werden.**

> **ACHTUNG — `db:push` erkennt keine Änderungen an Ausdrucksindizes.** Verifiziert
> am 2026-07-28: Nach einer Änderung des Datumsausdrucks in `idx_position_date_weather`
> und `idx_year_sichtungen` enthielt der Push-Plan keine der beiden Anweisungen.
> Der alte Index bleibt bestehen — die Abfrage wird dadurch nicht falsch, verliert
> aber still ihre Index-Unterstützung für das geänderte Prädikat.
>
> Für **deployte Umgebungen** ist das seit der Migrations-Umstellung gelöst:
> `npm run db:generate` erfasst Ausdrucksindizes vollständig (verifiziert in
> `drizzle/0000_initial.sql`) — bei Index-Änderungen also immer eine Migration
> generieren. Nur für **lokale Dev-DBs**, die per `db:push` gepflegt werden,
> müssen geänderte Ausdrucksindizes manuell nachgezogen werden (z. B. per
> DDL-Skript unter `scripts/migrations/`).
>
> Prüfen lässt sich der Ist-Zustand mit:
>
> ```sql
> SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sichtungen';
> ```
>
> **Warum diese Ausdrücke überhaupt existieren:** Die Zeitstempelspalten sind
> UTC, aber Kalenderfragen (Tag/Monat/Jahr) sind fachlich immer Berlin-Ortszeit
> gemeint — der Ausdruck rechnet das bei jeder Abfrage um, statt eine zweite
> Spalte zu pflegen. Der SQL-Text muss dabei **zeichengleich** mit
> `berlinCalendarDate`/`berlinDatePart` aus `src/lib/server/db/sqlTimeZone.ts`
> sein, sonst greift der Index nicht. Zentrale Referenz für die
> Zeitzonen-Konvention: `docs/ENVIRONMENT.md`, Abschnitt `TZ`.

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

## Prüfstatus in Auswertungen — immer explizit

Der Prüfstatus selbst ist in `.claude/rules/api.md` geregelt: **genau zwei Zustände**
(ungeprüft / geprüft), geprüft heißt veröffentlicht, `approvedAt IS NOT NULL` ist die
öffentliche Grundmenge. Hier steht nur, was daraus für **Auswertungen** folgt.

Die Statistiken filterten lange nach **gar keinem** Status, die öffentliche Karte dagegen
schon — Karte und Zahlentext widersprachen sich sichtbar (19.262 vs. 19.877).

Vorgabe des Meeresmuseums: Im öffentlichen Bereich zählen nur geprüfte Sichtungen. In der
Admin-Statistik dürfen ungeprüfte vorkommen, aber **niemals mit geprüften zu einer Zahl
vermischt** — getrennt ausweisen („19.262 geprüft / 615 offen").

`approvedOnly()` und `pendingOnly()` bilden genau diese zwei Zustände ab; ein dritter
Scope wäre ein Widerspruch zur Regel in `api.md` und darf nicht entstehen.

```typescript
import { approvedOnly, pendingOnly, approvalFilter } from '$lib/server/db/approvalFilter';

// Öffentlich: nur freigegebene
.where(approvedOnly())

// Admin: getrennte Läufe statt CASE-Aggregaten — so kann keine Summe entstehen
const [approved, pending] = await Promise.all([load('approved'), load('pending')]);
```

Wer eine neue Statistikabfrage ergänzt, muss den Status explizit setzen. `sichtungen_dateien`
kennt die Spalte nicht — dort ist ein Join auf `sichtungen` nötig. Der Epoch-Ausschluss
(`EARLIEST_PLAUSIBLE_SIGHTING_DATE`) gilt zusätzlich, nicht statt dessen.
Abgesichert durch `src/lib/server/db/statisticsApprovalScope.test.ts`.

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
