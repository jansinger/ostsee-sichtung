# UX- und Funktionsreview: Sichtungskarte (`/map`)

**Datum:** 2026-07-28
**Methode:** Code-Review aller Karten-Module, Live-Test im Browser (Desktop 1151×756 und Mobile 375×812, Chrome), Abgleich gegen aktuelle Best Practices für interaktive Webkarten (OpenLayers, Google Maps Platform, Leaflet/Mapbox, NN/g, Baymard, W3C/WAI — Quellen am Ende).
**Getesteter Stand:** Branch `claude/sichtungskarte-ux-review-a2737a`, lokale DB mit Prod-Datenstand.

---

## 1. Zusammenfassung

Die Karte ist funktional solide gebaut (Clustering, Abbruch laufender Requests, Consent-basierte Namensanzeige, Co-located-Cluster-Liste) — aber im Live-Test zeigen sich **drei kritische Probleme**, die den Ersteindruck bzw. die Nutzbarkeit grundlegend beeinträchtigen:

| #      | Befund                                                                                                                                            | Schwere  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| K1     | Erststart zeigt eine **leere Karte** („Keine Sichtungen für 2026")                                                                                | Kritisch |
| K2     | **165 von 817 Features (2025) mit ungültigen Koordinaten** (Null Island 0/0, Nordpol) werden gerendert; „Auf alle zoomen" springt auf Weltansicht | Kritisch |
| K3     | Karte ist **per Tastatur nicht bedienbar**, Marker/Popups unerreichbar, keine Datenalternative → WCAG-2.1-Verstoß                                 | Kritisch |
| H1–H7  | Stale Popup, Zeitslider-Inkonsistenz, irreführende Suche, 19-px-Controls, ARIA-Fehler, Panel-Layout mobil kaputt, globale Einzeltasten-Shortcuts  | Hoch     |
| M1–M10 | Doppelte Farbcodierung, Cluster-Overlap, OpenSeaMap-Rauschen, fehlender URL-State, fehlender Reset u. a.                                          | Mittel   |

Alles Weitere unten mit Evidenz (Datei:Zeile bzw. Test-Beobachtung) und konkreter Empfehlung.

---

## 2. Was gut funktioniert (im Test verifiziert)

