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

| Frage        | Entscheidung                                                                               |
| ------------ | ------------------------------------------------------------------------------------------ |
| Bibliothek   | **Paraglide JS** (inlang), compilerbasiert                                                 |
| Sprachwahl   | **URL-Präfix `/en/…`**, Elternseite entscheidet; `Accept-Language` als Rückfallebene       |
| Einwilligung | **Vollwertig zweisprachig** im Nachweis; deutsch-only als markierter Zwischenstand erlaubt |
| Tests        | **Suite bleibt deutsch**, schmaler EN-Rauchtest kommt dazu                                 |

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

## 4. Routing: die `reroute`-Komposition

**Das ist die heikelste Stelle des ganzen Vorhabens.**

SvelteKit erlaubt genau **einen** `reroute`-Export. Er ist bereits belegt
([hooks.ts](../src/hooks.ts)) und Paraglide beansprucht ihn ebenfalls. Die beiden
Bedeutungen des Präfixes sind dabei gegenläufig:

| Aufruf                               | heute                                    | künftig                  |
| ------------------------------------ | ---------------------------------------- | ------------------------ |
| `/en/rest_sichtungen/antworten.json` | Präfix abschneiden, **deutsche** Antwort | **unverändert**          |
| `/en/sichtungen`                     | 404                                      | englische Oberfläche     |
| `/en`                                | 404                                      | englisches Meldeformular |
| `/en/admin/...`                      | 404                                      | **bleibt 404**           |

### 4.1 Reihenfolge

```
reroute(url):
  1. stripLegacyLanguagePrefix(url.pathname)   → Treffer? Ergebnis zurückgeben, fertig.
  2. deLocalizeUrl(url)                        → alles Übrige.
```

Die Legacy-Prüfung muss zuerst laufen und sie ist bereits eng gefasst: eine
Positivliste von genau vier Pfaden in `LEGACY_PFADE`, bewusst nicht generisch
über Verzeichnisse. Diese Enge ist jetzt doppelt wertvoll — sie verhindert, dass
Paraglide je einen Legacy-Pfad in die Hand bekommt.

### 4.2 Zwei bestehende Entscheidungen, die sich ändern

Beide sind heute in `languagePrefix.ts` und
[LEGACY_API_SPECIFICATION.md](LEGACY_API_SPECIFICATION.md) ausdrücklich begründet.
Wer sie umdreht, muss die Begründung mit umschreiben — sonst steht dort eine
Erklärung, die nicht mehr trägt.

- **„`/en/` vor der Startseite bleibt 404, weil die Anwendung einsprachig deutsch
  ist."** Diese Prämisse fällt weg. `/en` allein zeigte in CakePHP auf das
  Meldeformular; mit der englischen Fassung stellt sich genau das wieder her.
- **„`/en/admin` wäre ein zweiter Pfad auf geschützte Routen."** Diese Begründung
  **bleibt gültig** und wird zur harten Anforderung: Der Schutz in
  `hooks.server.ts` hängt an `event.url.pathname`, den `reroute` nicht verändert.
  Der Admin-Bereich ist ohnehin nicht im Umfang. Ein Guard-Test sichert den 404 ab
  (Abschnitt 7.2).

### 4.3 Spracherkennung

- **Hauptweg:** Die englische Seite auf meeresmuseum.de bindet den iframe mit
  `src=".../en"` ein. Die Sprachwahl trifft damit die Seite, auf der der Nutzer
  ohnehin steht. Eine englische Museumsseite existiert; die Anpassung der
  Einbettung ist mit dem DMM abzustimmen.
- **Rückfallebene:** Wer ohne Präfix kommt, wird anhand von `Accept-Language`
  einmalig weitergeleitet; die Wahl wird in einem Cookie gemerkt und schlägt den
  Header danach. Greift auch, falls die Museumsseite unverändert bleibt.
