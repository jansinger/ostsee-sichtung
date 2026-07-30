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
	minLongitude: 9.4,
	maxLongitude: 30.2,
	minLatitude: 53.0,
	maxLatitude: 66.0
};
```

O(1), <0.01ms. Client + Server verfügbar.

### 2. Präzise Geometrie (`isInBalticShape`)

RBush Spatial Index + Turf.js `booleanPointInPolygon`.

- Index: `rbush-index.json` (32MB, 5 MultiPolygon Features)
- Lazy Loading als Singleton (10-50ms init, 0.5-2ms pro Query)
- Behandelt Inseln/Archipele korrekt

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

Die Invariante „Polygon liegt in der Bounding Box" gilt **nicht**: die Westgrenze
9,4° E schneidet Kieler Bucht und Flensburger Förde ab (126 Zeilen mit
`ostsee = 1` westlich davon). Wer `BALTIC_SEA_BBOX` anfasst, prüft das mit.

Vollständige Referenz inkl. Messwerten und zwei noch offener Fehler:
`docs/OSTSEE_FLAGS.md`

---

## Schlüsseldateien

| Datei                                      | Zweck                              |
| ------------------------------------------ | ---------------------------------- |
| `src/lib/server/geo/checkBalticSeaFile.ts` | RBush + Turf.js Server-Validierung |
| `src/lib/server/geo/rbush-index.json`      | 32MB Spatial Index                 |
| `src/lib/utils/geo/checkBalticSea.ts`      | Client-Bounding-Box                |
| `src/routes/api/geo/inBaltic/+server.ts`   | HTTP Endpoint                      |

---

## Best Practices

- Index NICHT bundlen (32MB) -- Lazy Loading verwenden
- Fehler degradieren zu `false` (konservative Validierung)
- Punkte auf Polygon-Grenzen gelten als "inside"
- Koordinaten auf 6 Dezimalstellen normalisieren
