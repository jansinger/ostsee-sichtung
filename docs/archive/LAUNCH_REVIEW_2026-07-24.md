# Launch-Review Ostsee-Tiere — 2026-07-24

Umfassender Pre-Launch-Review: Security, UX/Design-System, Produktionsreife, Dependencies,
Doku-Abgleich. Grundlage: statische Code-Analyse durch spezialisierte Review-Agenten +
`npm audit`, `npm run test:quick`. Keine Laufzeit-/Penetrationstests.

**Gesamturteil:** Solide, überdurchschnittlich sorgfältig gebaute App (starke ARIA-Verdrahtung,
konsequente Admin-Autorisierung, parametrisierte Queries, GDPR-Feldfilterung). Vor dem Launch
sind einige klar umrissene Punkte zu beheben — v. a. 3 Security-HIGH und 4 UX-HIGH. Keine
CRITICAL-Findings.

---

## Nachtrag 2026-08-20 — verifizierter Stand gegen den Code

Dieses Review war bis hierher unabgehakt: Die Punkte unten waren zum großen Teil längst
umgesetzt, standen aber unverändert als offen da. Wer die Datei als Go-Live-Stand las,
bekam ein deutlich schlechteres Bild, als der Code hergab. Jeder Punkt wurde am
2026-08-20 **gegen `src/` geprüft** — nicht aus PR-Titeln oder Commit-Nachrichten
übernommen — und trägt jetzt einen Status direkt an der Fundstelle:

- **✅ behoben** — im Code nachgewiesen, Fundstelle in Klammern.
- **OFFEN** — im Code nachgewiesen weiterhin vorhanden.

