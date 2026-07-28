# Positionsangabe in Schritt 1 — Design

**Datum:** 2026-07-28
**Status:** Entwurf zur Freigabe
**Betrifft:** `src/lib/report/components/sections/PositionAndTime.svelte` und Umfeld

---

## Problem

Die Positionsangabe in Schritt 1 bietet drei gleichrangige Kacheln zur Auswahl —
„Foto mit GPS", „Karte / GPS Position", „Beschreibung" — und zeigt darunter
zusätzlich einen dauerhaft sichtbaren „oder"-Block mit denselben Feldern wie die
dritte Kachel.

Der Widerspruch ist real und im Code belegbar:

- Der Tab „Beschreibung" (`PositionAndTime.svelte:254-262`) rendert `waterway` +
  `seaMark` — **exakt die beiden Felder**, die der „oder"-Block (`:235-250`)
  ohnehin schon anzeigt. Der Tab fügt kein erreichbares Feld hinzu; er versteckt
  nur Karte und Foto-Upload.
- Der „oder"-Block existiert aus einem guten Grund: `waterway` ist laut Schema
  Pflicht, solange `hasPosition !== true` (`sightingSchema.ts:302`). Ohne einen in
  jeder Methode erreichbaren Fallback landet ein Nutzer, dessen Foto kein EXIF-GPS
  enthält, beim Klick auf „Weiter" in einer Sackgasse: eine Fehlermeldung zu einem
  Feld, das im aktiven Tab gar nicht sichtbar ist. Der Block war der Fix — und hat
  den dritten Tab überflüssig gemacht.

Das Datenmodell ist **binär, nicht ternär**: entweder Koordinaten
(`hasPosition === true`) oder eine Beschreibung. Foto und Karte sind zwei Wege zum
*selben* Wert. Drei gleichrangige Tabs bilden das falsch ab.

### Zwei weitere Befunde

**Der Foto-Weg ist deutlich wertvoller, als die UI zeigt.**
`DropzoneEnhanced.svelte:137-179` schreibt aus dem EXIF nicht nur `latitude`,
`longitude` und `hasPosition`, sondern auch `sightingDate` und `sightingTime`. Von
den sieben Feldern des Schritts erledigt ein einziges Foto fünf. In der UI steht
davon nur „Bevorzugt - GPS und Datum automatisch" in 12px Grautext.

**Im Foto-Modus ist die Karte unsichtbar.** Die aus dem EXIF übernommene Position
wird nie angezeigt. Nur `VerifyLocation` meldet „liegt innerhalb der Ostsee" — ein
um Seemeilen danebenliegender Punkt erfüllt diese Prüfung ebenfalls. Für einen
Forschungsdatensatz ist das eine schwache Kontrolle.

### Domänen-Vergleich

Vergleichbare Bürgerwissenschafts-Plattformen (iNaturalist, Observation.org,
eBird) lösen dasselbe Problem einheitlich anders: *eine* Positionsoberfläche mit
der Karte als kanonischer Anzeige; Foto-EXIF und Geräte-GPS sind **Beschleuniger**,
die den Marker setzen; ein Freitext-Ortsname ist immer verfügbar und
**ergänzend**, nie eine Alternative, zwischen der man vorab wählen muss.

---

## Entscheidungen

