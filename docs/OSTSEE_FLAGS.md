# Die beiden Ostsee-Flags: `ostsee` und `ostsee_geo`

Stand: 2026-07-30. Zahlen aus der lokalen Datenbank (19.880 Zeilen); sie weichen
von Produktion leicht ab (siehe `docs/WORKTREES.md` zur geteilten Dev-DB).

Die Tabelle `sichtungen` hat zwei Spalten, die beide „liegt in der Ostsee"
bedeuten könnten. Sie bedeuten **nicht dasselbe**, und ihre Namen legen die
Bedeutungen genau verkehrt herum nahe. Dieses Dokument ist die verbindliche
Referenz.

---

## Kurzfassung

| Spalte       | Drizzle-Feld     | Bedeutung heute                            | Wer schreibt        |
| ------------ | ---------------- | ------------------------------------------ | ------------------- |
| `ostsee`     | `inBalticSea`    | Punkt liegt **im exakten Ostsee-Polygon**  | neue App, Altsystem |
| `ostsee_geo` | `inBalticSeaGeo` | Punkt liegt **in der groben Bounding Box** | neue App, Altsystem |

`ostsee` ist die **strenge** Prüfung, `ostsee_geo` die **schwache** — obwohl der
Zusatz „geo" das Gegenteil suggeriert. Das ist die wichtigste Aussage dieses
Dokuments und die Ursache der beiden Fehler weiter unten.

---

## Wie die Werte entstehen

Beide Werte stammen aus **einem** Aufruf in `src/lib/server/db/mapFormToSighting.ts`:

```ts
({ inBaltic, inChartArea } = checkBalticSeaFile(lon, lat));
// …
inBalticSea: inBaltic ? 1 : 0,       // ostsee
inBalticSeaGeo: inChartArea ? 1 : 0  // ostsee_geo
```

`checkBalticSeaFile` (`src/lib/server/geo/checkBalticSeaFile.ts`) liefert:

- **`inBaltic`** — Punkt-in-Polygon gegen die Natural-Earth-Ostsee-Geometrie
  (RBush-Index + Turf.js). Präzise Küstenlinie.
- **`inChartArea`** — reine Bounding-Box-Prüfung gegen `BALTIC_SEA_BBOX`
  (`src/lib/utils/geo/checkBalticSea.ts`):

  | Grenze | Wert    |
  | ------ | ------- |
  | West   | 9,4° E  |
  | Ost    | 30,2° E |
  | Süd    | 53,0° N |
  | Nord   | 66,0° N |

  Dieses Rechteck umfasst große Landflächen (Jütland, Schonen, Nordostdeutschland,
  Polen, Baltikum) und Wasser, das keine Ostsee ist. Eine Sichtung in Hannover
  läge darin.

Ohne verwertbare Koordinaten sind beide Werte `0`.

---

## Wertebereich

`ostsee_geo` ist als `integer` deklariert und enthält **drei** Werte, nicht zwei:

| Wert | Zeilen | Zeitraum (`created`)     | Bedeutung                             |
| ---- | ------ | ------------------------ | ------------------------------------- |
| `0`  | 657    | 2012-05-31 – 2025-11-10  | keine verwertbare Position            |
| `1`  | 3.998  | 2012-05-29 – **laufend** | Position im Kartenbereich             |
| `2`  | 15.225 | 2012-05-21 – 2025-11-09  | Position im Kartenbereich (Altsystem) |

**Die neue App schreibt ausschließlich `0` und `1`.** Der Wert `2` endet exakt am
Cutoff des Altsystems (letzter Schreibvorgang 2025-11-10, vgl. den
Freigabe-Workflow) und wird nie wieder entstehen.

### Was `1` von `2` unterscheidet: nichts Auffindbares

Beide bedeuten „im Kartenbereich". Geprüft und jeweils **ohne** Trennschärfe:

| Prüfung                 | Ergebnis                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| Bounding Box            | `1`: 3.983 von 3.998 drin · `2`: 15.208 von 15.225 drin — praktisch gleich    |
| Geografische Lage       | Ø 11,26° E / 54,64° N gegen Ø 10,86° E / 54,85° N, gleiche Wertebereiche      |
| Zeitverlauf             | beide Werte laufen 2012–2025 **parallel**, kein Semantikwechsel               |
| ID-Bereiche             | 173–29.180 gegen 157–29.178 — vollständig überlappend, kein Import-Batch      |
| `eingangskanal`         | `2` überwiegt in **jedem** Kanal                                              |
| `vonwo` / `schiffsname` | `2` korreliert mit Schiffsmeldungen, erklärt sich aber aus der Grundrate 79 % |

**Fazit:** Die Unterscheidung ist aus den Daten nicht rekonstruierbar. Sie müsste
aus dem Quellcode des Altsystems oder vom Deutschen Meeresmuseum kommen. Solange
das offen ist, gilt die einzige belastbare Auslegung:

> **`ostsee_geo = 0` heißt „keine Position im Kartenbereich", jeder Wert `> 0`
> heißt „Position im Kartenbereich".**

Genau so behandelt der Code die Spalte bereits — `!!sighting.inBalticSeaGeo` in
`emailService.ts` und `{#if sighting.inBalticSeaGeo}` in den Svelte-Vorlagen machen
aus `2` ein `true`. Eine Abfrage darf deshalb **nie** auf `= 1` prüfen.

