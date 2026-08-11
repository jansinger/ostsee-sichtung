# Mehrsprachigkeit Deutsch/Englisch — Entwurf (Stand 2026-08-10)

> **Was dieses Dokument ist.** Der abgestimmte Entwurf, nicht der Umsetzungsplan.
> Es hält fest, **was** gebaut wird und **warum es so und nicht anders** aussieht.
> Der Umsetzungsplan mit Etappen und Tests entsteht daraus separat.
>
> Dateiname bewusst `DESIGN_…` statt `PLAN_…`: Die drei vorhandenen `PLAN_*`-Dokumente
> sind Umsetzungspläne mit Arbeitsschritten. Dieses hier steht davor.

---

## 1. Ziel und Umfang

Die Anwendung soll neben Deutsch auch **Englisch** anbieten.

**Im Umfang:** der gesamte öffentliche Bereich — Meldeformular, Karte mit Popups
und Listenansicht, Navigation, Footer, Fehler- und Statusmeldungen, die
Inhaltsseiten `/about` und `/bestimmungshilfe` einschließlich
`SpeciesIdentificationHelp`, sowie die Einwilligungsflächen.

**Nicht im Umfang, mit Begründung:**

| Bereich                                                         | Warum nicht                                                                                                                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin-Bereich                                                   | Das bearbeitende Team arbeitet deutsch. Rund 1.500 Textzeilen ohne Nutzen.                                                                                            |
| Legacy-API (`/rest_sichtungen`, `/sichtungen/showreports.json`) | Deutscher Wertevertrag, ein iOS-Client hängt live daran. Siehe Abschnitt 6.                                                                                           |
| Exportformate (CSV, XML, KML, JSON)                             | Gehen an die Wissenschaft. Stabile deutsche Kopfzeilen sind dort ein Merkmal, keine Nachlässigkeit.                                                                   |
| Benachrichtigungs-E-Mail                                        | Geht an genau einen konfigurierten Empfänger — das Museum, nicht den Melder ([emailService.ts:534](../src/lib/server/services/emailService.ts#L534)). Bleibt deutsch. |

---

## 2. Getroffene Entscheidungen

| Frage         | Entscheidung                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Bibliothek    | **Paraglide JS** (inlang), compilerbasiert                                                              |
| Routing       | **pfadbasiert** (`/en/…`) mit Ausschlussliste für `/api`, `/admin`, Betriebs- und Legacy-Pfade          |
| Sprachwahl    | `strategy: ['url','cookie','baseLocale']` — **ohne** `preferredLanguage`; `Accept-Language` nur auf `/` |
| Hartcodiertes | eigener Scan-Guard in der Bauart der vier bestehenden Quelltext-Guards                                  |
| Einwilligung  | **Vollwertig zweisprachig** im Nachweis; deutsch-only als markierter Zwischenstand erlaubt              |
| Tests         | **Suite bleibt deutsch**, schmaler EN-Rauchtest kommt dazu                                              |

### 2.1 Warum Paraglide JS

Es ist die für SvelteKit offiziell empfohlene Lösung und über `npx sv add paraglide`
Teil des Svelte-CLI. Ausschlaggebend hier sind drei Eigenschaften:

- **Compiler statt Laufzeit-Lookup.** Botschaften werden zu typisierten
  ESM-Funktionen kompiliert. Fehlende Übersetzungen sind Build-Fehler, nicht stille
  Rückfälle auf den Schlüsselnamen. Das passt zur Projektregel „keine `any`-Typen"
  und macht Abschnitt 7.2 überhaupt erst möglich.
- **Tree-Shaking.** Nur benutzte Botschaften landen im Bundle. Bei einer Anwendung,
  die überwiegend im iframe auf einer fremden Seite geladen wird, zählt das.
- **`reroute`-basierte URL-Lokalisierung.** Genau der Mechanismus, den die
  Anwendung für die Legacy-Präfixe bereits benutzt — siehe Abschnitt 4.

Verworfen: `svelte-i18n` (Laufzeit). Der einzige Vorteil wäre, Texte ohne
Deployment ändern zu können. Das betrifft hier fünf Konfigurationsschlüssel
(Abschnitt 5.4) und rechtfertigt weder den Bundle-Aufwand noch den Verlust der
Typprüfung.

---

## 3. Wo die Texte liegen

Die Erhebung vom 2026-08-10. Die Architektur ist an dieser Stelle günstig: Ein
großer Teil der nutzersichtbaren Sprache liegt zentral, nicht verstreut.

| Schicht                       | Ort                                                               | Umfang                              |
| ----------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| **A** Formular-Metadaten      | [sightingSchema.ts](../src/lib/form/validation/sightingSchema.ts) | ~146 Zeichenketten, 1 Datei         |
| **B** Domänen-Labels          | [`src/lib/report/formOptions/`](../src/lib/report/formOptions/)   | ~147 Zeichenketten, 16 Dateien      |
| **C** Markup in Komponenten   | 118 `.svelte`-Dateien                                             | grob 600–900 Botschaften öffentlich |
| **D** Serverseitige Texte     | `src/lib/server/`, plus DB-Konfiguration                          | ~75 Zeichenketten + 3 DB-Schlüssel  |
| **E** Fachliche Inhaltsseiten | `/about`, `/bestimmungshilfe`, `SpeciesIdentificationHelp`        | ~1.280 Zeilen Fachtext              |

**Schicht A ist der größte Hebel.** `sightingSchema.ts` ist Single Source of
Truth für Beschriftungen, Platzhalter, Hilfetexte, `valueText` **und**
Fehlermeldungen; Formular, Admin-Maske und `FormField` hängen alle daran.

**Schicht B kommt mehrfach zum Tragen.** Karte, Popups, Listenansicht und
Statistik lesen dieselben `formOptions` ([popupContent.ts](../src/lib/map/popupContent.ts),
[listViewUtils.ts](../src/lib/map/listViewUtils.ts)). Wer B übersetzt, übersetzt
diese Flächen mit.

**Zur Zahl in Schicht C.** Ein Grep über deutschsprachige Zeilen in `.svelte`
liefert rund 3.140 Treffer im öffentlichen Bereich. Diese Zahl ist **nach oben
verzerrt**: Projektkonvention ist, Begründungen als Kommentare ins Markup zu
schreiben (siehe `CLAUDE.md`), und die zählt der Grep mit. Die Schätzung 600–900
ist eine Ableitung daraus, keine Messung. Belastbar wird sie erst nach der
Extraktion in Etappe 2 — der Aufwand in Abschnitt 9 ist entsprechend als Spanne
angegeben.

---

## 4. Routing

**Das ist die heikelste Stelle des ganzen Vorhabens.** Gewählt ist
**pfadbasiertes Routing** — die Sprache steht in der URL, nicht in einem Cookie
oder Header. Deterministisch, cachebar, teilbar, und es ist die Struktur, die
Paraglide ohnehin vorsieht.

### 4.1 Der eine `reroute`-Export

SvelteKit erlaubt genau **einen** `reroute`-Export. Er ist bereits belegt
([hooks.ts](../src/hooks.ts)) und Paraglide beansprucht ihn ebenfalls. Die beiden
Bedeutungen des Präfixes sind dabei gegenläufig: Für die Legacy-API ist `/en/`
reine Routenkosmetik mit **deutscher** Antwort, für Seitenrouten ist es ein
Sprachversprechen.

```
reroute(url):
  1. stripLegacyLanguagePrefix(pathname)  → Treffer? zurückgeben, fertig.
  2. /de/…                                → undefined (Deutsch ist präfixlos).
  3. istAusgeschlossen(pathname)          → ja? undefined (keine Umschreibung).
  4. deLocalizeUrl(url)                   → alles Übrige.
```

Schritt 1 zuerst, weil `LEGACY_PFADE` bereits eine enge Positivliste von genau
vier Pfaden ist — bewusst nicht generisch über Verzeichnisse. Diese Enge ist
jetzt doppelt wertvoll: Sie verhindert, dass Paraglide je einen Legacy-Pfad in
die Hand bekommt.

Schritt 2 ist neu und in Abschnitt 4.2 begründet. `undefined` heißt „nicht
umschreiben" — SvelteKit löst den Pfad dann wörtlich auf, und da es keine Route
`/en/api/...` gibt, ist das Ergebnis ein 404. Genau das ist gewollt.

`reroute` betrifft ausschließlich die Routenauflösung. `event.url` bleibt in
`hooks.server.ts` und in den Endpunkten die vom Client gesendete URL —
Query-String und Trailing Slash bleiben unangetastet, und der Auth-Schutz sieht
weiterhin den echten Pfad.

### 4.2 Ausschlussliste: was nie lokalisiert wird

Eine Positivliste der lokalisierten Bereiche wäre die theoretisch sicherere
Bauart, in der Praxis aber eine Liste, die bei jeder neuen öffentlichen Seite
gepflegt werden müsste und beim Vergessen **still** eine deutsche Seite
ausliefert. Die Ausschlussliste scheitert andersherum — beim Vergessen entsteht
ein zusätzlicher, erreichbarer Pfad, und den findet der Guard-Test in
Abschnitt 8.2. Ein sichtbarer Fehlschlag ist einem stillen vorzuziehen.

| Präfix                                             | Warum ausgeschlossen                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| `/api/**`                                          | Maschinenschnittstelle, 12 Verzeichnisse. Antworten sind Daten, keine Oberfläche. |
| `/admin/**`                                        | Nicht im Umfang, siehe 4.3.                                                       |
| `/rest_sichtungen`, `/sichtungen/showreports.json` | Legacy-Vertrag, von Schritt 1 abgefangen.                                         |
| `/uploads/**`                                      | Auslieferung von Mediendateien.                                                   |
| `/health`, `/maintenance`                          | Betriebsendpunkte.                                                                |
| `/docs/**`, `/styleguide`                          | Entwicklerflächen, bleiben deutsch.                                               |

Die Liste gehört neben `LEGACY_PFADE` in `languagePrefix.ts` — dieselbe Datei
trägt schon heute die Begründung, warum ein Pfad ein Sprachpräfix bekommt oder
nicht.

### 4.3 Vollständige Pfad-Matrix

| Aufruf                               | heute                                    | künftig                           |
| ------------------------------------ | ---------------------------------------- | --------------------------------- |
| `/en/rest_sichtungen/antworten.json` | Präfix abschneiden, **deutsche** Antwort | **unverändert**                   |
| `/en`                                | 404                                      | englisches Meldeformular          |
| `/en/map`, `/en/about`, …            | 404                                      | englische Oberfläche              |
| `/de`, `/de/sichtungen`              | 404                                      | **bleibt 404** — siehe unten      |
| `/en/api/**`                         | 404                                      | **bleibt 404**                    |
| `/en/admin/**`                       | 404                                      | **bleibt 404**                    |
| `/en/uploads/**`, `/en/health`       | 404                                      | **bleibt 404**                    |
| `/en/rest_sichtungen/view/1840.json` | 404                                      | **bleibt 404** (kein Legacy-Pfad) |

**`/de/…` bleibt für Seitenrouten 404 — und das kostet eine eigene Zeile Code.**
`deLocalizeUrl` entfernt das Präfix **jeder** konfigurierten Locale, `de`
eingeschlossen; ohne ausdrückliche Ablehnung in Schritt 2 räumt es `/de/` ab und
liefert die deutsche Seite unter einer zweiten URL aus. Bei `baseLocale: 'de'` ist Deutsch
präfixlos; wären `/sichtungen` und `/de/sichtungen` beide erreichbar, gäbe es
zwei URLs für denselben Inhalt. Erwogen und verworfen: eine dauerhafte
Weiterleitung `/de/x → /x`. Sie wäre nur nötig, wenn Lesezeichen auf die
CakePHP-Anwendung zeigten — die es nicht mehr gibt; die vier Legacy-API-Pfade
behalten ihr `/de/` ohnehin über Schritt 1.

**`/en/admin/**` bleibt 404 — das ist eine Umfangsentscheidung, keine
Sicherheitsanforderung.** `/admin` steht auf der Ausschlussliste
(`NICHT_LOKALISIERT` in `languagePrefix.ts`), weil der Bereich einsprachig
deutsch bleibt — nicht weil ein zweiter Pfad eine Lücke im Zugriffsschutz wäre.
Der Zugriffsschutz auf `/admin` ist route-basiert
(`requireUserRole(url, locals.user, [...])` in
`src/routes/admin/+layout.server.ts`) und griffe unverändert auch unter
`/en/admin`, wenn der Pfad lokalisiert wäre. `event.url.pathname` in
`hooks.server.ts` dient dort nur dem `/rest_sichtungen`-CSRF-Hinweis und dem
Error-Logging, nicht der Autorisierung. Diese Begründung wurde in
`languagePrefix.ts` inzwischen entsprechend korrigiert.

Die andere dort dokumentierte Begründung fällt dagegen weg: „`/en/` vor der
Startseite bleibt 404, weil die Anwendung einsprachig deutsch ist." Die Prämisse
gilt nicht mehr. `/en` allein zeigte in CakePHP auf das Meldeformular — mit der
englischen Fassung stellt sich genau das wieder her. Kommentar und
[LEGACY_API_SPECIFICATION.md](LEGACY_API_SPECIFICATION.md) sind entsprechend
umzuschreiben; eine stehengelassene Begründung, die nicht mehr trägt, ist
schlimmer als keine.

### 4.4 Installation: `reroute` ist nur die halbe Miete

Paraglide braucht **zwei** Einhängepunkte, und der zweite wird leicht übersehen:

| Ort                   | Was                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/hooks.ts`        | `reroute` — Routenauflösung (Abschnitt 4.1)                                                                  |
| `src/hooks.server.ts` | `paraglideMiddleware` — löst die Locale serverseitig auf und ersetzt `%lang%`/`%dir%` im ausgelieferten HTML |
| `vite.config.ts`      | `paraglideVitePlugin` mit `strategy`, `outdir`, `emitTsDeclarations: true`                                   |
| `src/app.html`        | `%lang%`-Platzhalter statt des harten `lang="de"`                                                            |

Ohne die Middleware gibt es keine serverseitig aufgelöste Locale — also kein
korrektes SSR und keinen ersetzten Platzhalter. Die Middleware ist so einzuhängen,
dass sie den bestehenden `authentication`-Handler in `hooks.server.ts` nicht
verschiebt; der prüft `event.url.pathname` für den `/rest_sichtungen`-CSRF-Hinweis
und muss das weiterhin vor jeder Umschreibung tun. Das ist eine reine
Ordering-Anforderung, kein Bezug zum `/admin`-Zugriffsschutz — der ist
route-basiert und von `reroute`/dieser Middleware unabhängig (siehe 4.3).

### 4.5 Spracherkennung

**Strategie: `['url', 'cookie', 'baseLocale']` — ohne `preferredLanguage`.**

Das ist eine bewusste Abweichung von der Paraglide-Standardempfehlung. Mit
`preferredLanguage` in der Kette würde `/sichtungen` je nach Browser-Header mal
deutsch und mal englisch rendern: dieselbe URL mit zwei Inhalten. Das ist nicht
cachebar, für Suchmaschinen ein Duplikat, und in einem iframe hinter fremder
Infrastruktur besonders schwer zu durchschauen. Präfixlos heißt deshalb
**immer Deutsch**.

`Accept-Language` wird an **genau einer** Stelle ausgewertet:

- **Hauptweg:** Die englische Seite auf meeresmuseum.de bindet den iframe mit
  `src=".../en"` ein. Die Sprachwahl trifft damit die Seite, auf der der Nutzer
  ohnehin steht. Eine englische Museumsseite existiert; die Anpassung der
  Einbettung ist mit dem DMM abzustimmen.
- **Rückfallebene:** Nur auf `/` — und nur, wenn kein Sprach-Cookie gesetzt ist —
  leitet der Server bei englischem `Accept-Language` einmalig auf `/en` weiter.
  Diese eine Antwort trägt `Vary: Accept-Language`; alle übrigen Pfade bleiben
  unbeeinflusst und voll cachebar. Greift auch, falls die Museumsseite unverändert
  bleibt.
- **Zusätzlich:** ein Umschalter in der Navigation. Der ist im iframe unsichtbar
  ([PublicNavbar.svelte:63](../src/lib/components/PublicNavbar.svelte#L63)) und
  deshalb ausdrücklich **kein** tragender Weg — nur Bequemlichkeit für die
  Direktaufrufer. Genau an dieser Fehlannahme ist `/bestimmungshilfe` schon
  einmal gescheitert (siehe [IFRAME_EINBETTUNG.md](IFRAME_EINBETTUNG.md)).

Das Cookie merkt eine ausdrückliche Wahl und schlägt den Header danach. Es ist
für den Betrieb der gewählten Funktion erforderlich und damit **nicht
einwilligungspflichtig** — es wird kein Profil gebildet und nichts an Dritte
übermittelt.

**Sprachwechsel-Links brauchen `data-sveltekit-reload`.** Ohne das navigiert
SvelteKit clientseitig, während die Laufzeit-Locale aus dem beim ersten Aufruf
gerenderten Dokument stammt — URL, SSR-Dokument und Locale laufen auseinander.
Betrifft den Umschalter und jeden Verweis, der die Sprache wechselt.

### 4.6 SEO und statische Metadaten

- `<html lang>` wird über den `%lang%`-Platzhalter dynamisch (Abschnitt 4.4);
  `<meta name="language">` in [app.html](../src/app.html) entfällt ersatzlos —
  es ist ohnehin kein von Suchmaschinen ausgewertetes Merkmal und wäre nur eine
  zweite, potenziell widersprüchliche Quelle.
- `hreflang`-Verweise je Seite, im Kopf-Block der jeweiligen Route — umgesetzt
  in **Etappe 2**, zusammen mit dem übrigen Markup. Der Kopf-Block gehört
  laut bestehender Regel dorthin und nicht in `app.html`; `e2e/seo-meta.spec.ts`
  wacht weiterhin darüber.
- **Es gibt weder `sitemap.xml` noch `robots.txt`** in `static/`. Die
  `hreflang`-Auszeichnung im Kopf ist damit die vollständige Maßnahme, nicht die
  halbe. Wer später eine Sitemap ergänzt, muss die Sprachvarianten dort
  nachziehen — hier steht das, damit niemand eine sucht, die es nie gab.
- [manifest.json](../static/manifest.json) ist statisch und deutsch (`name`,
  `short_name`, `description`, `start_url: "/"`). Für die englische Fassung
  entweder eine zweite Datei, die unter `/en` verlinkt wird, oder eine
  serverseitig erzeugte Route. Entscheidung im Umsetzungsplan — der Nutzen ist
  gering, weil die Anwendung überwiegend im iframe läuft und dort gar nicht
  installierbar ist.
- Die 404-/Fehlerseite (`+error.svelte`) folgt der Locale der aufgerufenen URL;
  bei einem 404 ohne erkennbare Locale gilt Deutsch.

---

## 5. Übersetzung der einzelnen Schichten

### 5.1 Schicht A — Formularschema

Die Zeichenketten in `.label()`, `.meta({...})` und den Validierungsmeldungen
werden durch Aufrufe der kompilierten Botschaftsfunktionen ersetzt. Yup wertet
Schemas beim Aufbau aus; das Schema muss deshalb **pro Anfrage** unter der
aktiven Locale erzeugt werden statt einmal als Modulkonstante. Das ist die
einzige strukturelle Änderung an dieser Datei — und sie hat einen Nebeneffekt,
der ausdrücklich erwünscht ist: Sie erzwingt, dass das Schema keinen
prozessweiten Zustand mehr hält (vgl. die SSR-Regel in
`.claude/rules/architecture.md`).

### 5.2 Schicht B — Domänen-Labels

`createOptionsFactory` bekommt statt eines `Record<keyof T, string>` einen
Record von Botschaftsfunktionen. `speciesLabels` analog.

**Die englischen Artnamen sind Fachinhalt, keine Übersetzungsarbeit.** Sie
brauchen Freigabe durch das Deutsche Meeresmuseum. Empfehlung: die
**wissenschaftlichen Namen** gleich mitführen (`Phocoena phocoena` …). Die sind
sprachneutral, für die Bestimmungshilfe ohnehin ein Gewinn und lösen die Frage,
was mit „Unbekannte Walart" geschieht.

### 5.3 Schicht C — Markup

Extraktion Komponente für Komponente. Reihenfolge nach Nutzersichtbarkeit:
Meldeformular → Karte → Navigation/Footer → Toasts und Fehlerseiten.

Beim Extrahieren gilt: **Markup-Kommentare sind keine Botschaften.** Sie bleiben
deutsch stehen, wo sie stehen. Das ist der Grund, warum die Extraktion nicht
mechanisch über einen Grep laufen kann.

### 5.4 Schicht D — Serverseitige und DB-gepflegte Texte

Paraglide kennt nur Schlüssel zur Buildzeit. Drei Texte liegen aber in der
Datenbank ([configService.ts](../src/lib/services/configService.ts)):

| Schlüssel                     | Umgang                                         |
| ----------------------------- | ---------------------------------------------- |
| `display.maintenanceMessage`  | zweiter Schlüssel `…_en`, Fallback auf Deutsch |
| `mobile.updateMessage`        | dito                                           |
| `notification.email.template` | **unverändert** — die Mail geht ans Museum     |

Ein zweiter Schlüssel statt einer JSONB-Spalte, weil es genau zwei Texte betrifft
und die Admin-Oberfläche für Konfiguration ohnehin je Schlüssel ein Feld zeigt.
Bei einem dritten Fall ist das neu zu bewerten.

### 5.5 Schicht E — Fachliche Inhaltsseiten

Struktureller Umbau durch die Entwicklung, **Inhalt vom Meeresmuseum**. Die
Fachtexte liegen bereits in geteilten Datenmodulen, aus denen alle drei
Aufrufstellen von `SpeciesIdentificationHelp` speisen — der Umbau erfolgt also
einmal, nicht dreimal.

Diese Etappe ist von den übrigen entkoppelt: Solange keine englischen Fachtexte
vorliegen, zeigen die Inhaltsseiten unter `/en` die deutsche Fassung mit einem
Hinweis. Das ist ein bewusster, sichtbarer Zwischenstand, kein stiller Rückfall.

---

### 5.6 Formatierung, Zeitzone und Plurale

**Zeitzone bleibt Europe/Berlin. Nur die Darstellung folgt der Locale.**

Das ist die wichtigste Regel dieses Abschnitts, weil ihr Bruch keine kaputte
Oberfläche erzeugt, sondern **falsche Daten**. Der Sichtungstag ist fachlich
immer Berliner Ortszeit; `sichtungsdatum` mischt im Bestand ohnehin schon
Ortszeit und UTC (siehe [ENVIRONMENT.md](ENVIRONMENT.md), Abschnitt `TZ`).

Die 25 harten `'de-DE'`-Fundstellen sind deshalb **nicht** gleichartig:

| Art der Fundstelle                                                                                                                                   | Umgang                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Darstellung** — `toLocaleDateString`, `Intl.NumberFormat` in der Oberfläche                                                                        | folgt der Locale                   |
| **Rechnung** — `berlinToday()` in [sightingSchema.ts](../src/lib/form/validation/sightingSchema.ts), das `sv-SE` bewusst für ISO-Reihenfolge benutzt | **unverändert**                    |
| **Datenformate** — Export, Legacy-API, `sqlTimeZone.ts`                                                                                              | **unverändert**, siehe Abschnitt 6 |

Die rechnenden Aufrufe sind im Umsetzungsplan namentlich aufzuführen, bevor
jemand die Liste mechanisch abarbeitet. `display.dateFormat` in der
Konfiguration ist ausdrücklich **nicht** betroffen: Der Schlüssel wird laut
[configLabels.ts:109](../src/routes/admin/settings/configLabels.ts#L109) nirgends
gelesen.

**Plurale gehören in ICU-Botschaften, nicht in Verkettungen.** Betroffen sind
Tierzahlen (`totalCount`), Trefferzahlen in der Listenansicht und Dateizahlen im
Dropzone. Wer „`{n} Tiere`" durch Zusammensetzen löst, ist bei „1 Tier" schon
falsch und in einer zweiten Sprache nicht mehr zu retten. Paraglide unterstützt
ICU-Plurale; das ist beim Extrahieren zu benutzen, nicht nachträglich.

**Freitexte der Melder bleiben in der Eingabesprache.** Ortsbeschreibungen,
Bemerkungen und Schiffsnamen werden gespeichert, wie sie eingegeben wurden. Der
Admin-Bereich zeigt dann englische Freitexte — das ist richtig so und keine
Lücke.

**Formularentwürfe im `localStorage` müssen den Sprachwechsel überleben.**
Gespeichert werden Werte, keine Beschriftungen ([localStorage.ts](../src/lib/storage/localStorage.ts),
[reportKind.ts](../src/lib/report/reportKind.ts)) — das trägt, ist aber beim
Umschalter ausdrücklich zu prüfen, weil `data-sveltekit-reload` (Abschnitt 4.5)
einen vollen Seitenaufbau auslöst.

---

## 6. Was locale-fest bleiben muss

Drei Pfade dürfen sich unter englischer Locale **nicht** ändern. Alle drei sind
von hier aus nicht mehr reparierbar, wenn sie einmal brechen:

1. **Legacy-API.** Deutscher Wertevertrag. Laut
   [LEGACY_API_SPECIFICATION.md](LEGACY_API_SPECIFICATION.md) normalisiert die
   Anwendung eingehende englische Windrichtungs-Abkürzungen bereits **auf die
   deutsche Form** — die Antwortrichtung ist damit erst recht festgelegt. Ein
   iOS-Client (`OstSeeTiere/8`) sendet aktiv.
2. **Exportformate.** CSV-, XML-, KML- und JSON-Kopfzeilen bleiben deutsch.
3. **`/en/admin/**`.** Bleibt 404 (Abschnitt 4.2).

Alle drei bekommen einen Guard-Test (Abschnitt 7.2). Kommentare tragen diese
Zusicherung nicht — dieselbe Erfahrung wie bei den Einwilligungskennungen, wo
ein Kommentar allein die Fassung nicht gehalten hat.

---

## 7. Einwilligung und Nachweis

### 7.1 Das Problem

Art. 7 Abs. 1 DSGVO verlangt, dass sich eine Einwilligung nachweisen lässt —
wann und **wozu** zugestimmt wurde. Die Anwendung löst das heute über
Fassungskennungen in [consentVersions.ts](../src/lib/form/consent/consentVersions.ts),
deren Geltungsbereich ausdrücklich die **gelesene Fläche** ist, nicht die
Zeichenkette im Schema; `consentSurfaces.svelte.test.ts` pinnt dazu Hashes der
gerenderten Flächen.

Eine englische Einwilligungsfläche ist damit ein anderer Wortlaut. Wer auf
Englisch zustimmt, hat dem englischen Text zugestimmt, und der Nachweis muss das
abbilden.

### 7.2 Lösung: Sprachsuffix an der Fassungskennung

Die vier Nachweisspalten sind `varchar(32)`
([schema.ts:78](../src/lib/server/db/schema.ts#L78) ff.) und tragen heute Werte
wie `2026-08-04`. Künftig tragen sie `2026-08-04-de` beziehungsweise
`2026-08-04-en`.

**Keine neue Spalte, keine Migration.** Das war der erste Entwurf und ist
verworfen: Die Sprache ist eine Eigenschaft der Einwilligung, nicht der Sichtung,
und gehört deshalb an die Kennung. Eine separate Spalte `sprache` wäre zudem
YAGNI — der einzige Zweck, den sie hätte haben können (Sprache der
Benachrichtigungsmail), entfällt, weil die Mail ans Museum geht.

**Bestandsdaten bleiben unangetastet.** Werte ohne Suffix gelten als `de`. Das
wird in `consentVersions.ts` dokumentiert und ist die einzige Stelle, an der die
Auswertung eine Sonderregel braucht.

**Die Hash-Pins verdoppeln sich.** `consentSurfaces.svelte.test.ts` bekommt je
Fläche einen zweiten gepinnten Hash für die englische Fassung. Ändert sich einer
der beiden Wortlaute, muss die zugehörige Kennung steigen — die bestehende Regel
gilt unverändert, nur je Sprache.

### 7.3 Zwischenstand

Falls die englischen Einwilligungstexte bei Umsetzungsbeginn noch nicht
freigegeben sind, ist ein markierter Zwischenstand zulässig: Das Formular ist
englisch, **Schritt 4 bleibt deutsch**, mit sichtbarem Hinweis. Der Sprachbruch
ist dann gewollt und erkennbar — nicht die schlechtere Variante, in der ein
englischer Melder einen deutschen Text ankreuzt, ohne dass es jemandem auffällt.

Dieser Zwischenstand ist **kein Auslieferungsziel.** Er wird im Umsetzungsplan
als eigener, ausdrücklich befristeter Zustand geführt.

---

## 8. Teststrategie

### 8.1 Bestehende Suite

Die 290 Textselektoren in der E2E-Suite bleiben, die Default-Locale im Test ist
`de`. Verworfen wurden:

- **Umstellung auf `data-testid`.** Kostet ~290 Umbauten und verliert dabei etwas
  Reales: `getByRole('button', { name: … })` prüft nebenbei den zugänglichen
  Namen. Für ein Projekt mit WCAG-2.1-AA-Anspruch wäre das ein Rückschritt. (Die
  Suite hat mit 193 `data-testid`-Zugriffen ohnehin schon eine sprachneutrale Ader.)
- **Selektoren gegen die Botschaftsfunktionen.** Tautologie: Test und Anwendung
  läsen dieselbe Quelle, ein falsch übersetzter Text fiele nicht mehr auf.

### 8.2 Neue Tests

| Test                    | Sichert ab                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| EN-Rauchtest (E2E)      | `/en` erreichbar, Formular durchspielbar, Umschaltung, Einwilligungsfläche |
| Legacy-API locale-fest  | die vier Pfade unter `en`-Locale liefern deutsche Vertragswerte            |
| Export locale-fest      | CSV/XML/KML-Kopfzeilen unter `en`-Locale unverändert                       |
| `/en/admin/**` → 404    | kein zweiter Pfad auf geschützte Routen                                    |
| Ausschlussliste         | `/en/api/**`, `/en/uploads/**`, `/en/health`, `/de/sichtungen` → 404       |
| Vollständigkeit         | fehlende englische Botschaft bricht den Build                              |
| **Hartcodierte Texte**  | nicht extrahierte Zeichenkette in übersetztem Bereich → rot (8.3)          |
| Einwilligungsflächen EN | zweiter gepinnter Hash je Fläche                                           |

Der Vollständigkeitstest gehört in `npm run test:quick`. Ohne ihn rutscht eine
neue deutsche Zeichenkette ohne englische Entsprechung still durch und erscheint
im englischen Formular auf Deutsch — der Fehler, der sich am schlechtesten von
selbst zeigt.

`scripts/testGate.test.ts` rechnet bereits nach, ob `test:quick` jedes
konfigurierte Vitest-Projekt fährt. Kommt für die Übersetzungsprüfung ein eigener
Schritt hinzu, ist dieser Test die Stelle, die ihn festhält.

### 8.3 Guard gegen hartcodierte Texte

Zwei Fehlerfälle, die oft verwechselt werden — und nur einer davon ist durch den
Compiler abgedeckt:

| Fall                                                                 | Wer findet ihn          |
| -------------------------------------------------------------------- | ----------------------- |
| Botschaft extrahiert, englische Fassung fehlt                        | Paraglide, Build-Fehler |
| Botschaft **gar nicht erst extrahiert** — Zeichenkette steht im Code | **nur ein Scan**        |

Den zweiten Fall kann Paraglide prinzipbedingt nicht sehen: Was nie ein
Schlüssel wurde, fehlt in keiner Sprachdatei. Genau das ist der Zustand, in dem
das englische Formular deutsche Brocken zeigt, ohne dass irgendetwas rot wird.

**Der Scan gehört in die vorhandene Bauart.** Das Projekt hat vier Guards dieses
Typs (`approvalPredicateScan`, `verifiedReadScan`, `statusLogWriteScan`,
`openQueueOrderScan`) und eine geteilte Utility
[sourceScan.testutil.ts](../src/lib/testing/sourceScan.testutil.ts) mit
`sourceFiles`, `stripComments`, `collectHits`. Entscheidend hier: `stripComments`
behandelt `<!-- … -->` in Svelte-Markup bereits. Da dieses Projekt Begründungen
ausdrücklich **ins Markup** schreibt (`CLAUDE.md`), wäre ein Scan ohne diesen
Schritt von Anfang an unbrauchbar.

Zuschnitt von `hardcodedStringScan.test.ts`:

- **Positivliste der geprüften Verzeichnisse**, nicht global: die als übersetzt
  erklärten Bereiche (öffentliche Komponenten, `formOptions/`,
  `sightingSchema.ts`). Der Admin-Bereich ist ausdrücklich draußen — ein Guard,
  der ab Tag eins rot ist, wird abgeschaltet und schützt danach nichts.
- **Drei Muster:** Textknoten im Markup mit mindestens zwei Wörtern; nutzersichtbare
  Attribute (`placeholder`, `title`, `aria-label`, `alt`); Zeichenketten-Literale in
  `.label(…)`, `.meta({…})` und Yup-Validierungsmeldungen.
- **Keine Umlaut-Heuristik.** Sie versagt genau dort, wo es zählt: Eine
  versehentlich englisch hartcodierte Zeichenkette hat keine Umlaute.
- **Ausnahmeliste mit Begründungspflicht** statt perfekter Erkennung — so lösen
  es die vier bestehenden Guards auch. Eine Ausnahme ohne Begründung ist ein
  Review-Befund, kein Testfehler.
- **Konstruierte Positiv- und Gegenproben im Test selbst.** Das verlangt das
  Vorbild ausdrücklich: Ein Scan über einen konformen Bestand belegt nichts über
  die Regel — er ist auch dann grün, wenn das Muster eine Lücke hat.
- **Remediation-Text in der Fehlermeldung**, wie in `statusLogWriteScan.test.ts`:
  Der Guard sagt, was stattdessen zu tun ist, nicht nur, was falsch war.

Erwogen und verworfen: `eslint-plugin-i18next/no-literal-string`. Es kennt
Svelte-Markup nur schwach, und eine fünfte Bauart neben vier bestehenden Guards
würde getrennt altern — genau der Fall, den das Datei-Doc von
`sourceScan.testutil.ts` für die frühere Doppelimplementierung beschreibt.

Der Scan ist **kein Ersatz** für Sorgfalt beim Extrahieren, sondern ein Netz für
den Rückfall: die Zeile, die drei Monate später jemand schnell noch einfügt.

---

## 9. Aufwand

Personentage, ohne die Übersetzungsleistung selbst (Fachinhalt vom DMM).

| Etappe | Inhalt                                                                                                                                                               | Aufwand   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 0      | Paraglide (Vite-Plugin, `reroute`, `paraglideMiddleware`, `%lang%`), Ausschlussliste, Locale-Erkennung, **lokalisierte Verweise, Sprachumschalter**, Zeitzonen-Guard | 4–5       |
| 1      | Schichten A + B — Schema und `formOptions`; deckt Formular, Karte, Popups, Liste ab                                                                                  | 3–4       |
| 2      | Schicht C — öffentliches Markup, Plurale, `hreflang` je Route, Toasts, Fehlerseiten                                                                                  | 3–4       |
| 3      | Einwilligung und Nachweis (Abschnitt 7)                                                                                                                              | 1–3       |
| 4      | Schicht E — Inhaltsseiten, struktureller Umbau                                                                                                                       | 2–3       |
| 5      | Guards inkl. Hartcodiert-Scan (8.3), Vollständigkeitsprüfung, EN-Rauchtest                                                                                           | 3–4       |
|        | **Summe**                                                                                                                                                            | **16–23** |

**Korrektur gegenüber der ersten Fassung (15–22).** Beim Ausarbeiten von
Etappe 0 stellte sich heraus, dass zwei Punkte dort falsch einsortiert waren:
Die **Lokalisierung interner Verweise** und der **Sprachumschalter** sind
Routing, nicht Text. Ohne sie fällt `/en` beim ersten Klick zurück auf Deutsch,
und im iframe gibt es keine Navigation zum Zurückfinden — Etappe 0 lieferte
sonst eine erreichbare, aber unbenutzbare englische Fassung. Im Gegenzug wandert
`hreflang` nach Etappe 2, weil die Verweise in die Kopf-Blöcke der zwölf
`+page.svelte` gehören, die dort ohnehin geöffnet werden.

Die Spannen sind echt, nicht kosmetisch: Etappe 2 hängt an der tatsächlichen
Botschaftszahl (Abschnitt 3), Etappe 3 an der Rückmeldung zum
Einwilligungskonzept.

**Etappe 0 enthält einen Schritt, der leicht übersehen wird und dann teuer ist:**
Der von Paraglide erzeugte Code unter `src/lib/paraglide` gehört nicht ins
Repository — dann müssen `lint`, `type-check` und `check` ihn aber vorfinden. Der
Compile-Schritt gehört deshalb vor `npm run test:quick` **und** in
`npm run worktree:setup`, neben `svelte-kit sync`. Fehlt er, ist ein frischer
Worktree rot und die Ursache sieht nach einem kaputten Setup aus statt nach einem
fehlenden Build-Schritt.

Etappen 0–2 sind die tragende Reihenfolge und aufeinander angewiesen. Etappen 3,
4 und 5 sind untereinander unabhängig und können parallel oder nachgelagert
laufen; Etappe 5 sollte nicht ans Ende rutschen — die Guards aus Abschnitt 6
schützen genau die Pfade, die während der Umstellung am ehesten brechen.

### 9.1 Auslieferung

**`/en` ist von Etappe 0 an öffentlich erreichbar, trägt aber bis zum Abschluss
der Übersetzung `X-Robots-Tag: noindex, follow`.** Der ursprüngliche Plan sah
vor, `/en` bis Etappe 3 zusätzlich in die Ausschlussliste aus Abschnitt 4.2
aufzunehmen und damit 404 zu liefern. Umgesetzt wurde stattdessen Option C: ein
Header-Riegel (`noindexEnglishPages` in `src/hooks.server.ts`) hält die noch
deutschsprachige `/en`-Fassung aus dem Suchmaschinenindex, ohne den Pfad selbst
zu sperren.

**Grund für den Wechsel.** Etappe 0 hat `/en` bereits über mehrere E2E-Tests
verankert (Task 6, `e2e/i18n-routing.spec.ts`, u. a. „`/en` liefert die Seite
aus"). Ein nachträgliches Aufnehmen von `/en` in die Ausschlussliste hätte rund
zehn dieser Tests rot gemacht — keine Ein-Zeilen-Maßnahme mehr. `noindex,
follow` erfüllt die eigentliche Absicht — kein halb übersetzter englischer
Zustand wird öffentlich indexierbar — mit weniger Bruch als eine 404-Sperre.

**Der Riegel muss beim Abschluss der Übersetzung entfernt werden — und im
selben Schritt `hreflang` ergänzt werden (Abschnitt 4.6, Etappe 2).** Nur den
Riegel zu entfernen, ohne `hreflang` nachzuziehen, kippt das Problem in die
andere Richtung: Google indexiert dann die englische Fassung, aber ohne
Sprachzuordnung zur deutschen — wieder Duplicate-Content-Risiko, nur
andersherum. Die Entfernungsbedingung ist auch im Quelltext festgehalten
([noindexEnglishPages.ts](../src/lib/server/middleware/noindexEnglishPages.ts)).

Etappe 4 (Inhaltsseiten) darf unabhängig davon folgen: Bis englische Fachtexte
vorliegen, zeigen `/en/about` und `/en/bestimmungshilfe` die deutsche Fassung
mit sichtbarem Hinweis (Abschnitt 5.5). Ein erkennbarer Zwischenstand, kein
stiller Rückfall.

---

## 10. Offene Punkte

| Punkt                                                           | Wer entscheidet | Blockiert                             |
| --------------------------------------------------------------- | --------------- | ------------------------------------- |
| Englische Einwilligungstexte, freigegeben                       | DMM/Datenschutz | Etappe 3                              |
| Englische Artnamen und Fachtexte für die Bestimmungshilfe       | DMM             | Etappe 4                              |
| Anpassung der iframe-Einbettung auf der englischen Museumsseite | DMM             | nichts — Rückfallebene greift         |
| Ob ein Legacy-Client das `/de/`-`/en/`-Präfix nutzt             | unklärbar       | nichts — Verhalten bleibt unverändert |
| Englische Fassung von `manifest.json` (zweite Datei vs. Route)  | Umsetzungsplan  | nichts — geringer Nutzen im iframe    |

Der letzte Punkt bleibt bewusst offen: Das Zugriffsprotokoll auf hawking reicht
nur einen Tag zurück. Da sich am Legacy-Verhalten nichts ändert, ist die Frage
für dieses Vorhaben ohne Folgen.

---

## Was hier nicht steht

- **Kein Umsetzungsplan.** Etappen sind benannt, aber nicht in Arbeitsschritte
  mit Tests zerlegt. Das folgt separat.
- **Keine Botschafts-Schlüsselstruktur.** Ob nach Route, nach Komponente oder
  flach benannt wird, entscheidet sich sinnvoll erst an der ersten Extraktion in
  Etappe 1.
- **Keine belastbare Botschaftszahl für Schicht C.** Siehe Abschnitt 3; die
  Schätzung ist als solche markiert.
