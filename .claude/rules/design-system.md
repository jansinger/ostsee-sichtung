---
paths:
  - 'src/app.css'
  - 'src/lib/components/**'
  - 'src/lib/report/components/**'
  - 'src/routes/**/*.svelte'
---

# Design System

Verbindliche Regeln für UI-Änderungen: Feld-Pipeline, Button-Hierarchie, Barrierefreiheit.

**Theme, Farbtokens und DaisyUI-Overrides stehen in `daisyui.md`** (lädt bei denselben Dateien) — dort gilt: einzige Farbquelle ist `src/app.css`, keine Hex-Werte oder Tailwind-Graustufen, kein Dark-Theme. Diese Regel ergänzt das um die Punkte, an denen das Projekt in der Praxis gescheitert ist.

Begründung und verifizierter Ist-Zustand: `docs/DESIGN_GUIDE.md`.

---

## Die `*-content`-Regel (WCAG-relevant)

`text-primary-content`, `text-warning-content`, `text-info-content` usw. sind **ausschließlich** für Text auf der jeweiligen **Vollton**-Fläche gedacht.

Im Theme sind fast alle `*-content`-Farben reines Weiß (`oklch(1 0 0)`). Auf einem hellen Tint ergibt das rechnerisch rund **1,3:1** — weit unter den geforderten 4,5:1.

```svelte
<!-- ❌ FALSCH: weißer Text auf hellgelbem Tint -->
<div class="bg-warning/10">
	<h4 class="text-warning-content">Zusätzliche Informationen für Totfund</h4>
</div>

<!-- ✅ RICHTIG: Tint trägt normalen Body-Text, Akzent nur am Icon -->
<div class="bg-warning/10 border-warning/20 border">
	<h4 class="text-base-content">
		<Icon icon="lucide:triangle-alert" class="text-warning" aria-hidden="true" />
		Zusätzliche Informationen für Totfund
	</h4>
</div>
```

**Gegenprobe:** `*-content` ist nur dann korrekt, wenn die Elternfläche die volle Farbe ohne Opacity-Suffix trägt — `bg-primary text-primary-content`, `bg-success text-success-content`. Sobald ein `/10`, `/20`, `/5` an der Hintergrundklasse steht, gehört dort `text-base-content` (bzw. `text-base-content/80` für Sekundärtext) hin; die Statusfarbe darf nur Icon, Border oder eine kurze Auszeichnung tragen. Referenz-Implementierung: `src/lib/report/components/sections/DeadAnimal.svelte`.

---

## Statusfarben haben zwei Rollen

Die `*-content`-Regel oben deckt Text **auf** einer Farbe ab. Sie deckt nicht ab, dass die Farbe **selbst** als Vordergrund verwendet wird — und das ist der häufigere Fehler.

Gemessen auf `base-100` (Rechnung wie in `daisyui.md`, im Browser nach sRGB):

| Utility          | Kontrast   | WCAG 1.4.3 |
| ---------------- | ---------- | ---------- |
| `text-primary`   | 9,22:1     | ✅         |
| `text-error`     | 6,04:1     | ✅         |
| `text-info`      | **3,92:1** | ❌         |
| `text-success`   | **3,81:1** | ❌         |
| `text-warning`   | **2,74:1** | ❌         |
| `text-secondary` | **2,68:1** | ❌         |
| `text-accent`    | **1,55:1** | ❌         |

`text-warning` verfehlt mit 2,74:1 sogar die 3:1 aus WCAG 1.4.11 für grafische Objekte — es ist damit auch als **Icon-Farbe** nicht zulässig.

**Regel:** Die Basis-Statusfarbe ist ausschließlich Flächenfarbe. Für Text, Icons und Zahlen gibt es `text-*-strong` (definiert in `src/css/tokens.css`, als Utility nutzbar über den `@theme`-Block in `app.css`).

```svelte
<!-- ❌ FALSCH -->
<h4 class="text-warning">Totfund</h4>
<Icon icon="lucide:triangle-alert" class="text-warning" />
<div class="stat-value text-secondary">1.244</div>

<!-- ✅ RICHTIG -->
<h4 class="text-warning-strong">Totfund</h4>
<Icon icon="lucide:triangle-alert" class="text-warning-strong" />
<div class="stat-value text-secondary-strong">1.244</div>
```