---

## Fehler 1: Statistik-Abfrage zählte nur 0 und 1

War in `src/routes/admin/statistics/+page.server.ts`:

```ts
inBalticSea:      COUNT(CASE WHEN ostsee_geo = 1 THEN 1 END)
outsideBalticSea: COUNT(CASE WHEN ostsee_geo = 0 THEN 1 END)
```

Damit fielen die 15.225 Zeilen mit `2` lautlos heraus — 79 % der Daten. Die
Abfrage ist am 2026-07-30 entfernt worden; sie wurde ohnehin nie gerendert.
Eine Neufassung muss `> 0` statt `= 1` prüfen.

---

## Fehler 2: Die Admin-Übersicht zeigt die falsche Spalte (offen)

`src/routes/admin/+page.svelte` beschriftet die Spalte mit **„Ostsee"**, rendert
darin aber `inBalticSeaGeo`:

```svelte
{ key: 'inBalticSeaGeo', label: 'Ostsee', sortKey: null }
…
{#if sighting.inBalticSeaGeo}
```

Weil `ostsee_geo` die Bounding Box ist, erscheinen **9.316 Zeilen** mit
`ostsee = 0` (also nachweislich **nicht** in der Ostsee) in dieser Spalte als „in
der Ostsee". Eine Meldung aus Hamburg oder Hannover würde dort als Ostsee-Sichtung
ausgewiesen.

Die Detailansicht macht es richtig — `AdminSightingView.svelte` zeigt beide Werte
getrennt als „In der Ostsee" und „In der Ostsee (geo)".

**Korrektur:** In der Übersicht `inBalticSea` unter dem Label „Ostsee" rendern
und `inBalticSeaGeo`, wenn überhaupt, als eigene Spalte „Kartenbereich".

---

## Fehler 3: Die Bounding Box schneidet die Ostsee im Westen ab (offen)

Erwartbar wäre, dass das Polygon in der Bounding Box liegt, also
`ostsee = 1 → ostsee_geo > 0`. Das gilt **nicht**: die Westgrenze steht auf
9,4° E, das Ostsee-Polygon reicht westlicher (Kieler Bucht, Flensburger Förde,
dänische Meerengen).

- **126 Zeilen** haben `ostsee = 1` bei einer Länge **unter 9,4° E**.
- **533 Zeilen** haben `ostsee = 1` und `ostsee_geo = 0` (alle aus dem Altsystem).
- Die jüngsten echten Meldungen liegen bei 9,59° E — 0,19° von der Kante.

Eine neue Sichtung in der Flensburger Förde bekäme damit `ostsee = 1` und
`ostsee_geo = 0` und würde in der Admin-Übersicht (Fehler 2) als „nicht Ostsee"
geführt.

Der Kommentar an `BALTIC_SEA_BBOX` nennt die Westgrenze „etwa Skagerrak" — das
Skagerrak liegt bei 8–11° E, die Grenze ist also zu eng gewählt. Eine Korrektur
auf ca. **8,5° E** würde das Polygon einschließen; sie berührt aber auch die
Karten-Extent-Begrenzung (`.claude/rules/maps.md`) und will deshalb bewusst
entschieden werden.

---

## Die E-Mail-Benachrichtigung ist korrekt

Die Handlebars-Vorlage (Default in `configInitializer.ts`) staffelt richtig:
`inBalticSeaGeo` ist die äußere, gröbere Bedingung, `inBalticSea` die
Verfeinerung. Der Fall „im Polygon, aber außerhalb der Bounding Box" wird als
**„Ostsee-Rand — bitte Plausibilität prüfen"** ausgewiesen. Das ist für die
Westkante genau die passende Aussage.

---

## Wo das verankert ist

Kurzfassungen liegen in `.claude/rules/database.md` (lädt bei jeder Datei unter
`src/lib/server/db/**`, also auch beim Bearbeiten des Schemas) und in
`.claude/rules/geo.md` (lädt bei den Geo-Modulen).

**Bewusst nicht als Kommentar an den Spalten in `schema.ts`:** Der CI-Job
`migration-check` verlangt bei jeder Änderung an `schema.ts` eine Migration unter
`drizzle/` — rein pfadbasiert, auch bei reinen Kommentaränderungen, für die
`db:generate` erwartungsgemäß „No schema changes" meldet. Wer die Erklärung dorthin
verschiebt, macht die CI rot, ohne dass es etwas zu migrieren gäbe.

---

## Regeln für neuen Code

1. **Öffentliche Aussagen über „liegt in der Ostsee" nur über `ostsee`.**
   `ostsee_geo` ist ein Kartenbereichs-Filter, keine fachliche Aussage.
2. **Nie auf `ostsee_geo = 1` prüfen** — immer `> 0`, sonst verschwindet der
   Altbestand.
3. **`ostsee_geo` ist `notNull` mit Default 0, `ostsee` ist nullable.** Diese
   Asymmetrie ist Altbestand. Praktisch enthält `ostsee` derzeit **keine**
   `NULL`-Werte (0 von 19.880 Zeilen geprüft), die Spalte erlaubt sie aber — eine
   Auswertung sollte sie deshalb trotzdem abfangen, statt sich darauf zu verlassen.
4. **Keinen dritten Wert einführen.** Wer eine neue Abstufung braucht, legt eine
   eigene Spalte an, statt die ungeklärte `2` zu erweitern.
