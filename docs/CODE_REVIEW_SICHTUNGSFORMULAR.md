# Code Review: Sichtungsformular

**Datum:** 2026-04-11
**Scope:** Hauptformular (Multi-Step Sichtungsformular), ohne Admin und Map
**Dateien analysiert:** ~30 Svelte-Komponenten, ~1.200 Zeilen Validation, ~570 Zeilen API

---

## Zusammenfassung

| Kategorie              | Bewertung       | Findings                             |
| ---------------------- | --------------- | ------------------------------------ |
| Svelte 5 Patterns      | **Sehr gut**    | 3 Findings (1 Medium, 2 Low)         |
| DaisyUI v5             | **Gut**         | 5 Findings (1 High, 2 Medium, 2 Low) |
| Benutzerfreundlichkeit | **Gut**         | 6 Findings (1 High, 3 Medium, 2 Low) |
| Sicherheit             | **Sehr gut**    | 4 Findings (1 Medium, 3 Low)         |
| Testabdeckung          | **Ausreichend** | 7 Findings (2 High, 3 Medium, 2 Low) |

**Gesamt: 25 Findings** (0 Critical, 4 High, 10 Medium, 11 Low)

---

## 1. Svelte 5 Patterns & Runes

### Stärken

- **100% Runes-Migration:** Keine Legacy-Patterns (`on:click`, `export let`, `$:`) gefunden
- **Korrekte $state/$derived/$effect Nutzung** in ModernReportForm, FieldRenderer, FormField
- **$bindable()** korrekt eingesetzt (Step3, FormSteps, StepNavigation)
- **untrack()** für Debug-Logging in FormField.svelte:62 - verhindert unnötige Reaktivität
- **Snippet-basierte Komposition** in Form.svelte:55
- **SSR-Sicherheit:** `browser` Guard in localStorage.ts, kein globaler $state der leaken könnte

### Findings

#### S5-1: $effect-Kaskade bei localStorage-Sync (Medium)

**Datei:** `ModernReportForm.svelte:150-162`

Zwei separate `$effect`-Blöcke für localStorage-Sync laufen bei jeder Formänderung:

```typescript
// Effect 1: Speichert currentStep
$effect(() => {
	saveToStorage(STORAGE_KEYS.CURRENT_STEP, currentStep);
});

// Effect 2: Speichert gesamte Formulardaten (inkl. currentStep im Log)
$effect(() => {
	saveToStorage(STORAGE_KEYS.FORM_DATA, $form);
});
```

**Problem:** Effect 2 trackt `$form` und `currentStep` (via Log-Message), läuft also bei _jeder_ Formänderung UND bei Step-Wechsel doppelt. Das ist funktional korrekt aber ineffizient.

**Fix:** Logger-Call in Effect 2 in `untrack()` wrappen oder Effects konsolidieren.

---

#### S5-2: $derived als Funktion statt Wert in FormActions (Low)

**Datei:** `FormActions.svelte:18-21`

```typescript
const hasSavedContactData = $derived(() => {
	const contactData = loadUserContactData();
	return Object.keys(contactData).length > 0;
});
```

**Problem:** `$derived(() => ...)` gibt eine _Funktion_ zurück, nicht den Wert. Die korrekte Syntax für komplexe Berechnungen ist `$derived.by(() => ...)`. In Zeile 54 wird es als `hasSavedContactData()` aufgerufen, was funktioniert, aber semantisch falsch ist — es sollte ein reaktiver Wert sein, kein manueller Funktionsaufruf.

**Fix:** `$derived.by(() => ...)` verwenden und Aufruf als `hasSavedContactData` (ohne Klammern).

---

#### S5-3: DOM-Zugriff außerhalb $effect (Low)

**Datei:** `StepNavigation.svelte:34`, `Step3Observations.svelte:24`

```typescript
const formContent = browser ? (document.getElementById('form-content') as HTMLElement) : null;
```

**Problem:** `document.getElementById()` wird beim Modul-Import ausgeführt, nicht reaktiv. Da es ein statisches Element ist, funktioniert es, aber es ist fragil — wenn das Element noch nicht im DOM ist (z.B. bei verzögertem Rendering), wird `null` zurückgegeben.

**Fix:** In `$effect` oder Event-Handler verschieben, oder `bind:this` verwenden.

---

## 2. DaisyUI v5 Patterns

### Stärken