| Frage | Entscheidung |
| --- | --- |
| Beschreibung bei vorhandenem GPS | Bleibt erreichbar als eingeklappte optionale Zusatzangabe (nicht entfernt) |
| Prominenz des Foto-Wegs | Foto wird das erste und größte Element des Panels |
| Methodenwahl | Entfällt ersatzlos |
| `mediaConsent` | **Nicht Teil dieser Änderung** — eigener Vorgang (siehe „Abgrenzung") |

---

## Lösung

Die Kachel-Auswahl entfällt. Es gibt genau ein Positions-Panel, in dem alle Wege
jederzeit erreichbar sind — aber nur einer laut ist.

### Zustand A — Startzustand (keine Position)

```
┌─ Positionsangabe ─────────────────────────────────────┐
│  ╔══════════════════════════════════════════════════╗ │
│  ║  📷   Foto mit GPS hochladen                     ║ │  border-primary,
│  ║       Der schnellste Weg: Position, Datum und    ║ │  volle Breite,
│  ║       Uhrzeit werden automatisch übernommen.     ║ │  großes Padding
│  ║       [ Foto auswählen ]  oder hierher ziehen    ║ │  btn-primary
│  ╚══════════════════════════════════════════════════╝ │
│  ─────────── oder Position selbst setzen ───────────  │
│  [ 📍 Aktuelle Position verwenden ]                   │  btn-outline
│  ▸ Position auf Karte wählen                          │  zugeklappt
│  ▸ Koordinaten eingeben                               │  zugeklappt
└────────────────────────────────────────────────────────┘

┌─ Kein GPS? Beschreiben Sie das Seegebiet ─────────────┐
│  [ Fahrwasser/Seegebiet * ]   [ Seezeichen ]          │  offen, Pflicht
└────────────────────────────────────────────────────────┘
```

Prominenz entsteht durch Position, Größe und Lesereihenfolge — nicht durch einen
Modus. Der „oder"-Divider trennt jetzt zwei echte Alternativen (Foto ↔ Position
selbst setzen) statt Methode ↔ Fallback.

### Zustand B — Position vorhanden (aus beliebiger Quelle)

```
┌─ Positionsangabe ─────────────────────────────────────┐
│  ✓ 📷 IMG_4711.jpg — Position, Datum und Uhrzeit      │  kompakte Zeile,
│       aus dem Foto übernommen          [Entfernen]    │  Thumbnail + Status
│  ┌──────────────────────────────────────────────────┐ │
│  │                    KARTE  📍                      │ │  klappt automatisch auf
│  └──────────────────────────────────────────────────┘ │
│  ▸ Koordinaten eingeben                               │
│  ✓ Die Koordinaten liegen innerhalb der Ostsee        │
└────────────────────────────────────────────────────────┘

▸ Ortsbeschreibung ergänzen (optional)                     zugeklappt
```

Die Karte klappt automatisch auf, sobald eine Position existiert — damit ist die
EXIF-Position erstmals sichtbar und korrigierbar. Einmal geöffnet, bleibt sie
offen.

### Zustand C — Foto ohne GPS-Daten

```
│  ⚠ In IMG_4711.jpg sind keine GPS-Daten gespeichert.  │  alert-warning, inline
│    Das ist häufig — viele Kameras und weitergeleitete │
│    Bilder enthalten keine Position. Das Foto ist      │
│    trotzdem wertvoll und bleibt erhalten.             │
│    ✓ Datum und Uhrzeit konnten übernommen werden.     │  nur wenn zutreffend
│    [ Auf Karte wählen ]  [ Seegebiet beschreiben ]    │  explizite Ausgänge
```

Statt einer stillen Sackgasse zwei benannte Ausgänge, die den Zielbereich
aufklappen **und den Fokus dorthin setzen**. Das Foto bleibt hochgeladen — es ist
als Medium weiterhin wertvoll.

---

## Komponenten

`PositionAndTime.svelte` ist mit 277 Zeilen zu groß und macht drei Dinge
gleichzeitig. Sie schrumpft auf reine Komposition.

| Datei | Rolle |
| --- | --- |
| `sections/PositionAndTime.svelte` | nur noch `<PositionPanel />` + Datum/Uhrzeit-Sektion |
| `form/position/PositionPanel.svelte` **(neu)** | Foto-Karte, Divider, GPS-Button, Karten-Disclosure, `VerifyLocation` |
| `form/position/LocationDescription.svelte` **(neu)** | `waterway` + `seaMark` samt Klapp-Logik |
| `form/position/positionPanelState.ts` **(neu)** | reine Funktionen, in Node testbar |
| `form/LocationInput.svelte` | Logik unverändert; Koordinatenfelder wandern in ein `<details>` |
| `sections/positionMethod.ts` + Test | **entfällt** |

