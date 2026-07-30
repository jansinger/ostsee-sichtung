# Spec: Ostsee-Geometrie bereinigen und Bounding Box ableiten

Stand: 2026-07-30. Alle Zahlen aus der lokalen Datenbank (19.880 Zeilen, davon
19.491 mit Koordinaten) und aus `src/tools/iho.json`. Lokale und Prod-Zahlen
weichen ab, siehe `docs/WORKTREES.md`.

Diese Spec ersetzt die Diagnose in `docs/OSTSEE_FLAGS.md`, Abschnitt „Fehler 3".

> **Umgesetzt am 2026-07-30.** Abweichungen und Ergänzungen gegenüber dem
> Entwurf, alle mit dem Auftraggeber entschieden:
>
> - Die **Oder** stellte sich als fünftes Binnenwasser-Artefakt heraus (bis
>   Gryfino, 50 km oberhalb des Stettiner Haffs) und wurde nachträglich maskiert.
> - **Schlei, Trave- und Warnow-Mündung** werden über eine zweite, kuratierte
>   Einschlussmaske aufgenommen — die in Abschnitt 2 zunächst verworfene Variante
>   „benannte Innengewässer", nach Ansicht der Prüfkarte nachgezogen.
> - Die Migration erfasst auch **Zeilen ohne Koordinaten** (378 trugen ein
>   Altsystem-`ostsee = 1`). Ohne sie ist die Invariante nicht herstellbar.
> - Der dynamische Import des Index (Abschnitt 3.2) ist **aufgeschoben**: er macht
>   `checkBalticSeaFile` `async` und zieht vier Aufrufer plus zwei Testdateien
>   nach. `.claude/rules/geo.md` nennt ihn als offenen Punkt.
>
 > **Offene Punkte aus dem Abschluss-Review vom 2026-07-30:**
>
> - **Die Einschluss-Korridore schlagen rund 165 km² Festland der Ostsee zu**
>   (Schlei 81, Trave 50, Warnow 34), weil in ihnen der Landabzug nicht greift.
>   Kappeln, Arnis, Travemünde, Priwall, Warnemünde und der Rostocker Hafen
>   liefern damit `inBaltic = true`. Als Plausibilitätssignal ist `ostsee` dort
>   stumpf. Entweder Korridore auf die Wasserachse verengen — und die 77
>   Restfälle akzeptieren — oder die Abweichung so belassen. Braucht eine
>   fachliche Entscheidung.
> - **Der östliche Limfjord** (Aalborg, Hals) ist Teil der Fläche; die Maske
>   schließt nur den westlichen Arm und damit die Nordsee-Passage bei Thyborøn.
>   Das ist als Kattegat-Zufahrt verteidigbar, war aber ursprünglich anders
>   dokumentiert und ist jetzt überall richtiggestellt.
>
> Tatsächliche Werte: Simplify-Toleranz 20 m, Index 3,9 MB, 1.575 Teilflächen,
> 158.976 Stützpunkte, Fläche 426.759 km². `BALTIC_SEA_BBOX` = 9,40 / 30,25 /
> 53,55 / 65,95. Verbleibend außerhalb: 77 Sichtungen in Schlei, Trave und
> Warnow, deren Korridore dort zu schmal geraten sind, sowie 71 Strandfunde
> knapp außerhalb des 200-m-Uferstreifens.

---

## 1. Ausgangslage und Messung

Der UI/UX-Review vom 2026-07-30 notierte, die Bounding Box `BALTIC_SEA_BBOX`
schneide im Westen echte Ostsee-Gebiete ab (Kieler Bucht, Flensburger Förde).
Die Nachmessung widerlegt das, fördert aber zwei andere Defekte zutage.

### 1.1 Die Box schneidet im Westen nichts ab

Der RBush-Index enthält fünf Features aus dem MarineRegions-Datensatz
„IHO Sea Areas":

