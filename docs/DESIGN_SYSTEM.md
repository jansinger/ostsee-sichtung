# Design System — Ostsee-Tiere

Token-Referenz. **Begründungen** stehen in `docs/DESIGN_GUIDE.md`, die
**verbindlichen Regeln** in `.claude/rules/design-system.md` und
`.claude/rules/daisyui.md`. Diese Datei beantwortet nur: welche Tokens gibt es,
welchen Wert haben sie, wofür sind sie da.

Angeschaut wird das System unter **`/styleguide`** (nur `dev`). Der lebende
Zustand steht dort, nicht hier — eine Prosa-Liste veraltet.

---

## Aufbau

| Ebene           | Datei                            | Inhalt                                                                 |
| --------------- | -------------------------------- | ---------------------------------------------------------------------- |
| 1 Primitive     | `src/css/tokens.css`             | Rohwerte: Farbrampen, Skalen, Dauern                                   |
| 2 Semantisch    | `src/css/tokens.css`             | `--color-*-strong`, `--text-*`, `--space-*`, `--layer-*`, `--motion-*` |
| 3 DaisyUI-Theme | `src/app.css`                    | `@plugin 'daisyui/theme'` — mappt aus Ebene 1                          |
| 4 Utilities     | `src/app.css` (`@theme`-Block)   | macht die eigenen Tokens als Tailwind-Klassen verfügbar                |
| Randbereiche    | `mapTokens.ts`, `emailTokens.ts` | sRGB-Spiegelungen für Canvas und E-Mail                                |

Ein Wert existiert genau einmal — in Ebene 1. Alles andere referenziert.

---

## Farben

### Marke

| Token               | Wert                         | sRGB      | Verwendung                    |
| ------------------- | ---------------------------- | --------- | ----------------------------- |
| `--brand-sea-900`   | `oklch(0.25 0.089 235.3)`    | `#002545` | `accent-content`              |
| `--brand-sea-600`   | `oklch(0.35 0.089 235.3)`    | `#004062` | `primary` — Meeresmuseum-Blau |
| `--brand-sea-400`   | `oklch(0.475 0.04 215.2)`    | `#42626a` | `secondary-strong`            |
| `--brand-sea-300`   | `oklch(0.65 0.04 215.2)`     | `#74969f` | `secondary` (Fläche)          |
| `--brand-sea-200`   | `oklch(0.8 0.047 215)`       | `#9cc6d1` | `accent` (Fläche)             |
| `--brand-slate-700` | `oklch(0.37 0.016 251.8)`    | `#3a4048` | `neutral`                     |
| `--brand-slate-950` | `oklch(0.15 0.022 251.8)`    | `#050c14` | `base-content`                |
| `--brand-mist-100`  | `oklch(0.9403 0.0104 247.9)` | `#e6ecf2` | `base-100`                    |
| `--brand-mist-200`  | `oklch(0.88 0.012 247.9)`    | `#d1d8df` | `base-200`                    |
| `--brand-mist-300`  | `oklch(0.82 0.015 247.9)`    | `#bdc5ce` | `base-300` — nur Rahmen/Hover |

### Zwei Rollen je Statusfarbe

Das ist der Kern des Systems und der häufigste Fehler im Bestand: eine Farbe,
die als Fläche funktioniert, funktioniert als Vordergrund nicht.

| Farbe       | Fläche (`bg-*`) | weiß darauf | Vordergrund (`text-*-strong`) | auf base-100 | auf base-200 |
| ----------- | --------------- | ----------- | ----------------------------- | ------------ | ------------ |
| `primary`   | `#004062`       | 11,00 ✅    | `text-primary` genügt         | 9,24 ✅      | 7,65 ✅      |
| `info`      | `#007daa`       | 4,65 ✅     | `#00628d`                     | 5,63 ✅      | 4,66 ✅      |
| `success`   | `#1c882d`       | 4,56 ✅     | `#006d09`                     | 5,53 ✅      | 4,57 ✅      |
| `warning`   | `#bb8500`       | 3,26 ❌ †   | `#865100`                     | 5,53 ✅      | 4,58 ✅      |
| `error`     | `#ac1922`       | 7,20 ✅     | `text-error` genügt           | 6,05 ✅      | 5,01 ✅      |
| `secondary` | `#74969f`       | 3,19 ❌ †   | `#42626a`                     | 5,54 ✅      | 4,58 ✅      |
| `accent`    | `#9cc6d1`       | 1,84 ❌ †   | `#3c636d`                     | 5,52 ✅      | 4,57 ✅      |

† Deshalb ist `*-content` für diese drei **nicht** weiß, sondern
`base-content`: `warning` 6,05:1, `secondary` 6,18:1, `accent` 8,45:1.

Alle Werte oben (außer der Spalte „weiß darauf" für die drei ❌-Zeilen, die den
Zustand **vor** PR 1 festhält, und `base-300`) sind unter `/styleguide` von
`e2e/design-tokens.spec.ts` im Browser gemessen — dieselbe Mechanik, die den
Test grün oder rot macht. Wer eine Zahl hier korrigiert, ohne sie dort
nachzumessen, dokumentiert eine Vermutung.