- **Cluster-Klick zoomt sinnvoll hinein** (`optimizedMapController.ts:407-417`), und bei ortsgleichen Sichtungen erscheint stattdessen eine **scrollbare Liste mit Detail-Ansicht und Zurück-Link** — das ist die richtige Alternative zum Spiderfy-Pattern und funktionierte im Test einwandfrei.
- **Hover-Zusammenfassung auf Clustern** („44 Sichtungen — Schweinswal: 23, Kegelrobbe: 10, …") ist ein echtes Plus; nur Desktop, auf Touch korrekt deaktiviert.
- **Nur ein Popup gleichzeitig**; Klick auf leere Karte schließt es (Best Practice erfüllt).
- **Race-Condition-Schutz** beim Jahres-/Suchwechsel via `AbortController` (`optimizedMapController.ts:698-735`) — schnelles Umschalten produzierte im Test keine Fehler.
- **Datenschutz:** Name/Schiffsname erscheinen nur mit Consent — serverseitig gefiltert (`mapUtils.ts:164-167`, `+server.ts:44-50`), nicht nur clientseitig versteckt. Suche respektiert Consent-Flags ebenfalls serverseitig.
- **Legende mit sichtbar/gesamt-Zählern** pro Art und Live-Update beim Filtern (im Test: Schweinswal-Toggle → 0/585, Marker verschwinden sofort).
- **XSS-Härtung** der Popup-Inhalte über `sanitizeText`.
- Leere Zustände existieren („Keine Sichtungen für …", „Keine Sichtungen für den aktuellen Filter sichtbar" mit Hinweistext) und ein Fehler-Toast mit Dismiss.
- `100dvh`-basierte Höhe (mobile Browserleisten korrekt berücksichtigt), Tastatur-Hilfemodal mit dokumentierten Shortcuts.

---

## 3. Kritische Befunde

### K1 — Erststart zeigt eine leere Karte

**Beobachtung:** Beim Aufruf von `/map` erscheint „Keine Sichtungen für 2026 vorhanden." auf leerer Ostsee-Karte. Die API liefert für 2026 **0 Features** (2025: 817, 2024: 1060).

**Ursachen:**

- `getDefaultSightingYear()` (`src/lib/utils/date/defaultYear.ts:13`) wählt ab April das laufende Jahr — ohne zu prüfen, ob es Daten gibt.
- Verschärfend: Seit dem Altsystem-Cutoff (Nov 2025) setzt die neue App `freigegeben_am` beim Freigeben — aber der Rückstand ungeprüfter Meldungen ist groß; öffentlich sichtbar ist nur `approvedAt IS NOT NULL`. In Produktion ist die 2026er-Karte damit real leer oder fast leer.

Der erste Eindruck für jeden Besucher ist eine leere Karte — das klassische „Empty-State-Dead-End". Die Empty-State-Meldung bietet zudem **keine Aktion** an.

**Empfehlung (kurzfristig):** Default-Jahr = jüngstes Jahr **mit freigegebenen Daten** (die API kann das in einem kleinen Meta-Endpoint oder Response-Header liefern). In den Empty-State einen Button „Sichtungen \<Jahr\> anzeigen" aufnehmen.
**Empfehlung (mittelfristig):** Option „Alle Jahre" bzw. Zeitraum über Jahresgrenzen hinweg (siehe M4/M10) — eBird/iNaturalist zeigen standardmäßig einen kumulierten Bestand, nicht ein leeres Kalenderjahr.

### K2 — Ungültige Koordinaten werden gerendert; „Auf alle zoomen" springt auf Weltansicht

**Beobachtung (verifiziert per API-Abfrage im Test):** Für 2025 liegen **165 von 817 Features außerhalb der Ostsee-Bounding-Box**, überwiegend exakt bei `[0, 0]` („Null Island", Golf von Guinea), eine bei `[-88.77, 90]` (Nordpol). Auf der Karte erscheint dadurch ein großer Cluster (im Test „134") im Atlantik; die Taste **Z / „Auf alle Sichtungen zoomen" zoomt auf die halbe Weltkugel** statt auf die Ostsee. Danach gibt es keinen einfachen Weg zurück (kein Home-Button, siehe M5).

**Ursachen:**

- Sichtungen ohne GPS-Koordinaten (NULL in DB) werden in `sightingsToGeoJSON` auf `0` gemappt (`mapUtils.ts:137-145`, „Fallback auf 0 für ungültige Koordinaten").
- Der API-Endpoint (`src/routes/api/map/sightings/+server.ts`) filtert weder NULL-Koordinaten noch Ausreißer außerhalb der Ostsee-Box, obwohl `BALTIC_SEA_BBOX` im Projekt existiert (`src/lib/utils/geo/checkBalticSea.ts`).

**Empfehlung:** Features ohne gültige Koordinaten serverseitig ausfiltern (`latitude IS NOT NULL AND longitude IS NOT NULL` + Plausibilitätsfenster, z. B. die vorhandene Baltic-BBox mit Toleranz). Falls solche Meldungen zählbar bleiben sollen, als „ohne Position: N" in der Legende ausweisen statt sie auf Null Island zu stapeln. `zoomAllFeatures()` zusätzlich defensiv auf die Ostsee-Extent begrenzen.

### K3 — Tastaturbedienung und Screenreader: Karte nicht zugänglich

**Beobachtung/Prüfung (per DOM-Inspektion im Live-Test):**

- `#map` hat **kein `tabindex`** (`mapFocusable: -1`) → die Karte ist nicht fokussierbar; OpenLayers' eingebaute Tastaturnavigation (Pfeiltasten pannen, +/− zoomen) ist damit faktisch abgeschaltet. Genau dafür dokumentiert OpenLayers das `tabindex="0"`-Pattern (Beispiel „accessible").
- **Marker und Popups sind per Tastatur überhaupt nicht erreichbar** (Canvas-Rendering ohne fokussierbare Stellvertreter).
- Es gibt **keine Alternative in Tabellen-/Listenform** mit derselben Datengrundlage — laut WCAG-Praxis (u. a. Leitfaden Minnesota IT, W3C-Maps-Workshop) die Pflicht-Alternative für Karten.
- `role="application"` auf `#map` (`SightingsMapView.svelte:321`) suggeriert Screenreadern eine bedienbare Anwendung, die es per Tastatur nicht ist.

**Empfehlung:**

1. `tabindex="0"` auf das Karten-Target + sichtbarer Fokusring; OL-`KeyboardPan`/`KeyboardZoom` funktionieren dann sofort.
2. Eine zugängliche **Listen-/Tabellenansicht der aktuell gefilterten Sichtungen** anbieten (gleiches Jahr, gleiche Filter; z. B. Toggle „Karte / Liste"). Das löst gleichzeitig das Popup-Erreichbarkeitsproblem.
3. Skip-Link („Karte überspringen") vor der Karte für Tastaturnutzer.

---

## 4. Befunde mit hoher Priorität

### H1 — Popup veraltet bei Filter-/Jahreswechsel (Stale Popup)

**Beobachtung:** Popup einer Schweinswal-Sichtung vom 14.8.**2025** blieb geöffnet, während die Karte bereits auf **2024** und Suchbegriff „Rügen" stand — das Popup zeigt Daten, deren Feature längst entfernt ist. Auch beim Ausblenden der Art per Legende bleibt das Popup offen. **Escape schließt das Popup nicht** (der Escape-Handler kennt nur Hilfe-Modal und Panels, `SightingsMapView.svelte:284-301`).

**Empfehlung:** Bei `setYear`, `applyFilter`, Sichtbarkeits-Toggles und Zeitslider-Änderung `popup.setPosition(undefined)` aufrufen; Escape-Kaskade um das Popup erweitern (Popup → Hilfe → Panels).

### H2 — Zeitslider und Filterzustand laufen nach Jahreswechsel auseinander

**Beobachtung (verifiziert):** Start-Slider auf 06.07. gezogen, dann Jahr gewechselt → `timeFilter` wird korrekt auf das ganze Jahr zurückgesetzt und die Labels zeigen 01.01./31.12., **aber die Slider-Thumbs bleiben bei Tag 186** stehen. Der sichtbare Zustand (Thumb-Position) widerspricht dem tatsächlichen Filter.

**Ursache:** `setYear` resettet `timeFilter` (`optimizedMapController.ts:677-687`), aber niemand setzt `time-range-start/end` zurück — der `TimeSliderManager` kennt den Jahreswechsel nicht.

**Empfehlung:** Beim Jahreswechsel Slider-Values auf 0/max zurücksetzen (oder — besser — die Zeitspanne beibehalten und auf das neue Jahr anwenden, dann aber Labels und Filter konsistent).

### H3 — Suche: dreifach irreführend

1. **Placeholder verspricht E-Mail-Suche** („E-Mail, Name, Schiff…"), die API durchsucht aber Fahrwasser, Seezeichen, Name (nur mit Consent) und Schiffsname (nur mit Consent) — **keine E-Mail** (`+server.ts:40-52`). Gut so (Datenschutz!), aber der Placeholder ist falsch.
2. **„Enter-Taste zum Filtern drücken" ist falsch:** Der Controller filtert automatisch 300 ms nach der Eingabe (`optimizedMapController.ts:788-795`; im Test verifiziert: Fetch ohne Enter).
3. **Enter erzeugt nur Fake-Feedback:** Der Enter-Handler im Panel (`FilterPanel.svelte:135-139`) startet lediglich einen 800-ms-Spinner (`handleFilterApply`), der vom echten Ladezustand entkoppelt ist. Gleiches Muster beim Jahreswechsel (Spinner läuft pauschal 800 ms, egal wie lange der Request dauert).

**Empfehlung:** Placeholder ehrlich machen („Fahrwasser, Schiff, Name…"), Hilfetext auf „filtert automatisch beim Tippen" ändern, Fake-Spinner durch den echten `onLoading`-Zustand ersetzen (existiert bereits als Callback). Zusätzlich Ergebnisanzahl anzeigen („817 Sichtungen · 3 gefunden") — Best Practice „Ergebnisanzahl sichtbar" (NN/g, Pencil&Paper).

### H4 — Bedienelemente weit unter Mindest-Touchgröße

**Gemessen im Live-Test:** Zoom +/− **19×19 px**, „Z"-Control **19×19 px**, Popup-Schließen **10×27 px**, Legenden-Checkboxen 20×20 px. Das Projekt-Minimum sind **44×44 px** (`.claude/rules/design-system.md`), WCAG 2.5.8 (AA) verlangt mindestens 24 px. Die Größen sind in `mapStyles.css:30-41` per `!important` auf `1.375em` fixiert; die Mobile-Variante (`2.2em` ≈ 35 px, `mapStyles.css:246-256`) bleibt ebenfalls unter 44 px.

**Empfehlung:** Controls auf min. 44×44 px (Desktop wie Mobile) anheben; Popup-Closer als 44-px-Button mit größerem Hit-Target.

### H5 — ARIA-Semantik in Panels und Overlays fehlerhaft

- **`aria-modal="true"` auf nicht-modalen Seitenpanels** (`FilterPanel.svelte:82`, `LegendPanel.svelte:82`): Es gibt keinen Fokus-Trap, kein Backdrop, die Karte bleibt bedienbar — für Screenreader wird fälschlich „alles andere ist inaktiv" verkündet.
- **`aria-hidden="true"` bei 18 fokussierbaren Elementen** (gemessen): Das geschlossene Panel ist nur per `translateX` verschoben; alle Inputs/Buttons bleiben im Tab-Zyklus → „focusable but hidden"-Verstoß (WCAG 4.1.2). `inert` oder `visibility: hidden` nach Transition-Ende wäre korrekt.
- **Kein Fokus-Management:** Beim Öffnen der Panels wandert der Fokus nicht hinein, beim Schließen nicht zurück zum Auslöser (Google-Maps-Referenzpattern: Fokusrückgabe an den Marker/Toggle).
- **LoadingOverlay:** `role="dialog"`/`aria-modal` sitzt auf dem leeren Backdrop-Div, `aria-labelledby="loading-title"` referenziert ein Element in einem _anderen_ Teilbaum (`LoadingOverlay.svelte:31-37`).
- Tastatur-Shortcuts steuern Panels über `document.querySelector('[aria-label*="Filter"]')?.click()` (`SightingsMapView.svelte:258`) — funktioniert, ist aber fragil (Treffer hängt von DOM-Reihenfolge ab; der Schließen-Button matcht dasselbe Muster).

**Empfehlung:** Panels als nicht-modale `role="region"` + `aria-expanded` am Toggle; `inert` fürs geschlossene Panel; Fokus rein/raus managen; LoadingOverlay-ARIA auf das Inhaltselement setzen (oder schlicht `role="status"` + `aria-live="polite"`).

### H6 — Panel-Layout: 400 px fix, mobil defekt, verdeckt die Datenfläche

- Beide Panels sind fix **400 px** breit (`w-100`). Am Desktop verdecken sie genau den Kartenbereich, in dem die meisten Daten liegen (Mecklenburger/Vorpommersche Küste), inklusive halb verdeckter Marker an der Panelkante (im Test beobachtet).
- **Mobil (375 px)** ist das Panel breiter als der Viewport; der Toggle-Button wird um `-400px` verschoben und landet mitten im Layout über dem Titel (Screenshot-Beleg im Test). Die als Fix gedachte CSS-Regel **zielt auf eine nicht mehr existierende Klasse**: `.w-90 { width: 100vw }` (`mapStyles.css:241-243`) — die Panels heißen inzwischen `w-100`. Toter Code, der Bug bleibt.
- Panel ist `top-20` mit `h-full` → der untere Rand liegt 5 rem unterhalb des Viewports; der interne Scrollbereich ist entsprechend abgeschnitten.
- Beide Panels können gleichzeitig „offen" sein und überlagern sich dann an identischer Position; der LEGENDE-Toggle schwebt bei offenem Panel mitten über Popup-/Karteninhalten.

**Empfehlung:** Mobil als Bottom-Sheet (Best Practice für Karten-Details/Filter auf Touch) oder mindestens `max-width: 100vw` + korrekte Klasse; Desktop-Breite auf ~320 px reduzieren oder Panel andocken statt überlagern; Öffnen des einen Panels schließt das andere; `h-[calc(100%-5rem)]` statt `h-full`.

### H7 — Globale Einzeltasten-Shortcuts ohne Modifier

H, F, L, Z, ? feuern dokumentweit (`SightingsMapView.svelte:247-283`). Eingabefelder sind ausgenommen — trotzdem verstößt das Muster gegen **WCAG 2.1.4 (Character Key Shortcuts)**: Einzeltasten-Shortcuts müssen abschaltbar, remapbar oder nur bei Fokus aktiv sein (Problem u. a. für Spracheingabe-Nutzer). Im Test genügte beiläufiges Tippen („thisisunsafe" für die Zertifikatswarnung), um Hilfe-Modal und Filter-Panel zu öffnen — vier „z" zoomten anschließend ungewollt auf die Weltansicht.

**Empfehlung:** Shortcuts nur bei Fokus innerhalb der Karten-Region aktivieren (nach K3-Fix natürlich vorhanden) oder abschaltbar machen; mindestens „Z" (destruktivste Wirkung) entschärfen.

---

## 5. Befunde mittlerer Priorität

### M1 — Marker-Codierung: zwei konkurrierende Farbsysteme, Legende zeigt Falsches

- Auf der Karte codiert die **Ringfarbe die Anzahl** (gelb=1 … blau=>15, schwarz=Totfund), das **Emoji die Art**. In der Legende zeigen die Arten-Chips dagegen `baseColor`-Farben (`styleUtils.ts:64-142`), die auf der Karte **nirgends vorkommen** — die Legende erklärt also Farben, die es nicht gibt.
- Drei Robbenarten teilen sich dasselbe 🦭, drei Walarten dasselbe 🐋 — Arten sind auf der Karte de facto nicht unterscheidbar; die versprochene Differenzierung existiert nur in der Legende.
- **Beluga-Badge: weiße Schrift auf `#F0F8FF`** (fast weiß) — unlesbar (im Test sichtbar); Verstoß gegen die Projekt-`*-content`-Regel sinngemäß.
- Cluster nutzen ein **eigenes Blau-Spektrum** (`#51C2D5…#0F2933`), das mit der „>15"-Farbe `#0066CC` der Einzelmarker kollidiert; Cluster-Farben/Größen sind in der Legende gar nicht erklärt.
- Hex-Farben sind dreifach dupliziert (styleUtils, LegendPanel-Inline-Styles, Cluster-Logik in zwei Dateien — `styleUtils.ts:386-454` ist eine ungenutzte Kopie von `createFilteredClusterStyle`).

**Empfehlung:** Ein Codierungssystem wählen (Empfehlung: Farbe = Art-Gruppe mit ≤6 colorblind-sicheren Farben + Form/Symbol als zweitem Kanal, Anzahl als Badge-Zahl im Marker — so machen es iNaturalist/eBird); Legende aus denselben Konstanten rendern wie die Karte; Cluster-Skala in der Legende erklären.

### M2 — Cluster überlappen sich bei niedrigen Zoomstufen

Bei Zoom 7 lagen im Test 4 Cluster (37/50/27/78) deckungsgleich übereinander. `minDistance: 10` bei `distance: 40-50` (`optimizedMapController.ts:141-145`) erlaubt fast vollständige Überlappung. **Empfehlung:** `minDistance` ≈ `distance × 0.6` oder Radius-abhängig erhöhen.

### M3 — OpenSeaMap-Layer dominiert ab mittleren Zoomstufen

Ab Zoom ~12 fluten Seezeichen, Ankerplätze, Bojen (magenta/blau/gelb) die Karte und konkurrieren visuell mit den Sichtungsmarkern (Screenshot Wustrow im Test). Es gibt **keinen Layer-Umschalter**. Für die Zielgruppe (Bürger, die Sichtungen ansehen) ist die Seekarten-Ebene sekundär. **Empfehlung:** OpenSeaMap optional machen (Layer-Toggle in der Legende, Default aus oder Opacity weiter runter) — „Basemap lenkt nicht ab" ist Standard-Guidance.

### M4 — Kein URL-State, kein Filter-Reset, keine Filter-Chips

Jahr, Suche, Zeitraum, Arten-Toggles und Kartenausschnitt sind nicht in der URL → gefilterte Ansichten sind **nicht teilbar/bookmarkbar**, Reload verwirft alles. Es gibt keinen „Filter zurücksetzen"-Button und keine sichtbaren aktiven Filter (Chips), sobald das Panel zu ist — die Karte kann kommentarlos „leer" wirken, wenn ein vergessener Suchbegriff/Slider aktiv ist (der Hinweis-State existiert nur beim Totalausfall aller Marker). **Empfehlung:** Query-Params (`?year=&q=&from=&to=`) + `replaceState`; Chips über der Karte mit Einzel-Entfernen + „Alle zurücksetzen".

### M5 — Kein Weg zurück zur Ausgangsansicht; „Z"-Control kryptisch

Nach Pan/Zoom (oder dem Welt-Zoom aus K2) gibt es keinen Home-Button; das einzige Extent-Control zeigt nur den Buchstaben „Z". **Empfehlung:** Home-Control (Ostsee-Extent) mit Icon + Tooltip; „Z" durch Icon (z. B. `lucide:maximize`) ersetzen.

### M6 — Popup-Inhalt: Textfehler, fehlende Tiefe, hartkodierte Styles

- „Sichtung vom :" (Leerzeichen vor Doppelpunkt, `translations.report_date = 'Sichtung vom '` + `:`), „Anzahl Tiere: 3 Tiere" (doppelt).
- Kein Fahrwasser/Position im Popup, obwohl Übersetzungen (`position`, `latitude`, `longitude`) definiert sind; keine Fotos; kein Link auf eine Detailansicht.
- Popup und Hover-Info sind mit Inline-Hex-Styles gebaut (`optimizedMapController.ts:275-332`), am Theme vorbei.
  **Empfehlung:** Texte korrigieren; Popup schlank halten (Titel, Datum, Anzahl, Totfund-Badge) + „Details"-Weg; Styles über CSS-Klassen aus dem Theme.

### M7 — Loading-UX: modaler Vollbild-Blocker für jede Filteränderung

Jede Datenoperation (auch ein schneller Jahreswechsel) blendet ein **vollflächiges modales Overlay mit Backdrop-Blur** ein (`LoadingOverlay.svelte`), das die gesamte Seite blockiert — für Sub-Sekunden-Requests überdimensioniert; zudem existiert ein zweites, totes Lade-Overlay (`#overlay-load`, `SightingsMapView.svelte:329-334`). **Empfehlung:** Vollbild-Overlay nur beim Initial-Load; danach dezenter Inline-Indikator (z. B. Balken am Kartenrand oder Spinner im Panel — der existierende `isApplyingFilter`-Spinner, nur echt verdrahtet). Totes Overlay entfernen.

### M8 — Legende: Rauschen und Inkonsistenzen

Arten mit 0/0 (Beluga, Zwergwal, Finnwal, Buckelwal) werden gleichwertig gelistet; „Unbekannte Walart" trägt das Badge „Großwal"; ℹ️-Emoji statt Icon-System; Farbchips als Inline-Hex. **Empfehlung:** 0/0-Arten ausblenden oder ausgrauen ans Ende sortieren; Kategorie „Unbekannt" ehrlich benennen; Icons vereinheitlichen.

### M9 — Sprach-Inkonsistenz der OL-Defaults

Zoom-Buttons tragen englische Titles/Labels („Zoom in", „Zoom out") in ansonsten deutscher UI. **Empfehlung:** `zoomInTipLabel`/`zoomOutTipLabel` deutsch konfigurieren.

### M10 — Zeitfilter: zwei Single-Slider statt Dual-Range, ohne zugängliche Werte

- Zwei getrennte native Slider; der „Ende"-Track ist bei 31.12. **komplett gefüllt** und suggeriert „alles ausgewählt", während der Start-Track leer wirkt — der ausgewählte _Bereich_ ist nicht visualisiert (Baymard: Dual-Slider werden schon im besten Fall von >50 % missverstanden).
- Kein `aria-valuetext`: Screenreader lesen „186" (Tag-Index) statt „6. Juli".
- Start/Ende können nicht denselben Tag wählen (erzwungenes ±1, `timeSliderManager.ts:31,44`).
- Kein numerischer Fallback (Datumsfelder).
  **Empfehlung:** Echten Dual-Range (ein Track, zwei Handles, gefüllter Zwischenbereich) oder zwei Datums-Inputs; `aria-valuetext` mit Datum; Single-Day zulassen.

---

## 6. Kleinere Befunde / Code-Hygiene

- **N1:** `MapPanelManager.initializePanels()` ist funktionsloser Platzhalter (`panelManager.ts:15-29`); `updateTimeFilter()` im Controller ebenso (`optimizedMapController.ts:853-859`). Tote Pfade entfernen.
- **N2:** `LocationControl`/Geolocation ist vollständig implementiert, aber deaktiviert (`enableLocationControl: false`, `SightingsMapView.svelte:131`) — entweder aktivieren („Mein Standort" ist Standard bei Sichtungskarten) oder Code entfernen.
- **N3:** `createClusterStyle` (`styleUtils.ts:386`) wird nirgends verwendet (Duplikat der Controller-Logik ohne Filterunterstützung).
- **N4:** Jahresliste ist auf 10 Jahre begrenzt (`getAvailableYears(10)`), obwohl Daten bis 2007 zurückreichen — ältere Jahrgänge sind unerreichbar.
- **N5:** Sichtungen an Land (im Test: Marker bei Hamburg-Zentrum und südlich von Hamburg) — Hinweis auf fehlende Plausibilitätsprüfung im Altbestand; auf der Karte wirken sie wie Fehler.
- **N6:** Titel-Chip „Sichtungskarte 2026" aktualisiert korrekt bei Jahreswechsel (gut), kommuniziert aber nicht aktive Such-/Zeitfilter (siehe M4).
- **N7:** Der Hilfe-„?"-Button unten links bleibt bestehen — gut sichtbar, aber sein Modal erwähnt die automatische Suche nicht und listet Escape nur für „Dialoge".

---

## 7. Best-Practice-Checkliste (Bewertung)

Bewertung: ✅ erfüllt · ⚠️ teilweise · ❌ nicht erfüllt

| Kriterium                                           | Status                                                                               | Verweis |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ | ------- |
| **Navigation/Controls**                             |                                                                                      |         |
| Zoom-Buttons sichtbar, ≥44 px                       | ❌ 19×19 px                                                                          | H4      |
| Kein Verdecken relevanter Daten durch UI            | ⚠️ Panels auf 320 px reduziert (2026-07-29), überlagern rechts weiterhin             | H6      |
| Zustand teilbar (URL)                               | ❌                                                                                   | M4      |
| Home-/Ausgangsansicht                               | ❌                                                                                   | M5      |
| „Locate me"                                         | ❌ implementiert, deaktiviert                                                        | N2      |
| Basemap lenkt nicht ab                              | ⚠️ OpenSeaMap dominiert ab Z12                                                       | M3      |
| **Marker/Cluster**                                  |                                                                                      |         |
| Clustering mit Zählern                              | ✅                                                                                   | —       |
| Cluster-Klick zoomt / ortsgleiche auffächerbar      | ✅ Liste statt Spiderfy                                                              | —       |
| Cluster überlappen nicht                            | ❌                                                                                   | M2      |
| ≤6 colorblind-sichere Farben, Farbe + zweiter Kanal | ⚠️ Anzahl-Farben ok, Artcodierung faktisch wirkungslos                               | M1      |
| Selected-State des Markers                          | ❌                                                                                   | M6      |
| **Popups/Details**                                  |                                                                                      |         |
| Nur Identifikations-Kern + Weg zu Details           | ⚠️ kein Detail-Link                                                                  | M6      |
| Escape + X, Fokusrückgabe                           | ❌ Escape fehlt, kein Fokus-Mgmt                                                     | H1/H5   |
| Nur ein Popup zugleich                              | ✅                                                                                   | —       |
| Popup konsistent mit Filterzustand                  | ❌ Stale Popup                                                                       | H1      |
| **Filter/Legende**                                  |                                                                                      |         |
| Wirkung sofort sichtbar                             | ✅                                                                                   | —       |
| Ergebnisanzahl sichtbar                             | ⚠️ nur in Legende (sichtbar/gesamt), nicht am Suchfeld                               | H3      |
| Aktive Filter als Chips + Reset                     | ❌                                                                                   | M4      |
| Slider mit numerischem Fallback                     | ❌                                                                                   | M10     |
| Legende konsistent mit Kartendarstellung            | ❌                                                                                   | M1      |
| Ladeindikator bei Filteranwendung                   | ⚠️ vorhanden, aber fake-getimt bzw. überblockierend                                  | H3/M7   |
| **Mobile/Touch**                                    |                                                                                      |         |
| Kein Layout-Bruch auf 375 px                        | ✅ behoben 2026-07-29 (Panels als Bottom-Sheet < md)                                 | H6      |
| Details als Bottom Sheet                            | ⚠️ Filter/Legende als Bottom-Sheet (2026-07-29); Marker-Popup weiterhin Desktop-Stil | H6      |
| Touch-Targets ≥44 px                                | ❌                                                                                   | H4      |
| Pinch/Drag + Button-Alternativen                    | ✅                                                                                   | —       |
| **Performance/Laden**                               |                                                                                      |         |
| Clustering statt DOM-Marker                         | ✅ Canvas + Cluster                                                                  | —       |
| Request-Abbruch bei schnellen Wechseln              | ✅ AbortController                                                                   | —       |
| Kein Layout-Shift                                   | ✅                                                                                   | —       |
| **Accessibility**                                   |                                                                                      |         |
| Karte fokussierbar, Tastatur-Pan/Zoom               | ✅ behoben 2026-07-29 (`tabindex="0"` + Fokusring)                                   | K3      |
| Marker per Tastatur/SR erreichbar                   | ✅ über Listenansicht (Umschalter „Karte / Liste")                                   | K3      |
| Datenalternative (Tabelle/Liste)                    | ✅ behoben 2026-07-29 (`SightingsListView`)                                          | K3      |
| Korrekte ARIA-Semantik                              | ✅ behoben 2026-07-29 (region + inert + Fokus-Mgmt)                                  | H5      |
| Einzeltasten-Shortcuts abschaltbar                  | ✅ behoben 2026-07-29 (nur bei Fokus in der Karte)                                   | H7      |
| Kontraste in Panels/Popups                          | ⚠️ Beluga-Badge, sonst ok                                                            | M1      |

---

## 8. Priorisierte Maßnahmen

**Quick Wins (je < 1 Tag):**

1. K2-Serverfilter: NULL-/0-Koordinaten aus `/api/map/sightings` ausschließen.
2. K1: Default-Jahr auf jüngstes Jahr mit Daten + Empty-State-Button.
3. H1: Popup bei Jahr-/Filterwechsel schließen; Escape-Kaskade erweitern.
4. H2: Slider-Reset bei Jahreswechsel.
5. H3: Placeholder/Hilfetext/Spinner der Suche ehrlich machen.
6. H4: Control-Größen auf 44 px; M9: deutsche Zoom-Tooltips.
7. M5: „Z" → Icon-Button mit Ostsee-Home; `zoomAllFeatures` auf Ostsee-Extent klemmen.
8. H6 (Teilfix): tote `.w-90`-Regel auf `w-100`-Panels korrigieren bzw. `max-w-[100vw]`.

**Mittelfristig:**

- K3: `tabindex` + Fokusring + Skip-Link; Listen-/Tabellenansicht der gefilterten Sichtungen. — **Umgesetzt 2026-07-29** (`SightingsMapView.svelte`, `SightingsListView.svelte`, `listViewUtils.ts`).
- H5: ARIA-Sanierung der Panels (inert, region, Fokus-Management). — **Umgesetzt 2026-07-29** (`FilterPanel.svelte`, `LegendPanel.svelte`, `LoadingOverlay.svelte`, `panelFocus.ts`; inkl. H7: Shortcuts nur bei Fokus in der Karten-Region, Panel-Steuerung über `bind:isOpen` statt DOM-Queries).
- M1: Einheitliches Marker-/Legenden-Codierungssystem (colorblind-safe, Legende aus gemeinsamen Konstanten).
- M4: URL-State + Filter-Chips + Reset.
- M7: Loading-Konzept (Vollbild nur initial).
- H6: Mobile Bottom-Sheet für Filter/Legende. — **Umgesetzt 2026-07-29** (gemeinsame Wrapper-Komponente `MapPanel.svelte`: < md Bottom-Sheet mit Peek/Expanded-Zustand, Schließen per Button, ab md 320-px-Seitenpanel mit `h-[calc(100%-5rem)]`; Öffnen des einen Panels schließt das andere in `SightingsMapView.svelte`; solange ein Sheet offen ist, blendet Mobile die Toggle-Tabs aus, weil sie sonst den Sheet-Header verdecken).

**Strategisch:**

- Jahresübergreifende Ansicht („Alle Jahre", Heatmap/Hexbin für ältere Bestände — vgl. OBIS/eBird).
- Detailseite pro Sichtung (Popup verlinkt), inkl. Fotos mit Consent.
- Marker-Selected-State + Fokus-Stellvertreter für Tastatur (macht Popups zugänglich).

---

## 9. Quellen (Auswahl)

- OpenLayers Accessible-Beispiel (tabindex/Keyboard): https://openlayers.org/en/latest/examples/accessible.html
- Google Maps Platform — Marker/Info-Window-Zugänglichkeit & Clustering: https://developers.google.com/maps/documentation/javascript/markers · https://developers.google.com/maps/documentation/javascript/marker-clustering
- W3C/OGC Maps for the Web Workshop (kein Framework WCAG-konform): https://www.w3.org/2020/maps/ · WCAG-Evaluation: https://github.com/Malvoz/web-maps-wcag-evaluation
- Leitfaden „Accessible Interactive Web Maps" (Minnesota IT, Datenalternative): https://mn.gov/mnit/assets/Accessibility%20Guide%20for%20Interactive%20Web%20Maps_tcm38-403564.pdf
- Map UI Patterns (Pattern-Katalog: Cluster, Info-Popup, Attribute Filter, Timeline): https://mapuipatterns.com/
- Baymard — Slider-Interfaces (Dual-Slider-Verständlichkeit): https://baymard.com/blog/slider-interfaces · NN/g Sliders: https://www.nngroup.com/articles/sliders-knobs/
- Smashing Magazine — Accessible Tap Targets: https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
- Leaflet.markercluster (Spiderfy-Pattern): https://github.com/Leaflet/Leaflet.markercluster
- Eleken — Map UI Design (Basemap-Zurückhaltung, Scroll-Hijacking): https://www.eleken.co/blog-posts/map-ui-design
- Referenz-Karten: https://www.inaturalist.org/observations · https://ebird.org/map · https://mapper.obis.org
- ColorBrewer (colorblind-safe Paletten): https://colorbrewer2.org/

---

_Erstellt im Rahmen des UX-Reviews vom 2026-07-28. Testumgebung: lokaler Dev-Server (`npm run dev`, Port 4000), Chrome, lokale DB mit Produktionsdatenstand vom 2026-07-28._
