-- Schreibt die in geo_build.flag_changes ermittelten Werte nach sichtungen.
--
-- Wird ausschliesslich von recalc-baltic-flags.sh --migrate aufgerufen, immer
-- NACH dem Report im selben Lauf, damit View und Schreibvorgang denselben Stand
-- sehen.
--
-- Rollback:
--   UPDATE sichtungen s
--   SET ostsee = b.ostsee, ostsee_geo = b.ostsee_geo
--   FROM public.sichtungen_ostsee_backup b
--   WHERE s.id = b.id;
--
-- Spec: docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md

\set ON_ERROR_STOP on

BEGIN;

-- Die Backup-Tabelle ist die einzige Rueckfallebene. Ein zweiter Lauf darf sie
-- nicht ueberschreiben, sonst ist der Ausgangszustand unwiederbringlich weg.
-- Die Pruefung ist bewusst zweistufig verschachtelt und nutzt dynamisches SQL:
-- PL/pgSQL plant eine IF-Bedingung als Ganzes, ein `AND` kurzschliesst dort also
-- nicht. Ein direkter Verweis auf die Tabelle scheitert schon beim Planen, wenn
-- sie noch nicht existiert — also genau im Normalfall des ersten Laufs.
DO $$
DECLARE vorhanden bigint;
BEGIN
  IF to_regclass('public.sichtungen_ostsee_backup') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.sichtungen_ostsee_backup' INTO vorhanden;
    IF vorhanden > 0 THEN
      RAISE EXCEPTION
        'sichtungen_ostsee_backup existiert bereits mit % Zeilen. Erst pruefen und bewusst verwerfen, dann erneut migrieren.',
        vorhanden;
    END IF;
  END IF;
END $$;

DROP TABLE IF EXISTS public.sichtungen_ostsee_backup;
CREATE TABLE public.sichtungen_ostsee_backup AS
SELECT id, ostsee, ostsee_geo, now() AS gesichert_am FROM sichtungen;

\echo '== Gesicherte Zeilen'
SELECT count(*) AS gesichert FROM public.sichtungen_ostsee_backup;

UPDATE sichtungen s
SET ostsee = c.neu_ostsee, ostsee_geo = c.neu_geo
FROM geo_build.flag_changes c
WHERE s.id = c.id;

\echo '== Kontrolle innerhalb der Transaktion'
SELECT
  count(*)                                              AS gesamt,
  count(*) FILTER (WHERE ostsee = 1)                    AS ostsee_1,
  count(*) FILTER (WHERE ostsee = 0)                    AS ostsee_0,
  count(*) FILTER (WHERE ostsee_geo > 0)                AS geo_gt0,
  count(*) FILTER (WHERE ostsee_geo = 2)                AS geo_2,
  count(*) FILTER (WHERE ostsee = 1 AND ostsee_geo = 0) AS invariante_verletzt
FROM sichtungen;

-- invariante_verletzt MUSS 0 sein: das Polygon liegt in der Bounding Box, also
-- kann keine Zeile im Polygon ausserhalb des Kartenbereichs liegen. Ist der Wert
-- groesser 0, hier ROLLBACK statt COMMIT und zurueck zur Geometrie.
DO $$
DECLARE verletzt bigint;
BEGIN
  SELECT count(*) INTO verletzt FROM sichtungen WHERE ostsee = 1 AND ostsee_geo = 0;
  IF verletzt > 0 THEN
    RAISE EXCEPTION 'Invariante verletzt: % Zeilen mit ostsee=1 und ostsee_geo=0. Transaktion wird verworfen.', verletzt;
  END IF;
END $$;

COMMIT;