| Feature  | Name            | mrgid | Extent (lon / lat)            |
| -------- | --------------- | ----- | ----------------------------- |
| `iho.56` | Gulf of Riga    | 2409  | 21,725–24,617 / 56,805–59,215 |
| `iho.57` | Baltic Sea      | 2401  | 9,522–23,512 / 52,654–59,939  |
| `iho.58` | Gulf of Finland | 2407  | 22,910–37,469 / 59,215–62,916 |
| `iho.59` | Gulf of Bothnia | 2402  | 17,039–25,487 / 59,721–67,081 |
| `iho.96` | Kattegat        | 2374  | 9,366–13,063 / 54,634–58,077  |

Nur `iho.96` reicht westlich von 9,4° E — mit **fünf** Stützpunkten bei
9,366–9,398° E / 57,01–57,03° N. Das ist der **Limfjord bei Aalborg**. Kieler
Bucht (ab 10,1° E) und Flensburger Förde (ab 9,43° E) liegen vollständig
innerhalb der Box.

Der Kommentar an der Konstante nennt die Westgrenze „etwa Skagerrak". Das
Skagerrak ist nicht Teil der Geometrie; das westliche Feature ist der Kattegat.

### 1.2 Kein einziger Datensatz verletzt die Invariante

Das aktuelle Polygon wurde über alle 19.491 Zeilen mit Koordinaten gerechnet:

```
Polygon = true: 17.290    Box = true: 19.191    beides: 17.290
Verletzungen (Polygon = true, Box = false):  0
```

Die im Review genannten 126 bzw. 533 Zeilen messen etwas anderes: sie tragen ein
`ostsee = 1` aus dem Altsystem auf Müll- und Nordsee-Koordinaten — 55× Null
Island `(0/0)`, 43× `lat = 90`, 378× ohne Koordinaten, der Rest Helgoland
(7,89/54,18), Jadebusen (8,16/53,51), Ostfriesisches Wattenmeer (7,54/53,76) und
Doggerbank (2,02/54,87). Das heutige Polygon liefert für all diese korrekt
`false`. Die als Beleg genannten IDs 27414/27415 bei 9,59° E liegen ohnehin
innerhalb der Box.

### 1.3 Fehler A — Polygon zu weit (Falsch-Positive)

Vier Binnenwasser-Artefakte der IHO-Geometrie:

| Feature  | Artefakt                               | Stützpunkte |
| -------- | -------------------------------------- | ----------- |
| `iho.58` | Ladogasee + Onegasee (bis 37,47° E)    | 23.481      |
| `iho.59` | Torne-/Kalix-Flussläufe (bis 67,08° N) | 2.367       |
| `iho.57` | Weichsel bis Włocławek (52,65° N)      | 333         |
| `iho.96` | Limfjord (bis 9,366° E)                | 10          |

Verifiziert: `(31,5 / 60,8)` Ladogasee und `(35,5 / 61,8)` Onegasee liefern
beide `inBaltic = true`.

**Betroffene Datensätze: 0.** Die Bounding Box maskiert Fehler A vollständig.
Eine Erweiterung der Box „damit das Polygon hineinpasst" würde Ladoga und Onega
in Kartenbereich, Formularvalidierung und Karten-Extent holen — sie wäre also
genau die falsche Korrektur.

### 1.4 Fehler B — Polygon zu eng (Falsch-Negative)

Die IHO-Küstenlinie ist grob und lässt die inneren Küstengewässer weg:

```
In der Box, aber Polygon = false:  1.901 Zeilen  (9,8 % aller mit Koordinaten)
```

Cluster: Greifswalder Bodden und Strelasund (379), Flensburger Förde (159),
Lübecker und Wismarbucht (161), Fischland-Darß (149), Kieler und Eckernförder
Bucht (103). Das ist das Kerngebiet des Deutschen Meeresmuseums. Eine
Schweinswal-Meldung aus der Flensburger Förde bekommt heute `ostsee = 0`.

Abstand dieser Punkte zum IHO-Polygon:

| Schwelle | Zeilen | Anteil |
| -------- | ------ | ------ |
| ≤ 1 km   | 1.643  | 86,4 % |
| ≤ 2 km   | 1.739  | 91,5 % |
| ≤ 10 km  | 1.804  | 94,9 % |
| ≤ 20 km  | 1.828  | 96,2 % |
| ≤ 40 km  | 1.841  | 96,8 % |

