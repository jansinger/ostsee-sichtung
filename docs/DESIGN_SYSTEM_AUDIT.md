# Design System Audit: DaisyUI v5 Theme

**Datum:** 2026-04-12
**DaisyUI Version:** 5.5.18/19
**Tailwind CSS:** v4

---

## 1. Theme-Variablen: Soll vs. Ist

### DaisyUI v5 Light Theme (Referenz)

| Variable                    | DaisyUI v5 Light       | Unser `meeresmuseum`           | Status               |
| --------------------------- | ---------------------- | ------------------------------ | -------------------- |
| `--color-primary`           | `oklch(45% 0.24 277)`  | `oklch(0.35 0.089 235.3)`      | ✅ Angepasst         |
| `--color-primary-content`   | `oklch(93% 0.034 272)` | `oklch(1 0 0)`                 | ✅ Weiß              |
| `--color-secondary`         | `oklch(65% 0.241 354)` | `oklch(0.65 0.04 215.2)`       | ✅ Angepasst         |
| `--color-secondary-content` | `oklch(94% 0.028 342)` | `oklch(1 0 0)`                 | ✅ Weiß              |
| `--color-accent`            | `oklch(77% 0.152 181)` | `oklch(0.8 0.047 215)`         | ✅ Angepasst         |
| `--color-accent-content`    | `oklch(38% 0.063 188)` | `oklch(0.25 0.089 235.3)`      | ✅ Dunkel            |
| `--color-neutral`           | `oklch(14% 0.005 285)` | `oklch(0.37 0.016 251.8)`      | ✅ Angepasst         |
| `--color-neutral-content`   | `oklch(92% 0.004 286)` | `oklch(1 0 0)`                 | ✅ Weiß              |
| `--color-base-100`          | `oklch(100% 0 0)`      | `oklch(0.9403 0.0104 247.9)`   | ✅ Bläulich          |
| `--color-base-200`          | `oklch(98% 0 0)`       | `oklch(0.88 0.012 247.9)`      | ✅ Angepasst         |
| `--color-base-300`          | `oklch(95% 0 0)`       | `oklch(0.82 0.015 247.9)`      | ✅ Angepasst         |
| `--color-base-content`      | `oklch(21% 0.006 285)` | `oklch(0.15 0.022 251.8)`      | ✅ Dunkler           |
| `--color-info`              | `oklch(74% 0.16 232)`  | `oklch(0.55 0.12 230)`         | ✅ Dunkler           |
| `--color-info-content`      | `oklch(29% 0.066 243)` | `oklch(1 0 0)`                 | ⚠️ Weiß statt Dunkel |
| `--color-success`           | `oklch(76% 0.177 163)` | `oklch(0.55 0.16 145)`         | ✅ Dunkler           |
| `--color-success-content`   | `oklch(37% 0.077 168)` | `oklch(1 0 0)`                 | ⚠️ Weiß statt Dunkel |
| `--color-warning`           | `oklch(82% 0.189 84)`  | `oklch(0.65 0.16 85)`          | ✅ Dunkler           |
| `--color-warning-content`   | `oklch(41% 0.112 45)`  | `oklch(1 0 0)`                 | ⚠️ Weiß statt Dunkel |
| `--color-error`             | `oklch(71% 0.194 13)`  | `oklch(0.55 0.18 25)`          | ✅ Dunkler           |
| `--color-error-content`     | `oklch(27% 0.105 12)`  | `oklch(1 0 0)`                 | ⚠️ Weiß statt Dunkel |
| `--radius-selector`         | `0.5rem`               | ❌ FEHLT                       | 🔴 Fehlt             |
| `--radius-field`            | `0.25rem`              | ❌ FEHLT                       | 🔴 Fehlt             |
| `--radius-box`              | `0.5rem`               | `0.5rem` (als `--rounded-box`) | ⚠️ Falscher Name     |
| `--size-selector`           | `0.25rem`              | ❌ FEHLT                       | 🔴 Fehlt             |
| `--size-field`              | `0.25rem`              | ❌ FEHLT                       | 🔴 Fehlt             |
| `--border`                  | `1px`                  | ❌ FEHLT (nur `--border-btn`)  | 🔴 Fehlt             |
| `--depth`                   | `1`                    | ❌ FEHLT                       | 🔴 Fehlt             |
| `--noise`                   | `0`                    | ❌ FEHLT                       | 🔴 Fehlt             |