**Die beiden knappsten Werte:** `info-content` (4,65) und `success-content`
(4,56) liegen konstruktionsbedingt dicht über 4,5 — weiß ist dort bereits die
bessere Wahl, `base-content` misst 4,22 bzw. 4,31. Die Lightness von
`--status-info-surface` und `--status-success-surface` darf deshalb nie erhöht
werden (Regel in `.claude/rules/design-system.md`). Auf `base-200` ist
`text-accent-strong` mit 4,57 der knappste Vordergrundwert.

`text-info-strong` lag dort ursprünglich bei 4,53 und ist mit PR 3 auf
`oklch(0.46 …)` gesenkt worden (4,66). Grund war nicht der Wert selbst, sondern
seine Empfindlichkeit: die 8-Bit-Quantisierung nach sRGB kostete diesen Farbton
bei `L = 0.465` **0,043** Kontrast, die vier Nachbarn nur 0,005–0,012. Wer einen
`-strong`-Wert ändert, misst deshalb den quantisierten Wert nach, nicht den
gerechneten — Begründung steht an der Zeile in `src/css/tokens.css`.

**Regel:** `text-`, `fill-`, `stroke-` → immer `-strong`. `bg-`, `btn-`,
`badge-`, `alert-` → nie `-strong`.

**Grenze:** Alle `-strong`-Varianten liegen auf `base-300` bei ~3,77:1. Sie
gehören nur auf `base-100` und `base-200` — dieselbe Regel, die für
`text-error` schon galt.

### Deckkraft von `base-content`

| Token         | Stufe | base-100 | base-200 | base-300 | Verwendung                      |
| ------------- | ----- | -------- | -------- | -------- | ------------------------------- |
| `--fg-strong` | 100 % | 16,50 ✅ | 13,66 ✅ | 11,26 ✅ | Fließtext                       |
| `--fg-muted`  | 70 %  | 7,04 ✅  | 6,41 ✅  | 5,74 ✅  | Sekundärtext, Hilfetext         |
| `--fg-subtle` | 60 %  | 4,94 ✅  | 4,62 ✅  | 4,26 ❌  | Untergrenze, nicht auf base-300 |

`/50` (3,54 / 3,39 / 3,23) und `/40` (2,64 / 2,56 / 2,46) sind **dekorativ**.
Nie für Zeichen, die gelesen werden müssen.

---

## Typografie

Sechs Rollen. `Roboto` 400/500/700 lokal über `@fontsource`.

| Token            | Größe | Zeilenhöhe | Verwendung                   |
| ---------------- | ----- | ---------- | ---------------------------- |
| `--text-display` | 32px  | 1.1        | Seitentitel, einer pro Seite |
| `--text-title`   | 24px  | 1.2        | Schritt-Titel, Panel-Titel   |
| `--text-section` | 18px  | 1.3        | Abschnittstitel              |
| `--text-body`    | 16px  | 1.55       | Fließtext, Formularfelder    |
| `--text-label`   | 14px  | 1.4        | Feld-Label, Buttons          |
| `--text-support` | 13px  | 1.5        | Hilfetext, Metadaten, Badges |

`--text-body` gilt auch für `.input`, `.select`, `.textarea` — 16px verhindert
den iOS-Auto-Zoom beim Fokussieren. Das galt vorher nur im iframe-Modus.

Im Feldmodus (`data-density="field"`) wächst `--text-support` auf 14px.

---

## Abstände

4-px-Raster, fünf Stufen: `--space-1` 4px, `--space-2` 8px, `--space-3` 16px,
`--space-4` 24px, `--space-5` 32px.

Zuordnung: Icon→Text `1` · Label→Feld `2` · Feld→Feld und Card-Innenrand
mobil `3` · Card-Innenrand Desktop und Gruppe→Gruppe `4` ·
Abschnitt→Abschnitt `5`.

---

## Radien, Elevation, Z-Index, Motion

**Radien** (DaisyUI-Theme): `--radius-selector` 0.5rem (Checkbox, Radio,
Toggle) · `--radius-field` 0.25rem (Input, Select, Textarea) ·
`--radius-box` 0.5rem (Card, Alert, Modal).

**Elevation**, drei Stufen:

| Token                  | Verwendung                      |
| ---------------------- | ------------------------------- |
| `--elevation-flat`     | Rahmen statt Schatten           |
| `--elevation-raised`   | Card im Ruhezustand             |
| `--elevation-floating` | Panel, Modal, Toast, Card-Hover |

**Z-Index**: `--layer-raised` 10 · `--layer-panel` 20 · `--layer-nav` 30 ·
`--layer-overlay` 40 · `--layer-skip` 50. Keine freien `z-*`-Utilities.

**Motion**, vier Stufen:

| Token               | Wert  | Wofür                        | Kurve           |
| ------------------- | ----- | ---------------------------- | --------------- |
| `--motion-instant`  | 120ms | Hover, Fokus                 | `--motion-ease` |
| `--motion-quick`    | 200ms | Aufklappen, Toast            | `--motion-ease` |
| `--motion-panel`    | 300ms | Panel, Bottom-Sheet, Overlay | `--motion-ease` |
| `--motion-emphasis` | 400ms | Überschwung, Federung        | **`linear`**    |