### 1.5 Was eine Bereinigung für die Box bedeutet

Extent nach probeweisem Ausmaskieren der vier Artefakte:

```
GESAMT roh        lon  9,366 – 37,469   lat 52,654 – 67,081
GESAMT bereinigt  lon  9,420 – 30,349   lat 53,142 – 65,950
heutige Box       lon  9,400 – 30,200   lat 53,000 – 66,000
```

Die bereinigte Hülle deckt sich fast exakt mit der heutigen Box. Die einzige
Kante, die real Ostsee abschneidet, ist der **Osten**: 30,2 statt 30,349 — 0,15°
am Kopf der Newa-Bucht vor St. Petersburg. Der Westen bräuchte 9,42 statt 9,4,
also eine Verengung um 0,02°, keine Erweiterung.

---

## 2. Entscheidungen

| Frage                      | Entscheidung                                                           |
| -------------------------- | ---------------------------------------------------------------------- |
| Vorgehen                   | Polygon an der Quelle bereinigen, Box daraus ableiten                  |
| Zuschnitt                  | Fehler A **und** B gemeinsam                                           |
| Bedeutung von `ostsee = 1` | Wasserfläche nach OSM-Küstenlinie, landwärts um 200 m gepuffert        |
| Bestandsdaten              | Neu berechnen, mit Trockenlauf-Report und Rollback-Pfad                |
| Reihenfolge                | Umsetzung erst **nach Merge von PR #639**                              |
| Freigabe                   | Visuelle Kartenprüfung durch den Auftraggeber vor jedem Schreibvorgang |

Der Uferstreifen von 200 m ist fachlich begründet: die Analyse vom 2026-07-29
(`memory: land-sichtungen-analyse-2026-07-29`) fand 1.983 Kartenpunkte außerhalb
der Küstenlinie, davon 1.497 unter 100 m, mit 67,7 % Totfund-Anteil gegenüber
9,2 % im Gesamtbestand. Das sind Strandfunde und ruhende Robben, keine
Erfassungsfehler. Ein Modell ohne Uferstreifen würde sie auf `ostsee = 0` setzen
und damit einen Fehler durch einen anderen ersetzen.

---

## 3. Architektur

### 3.1 Geometrie-Pipeline (offline, manuell)

Läuft **nicht** im Build und nicht zur Laufzeit. Nur manuell, wenn die Geometrie
neu gebaut werden soll. Die Ausgabe wird committet.

```
 1  region    = ST_Union(5 IHO-Features aus src/tools/iho.json)
 2  region    = ST_Difference(region, artefakt_maske)      ← Fehler A
 3  expanded  = ST_Buffer(region, 20 km)                   ← in EPSG:3035, metrisch
 4  expanded  = ST_Difference(expanded, artefakt_maske)    ← Puffer darf A nicht zurückholen
 5  water     = ST_Difference(expanded, osm_land)          ← Fehler B
 6  water     = nur Teilflächen, die region berühren       ← Nordsee-Leckage entfernen
 7  ostsee    = ST_Buffer(water, 200 m)                    ← Uferstreifen
 8  ostsee    = ST_SimplifyPreserveTopology(ostsee, 20 m)
 9  teile     = ST_Subdivide(ostsee, 256)                  ← für den RBush-Index
10  bbox      = ST_Extent(ostsee)                          ← BALTIC_SEA_BBOX
```

**Schritt 3 — Puffergröße 20 km.** Holt 96,2 % der 1.901 Falsch-Negativen
zurück. 40 km brächte 0,6 Prozentpunkte mehr bei doppeltem Leckage-Risiko. Die
verbleibenden ~73 Zeilen liegen in Schlei, Trave und Elbe (in der
OSM-Küstenlinie Binnenwasser, nicht Meer) sowie in den 11 bekannten
Koordinatenfehlern; sie bleiben bewusst `ostsee = 0`.

