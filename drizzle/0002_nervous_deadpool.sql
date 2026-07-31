ALTER TABLE "sichtungen" ADD COLUMN "namensnennung_am" timestamp;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "namensnennung_version" varchar(32);--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "schiffnamensnennung_am" timestamp;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "schiffnamensnennung_version" varchar(32);--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "datenschutz_einverstaendnis_am" timestamp;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "datenschutz_einverstaendnis_version" varchar(32);