- **Vollständige v5-Migration:** Keine Legacy v3/v4 Patterns
- **`@plugin` Syntax** korrekt in app.css:25-26
- **Konsistente Komponenten-Klassen:** input-bordered, select-bordered, textarea-bordered
- **State-Klassen:** input-error/success, select-error/success korrekt
- **Theme-System:** Custom `meeresmuseum` Theme mit oklch() Farbwerten
- **Responsive Patterns:** Mobile-first mit grid-cols-1 → md:grid-cols-2/3

### Findings

#### D5-1: Massive CSS-Overrides mit !important (High)

**Datei:** `app.css:134-214`

45 Zeilen CSS-Overrides mit `!important` für Button- und Text-Farben:

```css
.btn-error {
	background-color: oklch(0.55 0.18 25) !important;
	border-color: oklch(0.55 0.18 25) !important;
	color: oklch(1 0 0) !important;
}
.text-success {
	color: oklch(0.35 0.16 145) !important;
}
```

**Problem:** DaisyUI v5 bietet Theme-Variablen für genau diesen Zweck. `!important` Overrides brechen die Spezifitäts-Kaskade und machen zukünftige Theme-Anpassungen unmöglich. Die Overrides existieren weil die Theme-Farben (success, error etc.) als helle Hintergrundfarben definiert sind (für Alerts), aber Buttons dunklere Varianten brauchen.

**Fix:** Separate DaisyUI Color-Utilities definieren oder die Theme-Farben so umstrukturieren, dass die Basis-Farben dunkel genug für Buttons sind und Alert-Hintergründe über `-content` Paare gesteuert werden. Alternativ: DaisyUI v5 `color-mix()` nutzen.

---

#### D5-2: `class:loading` ist deprecated in DaisyUI v5 (Medium)

**Datei:** `StepNavigation.svelte:147`

```svelte
class:loading={$isSubmitting}
```

**Problem:** In DaisyUI v5 ist `class:loading` als Svelte-Direktive zwar syntaktisch korrekt, aber die `loading` CSS-Klasse auf Buttons wird nicht mehr direkt unterstützt. Stattdessen wird das Loading-Spinner-Pattern in Zeile 150-152 korrekt als Kind-Element verwendet. Die `class:loading` Direktive hat hier keinen sichtbaren Effekt mehr.

**Fix:** `class:loading={$isSubmitting}` entfernen, da der Loading-Spinner bereits als Kind-Element implementiert ist.

---

#### D5-3: Hardcodierte rgba/rgb Farben in SpeciesIdentificationHelp (Medium)

**Datei:** `SpeciesIdentificationHelp.svelte:631-643`

```css
box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
background-color: rgba(0, 0, 0, 0.6);
```

**Problem:** Hardcodierte Farben statt DaisyUI Theme-Variablen. Diese passen sich nicht an Theme-Wechsel an.

**Fix:** `oklch(var(--b3) / 0.1)` oder ähnliche Theme-basierte Farben verwenden.

---

#### D5-4: Redundante Custom Card-Hover-Styles (Low)

**Dateien:** `AnimalInfo.svelte:42-49`, `SightingDetails.svelte:42-49`

```css
.card:hover {
	transform: translateY(-1px);
	box-shadow: 0 8px 25px -8px oklch(var(--b3));
}
```

**Problem:** Identischer Code in 2 Dateien UND bereits global in `app.css:231-234` definiert. Dreifache Duplikation.

**Fix:** Lokale `<style>` Blöcke in AnimalInfo und SightingDetails entfernen.

---

#### D5-5: RequiredConsent Custom CSS überflüssig (Low)

**Datei:** `RequiredConsent.svelte:66-82`

```css
.border-primary\/20 {
	border-color: oklch(var(--p) / 0.2);
}
.bg-primary\/5 {
	background-color: oklch(var(--p) / 0.05);
}
```

**Problem:** Diese Klassen werden bereits von Tailwind CSS generiert (`border-primary/20`, `bg-primary/5`). Die Custom-Styles sind redundant.

**Fix:** `<style>` Block entfernen.

---

## 3. Benutzerfreundlichkeit (UX)

### Stärken

- **Progressive Disclosure:** Bedingte Felder (Totfund, Sonstiges) korrekt
- **Step 3 Skip-Button:** Optionaler Schritt kann übersprungen werden
- **Auto-Save:** Formulardaten werden automatisch in sessionStorage gespeichert
- **Kontaktdaten-Persistenz:** GDPR-konform mit Consent-Steuerung
- **Klare Fehlermeldungen:** Deutsch, mit Icon und Animation
- **Position Method Selection:** 3 intuitive Methoden (Foto, Karte, Beschreibung)
- **Scroll-to-Error:** Automatisches Scrollen zum ersten Fehlerfeld

### Findings