**Schritt 6 — die heikelste Stelle.** Der 20-km-Puffer greift über Jütland und
die dänischen Inseln hinweg. Nach Abzug des Landes bleiben dort Nordsee-Streifen
übrig. Diese sind durch Land von der Ostsee getrennt, also eigene Teilflächen:
`ST_Dump` plus `ST_Intersects(region)` wirft sie weg. Der Limfjord ist die
einzige echt durchverbundene Nordsee-Ostsee-Passage; ihn schneidet die
Artefakt-Maske aus Schritt 2 und 4 heraus.

Falls trotzdem Nordseewasser übrig bleibt, zeigt es die Kartenprüfung aus
Abschnitt 3.3, bevor irgendetwas geschrieben wird.

**Eingaben:**

| Datei                                    | Herkunft                                    |
| ---------------------------------------- | ------------------------------------------- |
| `src/tools/iho.json`                     | vorhanden, unverändert                      |
| `src/tools/baltic-artifact-mask.geojson` | **neu**, vier Rechtecke, im Diff nachlesbar |
| `land-polygons-complete-4326`            | OSM, ~800 MB, **nicht** ins Repo            |

Die ungeteilte OSM-Variante ist zwingend. Natural Earth 10m ist zu grob (stuft
Flensburger Hafen als binnenlands ein), die `-split`-Variante hat Kachelkanten
mitten auf dem Festland. Das Skript prüft auf Vorhandensein und nennt sonst die
Bezugsquelle.

**Einzelne Punkte gegen die Küstenlinie prüfen:** `ogrinfo -ro -dialect SQLITE
-sql "SELECT COUNT(*) AS c FROM land_polygons WHERE ST_Intersects(geometry,
MakePoint(<LON>,<LAT>,4326))" land_polygons.shp` — `c = 0` heißt Wasser, `c = 1`
heißt Land. `ogrinfo -spat` ist dafür untauglich: die Landpolygone sind
kontinentgroß, ihre Bounding Box liefert für praktisch jeden Punkt einen
Treffer.

### 3.2 Laufzeit

`src/lib/server/geo/checkBalticSeaFile.ts` behält seinen Aufbau (RBush-Index,
Lazy-Init, Turf `booleanPointInPolygon`), bekommt aber zwei Korrekturen:

1. Statt fünf riesiger Features stehen subdividierte Teile im Index. RBush
   liefert dadurch weniger Kandidaten, und `booleanPointInPolygon` läuft auf
   ≤256 Stützpunkten statt auf bis zu 200.562. Das ist schneller, nicht langsamer.
2. `import rbushIndex from './rbush-index.json'` (Zeile 59) ist ein **statischer**
   Import — der Index landet im Bundle, obwohl `.claude/rules/geo.md`
   „Index NICHT bundlen, Lazy Loading verwenden" vorschreibt. Da die Datei
   ohnehin neu erzeugt wird, wird das auf einen dynamischen Import im
   bestehenden Lazy-Init nachgezogen.

Nebenbei bereinigt: die heutige Datei ist mit `JSON.stringify(…, null, 2)`
geschrieben — 31,9 MB für 8,3 MB Quelldaten. Ohne Einrückung schrumpft sie um
etwa das Vierfache. Es existieren zwei prüfsummengleiche Kopien
(`src/tools/rbush-index.json` und `src/lib/server/geo/rbush-index.json`); die in
`src/tools/` entfällt.

Zielgröße für den neuen Index: **unter 10 MB**. Die Simplify-Toleranz aus
Schritt 8 ist der Stellhebel; der tatsächlich verwendete Wert wird im
Generator-Skript und in `.claude/rules/geo.md` dokumentiert.

### 3.3 Visuelle Freigabe

Nach Schritt 10 der Pipeline und **vor** jedem Schreibvorgang an der Datenbank
erzeugt `npm run geo:review` eine eigenständige HTML-Seite und öffnet sie im
Browser:

- OSM-Basiskarte
- neue Ostsee-Wasserfläche, halbtransparent gefüllt
- altes IHO-Polygon als Kontur zum Vergleich
- abgeleitete Bounding Box als Rechteck
- die 1.901 bisherigen Falsch-Negativen als Marker — sie müssen jetzt innerhalb
  der Fläche liegen
