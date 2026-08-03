---
paths:
  - 'src/lib/server/geo/**'
  - 'src/lib/utils/geo/**'
  - 'src/routes/api/geo/**'
---

# Geographic Validation

Regeln für Ostsee-Positionsprüfung und Spatial Indexing.

---

## Dual-Strategie

### 1. Schnelle Bounding Box (`isInBalticArea`)

```typescript
BALTIC_SEA_BBOX = {
	minLongitude: 9.4, // innere Flensburger Förde
	maxLongitude: 30.25, // Kopf der Newa-Bucht
	minLatitude: 53.55, // Oder bei Police
	maxLatitude: 65.95 // Bottenwiek bei Tornio
};
```

O(1), <0.01ms. Client + Server verfügbar.

**Nicht von Hand pflegen.** Die vier Werte sind der Extent der Geometrie aus
`src/lib/server/geo/baltic-extent.json`, nach außen auf 0,05° gerundet.
`src/lib/utils/geo/checkBalticSea.test.ts` schlägt fehl, sobald Konstante und
Extent auseinanderlaufen.

### 2. Präzise Geometrie (`isInBalticShape`)

RBush Spatial Index + Turf.js `booleanPointInPolygon`.

- Index: `rbush-index.json` (3,9 MB, 1.575 subdividierte Teilflächen)
- Singleton-Initialisierung (10-50ms init, 0.5-2ms pro Query)
- Behandelt Inseln/Archipele korrekt

Der Index wird **nicht** aus Rohdaten gerechnet, sondern von einer manuell
gestarteten PostGIS-Pipeline erzeugt:

```bash
export BALTIC_LAND_SHP=…/land-polygons-complete-4326/land_polygons.shp
npm run geo:build    # Geometrie + baltic-extent.json (~1 h)
npm run geo:review   # Prüfkarte — MUSS freigegeben werden
cd src/tools && node create-rbush-index.js
```

Quellen und Stellhebel (alle in `src/tools/build-baltic-geometry.sql`):
20 km Regionspuffer, 200 m Uferstreifen, 20 m Simplify-Toleranz. Ausgeschlossen
per `baltic-artifact-mask.geojson`: Ladogasee, Onegasee, Weichsel- und
Torne-Flussläufe, Oder oberhalb des Stettiner Haffs, **westlicher** Limfjord
(damit ist die Nordsee-Passage bei Thyborøn zu; der östliche Limfjord bei
Aalborg und Hals bleibt als Kattegat-Zufahrt drin). Eingeschlossen
per `baltic-inclusion-mask.geojson` — seit 2026-08-03 echte OSM-Wasserumrisse
+200 m (Overpass-Abzug, je Feature in `grund` belegt) statt grober
Korridor-Vierecke: Schlei inkl. Noore, Untertrave von Lübeck bis Travemünde
inkl. Pötenitzer Wiek und Dassower See, Unterwarnow ab Mühlendamm inkl.
Breitling, Saaler Bodden sowie — defensiv, heute schon seewärts der
Küstenlinie in der Wasserfläche — Salzhaff, Achterwasser und Krumminer Wiek.
Der Peenestrom liegt komplett seewärts der Küstenlinie und braucht keinen
Korridor. Referenz- und Ausschlusspunkte: `src/tools/baltic-inclusion-mask.test.ts`
(Punkte nur per `ST_PointOnSurface` aus OSM-Wasserflächen ableiten — von Hand
geschätzte Koordinaten lagen mehrfach auf Land und haben falsche
Lücken-Diagnosen erzeugt).

**Einschränkung:** In den Einschluss-Korridoren greift der Landabzug nicht, sonst
wären diese Gewässer nicht aufnehmbar (OSM führt sie als Binnenwasser). Seit dem
Umbau auf Wasserumrisse beschränkt sich das auf den ~200-m-Uferstreifen — vorher
schlugen die Korridore rund **98 km² Festland** zu, und Kappeln, Arnis,
Travemünde, Priwall, Warnemünde samt Rostocker Hafen lieferten `inBaltic = true`.
Index und Flags sind seit dem 2026-08-03 auf diesem Stand (Freigabe der
Review-Karte, `geo:migrate`: 73 Zeilen — 70× `ostsee` 0→1 u.a. Trave bei
Lübeck und Dassower See, 3× 1→0 im ehemaligen Korridor-Landstreifen).
Rollback-Ebenen: `sichtungen_ostsee_backup` (Stand vor diesem Recalc) und
`sichtungen_ostsee_backup_20260730` (Stand vor der Juli-Bereinigung).

Für die OSM-Küstenlinie ist zwingend die **ungeteilte** Variante
`land-polygons-complete-4326` zu verwenden. Punkt-in-Polygon-Stichproben gegen
das Shapefile brauchen `ogrinfo -dialect SQLITE` mit `ST_Intersects`/`MakePoint`
— `-spat` ist untauglich, weil die Landpolygone kontinentgroß sind und ihre
Bounding Box immer trifft.

**Beim Durchlaufen des Index selbst:** `tree.children` sind ab dieser Größe
Zwischenknoten, nicht Blätter. Rekursiv absteigen und auf `node.geometry` prüfen
— bei den früheren fünf Features war der Baum flach.

