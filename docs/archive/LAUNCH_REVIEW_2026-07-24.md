# Launch-Review Ostsee-Tiere — 2026-07-24

Umfassender Pre-Launch-Review: Security, UX/Design-System, Produktionsreife, Dependencies,
Doku-Abgleich. Grundlage: statische Code-Analyse durch spezialisierte Review-Agenten +
`npm audit`, `npm run test:quick`. Keine Laufzeit-/Penetrationstests.

**Gesamturteil:** Solide, überdurchschnittlich sorgfältig gebaute App (starke ARIA-Verdrahtung,
konsequente Admin-Autorisierung, parametrisierte Queries, GDPR-Feldfilterung). Vor dem Launch
sind einige klar umrissene Punkte zu beheben — v. a. 3 Security-HIGH und 4 UX-HIGH. Keine
CRITICAL-Findings.

---

## 0. Test-/Build-Status

- `npm run lint`: 0 Fehler, 2 `any`-Warnings (nur in Test-Helper `src/tests/contract/helpers/createEvent.ts`).
- `type-check`, `svelte-check`: grün (nach `svelte-kit sync`).
- Unit-Tests: **1577 / 1578 grün**. Der eine Fehlschlag ist ein flakiger Performance-Test
  (`checkBalticSeaFile.comprehensive.test.ts:444`, erwartet <20 ms, unter Last 43 ms) — kein
  Funktionsdefekt. Empfehlung: Schwelle anheben oder Assertion entfernen, damit CI nicht flaky ist.

---

## 1. Security

**Gut abgesichert (geprüft):** Admin-/`/api/admin`-Routen erzwingen durchgängig `requireUserRole`;
JWT/Session via `jose` (httpOnly/secure/sameSite=lax, PKCE+state, AES-256-GCM-Verifier);
durchgängig parametrisierte Drizzle-Queries (kein `sql.raw`); mehrstufiger Path-Traversal-Schutz;
GDPR-Feldfilterung in `showreports.json`/`api/map/sightings` (Name/Schiff nur mit Consent, nie
E-Mail/Telefon/Adresse); beide `{@html}` nutzen `sanitizeHtml()`; Handlebars-Autoescape; keine
Secrets im Repo; **Produktions-Dependencies: 0 Vulnerabilities**.

### HIGH (vor Launch beheben)

1. **Open Redirect im OAuth-Callback.** `returnUrl` wird ungeprüft aus dem Query-String
   übernommen und in `redirect(302, returnUrl)` verwendet.
   `src/routes/api/auth/callback/+server.ts:19,60` (+ Weiterschleifen in `login/+server.ts:8,15`).
   → Post-Login-Phishing auf beliebige externe Domain. **Fix:** `returnUrl` auf relative
   Same-Origin-Pfade beschränken (`startsWith('/') && !startsWith('//')`), sonst `/`.

2. **Öffentliche Datei-Auslieferung ohne Freigabe-Prüfung.** `/uploads/[...path]` liefert jede
   Datei ohne DB-/Freigabe-/Auth-Check und mit `Access-Control-Allow-Origin: *` aus — parallel zur
   korrekt abgesicherten Route `/api/media/[...path]` (prüft `approvedAt` + Admin).
   `src/routes/uploads/[...path]/+server.ts`. Aktiv genutzt via `LocalStorageProvider.getUrl()`
   (`storage/local.ts:168`), `MediaFile.ts:80`, `MediaGallery.svelte`. → Medien nicht freigegebener
   Sichtungen (Totfunde, GPS-EXIF) öffentlich abrufbar. **Fix:** Route auf denselben DB-Freigabe-Check
   umstellen oder entfernen und alle Links auf `/api/media/...` umziehen.

3. **In-Memory Rate Limiting — Deployment-abhängig.** `rateLimitStore = new Map()`
   (`middleware/rateLimit.ts:26`). **Auflösung (2026-07-24):** Produktion läuft als
   **Single-Container-Docker** (adapter-node), nicht Vercel — dort ist der In-Memory-Zähler
   **korrekt und wirksam**, kein Code-Fix nötig. Erforderlich war jedoch die Client-IP-Auflösung
   hinter dem Reverse Proxy: `ADDRESS_HEADER`/`XFF_DEPTH`/`PROTOCOL_HEADER`/`HOST_HEADER` sind jetzt
   in `docker-compose.production.yml` und `.env.docker` gesetzt und in `docs/ENVIRONMENT.md`
   dokumentiert. Ohne diese hätte `getClientAddress()` allen Requests die Proxy-IP zugewiesen und
   das IP-Rate-Limiting global statt pro Client greifen lassen. Hinweis für die Zukunft: Bei
   horizontaler Skalierung (mehrere Replicas) ist ein gemeinsamer Store (Redis/Postgres) nötig.