Die ersten drei beschreiben **Übergänge** und laufen mit `--motion-ease`.
`--motion-emphasis` ist keine vierte Übergangsstufe: betonte Bewegungen bringen
ihre Kurve über die Keyframe-Stops mit (`bounceIn`: `.3 → 1.05 → .9 → 1`), eine
zweite Easing-Ebene würde dort jedes Segment einzeln biegen. Der
`prefers-reduced-motion`-Block in `app.css` entschärft global — eigene Guards
sind nicht nötig.

---

## Touch-Targets und Dichte

| Token            | Normal | Feldmodus |
| ---------------- | ------ | --------- |
| `--target-min`   | 44px   | 56px      |
| `--target-gap`   | 16px   | 24px      |
| `--control-size` | 28px   | 28px      |

44px ist WCAG 2.5.5 und gilt hier auch außerhalb von AAA, weil das Formular an
Deck ausgefüllt wird. Der Feldmodus (`<html data-density="field">`) rechnet mit
nassen Fingern, Handschuhen und einem schwankenden Boot.

**Das Ziel ist 44px, nicht das Bedienelement.** Durchgesetzt wird das global in
`app.css`, aber auf zwei getrennten Wegen:

| Element                                   | Mechanismus                     | Größe                      |
| ----------------------------------------- | ------------------------------- | -------------------------- |
| `.btn`, `summary.btn`                     | `min-height: var(--target-min)` | 44px (Feldmodus 56px)      |
| `.btn-circle`                             | zusätzlich `min-width`          | 44×44                      |
| `label:has(> .checkbox\|.radio\|.toggle)` | `min-height: var(--target-min)` | 44px — hier liegt das Ziel |
| `.checkbox`, `.radio`, `.toggle`          | `--size: var(--control-size)`   | 28px, sichtbare Größe      |

Ankreuzfelder deshalb **nie** über `min-height` vergrößern: DaisyUI setzt bei
ihnen `width` und `height` fest, eine Mindesthöhe streckt sie nur (gemessen:
Radio 24×44 als Ellipse). Anzusehen unter `/styleguide` → „Ankreuzfelder — das
Ziel trägt das Label", inklusive Umschalter auf den Feldmodus.

`min-h-11` an der Aufrufstelle ist damit überflüssig und `btn-xs` nicht mehr
gefährlich. Ausnahme über `.target-exempt` — nur für Ziele, die nachweislich
nicht mit dem Finger bedient werden.

### Feldmodus aktivieren

Der Modus hängt an genau einem Attribut am `<html>`-Element. Es gibt drei Wege
dorthin, je nachdem, wie lange er halten soll:

| Zweck                        | Weg                                                                    | Reichweite                  |
| ---------------------------- | ---------------------------------------------------------------------- | --------------------------- |
| Dauerhaft für ein Deployment | in `src/app.html` `data-density="field"` an das `<html>` hängen        | die ganze Auslieferung      |
| Kurz ansehen oder nachmessen | `/styleguide` → Umschalter „Feldmodus"                                 | solange die Seite offen ist |
| Einmalig prüfen, ohne Neubau | DevTools-Konsole: `document.documentElement.dataset.density = 'field'` | bis zum nächsten Laden      |

Der Normalzustand ist die **Abwesenheit** des Attributs — es gibt bewusst
keinen Selektor für `comfortable`. Wer `[data-density='comfortable']` stylt,
bricht damit zwei Dinge auf einmal: den „Attribut weg = Normalfall"-Vertrag und
den Hydrations-Check in `e2e/design-tokens.spec.ts`, der die Anwesenheit des
Attributs als Signal benutzt (dort kommentiert).

Was der Modus ändert, steht vollständig in `src/css/tokens.css` unter
`[data-density='field']`: `--target-min` 44 → 56px, `--target-gap` 16 → 24px,
`--text-support` 13 → 14px. Keine Komponente fragt den Modus ab. Eine
Komponente, die ihn abfragen müsste, ist ein Hinweis darauf, dass ihr ein Token
fehlt — nicht darauf, dass sie eine Fallunterscheidung braucht.