### Überflüssige v4-Variablen im Theme (nicht mehr gültig in v5)

| Variable                  | Status                                              |
| ------------------------- | --------------------------------------------------- |
| `--rounded-box: 0.5rem`   | ⚠️ v4 — v5 nutzt `--radius-box`                     |
| `--rounded-btn: 0.375rem` | ⚠️ v4 — v5 hat keine separate btn-radius Variable   |
| `--rounded-badge: 1rem`   | ⚠️ v4 — v5 hat keine separate badge-radius Variable |
| `--animation-btn: 0.25s`  | ⚠️ v4 — v5 hat keine animation Variablen            |
| `--animation-input: 0.2s` | ⚠️ v4 — v5 hat keine animation Variablen            |
| `--btn-focus-scale: 0.98` | ⚠️ v4 — v5 hat keine focus-scale Variable           |
| `--border-btn: 1px`       | ⚠️ v4 — v5 nutzt globales `--border`                |
| `--tab-border: 1px`       | ⚠️ v4 — v5 hat keine tab-border Variable            |

---

## 2. Legacy CSS-Variablen im Code

### `--b1`, `--b2`, `--b3`, `--p` (DaisyUI v4 Shorthand)

Diese Variablen existieren in DaisyUI v5 NICHT mehr. Sie werden nicht gesetzt und sind daher `undefined`:

| Datei          | Zeile | Code                        | Problem                                                       |
| -------------- | ----- | --------------------------- | ------------------------------------------------------------- |
| `app.css`      | 74    | `oklch(var(--base-100))`    | ❌ `--base-100` existiert nicht, v5 nutzt `--color-base-100`  |
| `app.css`      | 183   | `hsl(var(--neutral) / 0.1)` | ❌ `--neutral` existiert nicht, doppelt falsch: hsl + v4-Name |
| `app.css`      | 271   | `oklch(var(--b1))`          | ❌ `--b1` existiert nicht in v5                               |
| `app.css`      | 276   | `oklch(var(--b3))`          | ❌ `--b3` existiert nicht in v5                               |
| `app.css`      | 281   | `oklch(var(--b3) / 0.8)`    | ❌ `--b3` existiert nicht in v5                               |
| `app.css`      | 295   | `rgba(0, 0, 0, 0.1)`        | ⚠️ Hardcodiert, nicht theme-aware                             |
| `app.css`      | 300   | `hsl(var(--p))`             | ❌ `--p` existiert nicht, hsl falsch                          |
| Diverse Svelte | -     | `oklch(var(--b3))`          | ❌ In 10+ Dateien                                             |
| Diverse Svelte | -     | `oklch(var(--p))`           | ❌ In 2 Dateien                                               |
| Diverse Svelte | -     | `oklch(var(--b2))`          | ❌ In 1 Datei                                                 |

### Erklärung

DaisyUI v4 definierte Shorthand-Variablen wie `--b1`, `--b2`, `--b3`, `--p`, `--s` als oklch-Werte.
DaisyUI v5 hat diese vollständig durch `--color-base-100`, `--color-primary` etc. ersetzt.

**Warum funktioniert es trotzdem?** Vermutlich hat Tailwind CSS v4 oder ein anderer Mechanismus Fallback-Werte, oder die Styles fallen auf Browser-Defaults zurück (transparent/schwarz). Die betroffenen Stellen sind hauptsächlich `box-shadow` und Scrollbar-Styling — visuell subtil genug, dass der Fehler nicht sofort auffällt.

---

## 3. Status-Farben: Content-Color Problem

### Das Problem

DaisyUI v5 definiert `--color-info-content` als die Textfarbe **auf** dem Info-Hintergrund.

- **DaisyUI Light Theme**: `--color-info-content: oklch(29% ...)` (dunkel) — für Text auf hellem Info-Button
- **Unser Theme**: `--color-info-content: oklch(1 0 0)` (weiß) — für Text auf dunklem Info-Button

**Wo das zum Problem wird:**
Alerts nutzen `color: var(--color-info-content)` für den Text. Unser Alert-Override setzt `color: var(--alert-color)` statt `color-content`, was dieses Problem umgeht. **Aber:** Wenn jemand `alert-soft` oder `alert-outline` explizit nutzt, werden DaisyUI's native Alert-Styles aktiv — und dann wird der Text weiß auf hellem Hintergrund.

