ALTER TABLE "sichtungen" ADD COLUMN "medien_einwilligung" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "medien_einwilligung_am" timestamp;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "medien_einwilligung_version" varchar(32);