#### UX-1: FormSteps erlaubt unvalidiertes Step-Springen (High)

**Datei:** `FormSteps.svelte:16-21`

```svelte
<button type="button"
    class="step {currentStep >= index ? 'step-primary' : ''}"
    onclick={() => { currentStep = index; }}
>
```

**Problem:** Die Step-Buttons erlauben direktes Springen zu jedem Step OHNE Validierung. Ein User kann von Step 1 direkt zu Step 4 springen, ohne die Pflichtfelder in Steps 1-3 ausgefüllt zu haben. Die Validierung in `StepNavigation.svelte` greift nur bei "Weiter", nicht bei direktem Step-Klick.

**Fix:** Entweder:

1. Step-Klick nur auf vorherige/aktuelle Steps erlauben (nicht vorwärts)
2. Oder Validierung aller Zwischen-Steps beim Vorwärts-Springen auslösen
3. Oder Step-Buttons als reine Anzeige ohne Klick-Interaktion

---

#### UX-2: Kein Feedback beim Laden gespeicherter Daten (Medium)

**Datei:** `ModernReportForm.svelte:57-59`

Gespeicherte Formulardaten werden stillschweigend geladen. Der User sieht nicht, dass sein vorheriger Fortschritt wiederhergestellt wurde.

**Fix:** Toast-Notification anzeigen: "Ihre vorherigen Eingaben wurden wiederhergestellt."

---

#### UX-3: window.location.reload() bei Kontaktdaten-Löschung (Medium)

**Dateien:** `Step4Contact.svelte:29`, `FormActions.svelte:33`

```typescript
window.location.reload();
```

**Problem:** Ein harter Page-Reload zerstört den gesamten Formular-State (auch nicht-Kontakt-Felder). Wenn ein User in Step 3 ist und Kontaktdaten löscht, verliert er alle bisherigen Eingaben.

**Fix:** Formular-State selektiv zurücksetzen statt Page-Reload. `formContext.updateInitialValues()` mit bereinigten Daten nutzen.

---

#### UX-4: Success-Message nur als kleine Alert-Box (Medium)

**Datei:** `ModernReportForm.svelte:179-183`

```svelte
{#if submissionSuccess}
	<div class="alert alert-success mb-6" role="alert">
		<span>Erfolgreich gesendet: {submissionId}</span>
	</div>
{/if}
```

**Problem:** Nach erfolgreichem Submit erscheint nur eine kleine Success-Alert innerhalb des Formulars. Die eigentliche Success-Seite (`SubmissionSuccess` Komponente) wird in `+page.svelte` gerendert. Aber in `ModernReportForm.svelte` gibt es eine redundante Success-Alert die nie sinnvoll angezeigt wird (weil nach Submit `+page.svelte` schon auf Success umschaltet).

**Fix:** Redundante Success-Message in ModernReportForm entfernen.

---

#### UX-5: "notes" Feld in Step4 existiert nicht im Schema (Low)

**Datei:** `Step4Contact.svelte:160`

```svelte
<FormField name="notes" />
```

**Problem:** Das Feld "notes" wird in Step4 referenziert. Falls dieses Feld nicht im sightingSchema definiert ist, wirft `FormField` einen Error. Muss geprüft werden ob "notes" im Schema existiert oder ob es "bemerkungen" heißen sollte.

**Fix:** Feldnamen gegen Schema prüfen und korrigieren.

---

#### UX-6: Kein Focus-Management bei Step-Wechsel (Low)

**Datei:** `StepNavigation.svelte:48-50`

Bei Step-Wechsel wird `scrollToElement(formContent)` aufgerufen, aber kein Focus-Management. Screen-Reader-User bekommen keinen Hinweis, dass sich der Step geändert hat.

**Fix:** Nach Step-Wechsel Focus auf den Step-Header (`h2`) setzen.

---

## 4. Sicherheit

### Stärken

- **Honeypot-Spam-Schutz:** Form.svelte:46-54, API-Check in +server.ts:112
- **Field-Whitelist:** requestValidation.ts:19-23 mit Set-basiertem Whitelist
- **Admin-Field-Rejection:** Hardcodierte Forbidden-List (verified, internalComment, id, created, updated)
- **Rate Limiting:** 20/Stunde per User/IP mit In-Memory-Store
- **Security Audit Logging:** Alle Submissions mit User/IP/UserAgent geloggt
- **Server-Side Defaults:** verified=false, internalComment=undefined erzwungen
- **CSRF:** SvelteKit automatischer Cookie-basierter CSRF-Schutz
- **File Upload:** Magic Bytes + MIME Whitelist + Size Limits + Path Traversal Prevention
- **GDPR-konforme Storage:** Consent-basierte localStorage vs sessionStorage

