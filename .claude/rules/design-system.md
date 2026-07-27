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

## Alerts

Die Soft-Darstellung der Alerts kommt aus `app.css` (Details in `daisyui.md`). Für diese Regel zählt nur: `<div class="alert alert-warning">` genügt — den Override **nicht** per `bg-warning`/`text-warning-content`/`shadow-*` an der Aufrufstelle aushebeln, sonst entsteht genau der `*-content`-Fehler von oben.

---

## Button-Hierarchie

- **Genau eine Primäraktion pro Bereich** (`btn btn-primary`). Im Formular ist das „Weiter"/„Absenden".
- Sekundäre Navigation („Zurück") und Nebenaktionen: `btn btn-outline`. Keine Vollton-Sekundärbuttons neben der Primäraktion — sie konkurrieren optisch mit ihr und wirken je nach Fläche wie deaktiviert.
- Zurückhaltende Aktionen (Toggles in Panels, Aufklapper): `btn btn-ghost`.
- Destruktive Aktionen (Löschen, Zurücksetzen) einheitlich in **einer** Variante über das ganze Formular — im Sichtungsformular `btn btn-outline btn-error btn-sm min-h-11` (das `min-h-11` hält das 44-px-Touch-Target, das `btn-sm` sonst unterschreitet). Nicht an einer Stelle `btn-warning`, an anderer `btn-ghost text-error`. Destruktives immer mit Bestätigung.
- Gleiche Aktion = gleiche Variante = gleiches Icon, egal in welcher Komponente sie auftaucht.
- Ein Button, der nichts bewirkt, gehört entfernt — nicht dekorativ stehen gelassen.

---

## Formularfeld-Muster

Alle Felder laufen über `FormField` → `FieldRenderer` (`src/lib/report/components/form/fields/`). Kein Feld baut Label, Fehleranzeige oder ARIA selbst.

- Label, Hilfetext, Platzhalter, Icon, Optionen und Feldtyp kommen aus dem Yup-Schema (`.label()` / `.meta({...})` in `src/lib/form/validation/sightingSchema.ts`), nicht aus dem Template.
- Pflicht-Markierung (`*`) und `aria-required` stammen aus **derselben** Variable in `FieldRenderer`. Nie eines von beidem separat setzen — sonst driften optische und semantische Pflicht auseinander.
- **Konditionale Pflichten** (Yup `when()`) sind aus `describe()` nicht ableitbar. Dafür den `required`-Override an `FormField` setzen — Beispiel `waterway` in `sections/PositionAndTime.svelte`: `<FormField name="waterway" required={waterwayRequired} />`.
- Neues Feld: im Schema definieren **und** in `formStepsConfig` (`src/lib/report/formConfig.ts`) dem richtigen Schritt zuordnen — sonst greift weder Schritt-Validierung noch Fehler-Navigation.
- `data-testid="field-<name>"` entsteht automatisch; keine eigenen Test-IDs an Feldern vergeben.
- Fehler **nie** beim Betreten eines Schritts anzeigen — erst nach einem gescheiterten „Weiter"-Versuch (`StepNavigation.svelte` / `stepNavigationState.ts`).

---

## A11y-Mindestanforderungen (WCAG 2.1 AA)

- Kontrast: **≥ 4,5:1** für Text (WCAG 1.4.3), **≥ 3:1** für grafische Objekte und UI-Begrenzungen (1.4.11).
- Touch-Targets: Projekt-Mindestmaß **44×44 px** für alles, was im Feld mobil bedient wird (WCAG 2.5.5 ist formal AAA — hier gilt es trotzdem, weil das Formular an Deck ausgefüllt wird). DaisyUI-Default-Größen nicht per `btn-xs`/`input-xs` darunter drücken.
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
- Gleiches gilt für `dark:`-Varianten (kein Dark-Theme, siehe `daisyui.md`) und für Keyframes, die nur in `app.css` definiert, aber an keine Klasse gebunden sind.

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
