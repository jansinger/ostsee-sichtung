import { sql } from 'drizzle-orm';
import {
	bigint,
	geometry,
	index,
	integer,
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
export const testSichtungenSeq = pgSequence('test_sichtungen_seq', {
	startWith: '2499',
	increment: '1',
	minValue: '1',
	maxValue: '9223372036854775807',
	cache: '1',
	cycle: false
});
export const testSichtungenSeqOld = pgSequence('test_sichtungen_seq_old', {
	startWith: '1843',
	increment: '1',
	minValue: '1',
	maxValue: '9223372036854775807',
	cache: '1',
	cycle: false
});

export const ne10MOcean = pgTable(
	'ne_10m_ocean',
	{
		id0: serial('id_0').primaryKey().notNull(),
		geom: geometry({ type: 'multipolygon', srid: 4326 }),
		id: integer(),
		featurecla: varchar({ length: 32 }),
		scalerank: integer()
	},
	(table) => [
		index('sidx_ne_10m_ocean_geom').using(
			'gist',
			table.geom.asc().nullsLast().op('gist_geometry_ops_2d')
		)
	]
);

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
		sightingDate: timestamp('sichtungsdatum', { mode: 'string' }).notNull(),
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
		created: timestamp('created', { mode: 'string' }).notNull(),
		entryChannel: integer('eingangskanal').default(0).notNull(),
		approvedAt: timestamp('freigegeben_am', { mode: 'string' }),
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
		referenceId: varchar('referenz_id', { length: 64 })
	},
	(table) => [
		index('geom_sichtungen').using(
			'gist',
			table.location.asc().nullsLast().op('gist_geometry_ops_2d')
		),
		index('idx_year_sichtungen').using('btree', sql`date_part('year'::text`)
	]
);

// Table for storing file references linked to sightings
export const sightingFiles = pgTable('sichtungen_dateien', {
	id: serial().primaryKey().notNull(),
	sightingId: bigint('sichtung_id', { mode: 'number' })
		.references(() => sightings.id, { onDelete: 'cascade' })
		.notNull(),
	referenceId: varchar('referenz_id', { length: 64 }).notNull(),
	originalName: varchar('original_name', { length: 255 }).notNull(),
	fileName: varchar('datei_name', { length: 255 }).notNull(),
	filePath: varchar('datei_pfad', { length: 500 }).notNull(),
	mimeType: varchar('mime_typ', { length: 100 }).notNull(),
	size: bigint({ mode: 'number' }).notNull(),
	uploadedAt: timestamp('hochgeladen_am', { mode: 'string' }).notNull(),
	createdAt: timestamp('erstellt_am', { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index('idx_sichtungen_dateien_sichtung_id').on(table.sightingId),
	index('idx_sichtungen_dateien_referenz_id').on(table.referenceId)
]);
