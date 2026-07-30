# Die beiden Ostsee-Flags: `ostsee` und `ostsee_geo`

Stand: 2026-07-30. Zahlen aus der lokalen Datenbank (19.881 Zeilen); sie weichen
von Produktion leicht ab (siehe `docs/WORKTREES.md` zur geteilten Dev-DB).

> **Wichtig:** Die Bestandszahlen in den Abschnitten „Wertebereich" und
> „Fehler 1" beschreiben den Zustand **vor** der Geometrie-Bereinigung vom
> 2026-07-30. Seither ist `ostsee` für alle Zeilen aus der bereinigten Geometrie
> gerechnet (10.440 → 18.717 mit `ostsee = 1`), Zeilen ohne Koordinaten tragen 0,
> und es gibt keine Invarianten-Verletzung mehr (533 → 0). `ostsee_geo` behielt
> seinen Altwert `2`, wo sich die Aussage nicht änderte (15.225 → 15.208).
> Rückfallebene ist die Tabelle `sichtungen_ostsee_backup`. Details: Fehler 3
> weiter unten und `docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`. **Produktion ist
> davon nicht berührt und braucht einen eigenen Lauf.**

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

- **`inBaltic`** — Punkt-in-Polygon gegen die bereinigte Ostsee-Geometrie
  (RBush-Index + Turf.js). Quelle sind die IHO-Seegebiete von MarineRegions,
  verschnitten mit der OSM-Küstenlinie; erzeugt von `npm run geo:build`.
- **`inChartArea`** — reine Bounding-Box-Prüfung gegen `BALTIC_SEA_BBOX`
  (`src/lib/utils/geo/checkBalticSea.ts`):

  | Grenze | Wert     |
  | ------ | -------- |
  | West   | 9,40° E  |
  | Ost    | 30,25° E |
  | Süd    | 53,55° N |
  | Nord   | 65,95° N |

  **Nicht abschreiben.** Die Werte sind seit dem 2026-07-30 aus der Geometrie
  abgeleitet und ändern sich mit ihr; eine Auswertung importiert
  `BALTIC_SEA_BBOX` aus `src/lib/utils/geo/checkBalticSea.ts`.

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

## Fehler 2: Die Admin-Übersicht zeigte die falsche Spalte (behoben am 2026-07-30)

`src/routes/admin/+page.svelte` beschriftete die Spalte mit **„Ostsee"**, rendete
darin aber `inBalticSeaGeo`:

```svelte
{ key: 'inBalticSeaGeo', label: 'Ostsee', sortKey: null }
…
{#if sighting.inBalticSeaGeo}
```

Weil `ostsee_geo` die Bounding Box ist, erschienen vor der Geometrie-Bereinigung
**9.316 Zeilen** mit `ostsee = 0` (also nachweislich **nicht** in der Ostsee) in
dieser Spalte als „in der Ostsee". Eine Meldung aus **Hamburg** (9,99° O /
53,55° N — in der Box, nicht im Polygon) wurde dort als Ostsee-Sichtung
ausgewiesen. Hannover übrigens nicht: es liegt mit 52,38° N südlich der Südgrenze.

### Korrektur: ein kombinierter Status

Die Spalte trägt weiter das Label „Ostsee", zeigt aber den Status aus **beiden**
Flags plus der Frage, ob überhaupt Koordinaten vorliegen —
`src/routes/admin/balticSeaStatus.ts`:

| Koordinaten | `ostsee` | `ostsee_geo` | Anzeige         | Badge           |
| ----------- | -------- | ------------ | --------------- | --------------- |
| fehlen      | beliebig | beliebig     | „ohne Position" | `badge-outline` |
| vorhanden   | `> 0`    | `> 0`        | „Ostsee"        | `badge-info`    |
| vorhanden   | `> 0`    | `0`          | „Widerspruch"   | `badge-warning` |
| vorhanden   | `0`      | beliebig     | „außerhalb"     | `badge-ghost`   |

Zwei getrennte Spalten wären die naheliegendere Korrektur gewesen, aber die
Tabelle führt bereits 18 Spalten, und `ostsee_geo` als nacktes Ja/Nein ist allein
nicht handlungsleitend.