### MEDIUM

4. `application/pdf` ohne Magic-Bytes-Signatur → Upload-Whitelist für PDF faktisch unwirksam
   (`validation/magicBytes.ts`). Fix: `%PDF-`-Signatur ergänzen.
5. `ENCRYPTION_KEY` ohne Fail-Fast-Guard; `.env.example` liefert gültigen Default-Key. Analog zum
   vorhandenen `SESSION_SECRET`-Guard (`hooks.server.ts:21`) prüfen, dass ≠ Platzhalter in Prod.
6. CSP global `script-src 'unsafe-inline'` (für Scalar-Doku, aber app-weit); generierter
   `cspNonce` (`hooks.server.ts:44`) wird nirgends verwendet (toter Code). Fix: auf `/docs/api/scalar`
   beschränken oder echtes Nonce-Scripting.
7. `/api/csp-report` unauthentifiziert, ohne Rate-Limit, loggt `fullReport` ungefiltert bei
   50 MB Body-Limit → Log-Flooding. Fix: Rate-Limit + Feldbegrenzung.
8. `securityHeaders.ts:36` schreibt global alle `SameSite=Strict`-Cookies auf `None` um (Footgun
   für künftige Cookies). Fix: nur den benötigten Cookie-Namen gezielt behandeln.
9. `/api/files/delete` ohne Rate-Limit und ohne Ownership-Prüfung für anonyme Uploads
   (`sightingId === null`). Fix: Rate-Limit + `uid`/Session-Abgleich.

### LOW

10. `error.message` an Client (`api/map/sightings/+server.ts:89`, `rest_sichtungen:153`).
11. Legacy-`search`-Parameter ist ein Email-Oracle (spec-bedingt, kein Fix ohne Spec-Bruch — Monitoring).
12. Keine Rate-Limits auf `/api/geo/inBaltic`, `/api/weather/historical`.
13. `getClientIp` XFF-Fallback in Prod spoofbar, falls Adapter nicht korrekt konfiguriert.
    **Behoben (2026-07-24):** `ADDRESS_HEADER`/`XFF_DEPTH` in Prod-Config gesetzt + in
    `docs/ENVIRONMENT.md` dokumentiert (inkl. Sicherheitshinweis zur Proxy-Anzahl).

---

## 2. UX & Design-System

**Positiv:** Theme `meeresmuseum` (oklch + WCAG-Kommentare, reduced-motion, globale Fokus-Indikatoren)
vorbildlich; Fokus-Management beim Schrittwechsel; ARIA-Grundgerüst (`aria-describedby/-invalid/-required`,
`role="alert"`); Reload-Wiederherstellung mit Toast + GDPR-Consent; Ladezustände; Karten-Tastaturkürzel.

### HIGH (vor Launch)

1. **Platzhalter-Support-Adresse** `mailto:support@example.com` auf der Fehlerseite
   (`+error.svelte:188`). Echte Adresse einsetzen.
2. **Lösch-Dialog visuell defekt + nicht barrierefrei.** `bg-opacity-50` existiert in Tailwind 4
   nicht mehr → Backdrop deckend schwarz; kein `<dialog>`/`aria-modal`/Fokus-Trap/ESC
   (`ui/Dialog/DeleteDialog.svelte:19`). Auf natives `<dialog>`-Muster (wie Spam-Check-Modal) +
   `bg-black/50` umstellen. Tote `bg-opacity-*`/`*-focus`-Utilities auch in `PublicNavbar.svelte:62`,
   `SightingsMapView.svelte:331,409`.
3. **"Formular zurücksetzen" ohne Bestätigung** (`FormActions.svelte:51`) löscht sofort alle
   Eingaben + Storage. Bestätigungsdialog ergänzen.
4. **Admin-Aktionen scheitern stumm** — Löschen/Verifizieren-Fehler nur im Logger, kein UI-Feedback
   (`admin/+page.svelte:242,323`). `toast.error(...)` ergänzen.

### MEDIUM (Auswahl)

