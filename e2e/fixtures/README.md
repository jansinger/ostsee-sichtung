# E2E-Fixtures

## Testfotos mit EXIF

Drei synthetisch erzeugte JPEGs (640×480, ~12 KB) für die Tests des Foto-Uploads
in Schritt 1 des Sichtungsformulars. Bewusst generiert und **nicht**
heruntergeladen — so hängen keine fremden Bildrechte am Repository.

| Datei                          | GPS               | Zweck                                                                                |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------------------ |
| `photo-with-gps.jpg`           | 54,31 N / 12,09 E | Innerhalb der Ostsee-Box. Erfolgsfall: Position, Datum und Uhrzeit werden übernommen |
| `photo-without-gps.jpg`        | keins             | Zustand „Foto ohne GPS": Datum wird übernommen, Position nicht                       |
| `photo-gps-outside-baltic.jpg` | 41,39 N / 2,17 E  | Mittelmeer, außerhalb der Box. Löst den Validierungsfehler aus `BALTIC_SEA_BBOX` aus |

Alle drei tragen `DateTimeOriginal`, `CreateDate` und `ModifyDate` mit der
Wanduhrzeit **2025:08:15 10:30:00** — in der Vergangenheit, weil das Schema
Zukunftsdaten abweist.

Verifiziert mit dem Parser, den die App selbst benutzt (`exifr`, siehe
`src/lib/utils/client/fileAnalysis.ts:71-92`), nicht nur mit dem Schreibwerkzeug.

## Achtung: der Zeitstempel ist zeitzonenabhängig

`exifr` belebt den EXIF-String `"YYYY:MM:DD HH:MM:SS"` in der **lokalen Zeitzone
des ausführenden Prozesses** — EXIF selbst trägt keinen Offset. Aus
`2025:08:15 10:30:00` wird also:

- in `Europe/Berlin` (CEST, Sommerzeit) → `2025-08-15T08:30:00Z`
- in `UTC` → `2025-08-15T10:30:00Z`

Der Produktions-Container läuft mit `TZ=UTC` (`Dockerfile:122`, Begründung in
`docs/ENVIRONMENT.md`, Abschnitt `TZ`); ein Entwickler-Mac in der Regel nicht.

**Konsequenz für Tests:** Niemals auf einen festen UTC-Instant prüfen. Entweder
die Zeitzone im Test explizit festnageln, oder gegen die dem Nutzer angezeigte
Ortszeit assertieren. Dasselbe Verhalten ist bereits in
`src/lib/utils/client/fileAnalysis.test.ts` dokumentiert.

## Neu erzeugen

```bash
exiftool -overwrite_original \
  -GPSLatitude=54.31 -GPSLatitudeRef=N -GPSLongitude=12.09 -GPSLongitudeRef=E \
  -DateTimeOriginal="2025:08:15 10:30:00" \
  -CreateDate="2025:08:15 10:30:00" \
  -ModifyDate="2025:08:15 10:30:00" \
  photo-with-gps.jpg
```

Die Bilddaten selbst stammen aus einem kurzen PIL-Skript (Farbverlauf plus
Beschriftung); der Inhalt ist für die Tests bedeutungslos, nur die EXIF-Tags
zählen.
