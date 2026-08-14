# Arbeitsprotokoll Etappe 0 — Mehrsprachigkeit DE/EN

> **Was das ist.** Das laufend geführte Protokoll der Umsetzung von Etappe 0
> (Infrastruktur und Routing, PR #856). Es entstand als Arbeitsdatei und wird
> hier unverändert abgelegt, weil es die einzige vollständige Aufzeichnung der
> Befunde ist — inklusive derer, die nicht im Code landeten, sondern in
> geänderten Annahmen.
>
> **Historisches Artefakt.** Der Stand ist der von Etappe 0. Wo es Zahlen nennt,
> gelten die gemessenen aus `docs/i18n/i18n-inventory.md`; wo es Planaussagen nennt,
> gilt `docs/i18n/DESIGN_MEHRSPRACHIGKEIT_2026-08-10.md`. Nicht nachpflegen.
>
> **Wofür es nützlich ist.** Es benennt neun Fehler im Plan und acht Tests, die
> auch bei entfernter Funktion grün geblieben wären — jeweils mit Fundstelle und
> Ursache. Die drei Lehren daraus stehen im Entwurf; die Einzelfälle nur hier.

---

# Etappe 0 — Mehrsprachigkeit DE/EN

Plan: docs/archive/PLAN_MEHRSPRACHIGKEIT_ETAPPE0_2026-08-10.md (9 Tasks)
Branch: claude/multi-language-support-f32fa0, rebased auf origin/main 8b9c8079
Modelle: Implementierung Sonnet, Reviews Opus.

## Vorab geklärt (mit dem Menschen, vor Task 1)
1. `npx sv add paraglide` ist NICHT non-interaktiv steuerbar: `demo:no` wird
   akzeptiert, `languageTags:de,en` nicht (Komma kollidiert mit dem
   Options-Trenner), und ein stdin-Pipe hängt den Text an den Default `en, es`
   an → `en, esde,en`. ABWEICHUNG VOM PLAN: Paraglide wird direkt per
   `npm i -D @inlang/paraglide-js` installiert, `project.inlang/settings.json`
   von Hand geschrieben — aber mit GEPINNTER Version, nie `@latest`. Der
   einzige Zweck von `sv add` war die Pinnung; die ist so ebenfalls erreicht.
   Plan-Task 1, Schritt 3 entsprechend nachziehen.
2. Cookie-Name NICHT als Platzhalter in den Code: Task 1 schreibt ihn als
   echte Konstante, Task 5 importiert sie.
3. Global Constraint "jeder Task beginnt mit einem fehlschlagenden Test" gilt
   NICHT für Task 7 — das ist ein Charakterisierungstest, der bestehendes
   Verhalten festnagelt und beim ersten Lauf PASS erwartet.

## Stand
- [x] Rebase auf origin/main
- [x] Task 1 KOMPLETT (Commits 11c9630..524ede8, Review clean nach 3 Runden)
- [~] (alt) Task 1 BEGONNEN: @inlang/paraglide-js als devDependency installiert
      (package.json/package-lock.json geändert, noch NICHT committet).
      Offen: settings.json, messages/, vite-Plugin (3 Configs), .gitignore,
      Werkzeug-Ausnahmen, package.json-Skripte, setup-worktree.sh,
      scripts/i18nGate.test.ts, Cookie-Name feststellen.
- [ ] Task 2..9

## Planfehler, gefunden bei Task 1 (2026-08-10)
Der Guard-Test in Plan-Task 1, Schritt 1 war UNERFÜLLBAR: Er prüfte
`flattenScript('test:quick', …)).toContain('i18n:compile')`. `flattenScript`
löst `npm run`-Verweise aber rekursiv bis zum Shell-Kommando auf — ein
Skriptname kommt im Ergebnis nie vor. Korrigiert: Assertion prüft gegen
`paraglide-js compile`. Zusätzlich müssen beide Indizes auf `>= 0` geprüft
werden, bevor die Reihenfolge assertiert wird — sonst besteht der Test auch
bei fehlendem Kommando (`indexOf` liefert -1). PLAN NACHZIEHEN.

Bestätigt bei Task 1: paraglide-js 2.23.2 bringt das Message-Format NICHT
eingebaut mit; `modules` mit `plugin-message-format@4.4.0` bleibt nötig, die
Pinnung stammt aus Paraglides eigenem Default. Cookie-Name: PARAGLIDE_LOCALE,
als Konstante in src/lib/i18n/localeCookie.ts.


## Task 1: complete (commits 11c96301..524ede80, review clean)
Drei Commits: a11d045 (Setup), cea2f9b (strategy-Angleich), 524ede8
(outputStructure gepinnt). test:quick gruen, 759 Tests.

### Offene Minor-Befunde -> an den finalen Branch-Review
1. `outputStructure` ist CLI-seitig nur BEHAUPTET, nicht geprueft: der Guard
   testet `not.toContain('--output-structure')` plus Literal 'message-modules'.
   Das Flag `--output-structure <structure>` EXISTIERT aber. Zwei Zeilen:
   Flag an `i18n:compile` und `setup-worktree.sh`, Guard gegen den Config-Wert
   statt gegen ein Literal.
2. `describe`-Titel "CLI und Vite-Plugin erzeugen dieselbe Paraglide-Laufzeit"
   verspricht zu viel: der `isServer`-Unterschied besteht fort (Plugin:
   `import.meta.env?.SSR ?? typeof window === 'undefined'`, CLI: nur der
   Fallback; semantisch gleich, per `--is-server` schliessbar). Im Repo
   NIRGENDS dokumentiert. Titel praezisieren, Ausnahme in die JSDoc.
3. CDN-Abruf ohne Integritaetspruefung (jsdelivr) fuer build/check/test:quick/
   setup-worktree/Docker. In `x-buildRiskNote` dokumentiert, bewusst akzeptiert.
4. `check:watch` hat keinen Compile-Vorlauf; im Brief nicht verlangt, aber in
   einer IDE-Watch-Sitzung auf frischem Worktree fehlt der generierte Code.

### Fuer Folge-Tasks wichtig
- Cookie-Konstante: `LOCALE_COOKIE` in `src/lib/i18n/localeCookie.ts`
  (Wert 'PARAGLIDE_LOCALE'). Task 5 importiert sie, raet sie NICHT.
- CLI und Vite-Plugin schreiben in dasselbe outdir; Vitest laedt den Plugin
  NICHT. Unit-Tests sehen also den CLI-erzeugten Runtime.

## Planfehler 2, gefunden bei Task 2 (2026-08-10)
Plan-Task 2 widersprach sich: `NICHT_LOKALISIERT` enthielt '/sichtungen',
der danebenstehende Testfall verlangte `istAusgeschlossen('/sichtungen')===false`.
Aufgeloest: '/sichtungen' NICHT in die Liste. Unter src/routes/sichtungen/ liegt
nur der Legacy-Endpunkt showreports.json, der ueber LEGACY_PFADE in Schritt 1
des reroute abgefangen wird; eine Seitenroute /sichtungen existiert nicht, also
ist /en/sichtungen ohnehin 404. PLAN NACHZIEHEN (auch die Beispielpfade in
Entwurf Abschnitt 4.2/4.3 nennen /sichtungen als Seitenroute - falsch).

## Task 2: complete (commits 6b71c501..0873b5b9, review clean)
test:quick gruen. Wichtigster Befund: die /admin-Sicherheitsbegruendung im
Bestandskommentar war FALSCH (kein Admin-Guard in hooks.server.ts; echter
Schutz ist requireUserRole in src/routes/admin/+layout.server.ts:7). Ersetzt.
ENTWURF UND PLAN NACHZIEHEN - die falsche Begruendung steht dort mehrfach.

### Offene Minor -> Branch-Review
1. Reihenfolge-Auflage fuer Task 3 (siehe unten, in den Brief uebernommen).
2. Deutsche Bezeichner vs. Regel "Bezeichner englisch" - einmal auf Plan-Ebene
   entscheiden, nicht pro Task.
3. Forward-Referenz auf e2e/i18n-routing.spec.ts (kommt in Task 6).
4. Ungetestet: Trailing Slash, Unterpfad-Zweig von /rest_sichtungen.
5. Gross-/Kleinschreibung und Prozent-Kodierung nicht abgedeckt (unkritisch).

## Task 3: complete (commits a5a08537..61473693, review clean)
reroute-Komposition. Legacy-Verhalten fuer alle vier Pfade in allen vier
Praefix-Varianten bitgleich (Reviewer hat RED selbst reproduziert).
/de-Ablehnung laeuft ueber toLocale/baseLocale, nicht ueber eigenen Regex.

PLANFEHLER 3 + 4 (NACHZIEHEN): (a) mein geforderter Testfall
/en/sichtungen/showreports.json belegt die Reihenfolge NICHT - bei diesem Pfad
liefert die umgekehrte Reihenfolge denselben String. Richtiger Waechter ist
/de/rest_sichtungen/antworten.json. (b) meine /de-Ablehnung im Plan-Code war
case-sensitiv, Paraglide vergleicht per toLowerCase - /DE/sichtungen erzeugte
die zweite URL, die verhindert werden sollte.

### Offene Minor -> Branch-Review
1. Trailing Slash nur mit Sprachpraefix normalisiert (/en/map/ -> /map,
   /map/ -> /map/). Aus deLocalizeUrlDefaultPattern, nicht aus unserem Code.
2. Fuehrende Leersegmente umgehen die /de-Ablehnung: Waechter liest
   split('/')[1], deLocalizeUrl nutzt filter(Boolean). //de/map passiert.
   Gleiche Fehlerklasse wie der behobene /DE/-Fall, praktisch unerreichbar.
3. / gibt '/' statt undefined zurueck (folgenlos).
4. Berichts-Kosmetik: Client-Zahlen als Gesamtergebnis ausgewiesen.

## Task 4: complete (commits d41acafa..01fad9e6, review clean, abgenommen)
paraglideMiddleware als letztes sequence-Glied, %lang% via replaceAll.
Auth-Pruefung nachweislich unveraendert wirksam (Reviewer hat Reihenfolge und
POST-Body-Durchreichung gegen Node v24.18.0 verifiziert).

### Offene Minor -> Branch-Review / Etappen-Ende
- Task 6 muss abdecken: "Cookie=en, Aufruf von /" -> 307. Die curl-Verifikation
  hat den Browser-Pfad nie beruehrt (kein Sec-Fetch-Dest: document).
- PLAN-EBENE: hreflang-Alternates UND og:locale existieren NIRGENDS in src/
  oder im Plan. hreflang ist bewusst nach Etappe 2 verschoben; og:locale ist
  schlicht durchgerutscht. Fuer zwei indexierte Sprachvarianten der eigentliche
  SEO-Punkt.
- ETAPPEN-ENDE: .claude/rules/middleware.md und security.md zeigen die
  sequence noch mit VIER Gliedern und setAdditionalHeaders als letztem.
- ETAPPEN-ENDE: docs/PLAN_..._ETAPPE0_...md zeigt im Task-4-Block weiterhin
  .replace('%lang%') statt replaceAll; Task 6 verweist auf denselben Block.
- ETAPPEN-ENDE: npm run build lief nie, nur Dev-Server verifiziert.

## Task 5: complete (commits c26da308..a9519603, review clean, freigegeben)
Accept-Language nur auf /, 302 nach /en, Vary auf der Weiterleitung selbst.
Critical behoben: Query-String ging verloren (kollidierte mit reportKindHref,
das Kampagnen-Marker bewusst erhaelt). Important: Vary via append + Cookie;
HEAD war faelschlich ausgeschlossen (mein Formulierungsfehler "nur GET").

PLANFEHLER 5+6 (NACHZIEHEN): (a) mein Brief-Code gab '/en' als Literal zurueck,
ohne event.url.search. (b) meine Minor-Empfehlung "auf method === 'GET'
beschraenken" schloss HEAD aus - RFC 9110 verlangt fuer HEAD dieselbe Antwort.

### Offene Minor -> Branch-Review
- q-Gewichte werden ignoriert, nur erste Praeferenz zaehlt (brief-konform).
- Kein Test fuer mehrere Query-Parameter / Prozent-Kodierung.
- Vary-Zweig nicht methodengebunden: 405 auf POST / traegt ueberfluessiges Vary.
- Vary: Cookie macht / fuer geteilte Caches unspeicherbar (bewusste Abwaegung).

## TASK 6 TRAEGT DREI AUFLAGEN AUS FRUEHEREN REVIEWS
1. Ausschlussliste + /de/... gegen 404 (aus dem Plan).
2. Cookie-Fall: PARAGLIDE_LOCALE=en, Aufruf von / -> 307/302. Die curl-
   Verifikation in Task 4 hat den Browser-Pfad nie beruehrt.
3. Verdrahtung von Task 5: Entfernt man handleStartseitenSprache aus der
   sequence, bleiben ALLE Tests gruen. Task 6 muss das aendern.

## Task 6: complete (commit 0d2f7db3, review clean, freigegeben)
E2E-Guard, 19 Tests. Deckungsnachweis 2/19. map-Shard 140/140 gruen.
Branch am 2026-08-10 erneut auf origin/main rebased (19 Commits, konfliktfrei).
CRITICAL war: e2e/legacy-language-prefix.spec.ts erwartete fuer /en/ einen 404,
real ist es 308 auf /en. Datei nie angefasst, nie ausgefuehrt - test:quick
enthaelt keine E2E. Behoben, Test prueft jetzt Code UND Ziel.

### KRITISCH VOR ETAPPE 1 (Minor 1 aus dem Review, erhoeht)
playwright.config.ts setzt kein `locale`. Chromium sendet Accept-Language:
en-US, also laufen 10 Specs mit page.goto('/') seit der /-Weiterleitung
faktisch gegen /en. Heute gruen, weil nichts uebersetzt ist - mit Etappe 1
kippt das schlagartig, und bis dahin ist die deutsche Startseite in E2E
ungeprueft. Fix: `locale: 'de-DE'` in `use` der playwright.config.ts.
Wird in Task 7 mitgenommen.

### Offene Minor -> Branch-Review
- Testname "sondern die Startseite" passt nicht zur Assertion (308 auf /en).
- /en/styleguide als Waechter nur gegen vite dev aussagekraeftig.
- Position von handleStartseitenSprache nach authentication ungetestet.
- TASK 9: "zurueck auf Deutsch" muss PARAGLIDE_LOCALE=de SCHREIBEN. Loeschen
  faellt auf Accept-Language zurueck und leitet englische Browser sofort
  wieder nach /en - Einbahnstrasse.

## Task 7 + Playwright-Locale: complete (27e95b9f, d83520e0, b3b02f4a, 891d3f8f)
Beide Verdikte PASS. Vier Bruch-Varianten der Zeitzonen-Invariante werden rot.
PLANFEHLER 8: mein Testzeitpunkt 23:30 UTC lag im Fenster, in dem Berlin und
London DENSELBEN Kalendertag zeigen - die naheliegendste falsche Kopplung
(en -> Europe/London) waere gruen geblieben. Jetzt 22:30.
PLANFEHLER 9: Test prueste de-DE/en-GB, die App reicht de/en durch. Eine
Zone-Map auf die kurzen Tags mit Berlin-Fallback waere gruen geblieben.
AUFGABE A: playwright.config.ts hatte kein locale -> 10 Specs mit goto('/')
liefen faktisch gegen /en. Behoben mit locale: 'de-DE'.

### Offene Minor -> Branch-Review
1. 'en' liefert US-Format (07/16/2026, 12:30 AM). Fuer Ostsee-Publikum waere
   en-GB naheliegender. PRODUKTENTSCHEIDUNG fuer Etappe 2.
2. test.use({locale:'de-DE'}) in i18n-routing.spec.ts:84 ist redundant,
   bewusst behalten (schuetzt gegen Config-Rueckbau).
3. Schluesselnamen de/en im erwartet-Objekt tragen die Werte der langen Tags.
4. Nur dateTime.ts ist gegen Locale->Zone-Kopplung gehaertet; berlinToday()
   in sightingSchema.ts traegt dieselbe Invariante, hat aber keinen
   Locale-Parameter. Beobachten, falls Etappe 2 dort einen einfuehrt.

## Task 8: complete (commits 69389b17..1968ed9a, review clean, angenommen)
Interne Verweise ueber localizeHref. CRITICAL war: die Einstiegsseite setzt an
DREI Stellen die URL, nur eine ist ein href. replaceState (Zeile ~265) feuert
OHNE Nutzeraktion beim Laden von /en und warf still nach Deutsch zurueck.
Jetzt alle drei ueber localizedHomeHref(). +error.svelte mitgezogen.

### Offene Minor -> Branch-Review
1. OstseeTiereLogo.svelte und +error.svelte bestehen `prettier --check` nicht.
   Kein Gate bricht (format:check ist in keinem Workflow), aber das naechste
   `npm run format` erzeugt Diff-Rauschen in fremden Zeilen.
2. +error.svelte ist nicht testgedeckt.
3. href-Langschwanz ohne Waechter: Footer(4), Logo, about(3),
   bestimmungshilfe(2), SubmissionSuccess(2), 3 Navbar-Ziele. Von ~18 Stellen
   bewachen die Tests 4. Ein Sweep-Test ueber /en, der alle internen href
   einsammelt und auf /en-Praefix prueft, schloesse die Klasse.
4. WARTUNGSMODUS verliert das Sprachpraefix in BEIDE Richtungen
   (maintenanceMode.ts:31 hin, maintenance/+page.server.ts:11 zurueck).
   In Task 8 nicht behebbar - ausgeschlossene Routen loesen strukturell de auf.
   In Task 9 als Ausnahme dokumentieren.

## Task 9: complete (commits c340b9d5..e562f1cb, review clean, abnahmefaehig)
Sprachumschalter. ZWEI CRITICALS:
1. Meine Auflage 3 war FALSCH begruendet. Ich schrieb "auf ausgeschlossenen
   Routen wirkungslos, nur dokumentieren". Tatsaechlich: Paraglide kennt die
   Ausschlussliste nicht, localizeHref('/admin',{locale:'en'}) -> /en/admin,
   reroute gibt undefined -> 404. Kaputter Link in der globalen Navigation.
   Behoben: Umschalter rendert dort gar nicht.
2. Query-Verlust - ZUM DRITTEN MAL in diesem Branch.
Wirksamkeit erstmals PER MUTATION belegt (3 Mutationen, je rot, je zurueck).

## ALLE NEUN TASKS KOMPLETT. Naechster Schritt: finaler Branch-Review.

## BRANCH-REVIEW: mergefaehig, kein Critical. Prod-Build verifiziert.
VOR DEM MERGE:
- Punkt 3: ENTSCHEIDUNG /en erreichbar oder nicht (Entwurf 9.1 sagt: bis
  Etappe 3 zu). Nachtraegliches Aufnehmen in NICHT_LOKALISIERT macht ~10
  E2E-Tests rot, ist also KEINE Ein-Zeilen-Massnahme. Dazu: app.html setzt
  robots: index,follow global, kein hreflang bis Etappe 2 -> /en/* waere ab
  Merge indexierbarer Duplicate Content in deutscher Sprache.
- Punkt 1: LEGACY_API_SPECIFICATION.md:61ff und languagePrefix.ts:28 sagen
  weiterhin "/en/ vor der Startseite bleibt 404". Falsch seit diesem Branch.
NACH DEM MERGE: Punkt 2 (falsche Admin-Begruendung an 4 Stellen), 7
(setup-worktree.sh behauptet einen Waechter, den es nicht gibt), 5 (Sweep-Test
fuer ~14 ungewachte href-Stellen), 6 (NICHT_LOKALISIERT exportieren), 4
(Export-Guard vor Etappe 2).

## ETAPPE 0 ABGESCHLOSSEN (31 Commits auf origin/main 018420a1)
- 7dafd5e7 docs: veraltete i18n-Begruendungen korrigiert (Punkt 1+2+7)
- c4c8733d fix(security): X-Robots-Tag noindex,follow fuer alle /en-Antworten
  = Entscheidung Option C statt Entwurf 9.1 (/en zu). ENTWURF 9.1 NACHZIEHEN.
test:quick verifiziert gruen: 80 Dateien, 766 Tests.

MERKE: Die Fehlschlag-Meldungen beider Agenten waren Lastartefakte - ich hatte
sie PARALLEL im selben Worktree laufen lassen, beide fuhren gleichzeitig
test:quick. Skill verbietet parallele Implementierer genau deshalb.

## OFFEN NACH ETAPPE 0
1. Entwurf 9.1 auf Option C umschreiben (noindex statt /en unerreichbar).
2. Neun Planfehler aus diesem Ledger in Entwurf + Plan zurueckschreiben.
3. .claude/rules/middleware.md und security.md: sequence hat jetzt SECHS
   Glieder, dort stehen vier.
4. Sweep-Test fuer ~14 ungewachte href-Stellen (vor Etappe 1).
5. NICHT_LOKALISIERT exportieren, E2E-Schleife darueber (vor Etappe 1).
6. Export-Guard CSV/XML/KML deutsch (vor Etappe 2).
7. prettier --check scheitert an +error.svelte und OstseeTiereLogo.svelte.
8. og:locale + hreflang haben weiterhin keinen Task (Etappe 2).

## NACHARBEIT ERLEDIGT (e9fd8aa5, 9506b3ed)
Entwurf 9.1 auf Option C, neun Planfehler zurueckgeschrieben,
.claude/rules/middleware.md + security.md auf SIEBEN sequence-Glieder
(meine Ledger-Notiz "sechs" war falsch, der Agent hat nachgezaehlt).
Zehnte Fundstelle der falschen Admin-Begruendung in languagePrefix.test.ts
behoben. Planfehler 6 (HEAD) hatte KEINEN Fundort - war nur eine
Review-Nachricht, nie verschriftlicht.

## NOCH OFFEN (Reihenfolge nach Faelligkeit)
VOR ETAPPE 1:
- Sweep-Test fuer ~14 ungewachte href-Stellen auf /en
- NICHT_LOKALISIERT exportieren + E2E-Schleife darueber statt Literale
VOR ETAPPE 2:
- Export-Guard: CSV/XML/KML-Kopfzeilen bleiben unter en-Locale deutsch
- og:locale + hreflang haben weiterhin keinen Task
JEDERZEIT:
- docs/WORKTREES.md um Paraglide-Compile-Schritt ergaenzen
- vollstaendiger npm run test:e2e ISOLIERT (nie gelaufen)
- prettier --check scheitert an +error.svelte, OstseeTiereLogo.svelte

## VOR-ETAPPE-1-TESTS ERLEDIGT (5efd7674, 407e4df6, f87871e2, accf2465)
A: Sweep-Test ueber interne Verweise auf /en, /en/about, /en/bestimmungshilfe,
   Erfolgsseite. B: NICHT_LOKALISIERT exportiert, E2E-Schleife ueber die
   Konstante, ein Test je Eintrag.
CRITICAL war: die Ausschluss-Richtung im Sweep war TOTER CODE -
istAusgeschlossen('/en/docs') ist immer false, weil NICHT_LOKALISIERT nur
praefixlose Eintraege hat. Achte Instanz derselben Fehlerklasse. Durchgerutscht,
weil die Mutation nur fuer die funktionierende Richtung gefahren wurde.

### Offene Minor -> spaeter
- Zaehlschwellen sind vier Literale (Puffer 2 bei 16/19/16/16). Bei einem
  Umbau des responsiven Menues fielen ~4 Verweise weg -> alle vier Tests rot
  ohne Lokalisierungsfehler. Robuster: statt zaehlen pruefen, dass /en/map und
  /en/about im Ergebnis stehen - ueberlebt Layout-Umbauten.
- MINDEST_VERWEISE ist Record<string,number>; fuenfte Seite ohne Eintrag ergibt
  undefined statt Typfehler. Key-Union oder satisfies wuerde es erzwingen.
- :not([hreflang]) filtert per Attribut; /en/map und +error.svelte bleiben
  ausserhalb des Sweeps (in der Spec-JSDoc benannt).
