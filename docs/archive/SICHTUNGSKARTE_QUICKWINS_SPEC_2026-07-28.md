# Spec: Sichtungskarte — Quick-Win-Fixes aus dem UX-Review

**Datum:** 2026-07-28 · **Basis:** `docs/archive/UX_REVIEW_SICHTUNGSKARTE_2026-07-28.md`
**Scope:** Die acht Quick Wins (§8 des Reviews). Größere Maßnahmen (K3-A11y, ARIA-Sanierung, Bottom-Sheet, Farbsystem, URL-State) sind **nicht** Teil dieser Spec — sie werden als separate Follow-Up-Tasks angelegt.

**Verbindlich für alle Punkte:** Test-First gemäß `.claude/rules/testing.md` (reproduzierender Test vor dem Fix; reine CSS-/Textänderungen sind dokumentierte Ausnahmen). API-Änderungen aktualisieren `static/openapi.yml`. Design-Tokens gemäß `.claude/rules/design-system.md`.

---

## Priorisierung & Wellen

| Prio | ID   | Titel                                                       | Review-Ref | Welle            | Dateien (führend)                                           |
| ---- | ---- | ----------------------------------------------------------- | ---------- | ---------------- | ----------------------------------------------------------- |
| 1    | QW1  | Ungültige Koordinaten serverseitig filtern                  | K2         | 1 (Server)       | `api/map/sightings/+server.ts`                              |
| 2    | QW2a | Endpoint „verfügbare Jahre mit Anzahl"                      | K1         | 1 (Server)       | `api/map/sightings/years/+server.ts` (neu)                  |
| 3    | QW2b | Default-Jahr = jüngstes Jahr mit Daten + Empty-State-Button | K1         | 2 (Client)       | `SightingsMapView.svelte`, `FilterPanel.svelte`             |
| 4    | QW3  | Popup bei Jahr-/Filterwechsel schließen; Escape-Kaskade     | H1         | 2 (Client)       | `optimizedMapController.ts`, `SightingsMapView.svelte`      |
| 5    | QW4  | Zeitslider-Reset bei Jahreswechsel                          | H2         | 2 (Client)       | `timeSliderManager.ts`                                      |
| 6    | QW5  | Suche ehrlich: Placeholder, Hilfetext, echter Ladeindikator | H3         | 2 (Client)       | `FilterPanel.svelte`, `SightingsMapView.svelte`             |
| 7    | QW6  | Controls ≥ 44 px + deutscher Zoom-Tooltip                   | H4, M9     | 1 (CSS/Controls) | `mapStyles.css`, `optimizedMapController.ts`                |
| 8    | QW7  | „Z" → Icon-Button; Zoom-alle auf Ostsee begrenzt            | M5, K2     | 1 (CSS/Controls) | `ZoomAllControl.ts`, `optimizedMapController.ts`            |
| 9    | QW8  | Mobile Panelbreite reparieren (tote `.w-90`-Regel)          | H6         | 1 (CSS/Controls) | `mapStyles.css`, `FilterPanel.svelte`, `LegendPanel.svelte` |

Welle 1 läuft parallel (Server-Agent ∥ CSS/Controls-Agent, disjunkte Dateien). Welle 2 startet danach (ein Client-UX-Agent; hängt von QW2a ab und fasst Controller/Panels an, die Welle 1 punktuell ändert).

---

## Welle 1 — Server

### QW1: Ungültige Koordinaten filtern (K2)

**Problem:** 165/817 Features (2025) mit `[0,0]` bzw. Nordpol-Koordinaten; Ursache NULL-Koordinaten → `sightingsToGeoJSON`-Fallback auf 0.

**Lösung:** In `GET /api/map/sightings` zusätzliche WHERE-Bedingungen:

- `latitude IS NOT NULL AND longitude IS NOT NULL`
- Plausibilitätsfenster Ostsee: `longitude BETWEEN 9.4 AND 30.2 AND latitude BETWEEN 53.0 AND 66.0` — Konstanten aus `BALTIC_SEA_BBOX` (`src/lib/utils/geo/checkBalticSea.ts`) importieren, nicht duplizieren.

**Akzeptanz:**