Der Zustand **„Widerspruch"** ist nach der Bereinigung leer (0 Zeilen) und kann von
keinem Code-Pfad mehr erzeugt werden: die Recalc-SQL schreibt beide Spalten in
einer Transaktion mit Invarianten-Wächter, und `mapFormToSighting` — auch im
Bearbeitungsweg über `updateSighting` — nimmt beide Werte aus **einem**
`checkBalticSeaFile`-Aufruf. Er bleibt trotzdem als eigener Zustand bestehen:
**Produktion ist noch nicht neu berechnet** und trägt die Kombination weiterhin.
Ohne den Zustand würde die Übersicht solche Zeilen stillschweigend als „Ostsee"
ausweisen — genau der Fehler, um den es hier geht.

Der Zustand **„ohne Position"** trifft 390 Zeilen. Ohne Koordinaten belegt auch
`ostsee = 1` nichts; vor der Bereinigung standen 378 solcher Zeilen auf `1`.

### Nachgemessen (2026-07-30, nach der Bereinigung)

Über alle 19.491 Zeilen mit Koordinaten, gegen `checkBalticSeaFile` gerechnet:

| Spalte       | stimmt mit ihrer Prüfung überein |
| ------------ | -------------------------------- |
| `ostsee`     | **100,00 %** (Polygon)           |
| `ostsee_geo` | **100,00 %** (Bounding Box)      |

Die alte Anzeige über `ostsee_geo` würde weiterhin **457 Zeilen** falsch als
Ostsee ausweisen (`ostsee = 0` bei `ostsee_geo > 0`). Verteilung der Spalte heute:
18.717 „Ostsee", 774 „außerhalb", 390 „ohne Position", 0 „Widerspruch".

Abgesichert durch `src/routes/admin/balticSeaStatus.test.ts`; der zentrale Test
weist eine Sichtung mit `ostsee = 0` und `ostsee_geo = 1` **nicht** als Ostsee aus.

### Offen: dieselbe Verwechslung an drei weiteren Stellen

1. **`AdminSightingView.svelte`** (Zeilen um 328/329) zeigt beide Rohwerte getrennt
   als „In der Ostsee" und „In der Ostsee (geo)" — nicht falsch, aber nicht
   derselbe Wert wie die Übersicht.
2. **Die Benachrichtigungs-Mail** (Default in `configInitializer.ts`, Zeilen ~72–107)
   prüft in der **äußeren** Bedingung `inBalticSeaGeo` und zeigt dann ein grünes
   „Ostsee ✓". Eine Meldung aus dem Hamburger Hafen bekommt damit denselben Badge
   wie eine echte Ostsee-Sichtung; `inBalticSea` wird nur im else-Zweig angesehen.
   Ausführlich als **Fehler 4** weiter unten — inklusive des Stolpersteins, dass
   die Vorlage aus `app_config` kommt und der DB-Wert gegen den Code-Default
   gewinnt.
3. **`statistics/+page.server.ts`** (Zeilen ~229/230) zählt
   `COUNT(CASE WHEN ostsee_geo = 1 …)` unter dem Feldnamen `inBalticSea` — falsche
   Spalte und der `= 1`-Fehler aus Fehler 1 in einer Abfrage. Wird nicht gerendert.

Alle drei sollen an dieselbe Funktion wie die Übersicht angeschlossen werden,
damit der Wert nur an einer Stelle entsteht.

---

## Fehler 3: Das Polygon hatte zwei Fehler (behoben am 2026-07-30)

Die ursprüngliche Vermutung lautete, die Bounding Box schneide die Ostsee im
Westen ab. Die Nachmessung hat das **widerlegt**: nur fünf von rund 330.000
Stützpunkten der damaligen Geometrie lagen westlich von 9,4° E, und das war der
**Limfjord bei Aalborg** — nicht die Kieler Bucht (ab 10,1° E) und nicht die
Flensburger Förde (ab 9,43° E). Über alle 19.491 Zeilen mit Koordinaten
gerechnet, verletzte **keine einzige** die Invariante.

Die im Befund genannten 126 bzw. 533 Zeilen messen etwas anderes: sie tragen ein
Altsystem-`ostsee = 1` auf Müll- und Nordsee-Koordinaten — Null Island, `lat = 90`,
Zeilen ohne Koordinaten, Helgoland, Jadebusen, Doggerbank. Das damalige Polygon
lieferte für all diese korrekt `false`.

Gefunden wurden stattdessen zwei **echte** Fehler in der IHO-Quellgeometrie:

- **Zu weit:** sie enthielt Ladogasee und Onegasee (bis 37,47° E), die
  Torne-/Kalix-Flussläufe (bis 67,08° N), die Weichsel bis Włocławek und den
  Limfjord. Betroffene Datensätze: 0 — die Bounding Box maskierte das.