### Auswirkung

- `btn-info`, `btn-success`, `btn-error`, `btn-warning` → ✅ Weiß auf dunkel, korrekt
- `alert-info` etc. (mit unserem Override) → ✅ Dunkel auf hell, korrekt
- `badge-info`, `badge-success` etc. → ⚠️ Weiß auf dunkel (Badge-BG = base color)
- `text-info`, `text-success` etc. → ✅ Nutzt base color als Textfarbe, nicht content

---

## 4. Alert-Override: Spezifitäts-Analyse

```css
/* Unser Override (unlayered) */
.alert-info {
	color: var(--alert-color, ...);
	background: color-mix(...);
}

/* DaisyUI (layered) */
.alert-info {
	@layer daisyui.l1.l2 {
		color: var(--color-info-content);
		--alert-color: var(--color-info);
	}
}
```

**Analyse:**

- DaisyUI v5 Alerts sind in `@layer daisyui.l1.l2`
- Unsere Overrides sind **unlayered** (author styles)
- CSS-Spezifikation: Unlayered Styles schlagen immer gelayerte Styles
- **Ergebnis:** Unser Override gewinnt ✅

**Aber:** DaisyUI setzt `--alert-color` in seinem Layer. Unsere unlayered Rule liest `var(--alert-color)`. **Die Frage:** Setzt DaisyUI die CSS Custom Property bevor unsere Regel sie liest?

**Antwort:** Ja. CSS Custom Properties werden per Cascade aufgelöst — DaisyUI setzt `--alert-color: var(--color-info)` auf `.alert-info`, und unsere Rule auf `.alert-info` liest sie. Custom Properties unterliegen nicht dem Layer-System für ihre Vererbung, nur für die Property-Zuweisungen selbst. Da `--alert-color` von DaisyUI als Custom Property gesetzt wird (nicht als Standard-Property), und unsere Rule sie nur **liest**, funktioniert es korrekt.

---

## 5. Hardcodierte Farben in Komponenten (außerhalb Formular-Scope)

| Datei                               | Problem                                   |
| ----------------------------------- | ----------------------------------------- |
| `about/+page.svelte:174`            | `rgb(0, 60, 100)` hardcodiert             |
| `MediaThumbnail.svelte:215`         | `rgba(0,0,0,0.9) !important`              |
| `MediaModal.svelte:321-334`         | `rgb(0 0 0 / 0.1)` für Schatten           |
| `ApiDocumentation.svelte:197-207`   | `#f1f1f1`, `#c1c1c1`, `#a8a8a8` Scrollbar |
| `WeatherDataDisplay.svelte:264-270` | `#3b82f6`, `#10b981` hardcodiert          |
| `LegendPanel.svelte:120-231`        | `#FFD700`, `#FF8C00`, `#DC143C` etc.      |

**Hinweis:** LegendPanel-Farben sind Map-Legenden-Farben, die bewusst theme-unabhängig sind (Kartenfarben). Weather/About/API-Doku-Farben sollten Theme-Variablen nutzen.

---

## 6. Zusammenfassung der Probleme

### 🔴 Kritisch (Theme bricht wenn man es wechselt)

1. **8 fehlende v5 Theme-Variablen**: `--radius-selector`, `--radius-field`, `--size-selector`, `--size-field`, `--border`, `--depth`, `--noise`, `--radius-box` (statt `--rounded-box`)
2. **8 überflüssige v4 Variablen**: `--rounded-box/btn/badge`, `--animation-btn/input`, `--btn-focus-scale`, `--border-btn`, `--tab-border` — werden ignoriert
3. **Legacy CSS-Variablen**: `--b1`, `--b3`, `--p`, `--neutral`, `--base-100` in `app.css` — undefiniert in v5

### ⚠️ Mittel (funktioniert, aber nicht theme-switchable)

4. **Status-Content-Farben alle Weiß**: Wenn jemand ein helles Theme mit hellen Status-Buttons will, bricht das Design
5. **`hsl()` statt `oklch()`** in 2 Stellen der app.css

### 📝 Niedrig (außerhalb des Formular-Scopes)

6. **Hardcodierte Farben** in 6 Komponenten (About, Weather, Media, API-Doku)