**Bilanz:** Alle Blocker (Security HIGH 1–3, UX HIGH 1–4, Produktion HIGH 1,
Tailwind-4-Altlasten) sind erledigt, ebenso Security MEDIUM 4–9 und Produktion
MEDIUM 2–8 und UX MEDIUM 1–15. Die drei am 2026-08-20 noch offenen Punkte sind am selben
Tag nachgezogen worden: Produktion MEDIUM 8 (#901), Produktion LOW (#902 — mit dem
Ergebnis, dass der Index **nicht** gebaut wird, weil er gemessen nichts trägt) und
UX MEDIUM 13 (#904). Offen bleiben die Dependencies und Security LOW 12; Security LOW 11
bleibt bewusst offen (Legacy-API-Vertrag). Die vollständige Restliste steht am Ende unter
„Stand dieser Reihenfolge am 2026-08-20".

**Eine Einschränkung zur Prüfmethode, die #904 aufgedeckt hat.** Dieser Nachtrag nannte
`FormActions.svelte:36` die „letzte verbliebene" `confirm()`-Fundstelle. Das war nicht
gedeckt: Gesucht wurde mit einem Muster, das ein Leerzeichen oder einen Tabulator vor
`confirm(` verlangte, und `if (!confirm(…))` in `AdminSightingEditForm.svelte:144` passte
auf keins von beidem. Die Stelle ist inhaltlich harmlos — sie hängt an `beforeunload`,
dort gehört der Dialog dem Browser, und #904 hat sie bewusst nativ gelassen. Die
**Aussage** war trotzdem zu stark. Wer die Statusmarker hier weiterverwendet: Sie belegen
jeweils, dass ein Muster keinen Treffer hatte — nicht, dass es keine anderen
Schreibweisen gibt.

**Ein Punkt hat sich seit dem Review verschlechtert** — siehe Abschnitt 4:
Die Produktions-Dependencies sind nicht mehr sauber.

**Test-/Build-Status am 2026-08-20:** `npm run test:quick` grün, Exit 0 —
437 Testdateien, 6218 Tests, keine Fehlschläge. Der 2026-07-24 notierte flakige
Performance-Test tritt nicht mehr auf. Keine `TODO`/`FIXME` im Produktivcode.

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
Secrets im Repo; **Produktions-Dependencies: 0 Vulnerabilities** — _Stand 2026-07-24; am
2026-08-20 nicht mehr zutreffend, siehe Abschnitt 4_.

### HIGH (vor Launch beheben)

1. **✅ behoben — Open Redirect im OAuth-Callback.** _(`sanitizeReturnUrl()` aus
   `$lib/server/auth/returnUrl`, angewandt in `api/auth/callback/+server.ts` sowohl beim
   Flow-Neustart als auch beim finalen `redirect(302, …)`.)_ `returnUrl` wird ungeprüft aus dem Query-String
   übernommen und in `redirect(302, returnUrl)` verwendet.
   `src/routes/api/auth/callback/+server.ts:19,60` (+ Weiterschleifen in `login/+server.ts:8,15`).
   → Post-Login-Phishing auf beliebige externe Domain. **Fix:** `returnUrl` auf relative
   Same-Origin-Pfade beschränken (`startsWith('/') && !startsWith('//')`), sonst `/`.

2. **✅ behoben — Öffentliche Datei-Auslieferung ohne Freigabe-Prüfung.**
   _(`assertFileAccessAllowed()` in `src/routes/uploads/[...path]/+server.ts` joint
   `sichtungen_dateien` auf `sichtungen`, prüft `isSightingApproved()` und lässt
   Unfreigegebenes nur für `isAdminUser()` durch; unbekannte Datei → 404.)_ `/uploads/[...path]` liefert jede
   Datei ohne DB-/Freigabe-/Auth-Check und mit `Access-Control-Allow-Origin: *` aus — parallel zur
   korrekt abgesicherten Route `/api/media/[...path]` (prüft `approvedAt` + Admin).
   `src/routes/uploads/[...path]/+server.ts`. Aktiv genutzt via `LocalStorageProvider.getUrl()`
   (`storage/local.ts:168`), `MediaFile.ts:80`, `MediaGallery.svelte`. → Medien nicht freigegebener
   Sichtungen (Totfunde, GPS-EXIF) öffentlich abrufbar. **Fix:** Route auf denselben DB-Freigabe-Check
   umstellen oder entfernen und alle Links auf `/api/media/...` umziehen.

3. **✅ behoben (2026-07-24) — In-Memory Rate Limiting — Deployment-abhängig.** `rateLimitStore = new Map()`
   (`middleware/rateLimit.ts:26`). **Auflösung (2026-07-24):** Produktion läuft als
   **Single-Container-Docker** (adapter-node), nicht Vercel — dort ist der In-Memory-Zähler
   **korrekt und wirksam**, kein Code-Fix nötig. Erforderlich war jedoch die Client-IP-Auflösung
   hinter dem Reverse Proxy: `ADDRESS_HEADER`/`XFF_DEPTH`/`PROTOCOL_HEADER`/`HOST_HEADER` sind jetzt
   in `docker-compose.production.yml` und `.env.docker` gesetzt und in `docs/ENVIRONMENT.md`
   dokumentiert. Ohne diese hätte `getClientAddress()` allen Requests die Proxy-IP zugewiesen und
   das IP-Rate-Limiting global statt pro Client greifen lassen. Hinweis für die Zukunft: Bei
   horizontaler Skalierung (mehrere Replicas) ist ein gemeinsamer Store (Redis/Postgres) nötig.

### MEDIUM

4. **✅ behoben** _(`magicBytes.ts:46` trägt `[0x25, 0x50, 0x44, 0x46, 0x2d]` = `%PDF-`.)_
   `application/pdf` ohne Magic-Bytes-Signatur → Upload-Whitelist für PDF faktisch unwirksam
   (`validation/magicBytes.ts`). Fix: `%PDF-`-Signatur ergänzen.
5. **✅ behoben** _(`config/secretGuard.ts` prüft Vorhandensein in Prod, Platzhalter,
   Länge 64 und Hex-Alphabet.)_
   `ENCRYPTION_KEY` ohne Fail-Fast-Guard; `.env.example` liefert gültigen Default-Key. Analog zum
   vorhandenen `SESSION_SECRET`-Guard (`hooks.server.ts:21`) prüfen, dass ≠ Platzhalter in Prod.
6. **✅ entschieden statt gefixt** _(`hooks.server.ts:59` begründet im Kommentar, warum ein
   Nonce neben dem für die Scalar-Doku nötigen `'unsafe-inline'` wirkungslos wäre; der tote
   `cspNonce` ist entfernt.)_
   CSP global `script-src 'unsafe-inline'` (für Scalar-Doku, aber app-weit); generierter
   `cspNonce` (`hooks.server.ts:44`) wird nirgends verwendet (toter Code). Fix: auf `/docs/api/scalar`
   beschränken oder echtes Nonce-Scripting.
7. **✅ behoben** _(`api/csp-report/+server.ts`: `enforceRateLimit()` mit 60 Requests/Minute,
   und es werden nur bekannte CSP-Felder geloggt — kein `fullReport` mehr.)_
   `/api/csp-report` unauthentifiziert, ohne Rate-Limit, loggt `fullReport` ungefiltert bei
   50 MB Body-Limit → Log-Flooding. Fix: Rate-Limit + Feldbegrenzung.
8. **✅ behoben** _(`securityHeaders.ts` schreibt keine Cookies mehr um; der Session-Cookie
   setzt `SameSite=None; Secure` direkt in `auth.ts`.)_
   `securityHeaders.ts:36` schrieb global alle `SameSite=Strict`-Cookies auf `None` um (Footgun
   für künftige Cookies). Fix: nur den benötigten Cookie-Namen gezielt behandeln.
9. **✅ behoben** _(`api/files/delete/+server.ts:37` `enforceRateLimit(…, 'file_delete')`;
   ab `:97` muss die cookie-gebundene Owner-`uid` mit `sichtungen_dateien.uid`
   übereinstimmen, sonst Abweisung mit `upload_uid_mismatch`.)_
   `/api/files/delete` ohne Rate-Limit und ohne Ownership-Prüfung für anonyme Uploads
   (`sightingId === null`). Fix: Rate-Limit + `uid`/Session-Abgleich.

### LOW

10. **✅ behoben** _(`api/map/sightings/+server.ts:128` gibt nur noch
    `{ error: 'Fehler beim Abrufen der Sichtungen' }` heraus; der konkrete Fehler geht
    ausschließlich in den Logger — im Code kommentiert.)_
    `error.message` an Client (`api/map/sightings/+server.ts:89`, `rest_sichtungen:153`).
11. **Unverändert offen, bewusst** _(spec-gebunden — siehe die Legacy-API-Regel in
    `CLAUDE.md`: drei angebundene Mobile-Clients, Abweichung kostet echte Daten.)_
    Legacy-`search`-Parameter ist ein Email-Oracle (spec-bedingt, kein Fix ohne Spec-Bruch — Monitoring).
12. **OFFEN.** _(In beiden Routen kein `enforceRateLimit`-Aufruf.)_
    Keine Rate-Limits auf `/api/geo/inBaltic`, `/api/weather/historical`.
13. **✅ behoben (2026-07-24).** `getClientIp` XFF-Fallback in Prod spoofbar, falls Adapter nicht korrekt konfiguriert.
    **Behoben (2026-07-24):** `ADDRESS_HEADER`/`XFF_DEPTH` in Prod-Config gesetzt + in
    `docs/ENVIRONMENT.md` dokumentiert (inkl. Sicherheitshinweis zur Proxy-Anzahl).

---

## 2. UX & Design-System

**Positiv:** Theme `meeresmuseum` (oklch + WCAG-Kommentare, reduced-motion, globale Fokus-Indikatoren)
vorbildlich; Fokus-Management beim Schrittwechsel; ARIA-Grundgerüst (`aria-describedby/-invalid/-required`,
`role="alert"`); Reload-Wiederherstellung mit Toast + GDPR-Consent; Ladezustände; Karten-Tastaturkürzel.

### HIGH (vor Launch)

1. **✅ behoben** _(`grep -r "support@example.com" src/` → 0 Treffer.)_
   **Platzhalter-Support-Adresse** `mailto:support@example.com` auf der Fehlerseite
   (`+error.svelte:188`). Echte Adresse einsetzen.
2. **✅ behoben** _(`DeleteDialog.svelte` nutzt natives `<dialog>` mit
   `showModal()`/`close()` — Fokus-Trap und ESC kommen damit vom Browser. Die
   Tailwind-4-Altlasten sind projektweit weg — geprüft mit zwei Mustern, die
   ausschließlich Utility-Klassen treffen:
   `grep -rn "bg-opacity-" src/` und
   `grep -rnE "(bg|text|border|ring|outline)-(primary|secondary|accent|neutral|info|success|warning|error|base)-focus" src/`,
   beide 0 Treffer. Ein wörtliches `-focus` trifft dagegen einen Fundort, der nichts
   mit DaisyUI zu tun hat: den axe-Regelnamen `aria-hidden-focus` in einem Kommentar
   in `SightingsMapView.svelte:1033`.)_
   **Lösch-Dialog visuell defekt + nicht barrierefrei.** `bg-opacity-50` existiert in Tailwind 4
   nicht mehr → Backdrop deckend schwarz; kein `<dialog>`/`aria-modal`/Fokus-Trap/ESC
   (`ui/Dialog/DeleteDialog.svelte:19`). Auf natives `<dialog>`-Muster (wie Spam-Check-Modal) +
   `bg-black/50` umstellen. Tote `bg-opacity-*`/`*-focus`-Utilities auch in `PublicNavbar.svelte:62`,
   `SightingsMapView.svelte:331,409`.
3. **✅ behoben, aber siehe MEDIUM 13** _(`FormActions.svelte:36` fragt vor dem Zurücksetzen
   nach — allerdings per nativem `confirm()`, die Konsolidierung steht noch aus.)_
   **"Formular zurücksetzen" ohne Bestätigung** (`FormActions.svelte:51`) löscht sofort alle
   Eingaben + Storage. Bestätigungsdialog ergänzen.
4. **✅ behoben** _(Toasts liegen jetzt in `admin/sichtungen/+page.svelte` und
   `admin/[id]/+page.svelte` — die Aktionen sind bei der Admin-Überarbeitung aus
   `admin/+page.svelte` dorthin gewandert.)_
   **Admin-Aktionen scheitern stumm** — Löschen/Verifizieren-Fehler nur im Logger, kein UI-Feedback
   (`admin/+page.svelte:242,323`). `toast.error(...)` ergänzen.

### MEDIUM (Auswahl)

5. **✅ behoben** _(`StepNavigation.svelte` sperrt "Weiter" nur noch über `$isSubmitting`;
   der Kommentar bei `:366` hält ausdrücklich fest, dass kein `aria-disabled`/`btn-disabled`
   mehr gesetzt wird — die Fehlernavigation ist damit erreichbar.)_
   Validierungs-Timing: Fehler erscheinen sofort bei Betreten eines unberührten Schritts
   (`StepNavigation.svelte`), widerspricht Design Guide; "Weiter"-Button `disabled` macht die
   gebaute Fehlernavigation zu totem Code. "Weiter" aktiv lassen + Fehlernavigation triggern.
6. **✅ behoben** _(`FormSteps.svelte` trägt kein `role="tab"`/`"tablist"` mehr.)_
   Stepper ohne sichtbare Schritt-Namen, `role="tablist/tab"` falsch, klickbare `<li>` statt Buttons
   (`FormSteps.svelte:36`).
7. **✅ behoben** _(`FieldRenderer.svelte:197,274` reicht `meta.autocomplete` durch.)_
   Fehlende `autocomplete`-Attribute auf Kontaktfeldern (WCAG 1.3.5).
8. **✅ behoben** _(`FieldRenderer` wählt je Feld eine Markup-Form, sodass kein
   `label[for]` ins Leere zeigt — dokumentiert in `src/lib/report/README.md:188`.)_
   Radiogruppen ohne `fieldset`/`legend`, Label-`for` zeigt ins Leere (`FieldRenderer.svelte:237`).
9. **✅ behoben** _(die verbliebenen `tabindex="-1"` in `src/` sind durchweg gewollte
   Fokusziele — Skip-Ziel der Karte, Formularcontainer, Panel-Griff — keine Tooltips.)_
   Tooltip-Inhalte per Tastatur unerreichbar (`tabindex="-1"`).
10. **✅ behoben** _(`grep -r -- "text-gray-" src/` → 0 Treffer.)_
    Hardcodierte Farben (`text-gray-*` etc.) auf Rand-Seiten (`about`, `docs`, `admin/settings`, Karten-UI).
11. **✅ behoben** _(`OLMap.svelte:219` setzt `tabindex="0"`, bewusst mit
    `svelte-ignore a11y_no_noninteractive_tabindex` und Begründung im Markup.)_
    Karte nicht per Tastatur wählbar (`OLMap.svelte` ohne `tabindex`) — abgemildert durch manuelle
    Koordinatenfelder, dort aber Label-Mismatch `for="dd-latitude"` vs. `id="latitude"`.
12. **✅ behoben** _(`aria-sort` an den Spaltenköpfen, festgehalten in
    `admin/sichtungen/tableColumns.svelte.test.ts`.)_
    Admin-Tabellen-Sortierung nicht barrierefrei (`<th onclick>` ohne Button/`aria-sort`).
13. **✅ behoben (2026-08-20, #904)** — ein `ConfirmDialog` für alle Bestätigungen; der
    einzige verbliebene `confirm()`-Aufruf ist bewusst nativ (`beforeunload`). Details im
    Nachtrag unten.
    ~~Drei parallele Dialog-Systeme + native `confirm()`/`alert()` — konsolidieren.~~
14. **✅ behoben** _(`SubmissionSuccess.svelte:3,196` nutzt `getSpeciesLabel()`. Die beiden
    Textbefunde sind **im Botschaftskatalog** geprüft, nicht in der Komponente — seit der
    i18n-Umstellung stehen die Texte in `messages/de.json`, eine Suche nur über die
    `.svelte`-Datei liefe ins Leere: Der einzige Treffer für `\bgehen\b` im ganzen Katalog
    ist "Alle bisher eingegebenen Daten gehen verloren" (`formactions`, korrektes Deutsch);
    der Erfolgsseiten-Text lautet heute "Eine automatische Bestätigungsmail versenden wir
    nicht. Falls zu Ihrer Meldung etwas offen bleibt, melden wir uns bei Ihnen — per E-Mail
    an …" und behauptet keinen Upload per Mail mehr.)_
    Erfolgsseite: Tierart hart auf 0/1/2 gemappt statt `getSpeciesLabel()`; Tippfehler "gehen"→"geben";
    Text "Upload per E-Mail" widerspricht Direkt-Upload (`SubmissionSuccess.svelte`).
15. **✅ behoben** _(`routes/+layout.svelte:17-20` Skip-Link auf `#main-content`;
    `admin/+layout.svelte:17` verzichtet ausdrücklich auf ein eigenes `<main>`.)_
    Landmarks/Skip-Link fehlen; `admin/+layout.svelte` verschachtelt `<main>` in `<main>`.

### LOW

17. **✅ behoben** _(`messages/de.json:1306` "Handelte es sich um lebende Tiere oder einen
    Totfund?" — die Texte liegen seit der i18n-Umstellung im Botschaftskatalog.)_
    Sprachfehler in Yup-Messages ("Handeltete", "Lebende"/"Junge" groß) — `sightingSchema.ts:385,400`.
18. **✅ behoben** _(weder in `sightingSchema.ts` noch in `messages/de.json` auffindbar.)_
    Erfundene Social-Proof-Zahl "2.847 Sichtungen" (`sightingSchema.ts:220`).
19. **✅ behoben** _(`LocationInput.svelte` reicht `latitude`/`longitude` als `$bindable()`
    durch; die Kartendefaults stehen mit 54.5/13.5 richtig herum in `OLMap.svelte:14-15`.)_
    Vertauschte lat/lng-Defaults in `LocationInput.svelte:8`.
20. **✅ behoben** _(`+error.svelte:100` setzt den Titel über
    `routes_error_title_fehler_status_ostsee_tiere`; kein `pulse`-Keyframe mehr.)_
    Fehlerseiten-Titel "Sichtungen WebApp" statt "Ostsee-Tiere"; undefinierter `pulse`-Keyframe.

---

## 3. Produktionsreife

**Positiv:** Middleware-Reihenfolge korrekt + fail-open bei Config-Fehlern; Fail-fast für
`SESSION_SECRET`; Dockerfile (non-root, multi-stage, dumb-init, Healthcheck, Log-Rotation);
Legacy-Routen mit durchgängigem try/catch + Ergebnis-Limit 1000; CI deckt Lint/Types/Tests/E2E ab.

### HIGH

1. **✅ behoben — Health-Check prüft keine DB.** _(`routes/health/+server.ts` ruft
   `testDatabaseConnection()` und antwortet bei Ausfall mit 503 samt
   `database: 'disconnected'`; der Docker-Healthcheck greift damit.)_ Der DB-Block in `src/routes/health/+server.ts:29` ist
   auskommentiert → `/health` liefert immer 200, auch bei DB-Ausfall → Docker/Compose-Healthcheck
   markiert Container nie als unhealthy, kein Auto-Restart. Fix: DB-Check aktivieren, ggf.
   Liveness (`/health`) von Readiness (`/health/ready`) trennen.

### MEDIUM

2. **✅ behoben** _(`sightingRepository.ts:129` kapselt das Anlegen in `db.transaction()`,
   ebenso das Aufräumen bei `:458`.)_
   `saveSighting()` nicht transaktional — Insert + Media-Verknüpfung getrennt
   (`sightingRepository.ts:82` + `sightingFilesRepository.ts:49`) → verwaiste Medien bei Fehler
   dazwischen. In `db.transaction()` kapseln.
3. **✅ behoben** _(beide Routen setzen jetzt fire-and-forget: `api/sightings/+server.ts:308`
   und `rest_sichtungen/+server.ts:221` rufen `void EmailService.sendNewSightingNotification(id)`
   mit `.catch()`, jeweils mit Kommentar, dass der SMTP-Versand die Antwort nicht aufhalten darf.)_
   E-Mail-Versand blockierte synchron die API-Response (`await` vor Response in
   `rest_sichtungen:181`, `api/sightings:220`); nodemailer + Open-Meteo-`fetch` ohne Timeout →
   Response hängt bis zu Minuten bei SMTP-Ausfall. Fire-and-forget oder kurze explizite Timeouts.
4. **✅ behoben** _(`LOG_REDACTION` aus `src/lib/logger/redaction.ts` geht in die
   Pino-Optionen; `logger.test.ts:53` und `serverLogger.test.ts:50` halten fest, dass
   `redact.paths` u. a. `email` enthält.)_
   Kein globales Pino-`redact` — `sightingRepository.ts:70,78` loggt komplettes Objekt inkl. E-Mail
   im Klartext. Zentrales `redact: { paths: [...], remove: true }` in `serverLogger.ts`.
5. **✅ behoben** _(`hooks.server.ts:226` exportiert `handleError: HandleServerError`.)_
   Kein `handleError`-Hook → unerwartete Fehler nicht strukturiert geloggt.
6. **✅ behoben** _(`db/index.ts:49` setzt `max: 10`, `idle_timeout: 20`, `connect_timeout`;
   jede Option im Code begründet.)_
   Postgres ohne explizite Pool-/Timeout-Config (`db/index.ts:42`) → Connection-Exhaustion-Risiko
   auf Serverless. `postgres(url, { max, idle_timeout, connect_timeout })`.
7. **✅ behoben** _(`hooks.server.ts:279` `process.once('SIGTERM', …)` → `gracefulShutdown()`,
   schließt die DB-Verbindung.)_
   Kein Graceful-Shutdown (SIGTERM) → abrupter Abbruch laufender Requests bei Deploy.
8. **✅ behoben (2026-08-20, #901)** — OpenLayers hängt nicht mehr im Initial-Bundle.
   Die statische Hülle der Einstiegsseite fiel um 24,0 % roh / 21,8 % gzip. Der Umbau
   sitzt in `OLMap.svelte`, gilt damit für alle drei Aufrufer, und wird von
   `check:bundle` auf dem gebauten Chunk-Graphen bewacht. Messwerte, Fallstricke und
   Absicherung im Nachtrag unten.
   ~~OpenLayers statisch in die Startseite gebundelt (`LocationInput.svelte` → `OLMap`) → großes
   Initial-Bundle. Lazy `import()`.~~

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
  - **Der Plan ändert sich nicht.** Geprüft wurden zwei Kandidaten, beide partiell und
    beide einspaltig — einer auf der Filterspalte
    (`(freigegeben_am) WHERE freigegeben_am IS NOT NULL`), einer auf der Sortierspalte
    (`(sichtungsdatum) WHERE freigegeben_am IS NOT NULL`). Mit keinem von beiden wird die
    Abfrage hinter `GET /api/map/sightings` etwas anderes als ein **Seq Scan**: 1.805
    Buffer, ~11–16 ms.
  - **Erzwungen wird es schlechter.** Mit `enable_seqscan = off` wählt der Planner einen
    Bitmap Heap Scan (12,5 ms gegen 11,5 ms). Als geordneter Index Scan — der einzige
    Weg, der den Sort sparen würde — kostet er 17.391 statt 1.805 Buffer, also 9,6× so
    viel I/O. Der Planner-Cost sagt dasselbe: 7.908 gegen 3.391.
  - **Der scheinbare Gewinn beim Jahresfilter war Bloat, nicht der Index.** Der
    Kandidat auf `sichtungsdatum` sah bei `?year=2025` zunächst 2,7× schneller aus (0,40 ms
    gegen 1,1–2,5 ms). Ursache ist nicht der neue Index, sondern der vorhandene
    `idx_sichtungsdatum`: Ein bloßes `REINDEX` darauf liefert dieselben 0,44 ms. Der
    Kandidat wäre das Duplikat eines Index, der lediglich Wartung braucht (896 kB
    gegen 440 kB frisch gebaut, also gut 2× aufgebläht).

  Folge: keine Schema-Änderung, keine Migration. Neu zu bewerten, sobald der Anteil
  nicht freigegebener Meldungen deutlich steigt — erst dann wird das Prädikat selektiv.

- `RUN_MIGRATIONS`/`drizzle-kit migrate` im Entrypoint läuft mangels Migrationsverzeichnis ins Leere.
- `SKIP_DB_CHECK` nicht in `docs/ENVIRONMENT.md`.

- **✅ behoben** — `drizzle/` enthält inzwischen 9 Migrationen (`0000_initial.sql` ff.),
  der Entrypoint läuft nicht mehr ins Leere.
- **✅ behoben** — `SKIP_DB_CHECK` steht in `docs/ENVIRONMENT.md`.

---

## 4. Dependencies

- **⚠️ Nicht mehr zutreffend (geprüft 2026-08-20): 2 High in den Produktions-Dependencies.**
  `npm audit --omit=dev` meldet `deepmerge-ts <8.0.0` (Stack Exhaustion beim Mergen rekursiver
  Objektgraphen, GHSA-ggr8-5vv4-36mx), hereingezogen über `html-to-text@10.0.0`. Behebbar ohne
  Breaking Change per `npm audit fix`. Gesamtbild: 6 Findings (4 moderate, 2 high).
  Das ist der einzige Punkt dieses Reviews, der sich seit dem 2026-07-24 **verschlechtert** hat —
  und damit der einzige verbliebene Kandidat für „vor Go-Live".
  Der Stand vom 2026-07-24 lautete:
- ~~**Produktion: 0 Vulnerabilities.**~~ Alle Kern-Libs aktuell (Svelte 5.56, SvelteKit 2.70,
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

### Nachtrag 2026-08-20 zu UX MEDIUM 13 — Dialoge konsolidiert ✅

Es gibt jetzt **genau ein** Dialog-Bauteil: `src/lib/components/ui/Dialog/ConfirmDialog.svelte`
(natives `<dialog>` mit `showModal()`, damit Fokus-Trap, ESC und Top-Layer vom Browser
kommen). `DeleteDialog.svelte` und `admin/settings/ResetSettingsButton.svelte` tragen nur
noch ihre Texte und nutzen es; die Prop-Schnittstelle von `DeleteDialog` blieb unverändert,
die Aufrufstellen merken nichts davon.

Der Anlass war `FormActions.svelte`, die letzte Stelle im **Meldeformular** mit
`window.confirm()`. Sie fragt jetzt über denselben Dialog nach und nennt dabei zusätzlich,
was der Rückfragetext vorher verschwieg: Der Reset löscht nicht nur die Eingaben, sondern
auch den auf dem Gerät gespeicherten Zwischenstand, und das ist nicht rückgängig zu machen.

`ResetSettingsButton.svelte` war beim Umbau eine wörtliche Kopie von `DeleteDialog.svelte`
— gleicher `$effect`, gleicher Backdrop, gleicher Kommentar. Die Kopie war der eigentliche
Befund hinter „drei parallele Systeme"; ohne die gemeinsame Komponente wäre der Umbau von
`FormActions` die vierte geworden.

**Was der Punkt außerdem nannte, und was davon offen bleibt.** Von den `confirm()`-Aufrufen,
die der Punkt mitmeinte, steht noch **einer** — und der bewusst:

`AdminSightingEditForm.svelte:144` fragt beim Verlassen der Seite nach und ist an
`beforeunload` gekoppelt. Dort gehört der Dialog dem Browser; ein eigener käme gar nicht
mehr zur Anzeige (Begründung im Code, abgesichert in `AdminSightingEditForm.svelte.test.ts`).

Am selben Tag ebenfalls umgestellt wurden `admin/settings/CleanupPanel.svelte` und
`report/clearContactData.ts` — zwei Anmerkungen dazu, weil beide mehr als einen Import
verschoben haben:

- **Bei `CleanupPanel` wanderte „endgültig" vom Auslöser auf den bestätigenden Knopf.** Der
  Auslöser hieß „Endgültig löschen", löschte aber nichts, sondern öffnete nur die
  Rückfrage. Er heißt jetzt „Löschen", der Knopf im Dialog „Endgültig löschen" — dieselbe
  Aufteilung wie bei `ResetSettingsButton` („Zurücksetzen" → „Endgültig zurücksetzen").
- **Bei `clearContactData` verschob sich eine Zuständigkeit.** `confirmAndClearContactData`
  bündelte Rückfrage, Löschung und Toast und meldete per `boolean` zurück, ob bestätigt
  wurde. Ein `ConfirmDialog` beantwortet seine Frage aber nicht synchron im Funktionsaufruf,
  sondern über einen Callback. Die Rückfrage sitzt deshalb jetzt in `Step4Contact.svelte`,
  wo der Dialog steht; die Funktion heißt `clearContactDataWithFeedback`, trägt nur noch
  die Wirkung und gibt nichts mehr zurück.

---

### Nachtrag 2026-08-20 — Produktion MEDIUM 8 erledigt ✅

OpenLayers hängt nicht mehr im Initial-Bundle der Einstiegsseite.

Der Umbau sitzt in `src/lib/components/map/OLMap.svelte`, nicht bei den Aufrufern: Die
beiden statischen Wert-Importe (`$lib/utils/map/openLayersHelpers` und `ol/proj`) sind in
den bereits vorhandenen Init-`$effect` hinter `await import(...)` gewandert. Damit gewinnen
alle drei Einsatzorte auf einmal — Meldeformular (`LocationInput`), Admin-Ansicht
(`AdminSightingView`) und Foto-EXIF-Karte (`DropzoneEnhanced`) —, und ein künftiger vierter
Aufrufer kann den statischen Import nicht versehentlich zurückholen. Die `import type`-Zeilen
bleiben stehen; sie verschwinden beim Kompilieren ohnehin.

Solange der Chunk lädt, steht im Kartenfeld ein Ladehinweis (`data-testid="map-loading"`,
`role="status"`, Text aus `components_map_olmap_text_karte_wird_geladen`) — 400 px Leerfläche
ohne Erklärung wären für Screenreader-Nutzer nichts gewesen.

**Gemessen**, nicht geschätzt: statische Chunk-Hülle der Einstiegsseite (Route-Node `/`
plus Root-Layout plus Client-Entry, `npm run build`, dynamische Kanten bewusst nicht verfolgt):

|               | roh                      | gzip                    |
| ------------- | ------------------------ | ----------------------- |
| vorher        | 1.282.052 B              | 411.564 B               |
| nachher       | 973.863 B                | 321.968 B               |
| **Differenz** | **−308.189 B (−24,0 %)** | **−89.596 B (−21,8 %)** |

Der OpenLayers-Chunk (vorher 276.331 B roh / 79.895 B gzip) ist aus der statischen Hülle
verschwunden und wird jetzt als eigener Lazy-Chunk (263.130 B) nachgeladen.

Zwei Dinge, die bei der Messung auffielen und die man beim nächsten Anlauf nicht neu
herleiten muss:

- `src/lib/utils/format/formatLocation.ts` importiert `toStringHDMS` aus `ol/coordinate` und
  läuft synchron auf der Einstiegsseite (`SubmissionSuccess`, `DropzoneEnhanced`). Das ist
  **kein** übersehener Rest: Rollup trennt `ol/coordinate` samt Kleinkram in einen eigenen
  6.179-B-Chunk ab, der eager bleibt, während die 263 KB Karten-Laufzeit lazy sind. Wer diese
  6 KB für den vergessenen statischen Import hält, baut `formatLocation` unnötig um.
- Zwei aufeinanderfolgende `await import(...)` statt `Promise.all` kosten hier keinen zweiten
  Roundtrip: `openLayersHelpers` importiert `ol/proj` selbst, das Modul steckt also schon im
  Graphen des ersten Imports.

Schlägt das Nachladen fehl — ein Deploy wechselt die Chunk-Namen unter einer offenen Seite,
oder das Funknetz bricht weg —, erscheint statt des Spinners eine Fehlermeldung
(`data-testid="map-load-error"`, `role="alert"`), die auf die Koordinatenfelder verweist.
Ohne diese Behandlung bliebe der Spinner für immer stehen: `void (async () => …)()`
verschluckt die Rejection, und einen `hooks.client.ts`, der sie auffinge, gibt es in diesem
Projekt nicht.

Abgesichert durch vier Dateien:

| Datei                             | Was sie hält                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `OLMapSsr.test.ts`                | Ladehinweis steht schon im SSR-Markup — also ab dem ersten Bild, ohne JavaScript   |
| `OLMap.svelte.test.ts`            | Karte, GPS-Control und `tabindex="0"`/`role="application"` überleben das Nachladen |
| `OLMapLoadFailure.svelte.test.ts` | Fehlschlag zeigt den Fehlerzustand statt eines endlosen Spinners                   |
| `olmapLazyImport.test.ts`         | Guard gegen den statischen Wert-Import; `import type` bleibt erlaubt               |

Der Quelltext-Guard sieht allerdings nur die **direkten** Importe von `OLMap.svelte`. Wer
OpenLayers transitiv zurückholt, kommt an ihm vorbei — nachgemessen: mit einem
`import … from '$lib/map/extentUtils'` (importiert selbst `ol/proj`) bleibt
`olmapLazyImport.test.ts` **grün**, während die Karten-Laufzeit wieder eager in der
Einstiegsseite liegt.

Deshalb rechnet `src/tools/checkEntryBundle.ts` zusätzlich auf dem **gebauten Chunk-Graphen**
(`.svelte-kit/output/client/.vite/manifest.json`) und läuft in CI hinter `npm run build`
(`npm run check:bundle`). Es prüft gestaffelt:

1. **Struktur:** Der Chunk zu `openLayersHelpers.ts` muss von der Einstiegsseite aus
   ausschließlich dynamisch erreichbar sein.
2. **Schnittmenge:** Was sich die statische Hülle mit der Karten-Laufzeit teilt, darf 25.000 B
   roh nicht überschreiten.
3. **Gesamtgewicht:** Die statische Hülle bleibt unter 340.000 B gzip.

Punkt 2 ist der empfindliche — und der Grund, warum es ihn neben Punkt 3 gibt. Gemessen am
2026-08-20:

| Stand                                      | Schnittmenge | Hülle gzip |
| ------------------------------------------ | ------------ | ---------- |
| aufgeteilt (Soll)                          | 21.253 B     | 321.968 B  |
| mit `import … from '$lib/map/extentUtils'` | 31.185 B     | 326.140 B  |

Der Umweg kostet an der Schnittmenge 9,9 KB, am Gesamtgewicht aber nur 4,2 KB gzip — im
Gesamtbudget wäre er untergegangen.

Zwei Punkte, die beim Weiterarbeiten leicht schiefgehen:

- **Die Schnittmenge ist nicht „so viel OpenLayers liegt eager herum".** Das Manifest sagt
  nicht, welches Modul in welchem Chunk steckt; gemessen werden zwei Hüllen. In den 21 KB
  stecken auch harmlose App-Chunks, die `openLayersHelpers` seinerseits importiert (Logger,
  Karten-Tokens, Meldungen). Wer sie für reines OpenLayers hält, sucht an der falschen Stelle.
- **Fehlt das Manifest, bricht das Skript ab**, statt die Prüfung zu überspringen. Ein
  Wächter, der sich bei fehlender Eingabe still grün meldet, sieht nach Abdeckung aus und
  liefert keine.

Die Graph-Rechnung selbst steht in `src/tools/entryBundleClosure.ts` und ist an konstruierten
Manifesten geprüft (`entryBundleClosure.test.ts`, in `test:quick`) — inklusive des Rückfalls,
den sie fangen soll. Ein Wächter, der nur gegen den konformen Ist-Zustand läuft, belegt über
die Regel selbst nichts.

---

## Empfohlene Launch-Reihenfolge

**Blocker (vor Go-Live):** Security HIGH 1–3, UX HIGH 1–4, Produktion HIGH 1, Tailwind-4-Altlasten
(`bg-opacity-*`, `*-focus`). **Kurz danach:** Security MEDIUM 4–9, Produktion MEDIUM 2–7,
UX MEDIUM 5–8. **Backlog:** restliche MEDIUM/LOW + Dev-Dependency-Updates.

### Stand dieser Reihenfolge am 2026-08-20

**Blocker: vollständig abgearbeitet.** Ebenso die Stufe „kurz danach" und der größte Teil
des Backlogs.

Diese Tabelle deckt **alle** Befunde des Reviews ab: Jeder wurde am 2026-08-20 gegen `src/`
geprüft, die Statusmarker oben tragen jeweils die Fundstelle. Ein Punkt ohne Zeile hier ist
damit erledigt, nicht übersehen.

| Punkt                   | Stand 2026-08-20                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **Dependencies**        | **OFFEN** — 2 High in Produktion (`html-to-text` → `deepmerge-ts`), `npm audit fix`    |
| **Security LOW 12**     | **OFFEN** — keine Rate-Limits auf `/api/geo/inBaltic`, `/api/weather/historical`       |
| **Security LOW 11**     | bleibt bewusst offen (Legacy-API-Vertrag)                                              |
| **Produktion MEDIUM 8** | **Erledigt** (#901) — OpenLayers lazy, statische Hülle −24,0 % roh / −21,8 % gzip      |
| **Produktion LOW**      | **Geprüft, verworfen** (#902) — auf `freigegeben_am` misst der Index keinen Gewinn     |
| **UX MEDIUM 13**        | **Erledigt** (#904) — ein `ConfirmDialog`; der letzte `confirm()` bleibt bewusst nativ |

Die drei unteren Zeilen standen am Morgen des 2026-08-20 noch offen und sind am selben Tag
abgearbeitet worden. Sie bleiben mit Ergebnis stehen, damit erkennbar ist, wohin sie
verschwunden sind; beim nächsten Durchgang können sie raus.

Punkte, die **nicht** aus diesem Review stammen und den Go-Live ebenfalls berühren, stehen
bewusst nicht in dieser Tabelle — insbesondere die fehlende Bestätigungsmail an den Melder
(Issue #621, auf der Erfolgsseite inzwischen ausdrücklich offengelegt), das fehlende
EXIF-Stripping bei öffentlich ausgelieferten Medien (Privacy-Review 2026-07-31) und der
Superadmin-Riegel vor dem Sprachumschalter (`docs/i18n/`).

Nebenbefund aus derselben Messung, **nicht** Teil dieses Punktes: `idx_sichtungsdatum`
ist auf der lokalen DB rund 2× aufgebläht (896 kB gegen 440 kB frisch gebaut) und
kostet dadurch beim Jahresfilter etwa 1–2 ms.

**Produktion trägt diesen Bloat nicht — nachgemessen am 2026-08-20** (`sudo docker exec`
auf `ostsee-tiere-db-1`, rein lesend über `pg_class`/`pg_stat_user_indexes`; der
DB-Port ist dort weiterhin nicht freigegeben). Maßstab ist Byte pro Zeile, weil sich
ein Index auf Produktion nicht probeweise neu bauen lässt:

| `idx_sichtungsdatum`           | Größe  | Byte/Zeile | Faktor gegen frisch |
| ------------------------------ | ------ | ---------- | ------------------- |
| frisch gebaut (lokal)          | 440 kB | 22,6       | 1,00                |
| **Produktion** (19.880 Zeilen) | 600 kB | **30,9**   | **1,37**            |
| lokal, Ist-Zustand             | 896 kB | 46,0       | 2,04                |

Das gilt nicht nur für diesen Index: **jeder** Index auf `sichtungen` ist auf
Produktion etwa halb so groß pro Zeile wie lokal (`geom_sichtungen` 49,9 gegen 97,3;
`idx_year_sichtungen` 27,2 gegen 52,1; `idx_weather_fetched` 8,7 gegen 21,3). Der
Bloat ist damit ein Artefakt der **lokalen** Datenbank, keine Eigenschaft der
Anwendung: Lokal stehen 66.056 Updates auf 19.953 Zeilen, davon nur 41 % HOT — jedes
der übrigen hat in jedem Index einen neuen Eintrag hinterlassen. Das sind die
Massenkorrekturen, die bewusst nur lokal gefahren wurden (u. a. `bootsantrieb` 0→5
über 5.858 Zeilen).

Folge: **kein `REINDEX` auf Produktion nötig.** Lokal lohnt er sich, ist aber eine
Instanz-Wartung und keine Schema-Änderung — also nichts, was dieses Repository
festhalten müsste.

### Offener Faden: möglicherweise ungenutzte Weather-Indizes

Dieselbe Abfrage zeigt `idx_weather_data_gin` (608 kB) und `idx_weather_fetched`
(168 kB) auf Produktion bei **0 Scans**. Das Zählfenster ist bekannt: der Postmaster
läuft seit 2026-08-19 04:06, also rund 36 Stunden — zu kurz, um daraus allein auf
einen toten Index zu schließen.

Strukturell sieht es allerdings danach aus:

- `weather_data` steht in `src/` in genau **einer** Art von `WHERE`, nämlich
  `IS NOT NULL` (`weatherDeduplication.ts:62,187,195`). Ein GIN-Index kann
  `IS NOT NULL` nicht bedienen. Nachgemessen mit `enable_seqscan = off`: Der Planner
  greift auch dann nicht auf `idx_weather_data_gin` zurück, sondern auf das partielle
  `idx_position_date_weather`, dessen eigene `WHERE`-Klausel das Prädikat impliziert.
- `weather_fetched_at` kommt in `src/` in **keinem** `WHERE` vor, nur in
  Select-Listen und Insert-Werten.

**Trotzdem kein Grund, sie zu entfernen — und der Grund dafür ist wichtiger als der
Befund selbst:** `idx_weather_provider` steht auf Produktion bei 64 Scans (lokal 804),
obwohl auch diese Spalte in `src/` in keinem `WHERE` auftaucht. Es liest also etwas
auf dieser Datenbank, das nicht in diesem Repository steht — plausibel das Altsystem,
das auf derselben DB liegt. Eine Code-Analyse über `src/` kann einen Index hier
folglich **nicht** für tot erklären.

Nächster Schritt, falls jemand die 776 kB heben will: Scan-Zähler über eine bekannte,
längere Spanne messen (`SELECT pg_stat_reset_single_table_counters('sichtungen'::regclass);`
— die Funktion verlangt die Tabellen-OID, ohne Argument existiert sie nicht —, dann nach
ein paar Wochen erneut sehen) und parallel klären, welche Abfragen das Altsystem
auf `sichtungen` fährt.