**Gegenprobe:** Steht die Farbe hinter `text-`, `fill-` oder `stroke-`, muss `-strong` dranhängen. Steht sie hinter `bg-`, `btn-`, `badge-` oder `alert-`, darf sie es nicht.

Die über 60 Verstöße des Altbestands sind mit PR 4/4 (#620) abgearbeitet; seither ist die Gruppe „verbotene Kombinationen im DOM" in `e2e/design-tokens.spec.ts` ein **aktiver Guard** und kein `fixme` mehr. Sie fährt `/`, `/map`, `/about` sowie vier Admin-Routen (Session über `e2e/helpers/adminSession.ts`, ohne Auth0 — Begründung dort) — seit dem 2026-07-30 **alle sieben auch in CI**, gegen einen Postgres-Service mit Seed. Eine neue Fundstelle gehört an der Aufrufstelle behoben — nicht durch Aufweichen der Regel.

**Die Regeln stehen in `e2e/helpers/bannedClasses.ts`,** nicht als Regex-Literale im Spec, und sind über `bannedClasses.test.ts` an konstruierten Beispielen abgesichert (läuft in `npm run test:quick`). Der Grund: Ein Scan über einen konformen Bestand belegt nichts über die Regel — genau daran ist die Deckkraft-Lücke unentdeckt geblieben.

**Deckkraft-Suffixe werden mitgefangen** (seit 2026-07-30). `text-success/80` ist ein Verstoß wie `text-success`, und `bg-red-500/50` einer wie `bg-red-500`. Die Deckkraft-Regel vergleicht gegen die Schwelle /60 statt gegen die Literale 40 und 50 — ein `/30` auf Text ist damit ebenfalls ein Verstoß.

**Was der Scan nicht sieht:** `hover:`-Zustände (er liest den Ruhezustand — dafür gilt die Regel „`text-error` nicht auf `base-300`" unten) und `fill-`/`stroke-` (nur `text-` steht im Muster; im Bestand gibt es derzeit keine solche Fundstelle).

**Beim Beheben nicht mechanisch ersetzen:** Erst prüfen, ob die Farbe an der Stelle Bedeutung trägt. Dekorative Icons und Zierelemente gehören auf `base-content/70` — nicht auf eine Statusfarbe mit `-strong`. Trägt ein Zeichen gar keine Bedeutung (Trennpunkt, Zierglyphe), gehört zusätzlich `aria-hidden="true"` daran; Beispiel: die Danksagungs-Trennpunkte in `src/routes/about/+page.svelte`.

Beim Prüfen per `grep` gilt außerdem: **`grep -o` schneidet das `-strong`-Suffix aus der Ausgabezeile**, ein nachgeschaltetes `grep -v -- -strong` filtert dann ins Leere und meldet jede korrekte Verwendung als Verstoß — so entstand die inzwischen korrigierte „32 Fundstellen"-Liste in `docs/DESIGN_SYSTEM.md`. Die Regeln im Scan umgehen das, indem sie die Klassenliste splitten und jede Klasse gegen ein verankertes Muster prüfen.

---

## Bekannte Grenze: `text-error` auf `base-300`

`--color-error` (`oklch(0.48 0.18 25)`, seit #599) ist als Textfarbe **nicht auf jeder
Fläche AA-tauglich**. Gemessen gegen die drei Basisflächen:

| Fläche     | Kontrast   | WCAG 1.4.3 (4,5:1) |
| ---------- | ---------- | ------------------ |
| `base-100` | 6,05:1     | ✅                 |
| `base-200` | 5,01:1     | ✅                 |
| `base-300` | **4,13:1** | ❌                 |

**Es gibt derzeit keine solche Aufrufstelle** — `base-300` dient im Projekt durchgängig
als Rahmen (`border-base-300`) oder Zeilen-Hover (`hover:bg-base-300`), `text-error`
sitzt immer auf `base-100`. Der Fall ist hier dokumentiert, weil er sich versehentlich
leicht herstellen lässt:

```svelte
<!-- ❌ Fehlerfall: im Hover-Zustand nur 4,13:1 -->
<tr class="hover:bg-base-300">
	<td><button class="btn btn-outline btn-error btn-sm min-h-11">Löschen</button></td>
</tr>
```

**Regel:** `text-error` (und die destruktive Button-Variante) nur auf `base-100` oder
`base-200` platzieren. Braucht eine Zeile mit destruktiver Aktion einen Hover, dann
`hover:bg-base-200` verwenden — nicht `base-300`.

Warum das **kein** E2E-Test absichert: Eine Schwellwert-Assertion (`≥ 4,5:1`) wäre heute
rot, und sie grün zu bekommen hieße `--color-error` zu ändern — ein Eingriff ins
Farb-Theme, den dieser hypothetische Fall nicht rechtfertigt. Ein DOM-Scan nach der
Kombination wiederum würde genau den riskanten Fall verfehlen, weil `hover:`-Zustände in
`getComputedStyle` im Ruhezustand nicht auftauchen. Der wirksame Ort für diesen Guard ist
deshalb die Regel hier, nicht `e2e/form-a11y.spec.ts`. Sobald eine echte Aufrufstelle
entsteht, gehört sie mit `measureContrast` (`e2e/helpers/contrast.ts`) gemessen.

**Dieselbe Grenze gilt für alle `-strong`-Varianten** aus dem Abschnitt oben: auf
`base-300` liegen sie bei ~3,77:1. `text-*-strong` gehört deshalb genauso auf
`base-100` oder `base-200` wie `text-error`. `e2e/design-tokens.spec.ts` prüft aus
demselben Grund nur diese beiden Flächen — `base-300` ist hier ein Verbot, kein
Testfall.

---

## Harte Grenze: `--color-info` und `--color-success` dürfen nie heller werden

Beide Flächen liegen konstruktionsbedingt dicht über der Schwelle. Weißer Text darauf ist bereits die **beste** verfügbare Wahl — `base-content` ist dort messbar schlechter:

| Fläche            | weißer Text | `base-content` |
| ----------------- | ----------- | -------------- |
| `--color-info`    | **4,65:1**  | 4,22:1 ❌      |
| `--color-success` | **4,56:1**  | 4,31:1 ❌      |

(Im Production-Build gemessen, sRGB nach Gamut-Mapping.)

Anders als bei `warning` und `secondary` — wo der Wechsel von Weiß auf `base-content` den Kontrast von 3,26 auf 6,05 bzw. von 3,19 auf 6,18 hob — gibt es hier **keine bessere Vordergrundfarbe ohne Farbtonänderung**. Der Puffer über 4,5:1 beträgt 0,15 bzw. 0,06.

**Regel:** Die Lightness von `--status-info-surface` und `--status-success-surface` (`tokens.css`) darf **nicht erhöht** werden. Ein „etwas freundlicheres Grün" oder „helleres Blau" schiebt `*-content` unter AA — und zwar in **jedem** `btn-info`, `badge-info`, `btn-success` und `badge-success` gleichzeitig.

**Wenn der Kontrast-Test in PR 2 unter 4,5:1 misst, ist die Konsequenz, die Lightness um 0,01–0,02 zu senken und neu zu messen — nicht die Schwelle im Test zu senken.** Die Schwelle ist die Anforderung, nicht die Stellschraube. Dasselbe gilt, falls ein Browser-Update das Gamut-Mapping minimal verschiebt.

---

## Deckkraft-Untergrenze für Text ist /60

`base-content` mit Deckkraft, im Browser gemessen (nicht aus den oklch-Werten
gerechnet — die Differenz beträgt hier bis zu 0,08):

| Stufe | base-100    | base-200    | base-300    |
| ----- | ----------- | ----------- | ----------- |
| /80   | 9,82 ✅     | 8,62 ✅     | 7,46 ✅     |
| /70   | 7,04 ✅     | 6,41 ✅     | 5,74 ✅     |
| /60   | 4,94 ✅     | 4,62 ✅     | **4,26 ❌** |
| /50   | **3,54 ❌** | **3,39 ❌** | **3,23 ❌** |
| /40   | **2,64 ❌** | **2,56 ❌** | **2,46 ❌** |

**Regel:** `/60` ist die Untergrenze für Text, und nur auf `base-100` und `base-200`. **Jeder Wert darunter** — `/50`, `/40`, `/30`, … bzw. das entsprechende `opacity-*` — ist ausschließlich für dekorative Flächen und für Zeichen ohne Bedeutung; nie für etwas, das gelesen werden muss. Der Scan prüft das als Schwelle und nicht als Aufzählung (`e2e/helpers/bannedClasses.ts`), damit `/30` nicht durchrutscht wie früher.

Sekundärtext gehört auf `/70`, nicht auf `/60`: Hilfetexte werden im Feld gelesen, bei Sonnenlicht an Deck, und dort ist der reale Kontrast deutlich niedriger als der gemessene.

---

## Typografie hat sechs Rollen

Größen werden nicht mehr pro Komponente gewählt. Die Rolle bestimmt die Größe:

| Rolle     | Größe | Verwendung                   |
| --------- | ----- | ---------------------------- |
| `display` | 32px  | Seitentitel (eine pro Seite) |
| `title`   | 24px  | Schritt-Titel, Panel-Titel   |
| `section` | 18px  | Abschnittstitel in Karten    |
| `body`    | 16px  | Fließtext, Formularfelder    |
| `label`   | 14px  | Feld-Label, Buttons          |
| `support` | 13px  | Hilfetext, Metadaten, Badges |

`text-support` ist bewusst 13px und nicht 12px (`text-xs`): unter Sonnenlicht an Deck ist 12px bei `/60` nicht mehr lesbar.

Dieselbe semantische Ebene darf nicht in zwei Größen erscheinen — heute ist der Abschnittstitel je nach Komponente `text-base`, `text-lg` oder `sm:text-lg`.

---

## Elevation, Z-Index, Motion nur aus Tokens

- **Schatten:** `shadow-raised` (Karten) oder `shadow-floating` (Panels, Modals, Toasts). Kein `shadow-sm`/`-md`/`-lg`/`-xl`/`-2xl`, keine handgeschriebenen `box-shadow` in Komponenten.

**Zwei Zugriffswege, ein Name.** Jeder Token dieser Ebene ist als Utility (`class="text-warning-strong"`) **und** als Variable (`style="box-shadow: var(--shadow-raised)"`) benutzbar. Die beiden Wege entstehen unterschiedlich, und das hat eine Konsequenz:

| Weg        | Woher                           | Gilt für                                                                                                                  |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Utility    | `@theme`-Block in `app.css`     | wird von Tailwind **on demand** erzeugt — nur wenn der Klassenname als vollständiger String im gescannten Quelltext steht |
| `var(--…)` | `:root` in `src/css/tokens.css` | steht immer im ausgelieferten CSS                                                                                         |

Ein Token, das **nur** im `@theme`-Block steht, ist über `var()` nicht erreichbar: Tailwind backt Schatten- und Größenwerte direkt in die Utility und referenziert die Theme-Variable nie, sie landet also nicht im `:root`. Deshalb deklariert `tokens.css` jeden Wert selbst — inklusive der Aliase `--shadow-raised`/`--shadow-floating` auf `--elevation-*`. **Neuer Token heißt: Eintrag in `tokens.css` (für `var()`) UND im `@theme`-Block (für die Utility)** — sonst ist einer der beiden Wege still tot.

- **Z-Index:** `--layer-raised` (10), `--layer-panel` (20), `--layer-nav` (30), `--layer-overlay` (40), `--layer-skip` (50). Keine freien `z-*`-Utilities. Vorher lagen Navbar und Panel-Toggle beide auf `z-50` — welches Element oben lag, entschied damit die DOM-Position.
- **Dauer:**

  | Token               | Wert  | Wofür                        | Kurve           |
  | ------------------- | ----- | ---------------------------- | --------------- |
  | `--motion-instant`  | 120ms | Hover, Fokus                 | `--motion-ease` |
  | `--motion-quick`    | 200ms | Aufklappen, Toast            | `--motion-ease` |
  | `--motion-panel`    | 300ms | Panel, Bottom-Sheet, Overlay | `--motion-ease` |
  | `--motion-emphasis` | 400ms | Überschwung, Federung        | **`linear`**    |

  Die ersten drei beschreiben **Übergänge** und werden mit `--motion-ease` gefahren. `--motion-emphasis` ist keine Übergangsstufe: betonte Bewegungen bringen ihre Kurve über die Keyframe-Stops mit (`bounceIn`: `.3 → 1.05 → .9 → 1`). Eine zusätzliche Easing-Funktion biegt dort **jedes Segment einzeln** und lässt den Überschwung hektisch wirken — deshalb `linear`. Wer eine neue betonte Keyframe anlegt, nimmt diese Stufe und lässt die Kurve in den Stops.

---

## Breakpoint-Vertrag

Zwei Grenzen, mit Zuständigkeit:

- **`md` (768px)** ist die Grenze zwischen kompakt und weit. Alles Inhaltliche schaltet hier: Formular-Layout, Grid-Spalten, Panels (Bottom-Sheet ↔ Seitenpanel), Innenabstände.
- **`lg` (1024px)** schaltet ausschließlich die Navigation (Burger ↔ horizontales Menü).

`sm` ist **keine** Layout-Grenze mehr. Vorher schaltete das Formular bei `sm`, die Panels bei `md` und die Navbar bei `lg` — auf einem 800px-Tablet war das Formular damit „Desktop", die Navigation aber „Mobil".

---

## Alerts

Die Soft-Darstellung der Alerts kommt aus `app.css` (Details in `daisyui.md`). Für diese Regel zählt nur: `<div class="alert alert-warning">` genügt — den Override **nicht** per `bg-warning`/`text-warning-content`/`shadow-*` an der Aufrufstelle aushebeln, sonst entsteht genau der `*-content`-Fehler von oben.

Der Alert-Text steht in `base-content`, nicht in der Statusfarbe (WCAG 1.4.3, Messwerte in `daisyui.md`). Die Bedeutung trägt deshalb das **Icon** — jedes `alert-*` braucht eines, sonst sehen Warnung und Fehler praktisch gleich aus:

```svelte
<div class="alert alert-warning" role="alert">
	<Icon icon="lucide:triangle-alert" class="shrink-0" aria-hidden="true" />
	<span>Die Koordinaten liegen außerhalb der Ostsee.</span>
</div>
```

---

## Button-Hierarchie

- **Genau eine Primäraktion pro Bereich** (`btn btn-primary`). Im Formular ist das „Weiter"/„Absenden".
- Sekundäre Navigation („Zurück") und Nebenaktionen: `btn btn-outline`. Keine Vollton-Sekundärbuttons neben der Primäraktion — sie konkurrieren optisch mit ihr und wirken je nach Fläche wie deaktiviert.
- Zurückhaltende Aktionen (Toggles in Panels, Aufklapper): `btn btn-ghost`.
- Destruktive Aktionen (Löschen, Zurücksetzen) einheitlich in **einer** Variante über das ganze Formular — im Sichtungsformular `btn btn-outline btn-error btn-sm`. Nicht an einer Stelle `btn-warning`, an anderer `btn-ghost text-error`. Destruktives immer mit Bestätigung. (Das früher nötige `min-h-11` entfällt: die 44px kommen seit der Touch-Target-Regel aus `app.css`, siehe „Feldmodus und Touch-Targets".)
- Gleiche Aktion = gleiche Variante = gleiches Icon, egal in welcher Komponente sie auftaucht.
- Ein Button, der nichts bewirkt, gehört entfernt — nicht dekorativ stehen gelassen.

---

## Gesperrte Schaltflächen tragen `aria-disabled`, nicht `disabled`

Eine Schaltfläche, die gerade nicht ausgeführt werden darf, wird über
`aria-disabled="true"` gesperrt und bleibt fokussierbar. `disabled` nimmt sie aus
der Tab-Reihenfolge, und der Browser verwirft dabei den Fokus — wer per Tastatur
arbeitet, verliert seine Position, und zwar ausgerechnet während einer laufenden
Aktion. Die eigentliche Sperre übernimmt ein Wächter in der Handler-Funktion.

Begründet und angewendet in `PositionPanel.svelte` („Mein aktueller Standort"
während der Ortung), `FormSteps.svelte` und `StepProgressCompact.svelte` (noch
nicht erreichbare Schritte). Nebeneffekt, der das Muster zusätzlich trägt: der
`title` mit der Begründung („Bitte füllen Sie zuerst die vorherigen Schritte
aus") ist an einem `disabled`-Element per Tastatur nicht erreichbar.

**Konsequenz für Tests — leicht zu übersehen:** Playwright wertet
`aria-disabled="true"` selbst als „nicht bedienbar" und klickt gar nicht erst.
Ein Test, der die Sperre prüfen will, läuft ohne `force: true` in einen Timeout
und bestätigt am Ende nur Playwrights eigene Actionability-Prüfung — die Sperre
der Anwendung wird dabei nie erreicht.

```ts
await expect(letzter).toHaveAttribute('aria-disabled', 'true');
await letzter.click({ force: true }); // ohne force: Timeout, App-Sperre ungeprüft
await expect(ersterSchritt).toHaveAttribute('aria-current', 'step');
```

Beispiel: `e2e/form-field-mode.spec.ts` → „Vorwärts bleibt gesperrt, solange der
Schritt unvollständig ist".

---

## Formularfeld-Muster

Alle Felder laufen über `FormField` → `FieldRenderer` (`src/lib/report/components/form/fields/`). Kein Feld baut Label, Fehleranzeige oder ARIA selbst.

- Label, Hilfetext, Platzhalter, Icon, Optionen und Feldtyp kommen aus dem Yup-Schema (`.label()` / `.meta({...})` in `src/lib/form/validation/sightingSchema.ts`), nicht aus dem Template.
- Pflicht-Markierung (`*`) und `aria-required` stammen aus **derselben** Variable in `FieldRenderer`. Nie eines von beidem separat setzen — sonst driften optische und semantische Pflicht auseinander.
- **Konditionale Pflichten** (Yup `when()`) sind aus `describe()` nicht ableitbar. Dafür den `required`-Override an `FormField` setzen — Beispiel `waterway` in `src/lib/report/components/form/position/LocationDescription.svelte`: `<FormField name="waterway" required={waterwayRequired} />`.
- Neues Feld: im Schema definieren **und** in `formStepsConfig` (`src/lib/report/formConfig.ts`) dem richtigen Schritt zuordnen — sonst greift weder Schritt-Validierung noch Fehler-Navigation.
- `data-testid="field-<name>"` entsteht automatisch; keine eigenen Test-IDs an Feldern vergeben.
- Fehler **nie** beim Betreten eines Schritts anzeigen — erst nach einem gescheiterten „Weiter"-Versuch (`StepNavigation.svelte` / `stepNavigationState.ts`).

---

## Feldmodus und Touch-Targets

Das Formular wird an Deck und am Strand ausgefüllt — nass, in der Sonne, mit einer Hand, teils mit Handschuhen. 44px ist die WCAG-Größe für ruhige Hände.

- Touch-Targets kommen aus `--target-min` (44px, im Feldmodus 56px). Der `Touch-Targets`-Block in `app.css` setzt sie global durch — `min-h-11` an der Aufrufstelle ist damit nicht mehr nötig, und `btn-xs` unterschreitet die Grenze nicht mehr still.
- **Das Ziel ist 44px, nicht das Bedienelement.** WCAG 2.5.5 verlangt eine Trefferfläche dieser Größe — kein Control dieser Größe. Daraus folgen drei getrennte Mechanismen:

  | Element                                   | Mechanismus                     | Größe                          |
  | ----------------------------------------- | ------------------------------- | ------------------------------ |
  | `.btn`, `summary.btn`                     | `min-height: var(--target-min)` | 44px (Feldmodus 56px)          |
  | `.btn-circle`                             | zusätzlich `min-width`          | 44×44                          |
  | `label:has(> .checkbox\|.radio\|.toggle)` | `min-height: var(--target-min)` | 44px — **hier liegt das Ziel** |
  | `.checkbox`, `.radio`, `.toggle`          | `--size: var(--control-size)`   | 28px, sichtbare Größe          |

  `.checkbox`/`.radio`/`.toggle` **nie über `min-height`** vergrößern: DaisyUI setzt bei ihnen `width` **und** `height` fest, `min-height` überschreibt nur die Höhe und verzerrt sie (gemessen: Checkbox 24×44, Radio 24×44 als Ellipse, Toggle 40×44 mit versetztem Knopf). Und `--size` **nicht** auf `--target-min` setzen — dann greifen Control-Größe und Trefferfläche gleichzeitig, der Toggle würde 75×44 breit (im Feldmodus 96×56).

  Das `align-items: flex-start` an der Label-Regel ist nicht kosmetisch: ohne es streckt der Flex-Default `stretch` das Control wieder auf die volle Label-Höhe, sobald die `min-height` die Zeile aufzieht oder das Label mehrzeilig wird.

- Ausnahmen tragen `.target-exempt` und **begründen das im Code-Kommentar**. Zulässig nur für Ziele, die nachweislich nicht mit dem Finger bedient werden.
- Der Mindestabstand zwischen zwei Zielen ist `--target-gap`.
- Der Feldmodus wird über `<html data-density="field">` geschaltet und hebt `--target-min` auf 56px sowie `--text-support` auf 14px. Keine Komponente kennt den Modus — sie liest nur die Tokens.
- Die Primäraktion muss ohne Scrollen erreichbar sein: unterhalb `md` trägt die Schritt-Navigation `.form-step-nav` und wird zum ortsfesten Balken am unteren Rand (inkl. `env(safe-area-inset-bottom)`).

---

## A11y-Mindestanforderungen (WCAG 2.1 AA)

- Kontrast: **≥ 4,5:1** für Text (WCAG 1.4.3), **≥ 3:1** für grafische Objekte und UI-Begrenzungen (1.4.11).
- Touch-Targets: Projekt-Mindestmaß **44×44 px** für alles, was im Feld mobil bedient wird (WCAG 2.5.5 ist formal AAA — hier gilt es trotzdem, weil das Formular an Deck ausgefüllt wird). Durchgesetzt zentral in `app.css`, siehe „Feldmodus und Touch-Targets"; nicht per `.target-exempt` ohne Begründung aushebeln.
- Fokus muss sichtbar bleiben: `:focus-visible` und die Input-Fokus-Regel in `app.css` nicht durch `outline-none` überschreiben.
- Labels statt Platzhaltertexte. Ein `placeholder` ist Beispiel, nie Ersatz für das Label.
- Dekorative Icons bekommen `aria-hidden="true"`; informationstragende Icons brauchen ein `aria-label` am fokussierbaren Element.
- Radiogruppen als `fieldset`/`legend`, nicht als `label[for]` auf mehrere Inputs.
- Fehlermeldungen mit `role="alert"` und `aria-live="polite"`, referenziert über `aria-describedby` — und nur dann referenziert, wenn das Element tatsächlich gerendert ist.

---

## Icons

- UI-Icons ausschließlich über `src/lib/components/Icon.svelte` (unplugin-icons / lucide): `<Icon icon="lucide:map-pin" width="20" />`. Neue Icons dort einmalig importieren, nicht in Einzelkomponenten.
- Wetter-Icons sind CSS-basiert (`src/css/weather-icons*.css`): `<i class="wi wi-day-sunny"></i>`.

---

## Keine toten Utility-Klassen

Vor der Nutzung einer Utility prüfen, ob sie im Setup überhaupt existiert.

- Es ist **kein** Animations-Plugin installiert (weder `tailwindcss-animate` noch `tw-animate-css`). Klassen wie `animate-in`, `fade-in`, `slide-in-from-top-1` sind wirkungslos — sie sehen im Code nach Design aus und tun nichts.
- Für Ein-/Ausblendungen `transition:slide` / `transition:fade` aus `svelte/transition` verwenden (so gelöst in `sections/SightingDetails.svelte`).
- Gleiches gilt für `dark:`-Varianten (kein Dark-Theme, siehe `daisyui.md`).
- Umgekehrt gilt: **eine Keyframe ist nicht tot, nur weil keine Klasse sie nennt.** `fadeIn`, `bounceIn`, `loadingPattern` und `spin` in `app.css` hängen an inline-`style="animation: …"` (`map/LoadingOverlay.svelte`, `MaintenanceBanner.svelte`) bzw. an einem scoped `<style>`-Block (`media/MediaThumbnail.svelte`). Vor dem Löschen einer Keyframe deshalb nach dem **Namen** greppen, nicht nach einer Klasse.
- Neue eigene Utility (`text-*-strong`, `shadow-raised`, `text-support`, …) heißt: Eintrag im `@theme`-Block von `app.css`. Ein Token, das nur in `src/css/tokens.css` steht, ist eine CSS-Variable — **keine** Utility-Klasse. Fehlt der `@theme`-Eintrag, ist `class="text-warning-strong"` genau so tot wie `animate-in`.
- **Und ein Feld auf `/styleguide`.** Tailwind erzeugt eine Utility nur, wenn ihr Name als vollständiger String im gescannten Quelltext steht — sieben der dreizehn eigenen Utilities haben ihre einzige Aufrufstelle auf dieser Seite. Ein dort gelöschtes Farbfeld nimmt die Klasse still aus dem Build. Abgesichert durch `e2e/design-tokens.spec.ts` → „Utilities haben einen Vertreter auf /styleguide": Der Test liest die Tokens aus `tokens.css` und verlangt für jeden ein Element mit der zugehörigen Klasse.

---

## Randbereiche: wo Hex-Werte erlaubt sind

Drei Bereiche dürfen Hex-Werte enthalten — aber jeweils nur an **einer** Stelle:

| Bereich           | Warum Hex nötig ist                                | Wo die Werte stehen dürfen                |
| ----------------- | -------------------------------------------------- | ----------------------------------------- |
| OpenLayers-Canvas | Canvas kann keine CSS-Variablen lesen              | `src/lib/map/mapTokens.ts`                |
| Marker-Palette    | Datenkodierung, farbfehlsichtigkeits-sicher (Wong) | `src/lib/map/styleUtils.ts` (unverändert) |
| E-Mail-Templates  | Clients kennen `oklch()`/`color-mix()` nicht       | `src/lib/server/templates/emailTokens.ts` |

Überall sonst gilt weiterhin: keine Hex-Werte, keine Tailwind-Paletten-Farben (`daisyui.md`). Abgesichert durch den DOM-Scan in `e2e/design-tokens.spec.ts`.

---

## Zahlen in Nutzertexten nur mit Quelle

Hilfetexte und Tooltips (`meta.helpText` / `meta.valueText` im Yup-Schema) werden Bürgern als Aussage eines Forschungsmuseums präsentiert. Statistische Behauptungen ohne belegte Quelle gehören dort nicht hinein — im Zweifel die Aussage qualitativ formulieren („Bei ruhiger See sind Tiere leichter zu entdecken") statt eine Zahl zu erfinden.

**Durchgesetzt durch `src/lib/form/validation/sightingSchemaClaims.test.ts`.** Der Test schlägt fehl, sobald ein `valueText` eine Zahl enthält, die nicht in `REVIEWED_NUMERIC_TEXTS` mit Quelle hinterlegt ist. Eine neue Zahl einzubauen erzwingt also, die Herkunft zu dokumentieren.

### Was konkret nicht geht

| Muster              | Beispiel (entfernt)                                 | Problem                                         |
| ------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Erfundene Statistik | „73% der Sichtungen erfolgen morgens"               | Eigene DB sagt 10,6 % — widerlegt               |
| Erfundene Stückzahl | „47 neue Verhaltensweisen dokumentiert"             | Nicht belegbar                                  |
| Fremde Institution  | „für den IPCC-Meeresspiegel-Report verwendet"       | Frei erfunden, beschädigt fremden Ruf mit       |
| Verwertungszusage   | „Ihre Fotos werden in Publikationen verwendet"      | Kann die Plattform nicht garantieren → „können" |
| Superlativ          | „die präziseste Methode für Populationsschätzungen" | Nicht belegbar                                  |

### Wenn eine Zahl belegt ist

Quelle im Text erkennbar machen, nicht als nackte Prozentzahl:

```ts
// gut — Herkunft steht im Satz, Eintrag in REVIEWED_NUMERIC_TEXTS begründet ihn
valueText: 'einzelne Schiffe melden laut unserer Sichtungsdatenbank seit über 20 Jahren immer wieder Sichtungen';
```

### Grenze der eigenen Datenbasis

Die Tabelle `sichtungen` enthält **nur positive Meldungen, keinen Beobachtungsaufwand und keine Nullbeobachtungen**. Aussagen der Form „bei Bedingung X werden N-mal mehr Tiere entdeckt" lassen sich daraus grundsätzlich nicht ableiten — dafür wäre bekannter Suchaufwand nötig. Auch die zeitliche Verteilung der Meldungen bildet primär den Rhythmus der Beobachtenden ab (Mittagsgipfel 11–14 Uhr), nicht den der Tiere.
