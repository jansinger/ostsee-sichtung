CREATE SEQUENCE "public"."sichtungen_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1840 CACHE 1;--> statement-breakpoint
CREATE TABLE "app_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" varchar(255),
	CONSTRAINT "app_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"user_email" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar(100),
	"details" jsonb,
	"ip_address" varchar(45),
	"status" varchar(20) DEFAULT 'success' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sichtungen_dateien" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(64) NOT NULL,
	"sichtung_id" bigint,
	"referenz_id" varchar(64) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"datei_name" varchar(255) NOT NULL,
	"datei_pfad" varchar(500) NOT NULL,
	"mime_typ" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"url" varchar(1000),
	"hochgeladen_am" timestamp NOT NULL,
	"exif_daten" jsonb,
	"erstellt_am" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sichtungen" (
	"id" bigint PRIMARY KEY DEFAULT nextval('sichtungen_seq'::regclass) NOT NULL,
	"gps_breite" numeric(8, 6),
	"gps_laenge" numeric(8, 6),
	"fahrwasser" text,
	"seezeichen" text,
	"sichtungsdatum" timestamp NOT NULL,
	"vonwo" integer DEFAULT 0 NOT NULL,
	"vonwo_text" text,
	"entfernung" integer DEFAULT 0 NOT NULL,
	"anzahl_schiffe" integer,
	"anzahl_gesamt" integer DEFAULT 0 NOT NULL,
	"anzahl_jung" integer DEFAULT 0 NOT NULL,
	"verteilung" integer DEFAULT 0 NOT NULL,
	"verteilung_text" text,
	"aufnahme" varchar(255),
	"aufnahmeHochladen" integer DEFAULT 0 NOT NULL,
	"verhalten" integer DEFAULT 0 NOT NULL,
	"verhalten_text" text,
	"reaktion" text,
	"sonstige_auffaelligkeiten" text,
	"seegang" integer DEFAULT 0 NOT NULL,
	"windrichtung" varchar(4),
	"windstaerke" varchar(2),
	"sichtweite" integer DEFAULT 0 NOT NULL,
	"schiffsname" varchar(64),
	"heimathafen" varchar(64),
	"bootstyp" varchar(64),
	"bootsantrieb" integer DEFAULT 0 NOT NULL,
	"bootsantrieb_text" text,
	"vorname" varchar(64),
	"name" varchar(64),
	"strasse" varchar(64),
	"plz" varchar(5),
	"ort" varchar(64),
	"telefon" varchar(64),
	"fax" varchar(64),
	"email" varchar(64),
	"namensnennung" integer DEFAULT 0 NOT NULL,
	"schiffnamensnennung" integer DEFAULT 0 NOT NULL,
	"bemerkungen" text,
	"created" timestamp NOT NULL,
	"eingangskanal" integer DEFAULT 0 NOT NULL,
	"freigegeben_am" timestamp,
	"geprueft" integer DEFAULT 0 NOT NULL,
	"ostsee" integer DEFAULT 0,
	"kommentar_intern" text,
	"location" geometry(point),
	"ostsee_geo" integer DEFAULT 0 NOT NULL,
	"totfund" smallint DEFAULT 0 NOT NULL,
	"totfund_groesse" integer,
	"totfund_zustand" smallint DEFAULT 0 NOT NULL,
	"totfund_geschlecht" smallint DEFAULT 0 NOT NULL,
	"totfund_telefon" smallint DEFAULT 0 NOT NULL,
	"tierart" smallint DEFAULT 0 NOT NULL,
	"datenschutz_einverstaendnis" smallint DEFAULT 0 NOT NULL,
	"referenz_id" varchar(64),
	"weather_data" jsonb,
	"weather_fetched_at" timestamp,
	"weather_provider" varchar(50) DEFAULT 'open-meteo',
	"weather_api_version" varchar(20),
	"weather_data_type" varchar(20) DEFAULT 'historical'
);
--> statement-breakpoint
ALTER TABLE "sichtungen_dateien" ADD CONSTRAINT "sichtungen_dateien_sichtung_id_sichtungen_id_fk" FOREIGN KEY ("sichtung_id") REFERENCES "public"."sichtungen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_config_key" ON "app_config" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_app_config_category" ON "app_config" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action_timestamp" ON "audit_logs" USING btree ("action","timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_email_timestamp" ON "audit_logs" USING btree ("user_email","timestamp");--> statement-breakpoint
CREATE INDEX "idx_sichtungen_dateien_sichtung_id" ON "sichtungen_dateien" USING btree ("sichtung_id");--> statement-breakpoint
CREATE INDEX "idx_sichtungen_dateien_referenz_id" ON "sichtungen_dateien" USING btree ("referenz_id");--> statement-breakpoint
CREATE INDEX "idx_sichtungen_dateien_uid" ON "sichtungen_dateien" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "geom_sichtungen" ON "sichtungen" USING gist ("location" gist_geometry_ops_2d);--> statement-breakpoint
CREATE INDEX "idx_sichtungsdatum" ON "sichtungen" USING btree ("sichtungsdatum");--> statement-breakpoint
CREATE INDEX "idx_sichtungsdatum_berlin_tag" ON "sichtungen" USING btree (DATE("sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'));--> statement-breakpoint
CREATE INDEX "idx_year_sichtungen" ON "sichtungen" USING btree (EXTRACT(year FROM "sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin'));--> statement-breakpoint
CREATE INDEX "idx_weather_data_gin" ON "sichtungen" USING gin ("weather_data");--> statement-breakpoint
CREATE INDEX "idx_weather_fetched" ON "sichtungen" USING btree ("weather_fetched_at");--> statement-breakpoint
CREATE INDEX "idx_weather_provider" ON "sichtungen" USING btree ("weather_provider");--> statement-breakpoint
CREATE INDEX "idx_position_date_weather" ON "sichtungen" USING btree (ROUND("gps_breite"::numeric, 2),ROUND("gps_laenge"::numeric, 2),DATE("sichtungsdatum" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')) WHERE "sichtungen"."weather_data" IS NOT NULL;