- die fünf Referenzpunkte aus Fehler A als Marker — sie müssen außerhalb liegen

Die Seite ist zoom- und verschiebbar, damit die dänischen Meerengen, die
Newa-Bucht und die Bodden einzeln beurteilt werden können. Sie wird als Datei
übergeben, zusätzlich zu Screenshots der kritischen Ausschnitte.

**Diese Freigabe ist ein hartes Tor.** Ohne sie läuft weder der
Trockenlauf-Report noch die Migration.

### 3.4 Box-Ableitung

`BALTIC_SEA_BBOX` wird aus Schritt 10 erzeugt statt von Hand gepflegt, nach außen
auf 0,05° gerundet, damit die Formular-Fehlermeldung lesbare Zahlen nennt.

Der Generator schreibt die ungerundeten Werte zusätzlich in eine
Metadaten-Datei. Ein Test vergleicht Konstante gegen Metadaten und schlägt fehl,
wenn der Generator lief und die Konstante nicht nachgezogen wurde. Damit können
Polygon und Box nicht wieder auseinanderlaufen.

Die vier Verwendungsstellen bleiben bei einer gemeinsamen Konstante:

| Stelle                                                   | Zweck             |
| -------------------------------------------------------- | ----------------- |
| `src/lib/form/validation/sightingSchema.ts:237`          | Eingabegrenze     |
| `src/routes/api/map/sightings/publicMapConditions.ts:34` | Datenfilter       |
| `src/lib/map/extentUtils.ts:24`                          | View-Constraint   |
| `src/lib/server/db/mapFormToSighting.ts:323`             | `ostsee_geo`-Flag |

Eine Aufteilung nach Verwendungszweck wäre sauberer, ist hier aber nicht nötig:
nach der Bereinigung passt eine Hülle für alle vier Zwecke. YAGNI.

### 3.5 Migration

Zwei getrennte Schritte, damit die Freigabe vor dem Schreiben liegt.

**Trockenlauf** (`npm run geo:report`) rechnet für alle Zeilen mit Koordinaten
neu und schreibt einen Report: wie viele Zeilen kippen 0→1 und 1→0,
aufgeschlüsselt nach Region, mit Beispiel-IDs und den auffälligsten Fällen.
Ändert nichts.

**Migration** sichert `(id, ostsee, ostsee_geo)` nach `sichtungen_ostsee_backup`
und schreibt dann die neuen Werte. Rollback ist ein `UPDATE … FROM` aus der
Backup-Tabelle. Muster: `src/tools/fix-land-boat-drive.js`.

Zwei Warnungen:

- Die Dev-Datenbank ist zwischen allen Worktrees geteilt. Der Trockenlauf ist
  harmlos, die Migration wirkt sofort überall.
- Lokale und Prod-Zahlen weichen bereits ab (Bootsantrieb-Korrektur vom
  2026-07-29). Der Report gilt für die lokale Datenbank; Produktion braucht einen
  eigenen Lauf und eine eigene Freigabe.

---

## 4. Tests

Test-First nach `.claude/rules/testing.md`: die Tests werden vor der
Implementierung geschrieben und schlagen zunächst fehl.

| Test             | Punkte                                                                                                                                                                                                                                                                                      | Erwartung                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Invariante       | Raster über alle Polygon-Stützpunkte                                                                                                                                                                                                                                                        | `isInBalticArea` überall `true` |
| Fehler A behoben | Ladoga 31,5/60,8 · Onega 35,5/61,8 · Weichsel 19,0/52,7 · Torne 24,0/66,5 · Limfjord 9,38/57,02                                                                                                                                                                                             | `inBaltic === false`            |
| Fehler B behoben | Flensburger Förde 9,589748/54,850426 (Sichtung id 3946) · Eckernförder Bucht 9,838145/54,475078 (Sichtung id 25581) · Strelasund 13,098357/54,314608 (Sichtung id 4949) · Greifswalder Bodden 13,66281/54,28838 (Sichtung id 8868) — je außerhalb des heutigen Polygons und nach OSM Wasser | `inBaltic === true`             |
| Uferstreifen     | Strandpunkt ~100 m landeinwärts / 5 km landeinwärts                                                                                                                                                                                                                                         | `true` / `false`                |
| Weiterhin außen  | Helgoland 7,89/54,18 · Hamburg 10,0/53,55 · Hannover 9,73/52,37 · Doggerbank 2,02/54,87                                                                                                                                                                                                     | `inBaltic === false`            |
| Box abgeleitet   | Konstante gegen Generator-Metadaten                                                                                                                                                                                                                                                         | identisch                       |