- **Zu eng:** die grobe IHO-Küstenlinie ließ die inneren Küstengewässer weg.
  **1.901 Zeilen** lagen in der Box, aber außerhalb des Polygons, geballt in
  Bodden, Förden und Buchten — dem Kerngebiet des Museums.

Beide sind behoben. Die Geometrie wird jetzt aus IHO-Seegebieten, einer
Ausschlussmaske und der OSM-Küstenlinie erzeugt; `BALTIC_SEA_BBOX` ist ihr
Extent und wird nicht mehr von Hand gepflegt. Die Ostkante war übrigens die
einzige, die real Ostsee abschnitt: das bereinigte Polygon reicht bis 30,2383° E
am Kopf der Newa-Bucht, die alte Grenze stand auf 30,20.

Die Invariante `ostsee = 1 → ostsee_geo > 0` **gilt** seither und wird durch
`src/lib/utils/geo/checkBalticSea.test.ts` über alle Stützpunkte abgesichert.

Der Kommentar an `BALTIC_SEA_BBOX` nannte die Westgrenze „etwa Skagerrak". Das
war doppelt falsch: das Skagerrak ist gar nicht Teil der Geometrie, das
westliche IHO-Gebiet ist der **Kattegat**.

Vollständige Messung, Entscheidungen und Umsetzung:
`docs/OSTSEE_GEOMETRIE_SPEC_2026-07-30.md`

---

## Fehler 4: Die E-Mail-Benachrichtigung zeigt die Bounding Box als „Ostsee ✓" (offen)

> Dieser Abschnitt hieß bis zum 2026-07-30 „Die E-Mail-Benachrichtigung ist
> korrekt" und begründete das damit, `inBalticSeaGeo` sei die äußere, gröbere
> Bedingung und `inBalticSea` die Verfeinerung. Die **Staffelung** ist richtig, das
> **Ergebnis** nicht.

Die Handlebars-Vorlage (Default in `configInitializer.ts`, Zeilen ~72–107) prüft in
der äußeren Bedingung `inBalticSeaGeo` und zeigt dann sofort ein grünes
**„Ostsee ✓"**. `inBalticSea` wird nur im else-Zweig angesehen:

```handlebars
{{#if sighting.inBalticSeaGeo}}      → Badge „Ostsee ✓" (grün)
{{else}}{{#if sighting.inBalticSea}} → „Ostsee-Rand" (gelb)
        {{else}}                     → „Außerhalb Ostsee" (rot)
```

| `ostsee` | `ostsee_geo` | Mail zeigt         | richtig?                       |
| -------- | ------------ | ------------------ | ------------------------------ |
| `> 0`    | `> 0`        | „Ostsee ✓"         | ✅                             |
| **`0`**  | **`> 0`**    | **„Ostsee ✓"**     | ❌ — liegt nicht in der Ostsee |
| `> 0`    | `0`          | „Ostsee-Rand"      | seit der Bereinigung leer      |
| `0`      | `0`          | „Außerhalb Ostsee" | ✅                             |

Es ist dieselbe Verwechslung wie in Fehler 2, nur eine Ausgabe weiter. Eine
Meldung aus dem Hamburger Hafen bekommt denselben grünen Badge wie eine echte
Ostsee-Sichtung. Die betroffene Klasse `ostsee = 0, ostsee_geo > 0` umfasst
derzeit **457 Zeilen**; für Neumeldungen entsteht sie bei jeder Position im
Rechteck außerhalb des Polygons. Der zweite, gleich gebaute Block unter
`{{#unless sighting.inBalticSeaGeo}}` (Zeilen ~95–105) trägt die Fließtexte und
hat denselben Fehler.

Der Zweig „Ostsee-Rand" ist zusätzlich toter Code: Beide Werte stammen aus **einem**
`checkBalticSeaFile`-Aufruf, und das Polygon liegt in der Box — die Kombination
kann bei einer Neumeldung nicht entstehen.

**Beim Beheben beachten:** Die Vorlage kommt nicht aus dem Code, sondern aus
`app_config` unter dem Key `notification.email.template`
(`ConfigRepository.getString(…, this.getDefaultTemplate())` — der DB-Wert gewinnt,
der Default ist nur Fallback). Den Default zu ändern wirkt auf **keine**
bestehende Installation; der geseedete Wert muss mitgezogen werden. Und weil
Handlebars keine TypeScript-Funktion aufrufen kann, gehört der Status **einmal** in
`emailService.ts` berechnet und in den Template-Kontext gegeben — sonst wird die
Logik zum zweiten Mal nachgebaut und läuft wieder auseinander.

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