Offener Punkt: `checkBalticSeaFile.ts` importiert `rbush-index.json` **statisch**,
der Index landet also im Bundle. Der Umbau auf einen dynamischen Import macht
`checkBalticSeaFile` `async` und zieht vier Aufrufer plus zwei Testdateien nach;
er ist bewusst aufgeschoben.

---

## API Endpoint

```
GET /api/geo/inBaltic?longitude=10.1&latitude=54.3

Response: { inBaltic: boolean, inChartArea: boolean, longitude, latitude }
```

`inBaltic` = präzise Geometrie, `inChartArea` = Bounding Box.

---

## Persistenz: `ostsee` und `ostsee_geo` — Namen sind irreführend

Die beiden Ergebnisse landen in zwei Spalten, deren Namen die Bedeutungen
**verkehrt herum** nahelegen:

| Ergebnis      | Spalte       | Prüfung                      |
| ------------- | ------------ | ---------------------------- |
| `inBaltic`    | `ostsee`     | exaktes Polygon — **streng** |
| `inChartArea` | `ostsee_geo` | Bounding Box — **schwach**   |

Der Zusatz „geo" sitzt also an der _groben_ Prüfung. Zwei Konsequenzen für jeden
neuen Code:

1. Fachliche Aussagen („liegt in der Ostsee") nur über **`ostsee`**. `ostsee_geo`
   ist ein Kartenbereichs-Filter; sein Rechteck umfasst Jütland, Schonen,
   Nordostdeutschland, Polen und das Baltikum.
2. `ostsee_geo` hat **drei** Werte: `0` = keine Position im Kartenbereich, `1` =
   drin, `2` = drin (nur Altsystem, 15.225 Zeilen). Deshalb **immer `> 0` prüfen,
   nie `= 1`** — sonst fallen 79 % des Bestands lautlos heraus.

Die Invariante „Polygon liegt in der Bounding Box" **gilt** und wird von
`src/lib/utils/geo/checkBalticSea.test.ts` über alle Stützpunkte geprüft. Wer die
Box-Zahlen ändern will, ändert die Geometrie und lässt `npm run geo:build`
laufen.

Seit der Bereinigung am 2026-07-30 hat der Altbestand keine Widersprüche mehr:
`ostsee` ist für alle 19.881 Zeilen aus der Geometrie gerechnet, Zeilen ohne
Koordinaten tragen 0. Die Rückfallebene ist die Tabelle
`sichtungen_ostsee_backup`.

### Anzeige: nie selbst über die Flags verzweigen

Der anzuzeigende Zustand kommt aus **`getBalticSeaStatus()`**
(`src/lib/utils/geo/balticSeaStatus.ts`), Label und Erklärung aus
`BALTIC_SEA_STATUS_PRESENTATION` daneben. Vier Zustände: `baltic`, `edge`
(Flags widersprechen sich), `outside`, `noPosition`.

Das gilt auch für Handlebars-Vorlagen, die keine TypeScript-Funktion aufrufen
können: Der Status wird **einmal** in `emailService.ts` berechnet
(`server/templates/balticSeaEmailContext.ts`) und als `sighting.balticSea` in den
Kontext gelegt. Ein `{{#if sighting.inBalticSeaGeo}}` in einer Vorlage ist genau
der Fehler, an dem die Benachrichtigungs-Mail von der Admin-Anzeige abgewichen
ist (Fehler 4 in `docs/OSTSEE_FLAGS.md`).

**Der Status muss aus den Rohwerten der Zeile kommen** — vor jeder
`!!`-Umwandlung. Booleans verlieren den Altsystem-Wert `2` und machen
`noPosition` unerreichbar.

Die wirksame Mail-Vorlage steht in `app_config`, nicht im Code. Wer den Default
ändert, zieht den Seed mit `npm run config:refresh-email-template` nach und trägt
den Hash des alten Stands in `PREVIOUS_SHIPPED_TEMPLATE_HASHES` ein.

Vollständige Referenz inkl. Messwerten: `docs/OSTSEE_FLAGS.md`.
Bereinigung, Entscheidungen und Umsetzung:
`docs/archive/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`

---

## Schlüsseldateien

| Datei                                      | Zweck                                |
| ------------------------------------------ | ------------------------------------ |
| `src/lib/server/geo/checkBalticSeaFile.ts` | RBush + Turf.js Server-Validierung   |
| `src/lib/server/geo/rbush-index.json`      | Spatial Index, 3,9 MB (erzeugt)      |
| `src/lib/server/geo/baltic-extent.json`    | Extent — Quelle der Box              |
| `src/tools/build-baltic-geometry.sql`      | Geometrie-Pipeline                   |
| `src/tools/baltic-inclusion-mask.geojson`  | Einschluss-Korridore (Wasserumrisse) |
| `src/tools/baltic-inclusion-mask.test.ts`  | Referenzpunkte der Maske             |
| `src/lib/utils/geo/checkBalticSea.ts`      | Client-Bounding-Box                  |
| `src/routes/api/geo/inBaltic/+server.ts`   | HTTP Endpoint                        |

---

## Best Practices

- Index NICHT bundlen (32MB) -- Lazy Loading verwenden
- Fehler degradieren zu `false` (konservative Validierung)
- Punkte auf Polygon-Grenzen gelten als "inside"
- Koordinaten auf 6 Dezimalstellen normalisieren