5. Validierungs-Timing: Fehler erscheinen sofort bei Betreten eines unberührten Schritts
   (`StepNavigation.svelte`), widerspricht Design Guide; "Weiter"-Button `disabled` macht die
   gebaute Fehlernavigation zu totem Code. "Weiter" aktiv lassen + Fehlernavigation triggern.
6. Stepper ohne sichtbare Schritt-Namen, `role="tablist/tab"` falsch, klickbare `<li>` statt Buttons
   (`FormSteps.svelte:36`).
7. Fehlende `autocomplete`-Attribute auf Kontaktfeldern (WCAG 1.3.5).
8. Radiogruppen ohne `fieldset`/`legend`, Label-`for` zeigt ins Leere (`FieldRenderer.svelte:237`).
9. Tooltip-Inhalte per Tastatur unerreichbar (`tabindex="-1"`).
10. Hardcodierte Farben (`text-gray-*` etc.) auf Rand-Seiten (`about`, `docs`, `admin/settings`, Karten-UI).
11. Karte nicht per Tastatur wählbar (`OLMap.svelte` ohne `tabindex`) — abgemildert durch manuelle
    Koordinatenfelder, dort aber Label-Mismatch `for="dd-latitude"` vs. `id="latitude"`.
12. Admin-Tabellen-Sortierung nicht barrierefrei (`<th onclick>` ohne Button/`aria-sort`).
13. Drei parallele Dialog-Systeme + native `confirm()`/`alert()` — konsolidieren.
14. Erfolgsseite: Tierart hart auf 0/1/2 gemappt statt `getSpeciesLabel()`; Tippfehler "gehen"→"geben";
    Text "Upload per E-Mail" widerspricht Direkt-Upload (`SubmissionSuccess.svelte`).
15. Landmarks/Skip-Link fehlen; `admin/+layout.svelte` verschachtelt `<main>` in `<main>`.

### LOW

17. Sprachfehler in Yup-Messages ("Handeltete", "Lebende"/"Junge" groß) — `sightingSchema.ts:385,400`.
18. Erfundene Social-Proof-Zahl "2.847 Sichtungen" (`sightingSchema.ts:220`).
19. Vertauschte lat/lng-Defaults in `LocationInput.svelte:8`.
20. Fehlerseiten-Titel "Sichtungen WebApp" statt "Ostsee-Tiere"; undefinierter `pulse`-Keyframe.

---

## 3. Produktionsreife

**Positiv:** Middleware-Reihenfolge korrekt + fail-open bei Config-Fehlern; Fail-fast für
`SESSION_SECRET`; Dockerfile (non-root, multi-stage, dumb-init, Healthcheck, Log-Rotation);
Legacy-Routen mit durchgängigem try/catch + Ergebnis-Limit 1000; CI deckt Lint/Types/Tests/E2E ab.

### HIGH

1. **Health-Check prüft keine DB.** Der DB-Block in `src/routes/health/+server.ts:29` ist
   auskommentiert → `/health` liefert immer 200, auch bei DB-Ausfall → Docker/Compose-Healthcheck
   markiert Container nie als unhealthy, kein Auto-Restart. Fix: DB-Check aktivieren, ggf.
   Liveness (`/health`) von Readiness (`/health/ready`) trennen.

### MEDIUM

2. `saveSighting()` nicht transaktional — Insert + Media-Verknüpfung getrennt
   (`sightingRepository.ts:82` + `sightingFilesRepository.ts:49`) → verwaiste Medien bei Fehler
   dazwischen. In `db.transaction()` kapseln.
3. E-Mail-Versand blockiert synchron die API-Response (`await` vor Response in
   `rest_sichtungen:181`, `api/sightings:220`); nodemailer + Open-Meteo-`fetch` ohne Timeout →
   Response hängt bis zu Minuten bei SMTP-Ausfall. Fire-and-forget oder kurze explizite Timeouts.
4. Kein globales Pino-`redact` — `sightingRepository.ts:70,78` loggt komplettes Objekt inkl. E-Mail
   im Klartext. Zentrales `redact: { paths: [...], remove: true }` in `serverLogger.ts`.
5. Kein `handleError`-Hook → unerwartete Fehler nicht strukturiert geloggt.
6. Postgres ohne explizite Pool-/Timeout-Config (`db/index.ts:42`) → Connection-Exhaustion-Risiko
   auf Serverless. `postgres(url, { max, idle_timeout, connect_timeout })`.
7. Kein Graceful-Shutdown (SIGTERM) → abrupter Abbruch laufender Requests bei Deploy.
8. OpenLayers statisch in die Startseite gebundelt (`LocationInput.svelte` → `OLMap`) → großes
   Initial-Bundle. Lazy `import()`.