- `/api/map/sightings?year=2025` liefert 0 Features außerhalb der BBox (vorher 165).
- Test (Erweiterung von `src/routes/api/map/sightings/yearFilter.test.ts` oder neue Co-located-Testdatei): mit gemockter DB-Query wird verifiziert, dass die Bedingungen Teil der Query sind bzw. dass Null-Island-Datensätze nicht im GeoJSON landen.
- `static/openapi.yml`: Beschreibung des Endpoints ergänzt („liefert nur Sichtungen mit plausiblen Ostsee-Koordinaten").
- Kein Umbau von `sightingsToGeoJSON` (der 0-Fallback wird durch den Serverfilter unerreichbar für die Karte; Verhalten anderer Aufrufer unverändert).

### QW2a: Endpoint verfügbare Jahre (K1)

**Lösung:** Neuer Endpoint `GET /api/map/sightings/years` → `{ years: [{ year: number, count: number }, …] }`, absteigend sortiert. Grundmenge identisch zur Karte: `approvedAt IS NOT NULL` **und** gültige Koordinaten (QW1-Bedingungen). Jahresgrenzen wie im Hauptendpoint über `berlinDayRangeUtc`-Konvention (Gruppierung per `berlinDatePart`-Ausdruck aus `src/lib/server/db/sqlTimeZone.ts`, damit vorhandene Indizes greifen).

**Akzeptanz:**

- Liefert für den Prod-Datenstand u. a. `{year: 2025, count: >0}`, `{year: 2024, count: >0}`; 2026 erscheint nicht (count 0 wird nicht geliefert).
- Co-located Test (gemockte DB) + OpenAPI-Eintrag (Pfad, Schema).
- Kein zweiter Freigabe-Filterpfad: dieselbe `approvedOnly()`-Semantik wie überall (`.claude/rules/api.md`).

---

## Welle 1 — CSS/Controls

### QW6: Touch-Targets & deutsche Tooltips (H4, M9)

- `mapStyles.css`: `.ol-zoom button`, `.zoom-all-control button`, `.location-control button` auf **min. 44×44 px** (Desktop wie Mobile; die `!important`-`1.375em`-Blöcke und die 2.2em-Mobile-Variante ersetzen). Abstände/Offsets (`top`) der Controls entsprechend nachziehen, damit nichts überlappt (Zoom oben links unter dem Titel, Z darunter).
- Popup-Closer (`createPopup` in `optimizedMapController.ts`): Hit-Target auf min. 44×44 px (Padding), Symbol darf optisch klein bleiben.
- `defaultControls({ rotate: false, zoomOptions: { zoomInTipLabel: 'Vergrößern', zoomOutTipLabel: 'Verkleinern' } })`.

**Akzeptanz:** `getBoundingClientRect()` der drei Control-Buttons ≥ 44 px in beiden Dimensionen (manuelle Verifikation im Browser genügt, CSS-Ausnahme von Test-First — im Commit dokumentieren). Tooltips deutsch.

### QW7: Zoom-alle: Icon + Ostsee-Klemme (M5, K2-Symptom)

- `ZoomAllControl.ts`: statt `'Z'` ein Inline-SVG (z. B. Maximize-/Extent-Icon, `aria-hidden="true"` am SVG, `aria-label` bleibt am Button), Title „Auf alle Sichtungen zoomen".
- `zoomAllFeatures()` im Controller: Extent vor `view.fit()` mit dem Ostsee-Extent verschneiden (`BALTIC_SEA_BBOX` → `fromLonLat`-transformierte `boundingExtent`); wenn der Feature-Extent leer/unendlich ist → auf Ostsee-Default zoomen statt nichts zu tun. Damit zoomt „Z" nie mehr auf die Weltansicht, selbst wenn künftig wieder Ausreißer in den Daten sind.

**Akzeptanz:** Test für die neue Extent-Klemm-Logik (pure Funktion `clampExtentToBaltic(extent)` in `mapUtils.ts` o. ä., Test-First). Browser-Verifikation: Z zoomt auf Ostsee.

### QW8: Mobile Panelbreite (H6-Teilfix)

- Tote Regel `.w-90 { width: 100vw !important }` (`mapStyles.css:241-243`) entfernen.
- Panels (`FilterPanel.svelte`, `LegendPanel.svelte`): `w-100` → zusätzlich `max-w-[100vw]`; Toggle-Button-Transform von hartem `-400px` auf `calc(-1 * min(400px, 100vw))`, damit der Button auf schmalen Viewports an der Panelkante bleibt statt ins Layout zu ragen.

**Akzeptanz:** Bei 375 px Viewport: Panel ≤ Viewportbreite, Toggle-Button sichtbar an der linken Panelkante, Schließen-X erreichbar. (CSS-Ausnahme von Test-First, Browser-Verifikation mit Screenshot.)

---

## Welle 2 — Client-UX (nach Welle 1)

### QW2b: Default-Jahr mit Daten + Empty-State-Aktion (K1)

- `SightingsMapView.svelte`: vor Karteninitialisierung `GET /api/map/sightings/years` laden. Default-Jahr = `pickDefaultYear(availableYears, getDefaultSightingYear())` — neue **pure Funktion** in `src/lib/utils/date/defaultYear.ts`: jüngstes Jahr mit `count > 0`, das ≤ dem bisherigen Default liegt; gibt es keins, das jüngste Jahr mit Daten überhaupt; Fallback bei leerem/fehlgeschlagenem Response: bisheriges Verhalten. (Test-First in `defaultYear.test.ts`.)
- Jahres-Dropdown: weiterhin die letzten 10 Jahre, aber Jahre mit Daten kennzeichnen bzw. Anzahl anzeigen („2025 (817)") — Jahre ohne Daten bleiben wählbar.
- Empty-State „Keine Sichtungen für {Jahr} vorhanden." bekommt einen Button `btn btn-primary btn-sm` „Sichtungen {jüngstes Jahr mit Daten} anzeigen", der das Jahr umschaltet (gleicher Pfad wie Dropdown-Änderung). Button nur wenn ein solches Jahr existiert.
- Fehlerpfad: `years`-Request scheitert → stilles Fallback auf bisheriges Verhalten (kein Fehler-Toast dafür).

**Akzeptanz:** Erststart auf lokalem Prod-Stand zeigt 2025er-Daten statt leerer Karte; Test für `pickDefaultYear` (Grenzfälle: leere Liste, nur ältere Jahre, aktuelles Jahr mit Daten).

### QW3: Stale Popup schließen + Escape (H1)

- Controller: öffentliche Methode `closePopup()` (setzt `popup.setPosition(undefined)`), aufgerufen am Anfang von `setYear()`, `applyFilter()`, `setSpeciesVisibility()`, `setColorVisibility()`, `setFilter()` (Zeitslider).
- `SightingsMapView.svelte` Escape-Kaskade neu: **Popup → Hilfe-Modal → Filter-Panel → Legende** (Popup-offen-Abfrage über neue Methode `isPopupOpen()` oder `closePopup()` gibt `boolean` zurück, ob eines offen war).

**Akzeptanz:** Test-First soweit sinnvoll: Die Schließ-Aufrufe sind OL-lastig — zulässige Abdeckung: schlanker Unit-Test, der per Mock-Overlay verifiziert, dass `setYear`/`applyFilter`/Visibility-Setter `closePopup()` auslösen (Controller-Instanziierung ist im jsdom schwer — alternativ die Aufrufe in eine testbare private Hilfsstruktur ziehen oder als dokumentierte Browser-Verifikation). Browser-Verifikation: Jahr wechseln → Popup zu; Escape schließt zuerst das Popup.

### QW4: Zeitslider-Reset bei Jahreswechsel (H2)

- `MapTimeSliderManager` erhält `reset(daysInYear: number)`: Start-Slider → 0, Ende-Slider → `daysInYear - 1`, `max`-Attribute aktualisieren.
- Aufruf beim Jahreswechsel (im bestehenden `yearChangeCallback`-Fluss in `SightingsMapView.svelte`, der auch `currentDisplayedYear` setzt).
- Dabei die bestehende ±1-Zwangskorrektur so anpassen, dass Start == Ende erlaubt ist (Review M10-Teilaspekt, ein Zeilenfix: Klemmen statt Verschieben).

**Akzeptanz:** Test-First: `timeSliderManager.test.ts` (jsdom: zwei Range-Inputs, Manager initialisieren, `reset(366)` → Werte 0/365 und `max` 365; Start==Ende möglich). Browser-Verifikation: Slider auf Juli, Jahr wechseln → Thumbs auf 01.01./31.12.

### QW5: Suche ehrlich machen (H3)

- Placeholder: `„Fahrwasser, Schiffsname, Name…"` (keine E-Mail — die API durchsucht sie nicht).
- Hilfetext: `„Filtert automatisch beim Tippen"`.
- `title`-Attribut des Inputs entsprechend anpassen.
- **Echter Ladeindikator:** `FilterPanel` bekommt Prop `isLoading: boolean`; `SightingsMapView` reicht `isLoadingData` durch. Der 800-ms-Fake (`handleFilterApply`, `filterFeedbackTimeout`) und das `disabled` am Jahres-Select während des Fakes entfallen ersatzlos; Spinner/„Filter wird angewendet…" hängen an `isLoading`. Enter im Suchfeld: kein eigener Handler mehr nötig (Debounce filtert ohnehin) — Enter darf zusätzlich sofort filtern (Debounce-Bypass ist optional, nicht gefordert).

**Akzeptanz:** Textänderungen (Ausnahme Test-First, da reine Copy). Prop-Verdrahtung per vorhandenem Komponenten-Testmuster, falls ein FilterPanel-Test existiert — sonst Browser-Verifikation: Tippen zeigt Spinner während des echten Requests, danach aus.

---

## Nicht in dieser Spec (→ Follow-Up-Tasks / Chips)

| Thema                                                              | Review-Ref      |
| ------------------------------------------------------------------ | --------------- |
| Tastaturbedienung + Listen-/Tabellenalternative                    | K3              |
| ARIA-/Fokus-Sanierung der Panels (inert, region, Fokus-Management) | H5, H7          |
| Mobile Bottom-Sheet für Filter/Legende                             | H6 (Vollausbau) |
| Marker-/Legenden-Farbsystem vereinheitlichen                       | M1, M8          |
| URL-State, Filter-Chips, Reset                                     | M4, N6          |
| OpenSeaMap-Toggle, Loading-Konzept, Dual-Range-Slider              | M3, M7, M10     |

---

## Abnahme gesamt

1. `npm run test:quick` grün.
2. Browser-Verifikation Desktop + 375 px: Erststart zeigt Daten; Z zoomt auf Ostsee; Popup schließt bei Filterwechsel; Slider konsistent nach Jahreswechsel; Controls ≥ 44 px; Panel mobil ≤ Viewport.
3. `static/openapi.yml` validiert (js-yaml-Check aus `.claude/rules/api.md`).