`src/lib/server/geo/checkBalticSeaFile.comprehensive.test.ts` enthält rund 30
`inChartArea`-Zusicherungen. Einige Erwartungen ändern sich durch die neue
Geometrie und müssen mitgezogen werden.

`npm run test:quick` muss grün bleiben.

---

## 5. Reihenfolge

1. **Warten auf Merge von PR #639.** Dort liegt `docs/OSTSEE_FLAGS.md`, dessen
   Abschnitt „Fehler 3" diese Spec ersetzt. Ein paralleles Vorgehen kollidiert.
2. Von aktualisiertem `main` abzweigen.
3. Tests schreiben (RED).
4. Artefakt-Maske zeichnen, Pipeline bauen, Geometrie erzeugen.
5. **Kartenprüfung und Freigabe** (Abschnitt 3.3). Hartes Tor.
6. Index bauen, `BALTIC_SEA_BBOX` ableiten, Laufzeit anpassen (GREEN).
7. Trockenlauf-Report, Freigabe, Migration lokal.
8. Dokumentation nachziehen.

---

## 6. Betroffene Dateien

**Neu**

- `src/tools/baltic-artifact-mask.geojson` — die vier Ausschlüsse
- `src/tools/build-baltic-geometry.ts` — Pipeline (Abschnitt 3.1)
- `src/tools/render-baltic-review.ts` — Kartenprüfung (Abschnitt 3.3)
- `src/tools/recalc-baltic-flags.ts` — Report und Migration (Abschnitt 3.5)
- Metadaten-Datei mit ungerundetem Extent (Abschnitt 3.4)

**Geändert**

- `src/lib/utils/geo/checkBalticSea.ts` — abgeleitete Box, Kommentar korrigiert
- `src/lib/server/geo/checkBalticSeaFile.ts` — dynamischer Import
- `src/lib/server/geo/rbush-index.json` — neu erzeugt, ohne Einrückung
- `src/tools/create-rbush-index.js` — Einrückung raus, Subdivide-Eingabe
- `src/lib/server/geo/checkBalticSeaFile.comprehensive.test.ts` — Erwartungen
- `docs/OSTSEE_FLAGS.md` — „Fehler 3" durch die Messung ersetzen
- `.claude/rules/geo.md`, `.claude/rules/maps.md` — Box-Zahlen, Simplify-Toleranz
- `package.json` — `geo:build`, `geo:review`, `geo:report`

**Entfällt**

- `src/tools/rbush-index.json` — prüfsummengleiche Kopie

---

## 7. Nicht Teil dieser Spec

- **Die 8.900 Zeilen, deren gespeichertes `ostsee` schon heute dem aktuellen
  Polygon widerspricht.** Die Migration aus Abschnitt 3.5 räumt das als
  Nebeneffekt mit auf, aber die Ursachenanalyse (Altsystem-Logik) bleibt offen.
- **Der Wert `2` in `ostsee_geo`** (15.225 Zeilen aus dem Altsystem). Bedeutung
  ungeklärt, siehe `docs/OSTSEE_FLAGS.md`. Abfragen prüfen weiterhin `> 0`,
  nie `= 1`.
- **Die Admin-Übersicht** zeigt unter dem Label „Ostsee" die Spalte
  `inBalticSeaGeo` („Fehler 2"). Eigener Vorgang.
- **Schlei, Trave, Elbe und Nord-Ostsee-Kanal.** In der OSM-Küstenlinie
  Binnenwasser; Sichtungen dort bleiben `ostsee = 0`. Eine Aufnahme bräuchte eine
  kuratierte Gewässerliste und eine fachliche Abstimmung.