### LOW

- In-Memory-Rate-Limit nicht Multi-Instanz-fähig (siehe Security #3).
- ~~Kein Index auf `sightings.verified` trotz häufigem Filter.~~ **Geprüft 2026-08-20 —
  bewusst nicht angelegt.** Der Punkt nannte die falsche Spalte: `geprueft` wird seit
  2026-08 nicht mehr gelesen (Guard: `verifiedReadScan.test.ts`); der öffentliche Filter
  ist `freigegeben_am IS NOT NULL`. Auf **diese** Spalte trägt ein Index nicht — gemessen
  mit `EXPLAIN (ANALYZE, BUFFERS)` gegen die lokale DB (19.953 Zeilen, 14 MB Heap):
  - **Das Prädikat ist nicht selektiv.** 19.289 von 19.953 Zeilen (96,7 %) sind
    freigegeben; die Karten-Grundmenge liefert 18.892 von 19.953 (94,7 %). Einen Btree
    über ein Prädikat, das fast jede Zeile trifft, wählt kein kostenbasierter Planner.
  - **Der Plan ändert sich nicht.** Mit angelegtem Kandidaten — partiell
    (`(freigegeben_am) WHERE freigegeben_am IS NOT NULL`) wie zusammengesetzt
    (`(sichtungsdatum) WHERE freigegeben_am IS NOT NULL`) — bleibt die Abfrage hinter
    `GET /api/map/sightings` ein **Seq Scan**: 1.805 Buffer, ~11–16 ms.
  - **Erzwungen wird es schlechter.** Mit `enable_seqscan = off` wählt der Planner einen
    Bitmap Heap Scan (12,5 ms gegen 11,5 ms). Als geordneter Index Scan — der einzige
    Weg, der den Sort sparen würde — kostet er 17.391 statt 1.805 Buffer, also 9,6× so
    viel I/O. Der Planner-Cost sagt dasselbe: 7.908 gegen 3.391.
  - **Der scheinbare Gewinn beim Jahresfilter war Bloat, nicht der Index.** Der
    zusammengesetzte Kandidat sah bei `?year=2025` zunächst 2,7× schneller aus (0,40 ms
    gegen 1,1–2,5 ms). Ursache ist nicht der neue Index, sondern der vorhandene
    `idx_sichtungsdatum`: Ein bloßes `REINDEX` darauf liefert dieselben 0,44 ms. Der
    Kandidat wäre das Duplikat eines Index, der lediglich Wartung braucht (896 kB
    gegen 440 kB frisch gebaut, also gut 2× aufgebläht).

  Folge: keine Schema-Änderung, keine Migration. Neu zu bewerten, sobald der Anteil
  nicht freigegebener Meldungen deutlich steigt — erst dann wird das Prädikat selektiv.

- `RUN_MIGRATIONS`/`drizzle-kit migrate` im Entrypoint läuft mangels Migrationsverzeichnis ins Leere.
- `SKIP_DB_CHECK` nicht in `docs/ENVIRONMENT.md`.

---

## 4. Dependencies

- **Produktion: 0 Vulnerabilities.** Alle Kern-Libs aktuell (Svelte 5.56, SvelteKit 2.70,
  Drizzle 0.45, OpenLayers 10.9, jose 6.2, pino 10.3, nodemailer 9, handlebars 4.7.9, sanitize-html 2.17).
- 13 Audit-Findings (5 high) ausschließlich in **Dev-Tooling**: `commitizen`
  (lodash/tmp/inquirer), `drizzle-kit` (altes esbuild), `eslint-plugin-svelte` (yaml 1.x),
  `@cyclonedx/cyclonedx-npm` (fast-uri), `vitest-openapi` (axios). Kein Runtime-Risiko.
- Verfügbare Major-Updates (alle Dev, optional): commitlint 21, cyclonedx-npm 6,
  prettier-plugin-svelte 4, vitest-browser-svelte 3, @types/node 26. Prod nur `html-to-text` 9→10.
- Empfehlung: `npm audit fix` (non-breaking) für die Dev-Deps nach Launch; nicht launch-blockierend.

---

## 5. Doku-Abgleich (.claude) — bereits korrigiert

Im Zuge dieses Reviews aktualisiert:

- `svelte-forms-lib` → projekteigene `createForm`-Implementierung (`CLAUDE.md`, `architecture.md`,
  `forms.md`, `agents/form-development.md`).
- `security.md`: `isomorphic-dompurify` → `sanitize-html`; `rateLimit`-Pfad/API korrigiert;
  CodeQL-Behauptung → tatsächlicher SARIF-Upload in `docker-publish.yml`.
- `form-development.md`: `formState.ts` → `src/lib/report/formConfig.ts`.
- `maps.md`: `dataLoader.ts` entfernt, reale Dateien ergänzt.
- `architecture.md`: Strukturdiagramm auf reale Verzeichnisse aktualisiert; Beispiel-Importpfad.
- `docker.md`: Dual-Adapter (Vercel/Node via `USE_NODE_ADAPTER` + `build:docker`).
- `database.md`: `db:migrate`-Hinweis.

### Nachtrag 2026-07-27 — erledigt ✅

Der offene Bonus-Punkt (`src/lib/report/README.md` verweist auf `$lib/constants/…` statt
`$lib/report/formOptions/…`) ist behoben. Bei der Prüfung zeigte sich, dass der falsche
Importpfad nur ein Symptom war — die Datei beschrieb überwiegend eine nie gebaute
Architektur (`formStore.ts`, `CombinedField.svelte`, `combinedFields`, 3 statt 4 Schritte,
`form-design.md` als Quelle). Sie wurde gegen `src/` neu geschrieben.

Im selben Zug korrigiert, weil identisch veraltet:

- `.claude/rules/forms.md` — Feldnamen (`latitude`/`sightingDate`/`totalCount` statt
  `lat`/`date`/`count`), `touched` in der API-Liste ergänzt, 0-basierter `currentStep`,
  zwei- statt dreiargumentige `validateStep`/`isStepValid`, nicht existierende
  `.form-field`-CSS entfernt, handgeschriebenes Formular-Beispiel durch den Context-Weg
  (`Form.svelte` → `setFormContext` → `FormField`) ersetzt.

`docs/DESIGN_GUIDE.md` war ebenfalls betroffen, ist aber unabhängig davon mit **#567**
komplett neu geschrieben worden (419 → 161 Zeilen, deutsch, Leitlinien und verifizierter
Ist-Zustand getrennt). Diese Fassung deckt alle Punkte ab; eine parallele Korrektur wurde
verworfen. Ebenfalls mit #567: die verbindliche Kurzform `.claude/rules/design-system.md`.

Anmerkung zum Zeitpunkt: #567 hat `createForm` um einen `touched`-Store erweitert, der das
grüne Häkchen steuert (`touched && hasValue && !hasError` in `FieldRenderer`). Doku-Aussagen
über ein „fehlendes `touched`" beziehen sich auf den Stand **vor** #567.

---

## Empfohlene Launch-Reihenfolge

**Blocker (vor Go-Live):** Security HIGH 1–3, UX HIGH 1–4, Produktion HIGH 1, Tailwind-4-Altlasten
(`bg-opacity-*`, `*-focus`). **Kurz danach:** Security MEDIUM 4–9, Produktion MEDIUM 2–7,
UX MEDIUM 5–8. **Backlog:** restliche MEDIUM/LOW + Dev-Dependency-Updates.

### Stand dieser Reihenfolge am 2026-08-20

Diese Tabelle hält nur fest, was **tatsächlich nachgeprüft** wurde. Punkte ohne Zeile
sind damit nicht als offen oder erledigt behauptet — sie wurden in diesem Durchgang
schlicht nicht angefasst.

| Punkt                                                  | Stand 2026-08-20       | Beleg                                                                                                                             |
| ------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Produktion LOW — „Kein Index auf `sightings.verified`" | **Geprüft, verworfen** | Spalte überholt (`geprueft` wird nicht mehr gelesen); auf `freigegeben_am` misst der Index keinen Gewinn — siehe Abschnitt 3, LOW |

Nebenbefund aus derselben Messung, **nicht** Teil dieses Punktes und hier nicht
behoben: `idx_sichtungsdatum` ist auf der lokalen DB rund 2× aufgebläht (896 kB gegen
440 kB frisch gebaut) und kostet dadurch beim Jahresfilter etwa 1–2 ms. Ein
`REINDEX INDEX CONCURRENTLY idx_sichtungsdatum` wäre eine reine Wartungsmaßnahme auf
der jeweiligen Instanz, keine Schema-Änderung — ob die Produktionsdatenbank denselben
Bloat trägt, ist von hier aus nicht gemessen (Port dort nicht freigegeben).
