---
paths:
  - '**/*.svelte'
  - 'src/app.css'
  - 'src/css/**'
---

# DaisyUI v5 & Theme `meeresmuseum`

Styling-Basis: **DaisyUI v5** auf **Tailwind CSS v4**. Das gesamte Theme ist in
`src/app.css` definiert.

---

## Tailwind 4 — CSS-first, keine JS-Config

DaisyUI wird über CSS eingebunden, **nicht** über ein Plugin-Array in
`tailwind.config.js`:

```css
@import 'tailwindcss';

@plugin 'daisyui';
@plugin 'daisyui/theme' {
	name: 'meeresmuseum';
	/* … */
}
```

Anleitungen, die `plugins: [require('daisyui')]` oder eine `daisyui: { themes: [...] }`
-Sektion in `tailwind.config.js` zeigen, beziehen sich auf DaisyUI v4.
**`src/app.css` ist die alleinige Source of Truth** für DaisyUI und das Theme.

> **Es gibt bewusst keine `tailwind.config.js` mehr.**
> Die Datei war ein Rest aus der DaisyUI-v4-Zeit und wurde entfernt, nachdem
> nachgewiesen war, dass sie wirkungslos ist: Unter Tailwind 4 wird eine JS-Config
> nur noch über eine `@config`-Direktive geladen — die gibt es hier nicht, und
> auch `vite.config*.ts`, `svelte.config.js` und `.prettierrc` referenzieren sie
> nicht. Der Produktions-Build liefert vor und nach dem Löschen **byte-identisches
> CSS** (alle 17 Assets, gleiche Content-Hashes).
>
> Keine neue `tailwind.config.js` anlegen. Theme, Plugins und Utilities gehören
> nach `src/app.css`.

### Content-Detection läuft automatisch — kein `@source` nötig

Tailwind 4 scannt das Projekt selbstständig und überspringt dabei nur
`node_modules`, Binärdateien, CSS und alles, was in `.gitignore` steht. Da unter
`src/` nichts ignoriert wird, greift die Erkennung für **alle** Svelte- und
TS-Dateien inklusive `src/lib/` zuverlässig.

Explizite `@source`-Direktiven werden deshalb **nicht** gebraucht — und sollten
auch nicht „vorsorglich" ergänzt werden. Relevant wären sie nur, um eine
Tailwind-nutzende Abhängigkeit aus `node_modules` nachzuziehen oder um Klassen zu
safelisten, die nirgends als vollständiger String im Code stehen.

Praktische Konsequenz: Klassennamen müssen **vollständig im Quelltext** stehen.
`class={`btn-${variant}`}` wird nicht erkannt — stattdessen die kompletten Namen
in ein Mapping schreiben.

---

## Semantische Farbtokens — Pflicht

Immer die DaisyUI-Tokens verwenden, **nie** Farben aus der Tailwind-Palette:

```svelte
<!-- RICHTIG -->
<button class="btn btn-primary">Melden</button>
<div class="bg-base-200 text-base-content">…</div>

<!-- FALSCH — umgeht das Theme -->
<button class="rounded bg-blue-700 text-white">Melden</button>
```

Verfügbar: `primary`, `secondary`, `accent`, `neutral`, `base-100/200/300`,
`info`, `success`, `warning`, `error` — jeweils mit passendem `*-content` für Text
**auf** dieser Farbe.

---

## Kontraste sind handgeprüft — nicht beiläufig ändern

Die Farbwerte stehen in `oklch()` und wurden gezielt auf **WCAG 2.1 AA** eingestellt;
die betroffenen Zeilen in `app.css` sind entsprechend kommentiert (z. B.
`--color-primary` als „WCAG AA mit weißem Text", `--color-base-content` mit
„>4.5:1 auf base-100").

Wer einen Farbwert ändert, muss den Kontrast neu prüfen. Ein „etwas helleres Blau"
kann die Barrierefreiheit brechen.

---

## Nur ein helles Theme

Das Theme ist mit `color-scheme: light`, `default: true` und `prefersdark: false`
konfiguriert — es gibt **kein** Dark Theme.

`dark:`-Varianten oder `data-theme`-Umschaltung deshalb nicht einbauen; sie sind
tote Klassen.

---

## Vorhandene Overrides respektieren

`app.css` korrigiert einige DaisyUI-Defaults bewusst. Diese Stellen nicht in
Komponenten gegen-patchen:

| Override                                 | Warum                                                             |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Alerts auf Soft-Style (`color-mix` 12 %) | DaisyUI-v5-Default-Alerts sind auf diesem Theme zu dunkel         |
| `.input/.select/.textarea:focus`         | 3px-Outline in `primary` als deutlicher Focus-Indikator (WCAG)    |
| Formularfelder ≥ `1rem`                  | WCAG AA und verhindert Auto-Zoom auf iOS                          |
| `prefers-reduced-motion`                 | global entschärft — eigene Animationen brauchen keine Extra-Guard |

Ein `alert-soft` zusätzlich zu setzen ist überflüssig; die Klassen `alert-info`,
`alert-success`, `alert-warning`, `alert-error` liefern den Soft-Look bereits.

> **Zum Alert-Override:** DaisyUI 5 kennt `alert-soft` nur als Modifier-Klasse pro
> Element. Einen offiziellen Weg, den Soft-Look global zum Default zu machen — etwa
> eine Theme-Variable oder Plugin-Option — gibt es bis einschließlich **5.7.4**
> nicht. Der `color-mix`-Override in `app.css` bleibt daher die richtige Lösung und
> ist kein Workaround, den man bei einem Update „endlich aufräumen" könnte. Erst
> wenn DaisyUI eine solche Option nachliefert, lohnt ein erneuter Blick.

---

## Layout-Variablen

Radien und Größen kommen aus dem Theme, nicht aus Utility-Klassen:
`--radius-selector` (Checkbox/Radio/Toggle), `--radius-field` (Input/Select/Textarea),
`--radius-box` (Card/Alert/Modal), dazu `--border` und `--depth`.

Für konsistentes Aussehen die DaisyUI-Komponentenklassen (`card`, `input`, `alert`,
`fieldset`) nutzen — sie greifen automatisch darauf zu.

---

## iframe-Einbettung

Die App wird auf **meeresmuseum.de** in einem iframe eingebettet. Die Klasse
`.iframe-mode` blendet Navbar und Footer aus und verdichtet die Abstände.

Neue Seiten-Level-Elemente (Header, Navigation, Footer) müssen prüfen, ob sie im
iframe-Modus ausgeblendet oder angepasst gehören — sonst erscheinen sie doppelt
im eingebetteten Kontext.

---

## Dokumentation nachschlagen

Für DaisyUI-Komponenten **Context7** verwenden (`/saadeghi/daisyui`, versioniert
bis v5.x). Der GitMCP-Server zum DaisyUI-Repo liefert keine Komponenten-Doku — die
offizielle Doku liegt auf daisyui.com, nicht im Repository.