- **Zusätzlich:** ein Umschalter in der Navigation. Der ist im iframe unsichtbar
  ([PublicNavbar.svelte:63](../src/lib/components/PublicNavbar.svelte#L63)) und
  deshalb ausdrücklich **kein** tragender Weg — nur Bequemlichkeit für die
  Direktaufrufer. Genau an dieser Fehlannahme ist `/bestimmungshilfe` schon
  einmal gescheitert (siehe [IFRAME_EINBETTUNG.md](IFRAME_EINBETTUNG.md)).

### 4.4 SEO

`<html lang>` und `<meta name="language">` in [app.html](../src/app.html) sind
heute hart auf `de` gesetzt und werden dynamisch. Dazu `hreflang`-Verweise je
Seite. Der Kopf-Block gehört laut bestehender Regel in die jeweilige Route, nicht
in `app.html` — daran ändert sich nichts, und `e2e/seo-meta.spec.ts` wacht
weiterhin darüber.

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
| Vollständigkeit         | fehlende englische Botschaft bricht den Build                              |
| Einwilligungsflächen EN | zweiter gepinnter Hash je Fläche                                           |

Der Vollständigkeitstest gehört in `npm run test:quick`. Ohne ihn rutscht eine
neue deutsche Zeichenkette ohne englische Entsprechung still durch und erscheint
im englischen Formular auf Deutsch — der Fehler, der sich am schlechtesten von
selbst zeigt.

`scripts/testGate.test.ts` rechnet bereits nach, ob `test:quick` jedes
konfigurierte Vitest-Projekt fährt. Kommt für die Übersetzungsprüfung ein eigener
Schritt hinzu, ist dieser Test die Stelle, die ihn festhält.

---

## 9. Aufwand

Personentage, ohne die Übersetzungsleistung selbst (Fachinhalt vom DMM).

| Etappe | Inhalt                                                                                         | Aufwand   |
| ------ | ---------------------------------------------------------------------------------------------- | --------- |
| 0      | Paraglide, `reroute`-Komposition, Locale-Erkennung, `lang`/`hreflang`, `de-DE`-Hartcodierungen | 2–3       |
| 1      | Schichten A + B — Schema und `formOptions`; deckt Formular, Karte, Popups, Liste ab            | 3–4       |
| 2      | Schicht C — öffentliches Markup, Navigation, Toasts, Fehlerseiten                              | 3–4       |
| 3      | Einwilligung und Nachweis (Abschnitt 7)                                                        | 1–3       |
| 4      | Schicht E — Inhaltsseiten, struktureller Umbau                                                 | 2–3       |
| 5      | Guards, Vollständigkeitsprüfung, EN-Rauchtest                                                  | 2–3       |
|        | **Summe**                                                                                      | **13–20** |

Die Spannen sind echt, nicht kosmetisch: Etappe 2 hängt an der tatsächlichen
Botschaftszahl (Abschnitt 3), Etappe 3 an der Rückmeldung zum
Einwilligungskonzept.

Etappen 0–2 sind die tragende Reihenfolge und aufeinander angewiesen. Etappen 3,
4 und 5 sind untereinander unabhängig und können parallel oder nachgelagert
laufen; Etappe 5 sollte nicht ans Ende rutschen — die Guards aus Abschnitt 6
schützen genau die Pfade, die während der Umstellung am ehesten brechen.

---

## 10. Offene Punkte

| Punkt                                                           | Wer entscheidet | Blockiert                             |
| --------------------------------------------------------------- | --------------- | ------------------------------------- |
| Englische Einwilligungstexte, freigegeben                       | DMM/Datenschutz | Etappe 3                              |
| Englische Artnamen und Fachtexte für die Bestimmungshilfe       | DMM             | Etappe 4                              |
| Anpassung der iframe-Einbettung auf der englischen Museumsseite | DMM             | nichts — Rückfallebene greift         |
| Ob ein Legacy-Client das `/de/`-`/en/`-Präfix nutzt             | unklärbar       | nichts — Verhalten bleibt unverändert |

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
