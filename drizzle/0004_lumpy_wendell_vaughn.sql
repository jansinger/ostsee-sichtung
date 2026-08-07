ALTER TABLE "sichtungen" ADD COLUMN "spam_score" smallint;--> statement-breakpoint
ALTER TABLE "sichtungen" ADD COLUMN "spam_indicators" jsonb;