`LocationInput` behält die Hoheit über die Koordinaten. Die Trennung von
`mapLatitude`/`mapLongitude` gegenüber den echten Formularwerten samt
`untrack`-Logik (`:30-41`) und der „leeres Feld ⇒ `undefined`"-Behandlung ist
erkennbar hart erarbeitet und wird nicht angefasst. Es ändert sich nur, **wo** die
Felder im Markup landen.

`DropzoneEnhanced.svelte` bleibt unverändert. Der Foto-Zustand lässt sich von außen
ableiten: `mediaStore` liegt bereits im Form-Context (`Form.svelte:40-50`), und
`MediaFile` bietet `hasPosition()`, `exifData` und `timestamp`.

### Reine Logik in `positionPanelState.ts`

```ts
type PhotoStatus = 'none' | 'position-applied' | 'no-gps';

photoStatus(mediaFiles): PhotoStatus
mapExpanded(hasCoordinates, wasEverExpanded): boolean
descriptionCollapsed(hasCoordinates, waterway, seaMark): boolean
```

`descriptionCollapsed` fängt eine echte Falle ab: Wer erst das Seegebiet
beschreibt und *danach* ein Foto mit GPS hochlädt, dem darf der Block nicht
zuklappen und den eingegebenen Text verstecken.

**Regel:** zuklappen nur, wenn Koordinaten vorliegen **und** beide Felder leer
sind. Sonst bleibt der Block offen, nur ohne Pflicht-Stern.