**Keine Bedienung in der App.** Es gibt absichtlich keinen Umschalter im
Formular: Der Modus ist eine Betriebsentscheidung für ein Gerät („dieses Tablet
liegt an Deck"), keine Nutzerpräferenz pro Sitzung. Ein Schalter im Formular
wäre ein weiteres Bedienelement in genau dem Bildschirmbereich, den der Modus
freiräumen soll.

---

## Breakpoints

| Grenze | Breite | Zuständig für                       |
| ------ | ------ | ----------------------------------- |
| `md`   | 768px  | Layout, Grid, Panels, Innenabstände |
| `lg`   | 1024px | ausschließlich Navigation           |

`sm` ist keine Layout-Grenze. Vorher schaltete das Formular bei `sm`, die
Panels bei `md`, die Navbar bei `lg` — auf einem 800px-Tablet war das
Formular „Desktop", die Navigation „Mobil".

---

## Einbettungs-Modi

| Modus        | Navbar/Footer | Max-Breite | Marke       |
| ------------ | ------------- | ---------- | ----------- |
| `standalone` | sichtbar      | 672px      | eigene      |
| `embedded`   | versteckt     | 672px      | Elternseite |
| `kiosk`      | versteckt     | volle      | Elternseite |

Im `embedded`-Zustand trägt meeresmuseum.de die Marke — die App zeigt keine
zweite Wortmarke und keine zweite Navigation. Die 672px sind ein **Vertrag**
mit der Elternseite und nicht beiläufig zu ändern.

---

## Randbereiche mit erlaubten Hex-Werten

Drei Ausnahmen, jede mit einem einzigen Ort für ihre Werte:

| Bereich           | Warum                                              | Datei                                     |
| ----------------- | -------------------------------------------------- | ----------------------------------------- |
| OpenLayers-Canvas | Canvas liest keine CSS-Variablen                   | `src/lib/map/mapTokens.ts`                |
| Marker-Palette    | Datenkodierung, farbfehlsichtigkeits-sicher (Wong) | `src/lib/map/styleUtils.ts`               |
| E-Mail-Templates  | Clients kennen `oklch()`/`color-mix()` nicht       | `src/lib/server/templates/emailTokens.ts` |

Die Marker-Palette bewegt sich bewusst **nicht** mit dem Theme: Kleinwal
`#0072B2`, Großwal `#009E73`, Robbe `#D55E00`, unbestimmt `#767676`.
Datenfarben müssen über Theme-Änderungen hinweg stabil bleiben.

---

## Prüfung

```bash
npm run test:quick                              # Lint, Types, svelte-check, Unit (inkl. Scan-Regeln)
npx playwright test e2e/design-tokens.spec.ts   # Token-Kontraste + DOM-Scan
npx playwright test e2e/form-a11y.spec.ts       # Fokus, Alerts, error-Buttons
```

`design-tokens.spec.ts` prüft dreierlei: die Token-Kontraste gegen
`/styleguide` (dort steht jede Kombination genau einmal), die App gegen
verbotene Kombinationen (Statusfarbe als Vordergrund, Deckkraft unter /60,
Tailwind-Paletten-Klassen) und die **Vollständigkeit von `/styleguide`** selbst.
Gemessen wird im Browser, weil `oklch()` und `color-mix(in oklab, …)` erst nach
dem Gamut-Mapping nach sRGB als Kontrastwert lesbar sind.

### Die drei Scan-Regeln liegen in Node, nicht im Browser

Seit dem 2026-07-30 stehen sie als reine Funktionen in
`e2e/helpers/bannedClasses.ts`; der Browser gibt nur noch Klassenlisten heraus,
gefiltert wird in Node. Das hat einen Grund, der über Aufräumen hinausgeht: Ein
Scan über einen konformen Bestand belegt nichts über die Regel. Genau daran ist
die Deckkraft-Lücke unten monatelang unentdeckt geblieben — sie war grün, weil
der Code sauber war, nicht weil die Regel griff.

`e2e/helpers/bannedClasses.test.ts` stellt deshalb jede Regel an konstruierten
Beispielen scharf und läuft in `npm run test:quick` mit. Die Gegenprobe dazu ist
gefahren: Nimmt man das Deckkraft-Suffix aus dem Statusfarben-Muster, fallen
2 von 46 Fällen; ersetzt man den Schwellenvergleich wieder durch die Aufzählung
`(40|50)`, fallen 5; nimmt man `white|black` aus dem Paletten-Muster, fallen 9.

### Die zweite Lücke derselben Regel: `white` und `black`

Beim Schließen der Deckkraft-Lücke fiel eine zweite auf, gleicher Bauart. Das
Paletten-Muster verlangte hinter dem Farbnamen eine Farbstufe (`-\d{2,3}`) —
`bg-white`, `text-white`, `bg-black` und ihre Deckkraft-Varianten tragen keine
und konnten deshalb **strukturell** nie gemeldet werden. Nicht eine vergessene
Farbe in der Aufzählung, sondern die Form des Musters: dieselbe Fehlerklasse wie
das fehlende Suffix.

Im Bestand standen 27 Fundstellen. Bewertet wurde jede einzeln, mit drei
Ausgängen:

| Fall                                         | Antwort                             | Beispiel                                       |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Helle Fläche (Codeblock, Logo-Platte, Karte) | `bg-base-100`                       | Lizenztext auf `/about`, DMM-Platte auf `/map` |
| Dunkle Vollton-Fläche (helles Logo darauf)   | `bg-neutral`/`text-neutral-content` | Auth0-Panel auf `/about` (Logo ist `#FFFEFA`)  |
| Schleier über fremdem Inhalt                 | `bg-scrim/<n>`/`text-on-scrim`      | Modal-Backdrops, Foto- und Video-Overlays      |

Der dritte Fall war der Grund, warum die Lücke plausibel aussah: Für „dunkle
etwas anderes" gab es wirklich kein Token. Statt daraus eine Ausnahme in der
Regel zu machen — über die Klassenliste allein ohnehin nicht entscheidbar, weil
der Scan nicht sieht, was unter einem Element liegt — hat das Theme jetzt eines
(`--scrim-surface` in `src/css/tokens.css`). Die Regel bleibt damit ausnahmslos.

**Echte Fehler steckten darunter.** Der auffälligste: In `MediaThumbnail.svelte`
lag ein `bg-black/20` nicht über einem Foto, sondern über `bg-base-200`. Das
weiße Icon darauf erreichte 2,27:1 und verfehlte WCAG 1.4.11 (3:1). Steht jetzt
auf `/60` (7,34:1).

Der erste Anlauf hat daraus die falsche Regel abgeleitet — „bei bekanntem
Untergrund ist der Kontrast ausrechenbar, über fremdem Inhalt nicht". Das stimmt
für den _tatsächlichen_ Kontrast, aber nicht für den **schlechtesten Fall**: Ein
Foto, das an der Stelle des Icons reinweiß ist, ist genauso ausrechenbar. Weiß
auf `/40` über Weiß sind 2,85:1, auf `/30` sogar 2,11:1 — drei weitere Overlays
(Foto- und Artfoto-Lupe, Upload-Spinner) lagen damit ebenfalls unter 3:1. Alle
Schleier, die selbst einen Vordergrund tragen, stehen jetzt auf `/60` (5,74:1
über Weiß); reine Backdrops ohne eigenen Vordergrund bleiben leichter. Die
Untergrenze steht als Regel in `.claude/rules/design-system.md`.

Die Reihenfolge war dabei nicht beliebig: Erst die 27 Fundstellen bewerten, dann
die Regel schärfen. Andersherum wäre der Scan über mehrere Routen rot gewesen,
bevor überhaupt entschieden war, was an jeder Stelle richtig ist — und der
schnellste Weg zurück auf grün wäre das Aufweichen der Regel gewesen.

### Vollabdeckung in CI seit dem 2026-07-30

Der DOM-Scan deckt `/`, `/map`, `/about` sowie `/admin`, `/admin/statistics`,
`/admin/docs` und `/admin/settings` ab — **alle sieben auch in CI**. Der
`e2e`-Job in `ci.yml` fährt dafür einen `postgis/postgis:18-3.6`-Service (dasselbe
Image wie `docker-compose.yml`; PostGIS ist nötig, weil `sichtungen.location` eine
`geometry(point)`-Spalte ist), wendet die committeten Migrationen an und legt über
`npm run db:seed:e2e` 60 Sichtungen an.

Die 60 sind keine runde Zahl, sondern drei Schwellen: > 50 (`defaultPageSize`) für
eine **bedienbare** Paginierung, > 1 Zeile für die Zebra-Streifen, ≥ 2 Kalenderjahre
für die Spalte „Entwicklung" der Jahrestrend-Tabelle. Der Seed ist über
`kommentar_intern = 'e2e-seed'` idempotent und mit `npm run db:seed:e2e:purge`
wieder entfernbar — die lokale Datenbank ist laut `docs/WORKTREES.md` über alle
Worktrees geteilt.

**Vorher war die Aufteilung die schlechtestmögliche:** Übersprungen wurden genau
die zwei datenreichen Seiten — Datentabelle, Statusbadges, `stat-value`,
Paginierung. Dass die vier übrigen Routen sauber sind, sagte darüber nichts.
Nebeneffekt: rund 50 s Wartezeit im Smoke-Shard, weil die DB-Verbindungen in
Timeouts liefen.

**Der Skip-Pfad steht noch, aber nur lokal.** Wer ohne `npm run db:start` fährt,
bekommt für die vier DB-Routen einen sichtbaren Skip. **In CI ist derselbe Fall ein
harter Fehler** (`if (process.env.CI) throw`): Ein übersprungener Test in CI ist
kein Test.

**Drei Wächter gegen „vakuum-grün".** Eine leere Tabelle liefert ein DOM ohne eine
einzige verbotene Kombination — der Scan wäre grün, ohne die Seite gesehen zu
haben, genau wie bei einem Auth0-Redirect oder einer 403-Seite. Deshalb:

| Wächter                   | Fehlerfall, den er abfängt                                   |
| ------------------------- | ------------------------------------------------------------ |
| Umleitung ≠ eigene Origin | Session-Zeile fehlt oder Cookie-Name passt nicht              |
| Status 401/403            | Cookie gilt, aber `roles` reicht nicht für `requireUserRole` |
| `renders`-Sonden          | Seite antwortet 200 und rendert trotzdem nichts              |

Die Sonden prüfen Mindestzahlen, nicht bloß Status < 500: ≥ 10 Tabellenzeilen und
ein **bedienbares** „Nächste Seite" auf `/admin`; ≥ 5 `stat-value`, ≥ 2 Jahreszeilen
und ≥ 2 Zeilen Artenverteilung auf `/admin/statistics`. Nachgestellt: Ruft man
`/admin` mit einem Filter ohne Treffer auf, sind alle drei Klassen-Scans grün und
nur die Sonde rot.

Die Session legt `e2e/helpers/adminSession.ts` selbst an — als Zeile in `sessions`,
ohne Auth0. Die Begründung steht dort ausführlich; kurz: Auth0 erklärt die
Universal-Login-Routen als nicht für Automation gedacht, und ein ROPG-Token
konsumiert diese App nirgends. Seit dem Session-Store (#635) setzt der Weg
Schreibzugriff auf die Datenbank voraus und taugt deshalb nicht mehr als
Angriffspfad gegen Produktion.

Die dritte Gruppe hängt an einer Eigenschaft der Seite, die man ihr nicht
ansieht: Sie ist Schaufenster **und** Lieferbedingung. Tailwind erzeugt eine
Utility nur, wenn ihr Klassenname als vollständiger String im Quelltext steht —
sieben der dreizehn eigenen Utilities haben ihre einzige Aufrufstelle hier. Wer
ein Farbfeld löscht, weil es „nur Demo" ist, entfernt damit still die Klasse aus
dem ausgelieferten CSS; die Verwendungen im Rest der App bleiben stehen und
wirken nicht mehr. Der Test liest die Tokens aus `src/css/tokens.css` und
verlangt für jeden ein Element mit der zugehörigen Klasse — er schlägt in beide
Richtungen fehl, bei einem Token ohne Vertreter ebenso wie bei einem entfernten
Vertreter. Die Kontrast-Gruppe allein fängt das nicht: Sie misst, was auf der
Seite steht, und meldet bei einer Teilmenge weiter grün.

---

## Neue Komponente — Ablauf

1. Prüfen, ob ein bestehendes Muster passt (`/styleguide` ansehen).
2. Nur Tokens verwenden: keine Hex-Werte, keine Tailwind-Paletten-Farben,
   keine freien Größen für Text, Abstand, Schatten, Z-Index, Dauer.
3. Statusfarben: Fläche oder `-strong` — nie vertauschen.
4. Touch-Ziele ≥ `--target-min`, Abstand ≥ `--target-gap`.
5. Auf `/styleguide` eintragen, mit allen Zuständen (Ruhe, Fokus, Fehler,
   Laden, deaktiviert, leer).
6. Formularfeld? Dann im Yup-Schema definieren **und** in `formStepsConfig`
   dem richtigen Schritt zuordnen.
7. `npm run test:quick` und die beiden Playwright-Specs grün.

---

## Admin-Muster

Bestandsaufnahme vom 2026-07-29 über `src/routes/admin/**` und
`src/lib/components/admin/**` (16 Svelte-Dateien, 33 Dateien insgesamt).
**Reines Inventar — hier wurde kein Komponentencode geändert.** Es beantwortet
drei Fragen: welche Muster der Admin-Bereich hat und das Meldeformular nicht,
welche Zustände fehlen, und wo das Theme verletzt wird.

### 1. Wiederkehrende Muster

| Muster                   | Wo                                                                                                                                                                                            | Varianten | Kanonisch sollte sein                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------- |
| Datentabelle             | `src/routes/admin/+page.svelte:722`, `src/lib/components/admin/AdminSightingView.svelte` (9×), `src/routes/admin/statistics/+page.svelte:289`, `src/lib/components/admin/DataTableRow.svelte` | **4**     | Zwei Komponenten: `DataTable` (Liste) und `DataTableRow` (Schlüssel/Wert) |
| Filter + Sortierung      | `src/routes/admin/+page.svelte` (URL-Parameter, `sortableTh`-Snippet)                                                                                                                         | 1         | bleibt — aber ohne Bezug zum `FilterPanel` der Karte                      |
| Detail- gegen Edit-Sicht | `src/lib/components/admin/AdminSightingView.svelte` / `src/lib/components/admin/AdminSightingEditForm.svelte`                                                                                 | 2         | bleibt getrennt (siehe unten)                                             |
| Dialog                   | `src/lib/components/admin/ExportModal.svelte`, Spam-Check in `src/routes/admin/+page.svelte:1011`, `src/lib/components/ui/Dialog/DeleteDialog.svelte`                                         | **3**     | `DeleteDialog`s Grundgerüst als `Modal` verallgemeinern                   |
| Statusbadge              | `src/lib/components/admin/BooleanStatus.svelte` + 5 handgebaute Stellen                                                                                                                       | **6**     | `BooleanStatus` erweitern statt `badge-*` an der Aufrufstelle             |
| Paginierung              | `src/routes/admin/+page.svelte:945`                                                                                                                                                           | 1         | bleibt — einzige Aufrufstelle                                             |
| Spalten-Sichtbarkeit     | `src/routes/admin/+page.svelte:440`                                                                                                                                                           | 1         | admin-spezifisch, kein Formular-Gegenstück                                |

**Zwei Korrekturen an der erwarteten Liste:**

- **Massenaktionen gibt es nicht.** Die Checkboxen in `src/routes/admin/+page.svelte:459`
  steuern ausschließlich die Spalten-Sichtbarkeit, keine Zeilenauswahl. Es gibt
  keinen Weg, mehrere Sichtungen gemeinsam zu prüfen, freizugeben oder zu
  löschen — jede Aktion läuft einzeln über ihre Zeile.
- **Das Export-Modal ist kein eigenes Muster, sondern eine von drei
  Dialog-Umsetzungen.** Alle drei bauen `<dialog class="modal">` samt
  `showModal()`/`close()`-Synchronisation per `$effect` selbst nach.

**Dafür ein achtes Muster, das in der Liste fehlte: Datentabelle in zwei
Gestalten.** `src/routes/admin/+page.svelte` rendert dieselben Daten zweimal — als
Kartenliste (Zeile 599, `md:hidden`) und als Tabelle (Zeile 722,
`hidden md:block`). Beide Schleifen sind getrennt gepflegt; die Spalten-
Sichtbarkeit wirkt nur auf die Tabelle.

**Ein Bruch des Breakpoint-Vertrags dabei:** Der Seitenkopf schaltet bei `sm`
(640px, Zeile 385), die Datenliste bei `md` (768px, Zeile 599). Zwischen 640
und 768px zeigt der Kopf also das Desktop-Layout, während darunter noch Karten
stehen. Laut Abschnitt „Breakpoints" ist `sm` keine Layout-Grenze.

**Warum Detail und Edit getrennt bleiben sollten:** `AdminSightingEditForm`
setzt auf denselben Schema-getriebenen Feld-Pipeline wie das öffentliche
Formular (`Location`, `DateTime`, `AnimalInfo`, … aus
`report/components/sections/`). `AdminSightingView` ist eine reine
Schlüssel/Wert-Darstellung über `DataTableRow`. Das sind zwei verschiedene
Aufgaben, keine zwei Varianten derselben.

### 2. Fehlende Zustände

Dieselbe Matrix wie im Meldeformular:

| Zustand        | Stand im Admin-Bereich                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **leer**       | **Fehlt vollständig.** Beide `{#each sightings}` (Zeile 600 und 782) haben keinen `{:else}`-Zweig.                                  |
| **lädt**       | Nur in `src/lib/components/admin/AdminSightingView.svelte:346` (`loading`-Prop). Liste, Statistiken und Einstellungen haben keinen. |
| **teilweise**  | Fehlt vollständig.                                                                                                                  |
| fehlgeschlagen | Nur als Toast (`src/routes/admin/+page.svelte`: Löschen, Prüfstatus, Test-Mail) plus ein `alert-error` in `admin/[id]`.             |
| **offline**    | Fehlt vollständig.                                                                                                                  |

**Der wahrscheinlichste Fall ist auch der ungedeckte:** Ein Filter ohne Treffer
zeigt eine Tabelle mit Kopfzeile und leerem Körper — ohne Aussage, ob gefiltert
wurde, ob noch geladen wird oder ob die Datenbank leer ist. Dieselbe Lücke, die
die Karte hatte, bevor `SightingsMapView` einen Leer-Zustand bekam.

**Fehlschläge als Toast sind das Muster, von dem sich das Formular gerade
gelöst hat.** Löschen, Prüfstatus-Wechsel und Test-Mail melden ihren Fehler in
einer Einblendung, die nach fünf Sekunden weg ist und die Wiederholung nicht
trägt. `StatusBlock` deckt `loading`, `empty`, `partial`, `failed` und
`offline` bereits ab und ist ohne Anpassung verwendbar.

### 3. Theme-Verstöße

Vollständiger Scan über beide Verzeichnisse (nicht nur eine Teilmenge):

| Prüfung                                  | Treffer | Bewertung                             |
| ---------------------------------------- | ------- | ------------------------------------- |
| Tailwind-Paletten-Klassen                | **0**   | sauber (Ergebnis des Randbereiche-PR) |
| Hex-Werte                                | **0**   | sauber                                |
| Statusfarbe als Textfarbe ohne `-strong` | **0**   | siehe Korrektur unten                 |
| Deckkraft unter `/60` auf Text           | **0**   | siehe Korrektur unten                 |
| `btn-xs` / `badge-xs` ohne `min-h-11`    | 12      | **kein Verstoß**, siehe Anmerkung     |

**Anmerkung zu `btn-xs`/`badge-xs`:** Diese Prüfung ist seit dem
Touch-Target-Block in `app.css` gegenstandslos. `.btn:not(.target-exempt)`
steht dort ungelayert und gewinnt gegen Tailwinds `@layer utilities` — im
Browser gemessen liefern `btn btn-xs`, `btn btn-sm` und sogar
`btn btn-sm min-h-10` alle 44px. Umgekehrt heißt das: die zwei verbliebenen
`min-h-11` und die vier `min-h-10` an den Paginierungs-Schaltflächen sind tote
Utilities und können bei Gelegenheit weg — `min-h-10` ist dabei irreführend,
weil es 40px verspricht und nichts bewirkt.

**Korrektur vom 2026-07-29: Die hier ursprünglich gelisteten „32 Statusfarben
als Textfarbe" und „2 `opacity-50` auf Text" existieren nicht.** Beide Zahlen
waren Artefakte des Prüfbefehls, nicht Befunde im Code. Alle 32 Stellen tragen
bereits `-strong`; nachgezählt mit dem korrigierten Befehl unten sind es null.
Der Aufräum-PR 4/4 (#620) hatte den Bestand vollständig erfasst.

**Warum der Befehl falsch zählte** — und das ist der eigentlich merkenswerte
Teil, weil derselbe Fehler in jeder Prüf-Pipeline steckt, die `grep -o`
filtert:

```bash
grep -rnoE '…-(secondary|accent|info|success|warning)…' … | grep -v -- -strong
#      ↑ -o schneidet den Treffer aus der Zeile heraus
```

`-o` gibt nicht die Quellzeile aus, sondern nur den Treffer. Aus
`class="text-warning-strong"` wird damit die Ausgabezeile `text-warning` — das
Suffix, nach dem der zweite `grep` filtern soll, ist zu diesem Zeitpunkt bereits
abgeschnitten. Der Filter konnte also nie greifen, und die Prüfung meldete
zuverlässig jede korrekte Verwendung als Verstoß. Ohne `-o` liefert dieselbe
Kette null Treffer.

Dazu kommt eine zweite Ungenauigkeit: Bei den zwei `opacity-50`-Fundstellen war
die eine (`WeatherDataDisplay.svelte:240`) der **Kommentar**, der die andere
(`:243`) begründet. Und `:243` ist ein dekoratives Leerzustands-Icon ohne
Textinhalt — die `/60`-Untergrenze gilt laut `design-system.md` für Zeichen, die
gelesen werden müssen, hier also zu Recht nicht.

**Ein echter Fund fiel bei der Gegenprüfung an, außerhalb des Admin-Bereichs:**
`text-success/80` in
`src/lib/report/components/form/fields/DropzoneEnhanced.svelte:628` (GPS-Koordinaten
auf `bg-success/10`) — inzwischen auf `text-base-content/70` korrigiert.

**Die Lücke, die ihn verdeckte, ist seit dem 2026-07-30 zu.** Sie war keine
Randnotiz: Die alte Regex verlangte hinter dem Farbnamen Leerzeichen oder
Zeilenende, und ein Deckkraft-Suffix schiebt sich dazwischen. `text-success` misst
auf `base-100` 3,81:1, mit `/80` weniger — eine Statusfarbe mit Deckkraft auf einem
Tint derselben Farbe ist die Fehlerklasse, für die die `*-content`-Regel überhaupt
existiert, nur eine Ebene tiefer.

Alle drei Regeln in `e2e/helpers/bannedClasses.ts` fangen das Suffix jetzt mit.
Statt die Wortgrenzen um ein optionales `/<zahl>` zu erweitern, splittet der Scan
die Klassenliste an Weißraum und prüft jede Klasse gegen ein **verankertes** Muster
(`^text-success(/\d+)?$`). Das ist gleichwertig, hat aber kein
Überlappungsproblem bei zwei Treffern in einer Liste, benennt in der Meldung die
konkrete Klasse — und `-strong`/`-content` fallen durch die Verankerung heraus statt
durch ein nachgeschaltetes `grep -v`, an dem die Liste oben gescheitert ist.

Bei der Deckkraft-Regel wurde dabei aus der Aufzählung `(40|50)` ein
**Schwellenvergleich gegen /60**. Die alte Fassung hätte ein `/30` oder `/25`
genauso durchgelassen wie das `/80`.

**`fill-` und `stroke-` sind seit dem 2026-07-30 mit im Muster.** Die Regel oben
verlangt das `-strong` hinter allen drei Präfixen, das Muster kannte nur `text-`.
Die Lücke stand hier als bekannt notiert, mit der Begründung „im Bestand gibt es
derzeit keine solche Fundstelle" — dasselbe Argument, das `bannedClasses.ts` bei der
Paletten-Regel ausdrücklich verwirft, wo zehn Farbtöne ohne Fundstelle ergänzt
wurden. Eine Regel, die nur die Schreibweisen kennt, die schon jemand benutzt hat,
meldet die erste neue nicht. Erreichbar ist der Fall auch: `Icon.svelte` rendert
`<svg class="…">`, und der Scan liest `class` per `getAttribute` — ein `fill-warning`
an einem Icon landet also im gescannten Bestand und trägt dieselben 2,74:1 wie
`text-warning`, verfehlt damit auch die 3:1 aus WCAG 1.4.11 für grafische Objekte.
Der Scan über die sieben Routen bleibt dabei grün: die einzigen `stroke-`-Klassen im
Bestand sind zwei `stroke-current`, und die enthalten keinen Farbnamen.

Was die Regeln weiterhin **nicht** sehen: `hover:`-Varianten — der Scan liest den
Ruhezustand.

**Beim Aufräumen einer Fundstelle gilt:** Erst prüfen, ob die Farbe dort Bedeutung
trägt. Ein dekoratives Icon oder ein Zierelement gehört auf `base-content/70` —
nicht mechanisch auf `-strong`. So wurden die vier Trennpunkte in der Danksagung
auf `/about` behandelt, die der erweiterte Scan als Erstes gemeldet hat: `opacity-30`
→ `text-base-content/70` **plus** `aria-hidden="true"`, weil Screenreader dort
bisher „Svelte Team Bullet Tailwind Labs Bullet …" vorlasen.

### Reproduktion

Verbindlich sind die Regeln in `e2e/helpers/bannedClasses.ts` — die `grep`-Befehle
unten sind der schnelle Blick von Hand, nicht die Prüfung.

```bash
# Statusfarbe als Vordergrund ohne -strong.
# Ohne -o, sonst filtert der zweite grep gegen einen abgeschnittenen Treffer.
grep -rnE '\b(text|fill|stroke)-(secondary|accent|info|success|warning)(/[0-9]+)?\b' \
  src/routes/admin src/lib/components/admin | grep -v -- '-strong'

# Mit -o und deshalb ohne nachgeschalteten Filter: die optionale Endung
# gehört ins Muster, damit sie im Treffer sichtbar bleibt.
grep -rnoE '\b(text|fill|stroke)-(secondary|accent|info|success|warning)(/[0-9]+)?(-strong|-content)?' \
  src/routes/admin src/lib/components/admin | grep -vE '(-strong|-content)$'

# Deckkraft unter /60 auf Text — jeder Wert darunter, nicht nur 40 und 50.
# Treffer einzeln ansehen: dekorative Flächen und Icons ohne Textinhalt sind
# zulässig (die /60-Untergrenze gilt für Zeichen, die gelesen werden müssen).
grep -rnE '\btext-base-content/([1-5]?[0-9])\b|\bopacity-([1-5]?[0-9])\b' \
  src/routes/admin src/lib/components/admin
```
