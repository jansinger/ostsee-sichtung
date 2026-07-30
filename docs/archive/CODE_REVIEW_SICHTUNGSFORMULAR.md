# Code Review: Sichtungsformular

**Datum:** 2026-04-11
**Letzte Verifikation:** 2026-04-13
**Scope:** Hauptformular (Multi-Step Sichtungsformular), ohne Admin und Map
**Dateien analysiert:** ~30 Svelte-Komponenten, ~1.200 Zeilen Validation, ~570 Zeilen API

---

## Aktueller Stand (2026-04-13)

Von ursprünglich 25 Findings wurden **22 vollständig behoben**. 3 Findings sind noch offen:

| Finding        | Beschreibung                                                                       | Prio   | Aufwand |
| -------------- | ---------------------------------------------------------------------------------- | ------ | ------- |
| **T-2** (Rest) | Komponenten-Tests: FormField, BaseInput/Select/Checkbox, StepNavigation, FormSteps | High   | ~2h     |
| **T-5** (Rest) | `clearFormDataOnly()` und `clearAllStorage()` ohne Tests                           | Medium | ~30min  |
| **T-7**        | Upload-Endpoint `/api/files/upload` — Basis-Tests vorhanden, Happy Path fehlt      | Low    | ~1h     |

**Architektur-Backlog (kein aktiver Handlungsbedarf):**

| Finding   | Beschreibung                                           | Prio         | Aufwand     |
| --------- | ------------------------------------------------------ | ------------ | ----------- |
| **SEC-3** | In-Memory Rate Limiting — kein Redis, nicht persistent | Low (Future) | Architektur |

---

## Behobene Findings (Commit-Historie)

| Finding             | Commit    | Was behoben wurde                                                                                       |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| UX-1                | nach #454 | `canNavigateToStep()` Guard in FormSteps.svelte — kein unvalidiertes Vorwärts-Springen mehr             |
| D5-1                | nach #454 | Alle 45+ `!important`-Overrides entfernt — nur noch 3 für `prefers-reduced-motion` erlaubt              |
| T-1                 | nach #454 | E2E Submit-Flow vollständig implementiert: Happy Path, API-Mock, 500/400/Netzwerkfehler                 |
| T-2 (FieldRenderer) | #454      | 7 Vitest-Browser-Tests für FieldRenderer.svelte                                                         |
| S5-1                | nach #454 | `$effect`-Kommentar klärt Trennung, kein Doppel-Trigger mehr                                            |
| S5-2                | nach #454 | `$derived.by()` korrekt, kein `$derived(() => ...)` mehr                                                |
| S5-3                | nach #454 | DOM-Zugriff innerhalb von Funktionen, nicht auf Modul-Ebene                                             |
| D5-2                | #454      | `class:loading` entfernt, `{#if $isSubmitting}<span class="loading ...">` stattdessen                   |
| D5-3                | nach #454 | `rgba()`/`rgb()` durch `oklch(0% 0 0 / ...)` ersetzt                                                    |
| D5-4                | nach #454 | Lokale Card-Hover-Styles entfernt — `SectionCard.svelte` konsolidiert in app.css                        |
| D5-5                | nach #454 | Custom `<style>`-Block in RequiredConsent entfernt — Tailwind generiert die Klassen                     |
| UX-2                | nach #454 | Toast-Notification beim Laden gespeicherter Daten: "Ihre vorherigen Eingaben wurden wiederhergestellt." |
| UX-3                | nach #454 | `window.location.reload()` entfernt — selektives State-Reset ohne Page-Reload                           |
| UX-4                | nach #454 | Redundante Success-Alert in ModernReportForm entfernt                                                   |
| UX-5                | nach #454 | `notes`-Feld im Yup-Schema vorhanden (`max(1000)`)                                                      |
| UX-6                | nach #454 | `scrollAndFocusStep()` setzt Focus auf `h2` des neuen Steps (Screen-Reader-Support)                     |
| SEC-1               | nach #454 | `loadFromStorage()` Whitelist-Sanitization — nur bekannte Keys, Typ-Prüfung, Fallback                   |
| SEC-2               | nach #456 | `weatherDataValidation.ts` validiert WeatherData server-seitig vor DB-Write                             |
| T-3                 | nach #454 | Honeypot-Test in endpoint.test.ts: `_honeypot: 'i-am-a-bot'` → 400                                      |
| T-4                 | nach #454 | `rateLimit.test.ts`: 9 Tests für checkRateLimit, createIdentifier, enforceRateLimit                     |
| T-6                 | nach #456 | `weatherDataValidation.test.ts` vorhanden                                                               |

---

## Offene Findings (Detail)

### T-2 (Rest): Fehlende Komponenten-Tests

Noch nicht getestet:

- `FormField.svelte` (Schema-Integration, Fehleranzeige)
- `BaseInput.svelte`, `BaseSelect.svelte`, `BaseCheckbox.svelte` (State-Handling)
- `StepNavigation.svelte` (Navigation + Validierungslogik)
- `FormSteps.svelte` (Step-Klick-Verhalten mit `canNavigateToStep`)

**Fix:** Vitest-Browser-Tests mit `vitest-browser-svelte`.

---

### T-5 (Rest): clearFormDataOnly / clearAllStorage ohne Tests

`src/lib/storage/localStorage.ts` enthält zwei ungetestete Export-Funktionen:

- `clearFormDataOnly()` (Zeile 207) — löscht nur FORM_DATA, behält Kontaktdaten
- `clearAllStorage()` (Zeile 289) — DSGVO-Löschung aller Storage-Einträge aus beiden Storages

**Fix:** Tests an `localStorage.test.ts` anhängen (analog zu bestehenden Patterns im selben File).

---

### T-7: Upload-Endpoint — Happy Path ohne Test

`src/routes/api/files/upload/endpoint.test.ts` existiert mit 5 Validierungs-Tests (non-multipart, kein File, ungültige IDs). Folgendes ist getestet:

- `magicBytes.test.ts` ✅
- `requestValidation.test.ts` ✅
- `endpoint.test.ts` — Validierungsfehler (400-Responses) ✅

Fehlend: Erfolgreicher Upload-Flow (Happy Path), Rate-Limiting-Verhalten.

---

### SEC-3: In-Memory Rate Limiting (Architektur)

Rate Limiting nutzt In-Memory-Store. Bei Server-Neustart werden Limits zurückgesetzt.
Für aktuelles Single-Instance-Deployment akzeptabel.

**Wenn nötig:** Redis-basiertes Rate Limiting bei Multi-Instance-Deployment einführen.

---

## Ursprüngliche Zusammenfassung (2026-04-11)

| Kategorie              | Bewertung       | Findings                             |
| ---------------------- | --------------- | ------------------------------------ |
| Svelte 5 Patterns      | **Sehr gut**    | 3 Findings (1 Medium, 2 Low)         |
| DaisyUI v5             | **Gut**         | 5 Findings (1 High, 2 Medium, 2 Low) |
| Benutzerfreundlichkeit | **Gut**         | 6 Findings (1 High, 3 Medium, 2 Low) |
| Sicherheit             | **Sehr gut**    | 4 Findings (1 Medium, 3 Low)         |
| Testabdeckung          | **Ausreichend** | 7 Findings (2 High, 3 Medium, 2 Low) |

**Gesamt: 25 Findings** (0 Critical, 4 High, 10 Medium, 11 Low)

Das Sichtungsformular ist insgesamt **sehr gut umgesetzt** mit moderner Svelte 5 Architektur,
durchdachter UX, Defense-in-Depth Security (Honeypot, Whitelist, Rate Limit, Validation)
und GDPR-konformem Storage.