`mapExpanded` ist sticky, und zwar unabhängig davon, **warum** die Karte
aufgegangen ist: Sobald sie einmal offen war — durch Nutzerklick *oder* durch das
automatische Aufklappen bei Koordinaten — bleibt sie offen, auch wenn die
Koordinaten später wieder entfallen. Der zweite Parameter heißt daher besser
`wasEverExpanded`. Das vermeidet springendes Layout und stellt sicher, dass die
Fehler- und Randfall-Tabelle („Foto wieder entfernt → Karte bleibt offen") auch
für den Nutzer gilt, der die Karte nie selbst angeklickt hat.

---

## Datenfluss

```
Foto (EXIF)  ─┐
GPS-Button   ─┼→ latitude/longitude/hasPosition ──→ Karte (Marker) + VerifyLocation
Karten-Marker─┤   (+ sightingDate/sightingTime nur aus EXIF)
Koord.-Felder─┘
                          │
                          └→ waterwayRequired = hasPosition !== true
```

`hasPosition` bleibt die einzige Wahrheit darüber, welcher Zweig gilt. Schema,
`validateStep`, `formStepsConfig` und die Legacy-API bleiben unberührt.
**Kein Schema-Change, keine Migration.**

**Was ersatzlos verschwindet:** der Reset in `selectMethod('manual')`
(`PositionAndTime.svelte:66-70`). Er löscht heute stillschweigend Koordinaten,
sobald jemand auf „Beschreibung" klickt — ohne Modi gibt es diesen Datenverlust
nicht mehr.

**Was erhalten bleibt:** `resetExifPositionIfUnchanged` in `DropzoneEnhanced` nimmt
eine EXIF-Position beim Entfernen des Fotos zurück, aber nur wenn sie unverändert
ist. Diese Logik ist korrekt und vorsichtig und bleibt unangetastet.

---

## Fehler- und Randfälle

| Fall | Verhalten |
| --- | --- |
| Foto ohne GPS | Zustand C. Foto bleibt hochgeladen; Datum/Uhrzeit werden trotzdem übernommen, falls im EXIF vorhanden |
| Foto wieder entfernt | `resetExifPositionIfUnchanged` nimmt die Position zurück. Beschreibungsblock klappt auf, Pflicht-Stern kehrt zurück. Karte bleibt offen |
| EXIF-Position außerhalb der Ostsee | Das Schema blockiert beim „Weiter" (`BALTIC_SEA_BBOX`) — unverändert. Neu ist, dass die aufgeklappte Karte den Fehler **sichtbar und korrigierbar** macht |
| Beschreibung getippt, dann Foto mit GPS | Block bleibt offen, nur der Pflicht-Stern verschwindet |
| Session-Restore | `derivePositionMethod` entfällt; die Zustände ergeben sich direkt aus den wiederhergestellten Werten — robuster als die heutige Rekonstruktion eines *Modus* |

### Offener Punkt

Der GPS-Button stammt aus einem OpenLayers-Control (`OLMap.svelte:80-86`). Ein
Fehlerpfad für „Standortfreigabe abgelehnt" oder fehlendes HTTPS ist dort nicht
erkennbar behandelt. Da der Button im neuen Layout prominenter wird, ist das beim
Umsetzen zu prüfen und gegebenenfalls um einen Hinweis zu ergänzen.

---

## Barrierefreiheit

- Auf-/Zuklappen über natives `<details>`/`<summary>` mit `open={...}` — Tastatur
  und Screenreader ohne eigenes ARIA.
- Die „Kein GPS"-Meldung braucht `role="status"`, sonst erfährt ein
  Screenreader-Nutzer nichts vom fehlgeschlagenen Auslesen.
- Die Ausgangs-Buttons in Zustand C setzen den **Fokus** in den Zielbereich, nicht
  nur den Scroll.
- Die Hero-Dropzone trägt einen Tint (`bg-primary/5` + `border-primary`). Dort
  gehört `text-base-content` hin, **nicht** `text-primary-content` — weiß auf
  hellblau ergibt rund 1,3:1 (siehe `.claude/rules/design-system.md`).
- Touch-Targets mindestens 44×44 px.
- Die Radiogruppe mit `fieldset`/`legend` entfällt ersatzlos mit der Methodenwahl.

---

## Tests

Test-first gemäß `.claude/rules/testing.md`.

**Neu (Node):** `positionPanelState.test.ts` — `photoStatus`, `mapExpanded`
(inklusive Sticky-Verhalten), `descriptionCollapsed` inklusive des Falls „Text
bereits eingegeben".

**Entfällt:** `positionMethod.test.ts`.

**Umschreiben:** `e2e/form-position.spec.ts` hängt an `label[for="method-manual"]`
und `method-photo`; diese Selektoren existieren nicht mehr. Neu abzudecken:

- Hero-Dropzone beim Laden sichtbar
- Beschreibungsblock beim Laden offen, `waterway` als Pflichtfeld
- Kartenbereich initial zugeklappt
- `waterway` und `seaMark` ohne jeden Moduswechsel erreichbar

Die EXIF-Pfade werden über die reinen Funktionen abgedeckt. In `e2e/fixtures/`
liegt kein Bild; ein echtes Testfoto mit GPS-EXIF wäre wünschenswert, ist aber
kein Muss für diese Änderung.

---

## Abgrenzung

**Nicht Teil dieser Änderung:** die Einwilligung zur Mediennutzung.

`privacyConsent` (`sightingSchema.ts:1182`) ist das einzige Pflicht-Consent und
zählt abschließend „Sichtungsdaten (Datum, Position, Tierart, Anzahl)" auf —
Medien werden dort nicht genannt. `mediaConsent` (`:849`) ist optional
(`.default(false)`), deckt wissenschaftliche Nutzung und Öffentlichkeitsarbeit in
einer einzigen Checkbox ab und wird erst in Schritt 3 abgefragt, obwohl der Upload
schon in Schritt 1 stattfindet.

Durch die neue Prominenz des Foto-Wegs wird dieser Ablauf vom Sonderfall zum
Normalfall. Das Thema braucht eine eigene Abwägung — unter anderem einen Blick in
die extern liegende Datenschutzerklärung
(`deutsches-meeresmuseum.de/datenschutz`, verlinkt in `about/+page.svelte:247`) —
und wird als eigener Vorgang geführt, um diese Spec nicht zu verwässern.

**Ebenfalls unverändert:** Das in Schritt 1 hochgeladene Foto erscheint weiterhin
in der Medien-Liste in Schritt 3. Beide Dropzones schreiben in dasselbe
`$form.uploadedFiles`; das ist gewollt.
