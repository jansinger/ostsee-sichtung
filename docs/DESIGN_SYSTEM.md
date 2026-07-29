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
| `primary`   | `#004062`       | 11,00 ✅    | `text-primary` genügt         | 9,22 ✅      | 7,66 ✅      |
| `info`      | `#007daa`       | 4,65 ✅     | `#00648f`                     | 5,48 ✅      | 4,53 ✅      |
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
`text-info-strong` mit 4,53 der knappste Vordergrundwert.

**Regel:** `text-`, `fill-`, `stroke-` → immer `-strong`. `bg-`, `btn-`,
`badge-`, `alert-` → nie `-strong`.

**Grenze:** Alle `-strong`-Varianten liegen auf `base-300` bei ~3,77:1. Sie
gehören nur auf `base-100` und `base-200` — dieselbe Regel, die für
`text-error` schon galt.

### Deckkraft von `base-content`

| Token         | Stufe | base-100 | base-200 | base-300 | Verwendung                      |
| ------------- | ----- | -------- | -------- | -------- | ------------------------------- |
| `--fg-strong` | 100 % | 16,53 ✅ | 13,72 ✅ | 11,3 ✅  | Fließtext                       |
| `--fg-muted`  | 70 %  | 6,96 ✅  | 6,35 ✅  | 5,72 ✅  | Sekundärtext, Hilfetext         |
| `--fg-subtle` | 60 %  | 4,94 ✅  | 4,62 ✅  | 4,27 ❌  | Untergrenze, nicht auf base-300 |

`/50` (3,39) und `/40` (2,55) sind **dekorativ**. Nie für Zeichen, die gelesen
werden müssen.

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
npm run test:quick                              # Lint, Types, svelte-check, Unit
npx playwright test e2e/design-tokens.spec.ts   # Token-Kontraste + DOM-Scan
npx playwright test e2e/form-a11y.spec.ts       # Fokus, Alerts, error-Buttons
```

`design-tokens.spec.ts` prüft zweierlei: die Token-Kontraste gegen
`/styleguide` (dort steht jede Kombination genau einmal) und die App gegen
verbotene Kombinationen (Statusfarbe als Vordergrund, Deckkraft unter /60,
Tailwind-Paletten-Klassen). Gemessen wird im Browser, weil `oklch()` und
`color-mix(in oklab, …)` erst nach dem Gamut-Mapping nach sRGB als
Kontrastwert lesbar sind.

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
