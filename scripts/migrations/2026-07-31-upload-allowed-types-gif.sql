-- Ergänzt image/gif in security.allowedFileTypes für Installationen, die den
-- Schlüssel bereits vor 2026-07-31 angelegt haben.
--
-- Hintergrund: PUBLIC_UPLOAD_ALLOWED_TYPES bot image/gif an, die geseedete
-- Serverliste kannte es nicht — ein GIF passierte die Dropzone und bekam vom
-- Server ein 400. Die Code-Vorbelegung ist korrigiert, greift aber nur bei
-- Neuanlage (insertManyIfAbsent).
--
-- Idempotent: Läuft der Befehl zweimal, ändert der zweite Lauf nichts.
UPDATE app_config
SET value = (value::jsonb || '["image/gif"]'::jsonb)
WHERE key = 'security.allowedFileTypes'
  AND NOT (value::jsonb @> '["image/gif"]'::jsonb);
