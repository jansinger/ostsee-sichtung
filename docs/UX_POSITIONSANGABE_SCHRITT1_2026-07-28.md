# Positionsangabe in Schritt 1 — Design

**Datum:** 2026-07-28
**Status:** Freigegeben (nach Review vom 2026-07-28)
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

### Texte und bewusste Nicht-Entscheidungen

**Der Einleitungstext entfällt.** „Wählen Sie die für Sie einfachste Methode zur
Positionsangabe" (`PositionAndTime.svelte:92-94`) beschreibt eine Wahl, die es
nicht mehr gibt, und wird durch eine Aussage über den Zweck ersetzt (etwa: „Wo
haben Sie das Tier gesehen? Ein Foto mit GPS ist der schnellste Weg.").

**Kein `capture`-Attribut am Datei-Input.** Über die Browser-Kamera aufgenommene
Fotos tragen in aller Regel **kein** GPS-EXIF. Würde der Hero-Button die Kamera
erzwingen, wäre Zustand C der Normalfall statt der Ausnahme. Die normale
Betriebssystem-Auswahl (Galerie) ist die richtige — dort liegen die Fotos mit
Positionsdaten.

**Eingestandener Preis:** Die zugeklappte Karte ist weniger auffindbar als die
heutige Karten-Kachel. Das ist der bewusste Preis für die Prominenz des
Foto-Wegs, keine Nachlässigkeit. Wer die Karte sucht, findet eine beschriftete
Zeile direkt unter dem Divider.

**Der GPS-Button braucht ein eindeutiges Label.** „Aktuelle Position verwenden"
übernimmt den Standort des *Geräts zum Zeitpunkt des Ausfüllens*. Sichtungen
werden aber häufig später gemeldet — im Hafen, zu Hause, am Abend. Dann schriebe
der Button stillschweigend eine falsche Position in den Forschungsdatensatz, und
die Ostsee-Prüfung schlägt nicht an, weil auch die Küste in der Ostsee liegt.
Label deshalb: **„Mein aktueller Standort"**. Ein zusätzlicher sanfter Hinweis,
wenn `sightingDate` nicht der heutige Tag ist, wäre die bessere Lösung, ist aber
optional und kann später folgen.

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
| `form/LocationInput.svelte` | Logik unverändert; neues Prop `collapsibleCoordinates` (Default `false`) |
| `sections/positionMethod.ts` + Test | **entfällt** |

`LocationInput` behält die Hoheit über die Koordinaten. Die Trennung von
`mapLatitude`/`mapLongitude` gegenüber den echten Formularwerten samt
`untrack`-Logik (`:30-41`) und der „leeres Feld ⇒ `undefined`"-Behandlung ist
erkennbar hart erarbeitet und wird nicht angefasst.

### `LocationInput` wird vom Admin-Bereich mitbenutzt

`sections/Location.svelte` bindet dieselbe `LocationInput`-Komponente ein und wird
von `components/admin/AdminSightingEditForm.svelte:9` verwendet. Ein Zuklappen der
Koordinatenfelder als neues Standardverhalten würde einem Admin, der eine Sichtung
nachbearbeitet, genau die Felder verstecken, wegen derer er die Maske geöffnet hat.

**Deshalb ist das Zuklappen ein Prop, kein neues Standardverhalten:**

```ts
// LocationInput.svelte
collapsibleCoordinates?: boolean = false
```

- Default `false` → Admin-Maske bleibt unverändert.
- `PositionPanel` übergibt `true`.

Damit ändert sich für `LocationInput` nur, **ob** die Felder in einem
Collapse-Container liegen — die Koordinatenlogik bleibt vollständig unberührt.

**Randnotiz zu `hasPosition`:** `Location.svelte:25` rendert
`<FormField name="hasPosition" />` als sichtbaren Toggle. Im Admin ist
`hasPosition` also ein Bedienelement, im Meldeformular dagegen rein
programmatisch (gesetzt aus EXIF, Karte oder Koordinatenfeldern). Das ist kein
Widerspruch, sondern gewollt — beim Umsetzen aber leicht als einer zu lesen.

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
| Nutzer klappt die Karte wieder zu, obwohl Koordinaten gesetzt sind | `VerifyLocation` bleibt sichtbar — es liegt **außerhalb** der Karten-Disclosure. Sonst verschwände die Ostsee-Prüfung genau dann, wenn sie noch gilt |
| GPS-Button, Sichtung aber an einem anderen Tag gemacht | Der Button übernimmt den aktuellen Gerätestandort. Abgefedert nur über das Label „Mein aktueller Standort" (siehe „Texte und bewusste Nicht-Entscheidungen"); eine Datumsprüfung ist optional und nicht Teil dieser Änderung |

### Offener Punkt

