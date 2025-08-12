UPDATE sichtungen SET "aufnahmeHochladen"=0 where aufnahme is null or aufnahme = '';

** Alte Aufnahmen migrieren
npx tsx --env-file=.env tools/migrate-old-uploads.ts

** Referenz IDs erzeugen
npx tsx --env-file=.env tools/generate-reference-ids.ts
