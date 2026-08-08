CREATE TABLE "sichtung_status_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"sichtung_id" bigint NOT NULL,
	"verdict" varchar(16) NOT NULL,
	"bearbeiter" varchar(255),
	"zeitpunkt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sichtung_status_log_verdict_check" CHECK ("sichtung_status_log"."verdict" IN ('approve', 'reject', 'reset'))
);
--> statement-breakpoint
ALTER TABLE "sichtung_status_log" ADD CONSTRAINT "sichtung_status_log_sichtung_id_sichtungen_id_fk" FOREIGN KEY ("sichtung_id") REFERENCES "public"."sichtungen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sichtung_status_log_sichtung" ON "sichtung_status_log" USING btree ("sichtung_id","zeitpunkt");