### Findings

#### SEC-1: localStorage-Daten werden nicht validiert beim Laden (Medium)

**Datei:** `ModernReportForm.svelte:57-59`, `localStorage.ts:83-97`

```typescript
const savedFormData = loadFromStorage(STORAGE_KEYS.FORM_DATA, { ...initialFormData });
```

**Problem:** Daten aus sessionStorage/localStorage werden ohne Validierung in den Form-State übernommen. Ein Angreifer könnte über Browser DevTools manipulierte Daten injizieren (z.B. extrem lange Strings, Script-Tags). Die Daten werden zwar vor dem Submit serverseitig validiert, aber könnten client-seitig zu unerwartetem Verhalten führen.

**Fix:** Geladene Daten gegen ein Subset des Yup-Schemas validieren oder zumindest Typ-Checks durchführen.

---

#### SEC-2: WeatherData ohne Server-Side Schema-Validierung (Low)

**Datei:** `+server.ts:179-180`

```typescript
const weatherData = formDataWithDefaults.weatherData as StoredWeatherData | undefined;
```

**Problem:** Weather-Data wird vom Client akzeptiert und direkt als JSONB in die DB geschrieben, ohne Schema-Validierung. Ein Angreifer könnte beliebiges JSON als weatherData senden.

**Fix:** Yup-Schema oder Zod für StoredWeatherData-Validierung implementieren.

---

#### SEC-3: In-Memory Rate-Limit nicht persistent (Low)

**Problem:** Rate Limiting nutzt In-Memory-Store. Bei Server-Neustart werden alle Limits zurückgesetzt. Bei Multi-Instance-Deployment (Load Balancer) kann ein Angreifer Limits umgehen.

**Bewertung:** Für die aktuelle Deployment-Situation (Single-Instance Docker) akzeptabel. Bei Skalierung Redis-basiertes Rate Limiting einführen.

---

#### SEC-4: Error-Details in Development-Mode (Low)

**Datei:** `+server.ts:266-270, 286-289`

```typescript
detail: NODE_ENV === 'development' ? ... : undefined
```

**Bewertung:** Korrekt implementiert — Error-Details nur in Development sichtbar. Kein Finding, nur Bestätigung.

---

## 5. Testabdeckung

### Stärken

- **Step-Validierung:** 276 Zeilen, 100% Step-Paths abgedeckt
- **Legacy API:** 368 Zeilen, PDF-Spec-compliant
- **API Endpoint:** Security Tests (Admin-Fields, Unknown-Fields, Validation-Errors)
- **File Validation:** 540 Zeilen, umfassend inkl. Path Traversal
- **E2E Form Navigation:** 73 Zeilen, Step-Navigation getestet

### Findings

#### T-1: Keine E2E-Tests für kompletten Submit-Flow (High)

**Datei:** `e2e/form-submit.spec.ts`

Die E2E-Tests decken nur die Navigation (Step 1→2, Zurück) ab. Es fehlt:

- Komplettes Ausfüllen aller 4 Steps
- Formular-Submit und Success-State
- Validierungs-Feedback bei fehlenden Pflichtfeldern
- Skip-Button in Step 3

**Fix:** E2E-Test für Happy-Path Submit implementieren.

---

#### T-2: Keine Komponenten-Tests für Svelte-Formular-Komponenten (High)

Keine Unit Tests für:

- `FieldRenderer.svelte` (318 Zeilen, komplexe Routing-Logik)
- `FormField.svelte` (Schema-Integration)
- `BaseInput/BaseSelect/BaseCheckbox` (State-Handling)
- `StepNavigation.svelte` (Navigation + Validierung)
- `FormSteps.svelte` (Step-Klick-Verhalten)

**Fix:** Mindestens FieldRenderer und StepNavigation mit vitest-browser-svelte testen.

---

#### T-3: Kein Honeypot-Test am Endpoint (Medium)

**Datei:** `endpoint.test.ts`

Der Honeypot-Check in `+server.ts:112-119` hat keinen Test.

**Fix:** Test hinzufügen: Request mit `_honeypot: "spam"` muss rejected werden.

---

#### T-4: Keine Rate-Limit-Tests (Medium)

Rate-Limiting-Logik (`enforceRateLimit`) hat keine Unit Tests.

**Fix:** Mock-basierte Tests: N+1 Requests senden, 429 nach Limit prüfen.

---

#### T-5: Keine localStorage-Persistenz-Tests (Medium)

