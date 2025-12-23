import { sql } from 'drizzle-orm';
import {
	bigint,
	geometry,
	index,
	integer,
	jsonb,
	numeric,
	pgSequence,
	pgTable,
	serial,
	smallint,
	text,
	timestamp,
	varchar
} from 'drizzle-orm/pg-core';

export const sichtungenSeq = pgSequence('sichtungen_seq', {
	startWith: '1840',
	increment: '1',
	minValue: '1',
	maxValue: '9223372036854775807',
	cache: '1',
	cycle: false
});

export const sightings = pgTable(
	'sichtungen',
	{
		id: bigint({ mode: 'number' })
			.default(sql`nextval('sichtungen_seq'::regclass)`)
			.primaryKey()
			.notNull(),
		latitude: numeric('gps_breite', { precision: 8, scale: 6 }),
		longitude: numeric('gps_laenge', { precision: 8, scale: 6 }),
		waterway: text('fahrwasser'),
		seaMark: text('seezeichen'),
		sightingDate: timestamp('sichtungsdatum', { mode: 'date' }).notNull(),
		sightingFrom: integer('vonwo').default(0).notNull(),
		sightingFromText: text('vonwo_text'),
		distance: integer('entfernung').default(0).notNull(),
		shipCount: integer('anzahl_schiffe'),
		totalCount: integer('anzahl_gesamt').default(0).notNull(),
		juvenileCount: integer('anzahl_jung').default(0).notNull(),
		distribution: integer('verteilung').default(0).notNull(),
		distributionText: text('verteilung_text'),
		mediaFile: varchar('aufnahme', { length: 255 }),
		mediaUpload: integer('aufnahmeHochladen').default(0).notNull(),
		behavior: integer('verhalten').default(0).notNull(),
		behaviorText: text('verhalten_text'),
		reaction: text('reaktion'),
		otherObservations: text('sonstige_auffaelligkeiten'),
		seaState: integer('seegang').default(0).notNull(),
		windDirection: varchar('windrichtung', { length: 4 }),
		windForce: varchar('windstaerke', { length: 2 }),
		visibility: integer('sichtweite').default(0).notNull(),
		shipName: varchar('schiffsname', { length: 64 }),
		homePort: varchar('heimathafen', { length: 64 }),
		boatType: varchar('bootstyp', { length: 64 }),
		boatDrive: integer('bootsantrieb').default(0).notNull(),
		boatDriveText: text('bootsantrieb_text'),
		firstName: varchar('vorname', { length: 64 }),
		lastName: varchar('name', { length: 64 }),
		street: varchar('strasse', { length: 64 }),
		zipCode: varchar('plz', { length: 5 }),
		city: varchar('ort', { length: 64 }),
		phone: varchar('telefon', { length: 64 }),
		fax: varchar('fax', { length: 64 }),
		email: varchar('email', { length: 64 }),
		nameConsent: integer('namensnennung').default(0).notNull(),
		shipNameConsent: integer('schiffnamensnennung').default(0).notNull(),
		notes: text('bemerkungen'),
		created: timestamp('created', { mode: 'date' }).notNull(),
		entryChannel: integer('eingangskanal').default(0).notNull(),
		approvedAt: timestamp('freigegeben_am', { mode: 'date' }),
		verified: integer('geprueft').default(0).notNull(),
		inBalticSea: integer('ostsee').default(0),
		internalComment: text('kommentar_intern'),
		location: geometry('location', { type: 'point', srid: 4326 }),
		inBalticSeaGeo: integer('ostsee_geo').default(0).notNull(),
		isDead: smallint('totfund').default(0).notNull(),
		deadSize: integer('totfund_groesse'),
		deadCondition: smallint('totfund_zustand').default(0).notNull(),
		deadSex: smallint('totfund_geschlecht').default(0).notNull(),
		deadPhoneContact: smallint('totfund_telefon').default(0).notNull(),
		species: smallint('tierart').default(0).notNull(),
		privacyConsent: smallint('datenschutz_einverstaendnis').default(0).notNull(),
		referenceId: varchar('referenz_id', { length: 64 }),
		// Weather data fields for Issue #110
		weatherData: jsonb('weather_data'),
		weatherFetchedAt: timestamp('weather_fetched_at', { mode: 'date' }),
		weatherProvider: varchar('weather_provider', { length: 50 }).default('open-meteo'),
		weatherApiVersion: varchar('weather_api_version', { length: 20 }),
		weatherDataType: varchar('weather_data_type', { length: 20 }).default('historical')
	},
	(table) => [
		index('geom_sichtungen').using(
			'gist',
			table.location.asc().nullsLast().op('gist_geometry_ops_2d')
		),
		index('idx_year_sichtungen').using('btree', sql`date_part('year'::text, ${table.sightingDate})`),
		// Weather data indexes for Issue #110
		index('idx_weather_data_gin').using('gin', table.weatherData),
		index('idx_weather_fetched').on(table.weatherFetchedAt),
		index('idx_weather_provider').on(table.weatherProvider),
		// Compound index for position+date lookup (deduplication)
		index('idx_position_date_weather').on(
			sql`ROUND(${table.latitude}::numeric, 2)`,
			sql`ROUND(${table.longitude}::numeric, 2)`, 
			sql`DATE(${table.sightingDate})`
		).where(sql`${table.weatherData} IS NOT NULL`)
	]
);

// Type for selecting from sightings table
export type SightingSelect = typeof sightings.$inferSelect;

// Table for storing file references linked to sightings
export const sightingFiles = pgTable(
	'sichtungen_dateien',
	{
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
		uploadedAt: timestamp('hochgeladen_am', { mode: 'date' }).notNull(),
		exifData: jsonb('exif_daten'),
		createdAt: timestamp('erstellt_am', { mode: 'date' }).defaultNow().notNull()
	},
	(table) => [
		index('idx_sichtungen_dateien_sichtung_id').on(table.sightingId),
		index('idx_sichtungen_dateien_referenz_id').on(table.referenceId),
		index('idx_sichtungen_dateien_uid').on(table.uid)
	]
);

// Table for storing application configuration
export const appConfig = pgTable(
	'app_config',
	{
		id: serial().primaryKey().notNull(),
		key: varchar('key', { length: 255 }).notNull().unique(),
		value: jsonb('value').notNull(),
		description: text('description'),
		category: varchar('category', { length: 50 }).notNull(),
		updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
		updatedBy: varchar('updated_by', { length: 255 })
	},
	(table) => [
		index('idx_app_config_key').on(table.key),
		index('idx_app_config_category').on(table.category)
	]
);