Der GPS-Button stammt aus einem OpenLayers-Control (`OLMap.svelte:80-86`). Ein
Fehlerpfad für „Standortfreigabe abgelehnt" oder fehlendes HTTPS ist dort nicht
erkennbar behandelt. Da der Button im neuen Layout prominenter wird, ist das beim
Umsetzen zu prüfen und gegebenenfalls um einen Hinweis zu ergänzen.

---

## Barrierefreiheit und Design System

- Auf-/Zuklappen über das im Projekt etablierte Muster aus `<details>` plus
  DaisyUI-Collapse-Klassen (`Step4Contact.svelte:111-127`) — nativ zugänglich
  *und* konsistent mit dem Bestand:

  ```svelte
  <details class="bg-base-100 collapse" open={…}>
    <summary class="collapse-title min-h-0 py-2 text-sm font-medium">…</summary>
    <div class="collapse-content">…</div>
  </details>
  ```

- **Primäraktion:** Der Hero-Button ist `btn btn-primary`, obwohl „Weiter"
  (`StepNavigation.svelte:214`) ebenfalls `btn-primary` ist und meist gleichzeitig
  sichtbar. `design-system.md` fordert eine Primäraktion **pro Bereich**; Panel und
  Navigationsleiste sind zwei Bereiche, die Regel ist also eingehalten. Die
  Entscheidung ist bewusst getroffen und nicht beiläufig: Ohne
  Vollton-Primärbutton trägt die Foto-Karte die geforderte Prominenz nicht.
- Die „Kein GPS"-Meldung braucht `role="status"`, sonst erfährt ein
  Screenreader-Nutzer nichts vom fehlgeschlagenen Auslesen.
- Die Ausgangs-Buttons in Zustand C setzen den **Fokus** in den Zielbereich, nicht
  nur den Scroll.
- Die Hero-Dropzone trägt einen Tint (`bg-primary/5` + `border-primary`). Dort
  gehört `text-base-content` hin, **nicht** `text-primary-content` — weiß auf
  hellblau ergibt rund 1,3:1 (siehe `.claude/rules/design-system.md`).
- Touch-Targets mindestens 44×44 px.
- Die Radiogruppe mit `fieldset`/`legend` entfällt ersatzlos mit der Methodenwahl.
- Neue Elemente bekommen stabile `data-testid`-Hooks (Hero-Dropzone,
  Karten-Disclosure, Beschreibungs-Disclosure, die beiden Ausgänge aus Zustand C).
  Der heutige E2E-Test matcht auf Prosa (`Foto per Drag & Drop oder Klick
  hochladen`) und bricht deshalb bei jeder Textänderung.
- **Im iframe-Modus prüfen.** Die App läuft eingebettet auf meeresmuseum.de
  (`.iframe-mode`, siehe `.claude/rules/daisyui.md`); ein längeres Panel verändert
  dort das Scrollverhalten.

**Vorbestehender Verstoß, den diese Änderung sichtbarer macht:** Die
Entfernen-Buttons in `DropzoneEnhanced` sind `btn-xs` (`:349`, `:409`) und
unterschreiten damit das 44-px-Minimum. Wird die Foto-Karte zum Hauptweg, ist das
das meistgenutzte Bedienelement des Schritts. Behebung gehört in diese Änderung,
sofern sie ohne Nebenwirkung auf die Medien-Sektion in Schritt 3 möglich ist —
sonst als eigener Vorgang.

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

**Neue Fixtures.** Es liegt kein Bild in `e2e/fixtures/`, und in `e2e/` gibt es
bisher **kein einziges** `setInputFiles` — der Datei-Upload ist E2E vollständig
ungetestet. Die Testfotos schließen damit eine größere Lücke als nur diese
Änderung:

| Datei | Anforderung |
| --- | --- |
| `e2e/fixtures/photo-with-gps.jpg` | JPEG mit `GPSLatitude`/`GPSLongitude` **innerhalb** von `BALTIC_SEA_BBOX` (Breite 53,0–66,0 · Länge 9,4–30,2, `checkBalticSea.ts:27`), z.B. 54,31 N / 12,09 E. `DateTimeOriginal` in der Vergangenheit — Zukunftsdaten weist das Schema ab |
| `e2e/fixtures/photo-without-gps.jpg` | Gleiches Bild ohne GPS-Tags, `DateTimeOriginal` erhalten. Prüft Zustand C: „Datum übernommen, Position nicht" |
| `e2e/fixtures/photo-gps-outside-baltic.jpg` | *(optional)* GPS außerhalb der Box — deckt den Validierungsfehler ab, der heute unsichtbar zuschlägt |

JPEG, nicht PNG (PNG trägt keine GPS-EXIF zuverlässig). Ergänzend bleiben die
reinen Funktionen die primäre Absicherung der EXIF-Zustandslogik.

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