Die gesamte Auto-Save und Restore-Logik (loadFromStorage, saveToStorage, clearFormDataOnly) hat keine Tests.

**Fix:** Unit Tests für:

- Speichern und Laden von Formulardaten
- GDPR-Consent-basierte Storage-Auswahl
- clearFormDataOnly vs. clearAllStorage

---

#### T-6: Keine WeatherData-Validierung-Tests (Low)

Weather-Data wird serverseitig nicht validiert und hat auch keine Tests.

---

#### T-7: Upload-Endpoint ohne Tests (Low)

Der File-Upload-Endpoint (`/api/files/upload`) hat keine Endpoint-Tests (nur die Validierungs-Utilities sind getestet).

---

## Priorisierte Fix-Liste

### Prio 1 (High) — Zeitnah beheben

| #    | Finding                                            | Aufwand | Dateien                 |
| ---- | -------------------------------------------------- | ------- | ----------------------- |
| UX-1 | FormSteps erlaubt unvalidiertes Step-Springen      | ~1h     | FormSteps.svelte        |
| D5-1 | !important CSS-Overrides refactoren                | ~2h     | app.css                 |
| T-1  | E2E Submit-Flow Test                               | ~2h     | e2e/form-submit.spec.ts |
| T-2  | Komponenten-Tests für FieldRenderer/StepNavigation | ~3h     | neue Test-Dateien       |

### Prio 2 (Medium) — Nächste Iteration

| #     | Finding                              | Aufwand | Dateien                                 |
| ----- | ------------------------------------ | ------- | --------------------------------------- |
| S5-1  | $effect localStorage-Sync optimieren | ~30min  | ModernReportForm.svelte                 |
| D5-2  | class:loading entfernen              | ~5min   | StepNavigation.svelte                   |
| D5-3  | Hardcodierte Farben in SpeciesHelp   | ~30min  | SpeciesIdentificationHelp.svelte        |
| UX-2  | Feedback bei Formular-Restore        | ~30min  | ModernReportForm.svelte                 |
| UX-3  | window.location.reload() ersetzen    | ~1h     | Step4Contact.svelte, FormActions.svelte |
| UX-4  | Redundante Success-Message entfernen | ~5min   | ModernReportForm.svelte                 |
| SEC-1 | localStorage-Validierung             | ~1h     | localStorage.ts                         |
| T-3   | Honeypot-Test                        | ~15min  | endpoint.test.ts                        |
| T-4   | Rate-Limit-Tests                     | ~1h     | neuer Test                              |
| T-5   | localStorage-Tests                   | ~1h     | neuer Test                              |

### Prio 3 (Low) — Backlog

| #     | Finding                            | Aufwand | Dateien                                         |
| ----- | ---------------------------------- | ------- | ----------------------------------------------- |
| S5-2  | $derived Funktion in FormActions   | ~5min   | FormActions.svelte                              |
| S5-3  | DOM-Zugriff in $effect verschieben | ~15min  | StepNavigation.svelte, Step3Observations.svelte |
| D5-4  | Duplizierte Card-Hover-Styles      | ~5min   | AnimalInfo.svelte, SightingDetails.svelte       |
| D5-5  | Redundante RequiredConsent-Styles  | ~5min   | RequiredConsent.svelte                          |
| UX-5  | "notes" Feld prüfen                | ~10min  | Step4Contact.svelte                             |
| UX-6  | Focus-Management bei Step-Wechsel  | ~30min  | StepNavigation.svelte                           |
| SEC-2 | WeatherData Schema-Validierung     | ~1h     | +server.ts                                      |
| SEC-3 | Persistent Rate Limiting           | Future  | Architektur                                     |
| T-6   | WeatherData Tests                  | ~30min  | neuer Test                                      |
| T-7   | Upload-Endpoint Tests              | ~1h     | neuer Test                                      |

---

## Fazit

Das Sichtungsformular ist insgesamt **gut umgesetzt** mit moderner Svelte 5 Architektur und durchdachter UX. Die größten Verbesserungspotentiale liegen in:

1. **Testabdeckung ausbauen** — besonders E2E-Submit und Komponenten-Tests
2. **CSS-Architektur aufräumen** — !important-Overrides eliminieren
3. **FormSteps-Validierung** — unvalidiertes Step-Springen verhindern
4. **Kleine Svelte 5 Bugs** — $derived vs $derived.by, class:loading

Die Security ist auf gutem Niveau mit Defense-in-Depth (Honeypot, Whitelist, Rate Limit, Validation). Die GDPR-konforme Storage-Implementierung ist durchdacht.
