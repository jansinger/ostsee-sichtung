# Faktencheck Formulartexte — 2026-07-27

Prüfung aller Zahlen- und Institutionsangaben, die Bürger:innen im Sichtungsformular
angezeigt werden. Anlass: In PR #558 und #567 wurden erfundene Statistiken entfernt;
zu klären war, ob es für die Aussagen belegte Zahlen gibt und ob weitere Fälle existieren.

**Ergebnis in einem Satz:** Keine der beanstandeten Zahlen ist belegbar — eine ist durch
die eigene Datenbank sogar widerlegt — und die Ursache der ganzen Serie wurde gefunden:
hartkodierte Platzhalter-Statistiken in `FormHelp.svelte`.

---

## 1. Prüfung gegen die eigene Datenbank

| Aussage                                 | Behauptet | Tatsächlich (DB, 19.877 Sichtungen)       | Ergebnis                   |
| --------------------------------------- | --------- | ----------------------------------------- | -------------------------- |
| Schweinswalsichtungen morgens 6–10 Uhr  | 73 %      | **10,6 %**                                | **widerlegt**              |
| Schiffe melden seit … Jahren regelmäßig | 15 Jahre  | **22,8 Jahre** (PENNY LANE, 95 Meldungen) | **belegt, war zu niedrig** |

Die tatsächliche Verteilung der Schweinswalsichtungen hat ihren Gipfel **mittags**
(11–14 Uhr ≈ 44 %), nicht morgens:

| Stunde | 11     | 12     | 13     | 14     | 15    |
| ------ | ------ | ------ | ------ | ------ | ----- |
| Anteil | 11,1 % | 11,4 % | 11,2 % | 10,4 % | 8,8 % |

Das bildet den Rhythmus der **Beobachtenden** ab, nicht den der Tiere.

### Methodische Grenze — wichtig für künftige Aussagen

Die Tabelle `sichtungen` enthält **nur positive Meldungen**. Es gibt keine Tabelle für
Beobachtungsaufwand und keine Nullbeobachtungen (geprüft: nur `sichtungen`,
`sichtungen_dateien`, `app_config`, `audit_logs`).

Daraus folgt: Aussagen der Form „bei Bedingung X werden N-mal mehr Tiere entdeckt"
lassen sich aus dieser Datenbasis **grundsätzlich nicht** ableiten — dafür müsste bekannt
sein, wie oft unter Bedingung X _vergeblich_ geschaut wurde. Alle vier ursprünglich
beanstandeten Aussagen sind von dieser Art.

---

## 2. Prüfung gegen die Literatur

| #   | Aussage                                     | Ergebnis                                                                                             |
| --- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | 73 % morgens                                | **Keine Quelle, Muster gegenteilig** — Schweinswale sind akustisch v. a. nachtaktiv                  |
| 2   | 5× mehr Tiere bei ruhiger See               | Effekt **qualitativ gut belegt**, Faktor 5 nicht                                                     |
| 3   | Nordwind +40 %                              | **Keine Quelle.** Windrichtung taucht in Habitatmodellen nicht als Prädiktor auf                     |
| 4   | Elektromotoren +60 % Sichtungen             | **Keine Quelle — und fachlich fragwürdig** (s. u.)                                                   |
| 5   | Boot 3× bessere Entdeckungsrate als Land    | **Keine Quelle**, Literatur zeigt Gegenbeispiele in beide Richtungen                                 |
| 6   | Wale tauchen bei Wind länger/seltener auf   | **Keine Quelle** für Verhaltensänderung; belegt ist nur schlechtere Sichtbarkeit                     |
| 7   | Distance Sampling = „präziseste Methode"    | **Überzogen**, korrekt: etabliertes Standardverfahren                                                |
| 8   | IPCC-Meeresspiegel-Report                   | **Frei erfunden.** Einen solchen Report gibt es nicht; der IPCC verarbeitet keine Sichtungsmeldungen |
| 9   | Daten fließen in EU-Meeresschutzrichtlinien | **Qualitativ belegt**, aber differenziert (s. u.)                                                    |

**Zu 2 (Seegang):** Belegbar über Teilmann (2003), _J. Cetacean Res. Manage._ 5(1),
DOI 10.47536/jcrm.v5i1.830 — signifikanter Effekt bereits zwischen Seastate 0–3. Konkrete
Zahlen bei Gilles et al. (2023), SCANS-IV, Tab. 5: effektive Suchbreite 167 m (gute
Bedingungen) vs. 114 m (mäßig), g(0) 0,415 vs. 0,298.

**Zu 4 (Antrieb):** Smith et al. (2026), _JASA_ 159(3), 2388–2397 — Elektroantriebe sind
breitbandig leiser, erzeugen aber hochfrequente tonale Komponenten **genau im besten
Hörbereich des Schweinswals**. „Elektro = mehr Sichtungen" wäre also nicht nur unbelegt,
sondern potenziell irreführend. Belegt ist dagegen die Störwirkung von Bootslärm generell:
Wisniewska et al. (2018), _Proc. R. Soc. B_ 285:20172314; Dyndo et al. (2015), _Sci. Rep._ 5:11083.

**Zu 9 (EU):** Belegt ist, dass **standardisierte Bestandserfassungen** (SCANS, SAMBAH) in
MSRL-, FFH-, HELCOM- und ASCOBANS-Bewertungen einfließen (Gilles et al. 2023, S. 30 f.).
Opportunistische Bürgermeldungen sind eine **ergänzende** Quelle für Verbreitung und
Präsenz — sie liefern keine Abundanzschätzung. Die bisherige Formulierung („fließen direkt
ein", „Sie beeinflussen maritime Politik!") war deshalb zu stark.

---

## 3. Ursache der Serie — hartkodierte Platzhalter

Der Ursprung aller beanstandeten Zahlen stand in `src/lib/report/components/FormHelp.svelte`
als Fallback-Werte der Statistik-Anzeige:

```ts
// vorher
let statistics = $state<SightingStatistics>({
	totalSightings: 2847, // ← die in PR #558 entfernte „2.847 andere Sichtungen"
	completionRate: 89, // ← die „89 % erfahrener Beobachter" aus Aussage 2
	yearsOfService: 15, // ← die „seit 15 Jahren" aus dem Schiffsnamen-Text
	uniqueUsers: 150,
	sightingsWithMedia: 1200,
	deadAnimalsFound: 25
});
```

Jemand hat plausibel aussehende Platzhalter gesetzt und später Marketing-Texte
**auf diese Platzhalter hin** geschrieben. PR #558 und #567 haben die Texte entfernt,
die Platzhalter blieben.

Sie waren nicht bloß totes Beiwerk: Nur der erste Statistik-Block prüfte `fetchFailed`.
Bei einem Ausfall von `/api/statistics` bekamen Bürger:innen die erfundenen Zahlen als
Tatsachen angezeigt:

| Anzeige         | Platzhalter | Echt (API) |
| --------------- | ----------- | ---------- |
| Jahre           | 15          | **24**     |
| mit Fotos       | 42 %        | **4 %**    |
| Totfunde        | 25          | **1.830**  |
| Sichtungen ges. | 2.847       | **19.877** |

Zusätzlich stand dort eine fest verdrahtete Kachel **„3× häufiger zitiert"** — mit
Lade-Spinner, also optisch als geladene Statistik getarnt — sowie ein Alert mit
**„IPCC-Klimabericht"**, dem Badge **„IPCC Report"** und dem Satz
„Windpark-Planungen werden anhand Ihrer Koordinaten angepasst".

---

## 4. Was geändert wurde

**`sightingSchema.ts`** — neun Texte überarbeitet: `sightingFrom`, `distance`, `visibility`,
`windForce`, `mediaFile`, `mediaConsent`, `shipName`, `shipCount`, `behaviorText`, `notes`,
`otherObservations`.

Der einzige Fall, in dem eine Zahl **bleibt**, ist der durch die eigene DB belegte:

```ts
valueText: 'Schiffsnamen ermöglichen Langzeitauswertungen - einzelne Schiffe melden laut
            unserer Sichtungsdatenbank seit über 20 Jahren immer wieder Sichtungen';
```

**`FormHelp.svelte`** — Platzhalter durch `null` ersetzt (keine erfundene Zahl kann mehr
angezeigt werden), fehlerhafter `response.ok`-Zweig korrigiert, `3×`-Kachel und
IPCC-Alert entfernt, EU-Aussage auf die belegbare Formulierung reduziert.

**`sightingSchemaClaims.test.ts`** (neu) — macht die Regel durchsetzbar statt nur
dokumentiert. Der Test schlägt fehl, sobald ein `valueText` eine Zahl ohne Quelleneintrag
enthält oder eine fremde Institution vereinnahmt. Verifiziert durch Mutationstest.

**`.claude/rules/design-system.md`** — Regel „Zahlen in Nutzertexten nur mit Quelle" um
Negativbeispiele, Format für belegte Zahlen und die methodische Grenze der Datenbasis ergänzt.

---

## 5. Rückmeldung des Fachteams (2026-07-27) — erledigt

Alle vier Punkte sind geklärt und umgesetzt.

**1. Seegang-Zahlen aufnehmen? → Ja, laienverständlich.**
Die SCANS-IV-Werte (effektive Suchbreite 167 m bei guten, 114 m bei mäßigen Bedingungen,
also −31,7 %) stehen jetzt als „rund ein Drittel" im Text — ohne Fachbegriffe, mit
erkennbarer Quelle:

> „Bei unruhiger See schrumpft der Streifen Meer, den Beobachter verlässlich absuchen
> können, um rund ein Drittel (Ostsee-Erfassung SCANS 2023) …"

Bewusst **ohne Beaufort-Zahl**, weil SCANS unter „gut/mäßig" Seegang, Trübung und
Blendung zusammenfasst — eine konkrete Windstärke wäre schon wieder eine Überpräzisierung.

**2. Datenweitergabe → bestätigt, Weitergabe erfolgt direkt vom DMM.**
Damit ist die Aussage wieder konkret formulierbar und nennt die Gremien. Im Formular
(`notes`) und in der Hilfe-Sektion, dort mit kurzer Erklärung, was HELCOM und ASCOBANS
überhaupt sind — die Abkürzungen allein sagen Bürger:innen nichts.

**3. `shipName`-Text → unverändert übernommen.**

**4. Epoch-Ausschluss → festgehalten, siehe unten.**

---

## 6. Epoch-Platzhalter zählen nicht mit

**Festgehalten als verbindliche Regel:** Datensätze mit dem Platzhalterdatum
`1970-01-01` sind fehlerhafte Importe und fließen **nicht** in Statistiken ein.

Datenlage: 280 Datensätze liegen auf exakt `1970-01-01 01:00:00`. Zwischen 1970 und 2002
existiert kein einziger Datensatz — die älteste echte Sichtung stammt vom 08.07.2002.

Umgesetzt in `sightingRepository.ts` über eine benannte Konstante:

```ts
export const EARLIEST_PLAUSIBLE_SIGHTING_DATE = new Date('1990-01-01T00:00:00Z');
```

Die Grenze liegt bewusst in der Lücke zwischen Epoch und der ältesten echten Sichtung.

### Dabei gefundener Fehler

Die vorherige Implementierung verglich auf **Gleichheit** mit `new Date(0)` + `setHours(2)`.
`setHours` arbeitet in der lokalen Zeitzone:

| Umgebung                | Ergebnis          | Trifft die Daten? |
| ----------------------- | ----------------- | ----------------- |
| Europe/Berlin (lokal)   | 1970-01-01T01:00Z | ja                |
| UTC (Docker/Produktion) | 1970-01-01T02:00Z | **nein**          |

Im Docker-Setup ist kein `TZ` gesetzt, der Container läuft also UTC. In Produktion wurden
die 280 Epoch-Datensätze damit **mitgezählt** und `yearsOfService` sprang von 24 auf ~56
Jahre. Die feste UTC-Grenze ist zeitzonenunabhängig; abgesichert durch
`statisticsEpochExclusion.test.ts`, der alle 24 Stundenvarianten des 01.01.1970 prüft.

### Offen geblieben

365 Datensätze haben exakt `00:00:00` als Uhrzeit. Anders als die Epoch-Datensätze sind
das plausible Sichtungen mit fehlender Uhrzeitangabe — sie werden **nicht** ausgeschlossen,
sollten bei tageszeitlichen Auswertungen aber gefiltert werden (wie in Abschnitt 1 geschehen).

---

## Nachtrag: Öffentliche Statistiken zählten nicht freigegebene Sichtungen mit

### Befund

`getSightingStatistics()` filterte in **keiner** Abfrage nach `freigegeben_am`. Die
öffentliche Legacy-Karte (`/sichtungen/showreports.json`) tut das seit jeher.

| Kennzahl (Produktionsstand 2026-07-27) | Anzahl      |
| -------------------------------------- | ----------- |
| Sichtungen gesamt                      | 19.877      |
| davon freigegeben                      | 19.262      |
| nicht freigegeben                      | 615 (3,1 %) |

Folge: Der Hilfetext im Formular nannte 19.877, die Karte zeigte 19.262 Marker. Wer
nachzählt, bekommt eine andere Zahl als der Text daneben behauptet.

### Vorgabe des Deutschen Meeresmuseums (2026-07-27)

1. Im öffentlichen Bereich zählen ausschließlich freigegebene Sichtungen.
2. In der Admin-Statistik dürfen nicht freigegebene vorkommen, aber niemals mit
   freigegebenen zu **einer** Zahl vermischt — getrennt ausweisen
   („19.262 freigegeben / 615 offen"), nicht als Summe.
3. Eine Statistikzahl ohne erkennbaren Freigabebezug soll es nicht mehr geben.

### Umsetzung

| Stelle                                      | Änderung                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/lib/server/db/approvalFilter.ts` (neu) | `approvedOnly()` / `pendingOnly()` — Freigabefilter an einer Stelle definiert      |
| `getSightingStatistics(scope)`              | Freigabestatus ist Teil der Signatur, Default `'approved'`                         |
| `scope: 'both'`                             | liefert `{ approved, pending }` — getrennt, nie als Summe                          |
| `sightingsWithMedia`                        | joint jetzt auf `sichtungen` (Datei-Tabelle kennt `freigegeben_am` nicht)          |
| `/api/statistics`                           | ruft explizit `'approved'`                                                         |
| `/admin/statistics`                         | Basis-Kennzahlen je Freigabestatus getrennt, Quoten beziehen sich auf freigegebene |
| `FormHelp.svelte`                           | Beschriftungen sagen „freigegebene Sichtungen"                                     |

Der Epoch-Ausschluss (`EARLIEST_PLAUSIBLE_SIGHTING_DATE`, siehe oben) bleibt bestehen und
gilt **zusätzlich** zum Freigabefilter. Die 365 Datensätze mit `00:00:00` zählen laut
Museumsentscheidung weiterhin mit.

### Zwei Korrekturen, die dabei aufgefallen sind

- **`sightingsWithMedia` zählte Dateien statt Sichtungen.** `count(sightingFiles.sightingId)`
  ohne `DISTINCT` zählt jede hochgeladene Datei einzeln; das `selectDistinct` davor wirkt
  auf ein Aggregat nicht. Bei Mehrfach-Uploads konnte der im Formular angezeigte Medienanteil
  dadurch über 100 % steigen. Jetzt `countDistinct`.
- **Der Fallback erfand Zahlen und lieferte sie als Erfolg aus.** Bei Datenbankfehlern gab
  `getSightingStatistics()` „2.847 Sichtungen / 89 % / 15 Jahre" zurück; der API-Endpunkt
  verpackte das in HTTP 200 und `FormHelp` zeigte es als echte Museumszahlen an. Der dafür
  gebaute Fehlerzweig („Statistiken konnten nicht geladen werden") war unerreichbar. Die
  Funktion wirft jetzt weiter.

### Bewusst nicht geändert

- **Der Legacy-Endpunkt `/sichtungen/showreports.json`** behält seinen inline formulierten
  Filter. Ein Umbau auf den gemeinsamen Helper ließ dort drei Contract-Tests fehlschlagen
  (das Schema ist in den Tests durch Strings gemockt, `isNotNull()` wirft darauf). Der
  Endpunkt bedient produktive Mobile Apps — statt ihn anzufassen, hält
  `statisticsApprovalScope.test.ts` fest, dass beide Ausdrücke dasselbe SQL erzeugen.
- **Die moderne Karte `/api/map/sightings`** filtert auf `geprueft = 1`, **nicht** auf den
  Freigabestatus (`src/routes/api/map/sightings/+server.ts:19`). Sie wird vom
  `optimizedMapController` genutzt, ist also die Karte, die Bürger:innen sehen. Damit
  bleibt eine Restdivergenz:

  | Quelle                                      | Datensätze |
  | ------------------------------------------- | ---------- |
  | Legacy-Karte + neue Statistik (freigegeben) | 19.262     |
  | Moderne Karte (`geprueft = 1`)              | 19.253     |
  | davon geprüft **und nicht** freigegeben     | 0          |
  | freigegeben, aber nicht geprüft             | 9          |

  **Inzwischen erledigt.** PR #576 („Freigabe-Workflow auf einen Endpunkt vereinheitlichen",
  auf `main` seit 2026-07-28) stellt die Karte auf `isNotNull(approvedAt)` um. Legacy-Karte,
  moderne Karte und diese Statistiken hängen damit an derselben Spalte — die Parität ist
  vollständig, die Restdivergenz von 9 Datensätzen aufgelöst.

  Der Auftraggeber hat dabei als verbindliche Fachregel gesetzt: **genau zwei Zustände**
  (ungeprüft / geprüft), geprüft heißt veröffentlicht, ein Button, ein Endpunkt. Der frühere
  `/api/sightings/[id]/approve` wurde ersatzlos entfernt, `PATCH /api/sightings/[id]/verify`
  schreibt beide Spalten in einem Update, und `updateSighting` klammert `verified` aus, damit
  die Spalten nicht auseinanderlaufen können. Nachzulesen in `.claude/rules/api.md` →
  „Prüfstatus einer Sichtung — verbindlich".

  Damit ist auch ein Zustand „geprüft, aber nicht freigegeben" strukturell ausgeschlossen;
  die 9 Datensätze „freigegeben, aber ungeprüft" (2016–2018) sind eingefrorene Altlasten des
  Altsystems, die der heutige Workflow nicht mehr erzeugen kann.

  Ebenfalls mit #576 erledigt: Die Konfiguration `display.showUnapprovedOnMap` — ein
  Schalter, den kein Kartenquery je gelesen hat und der, verdrahtet, die Zwei-Zustände-Regel
  gebrochen hätte — wurde aus allen vier Fundstellen entfernt (`configInitializer`,
  `configService`, `accessControl`, `/api/config/public`).

- **Die übrigen Admin-Auswertungen** (Arten-, Jahres-, Monatsverteilung, Nutzer, Schiffe,
  Datenqualität, Geografie) filtern weiterhin auf `geprueft = 1` statt auf `freigegeben_am`.

  Ein Review hielt das für eine Vermischung freigegebener und offener Sichtungen. Das ist
  es nicht: Nach der verbindlichen Regel in `.claude/rules/api.md` sind `geprueft` und
  `freigegeben_am` **zwei Felder desselben Vorgangs**, nicht zwei Arbeitsschritte. Sie
  werden von einem Endpunkt in einem Update gemeinsam gesetzt, ein Zustand „geprüft, aber
  nicht freigegeben" existiert fachlich nicht. Die Gegenprobe an den Daten (2026-07-27):

  ```sql
  SELECT COUNT(*) FROM sichtungen WHERE geprueft = 1 AND freigegeben_am IS NULL;  -- 0
  ```

  Null Datensätze in 19.262 Freigaben über 13 Jahre. `eq(verified, 1)` und
  `isNotNull(approvedAt)` beschreiben dort also dieselbe Menge (19.253 von 19.262; die 9
  fehlenden sind die eingefrorenen Altlasten von 2016–2018).

  Nicht umgestellt, weil es fachlich nichts ändert und die Zeitzonen-Arbeit aus PR #575/#577
  genau diese Abfragen frisch angefasst hat. Eine Vereinheitlichung auf `approvedOnly()` wäre
  Kosmetik mit Konfliktrisiko — sinnvoll beim nächsten ohnehin nötigen Eingriff in diese
  Datei, nicht als eigener Umbau.

### Tests

`src/lib/server/db/statisticsApprovalScope.test.ts` — führt die Drizzle-Abfragen gegen einen
aufzeichnenden Mock aus und kompiliert jede `where`-Klausel über den echten `PgDialect`:

- Jede Statistikabfrage trägt den Freigabefilter der öffentlichen Karte.
- `approvedOnly()` und der Legacy-Kartenfilter erzeugen dasselbe Prädikat.
- `'both'` liefert getrennte Werte; die Summe 19.877 taucht in keinem Ergebnis auf.
- Bei Datenbankfehlern werden keine Zahlen erfunden.

---

## Quellen

Osiecka et al. 2020, _Sci. Rep._ 10:14876 · Amundin et al. 2022 (SAMBAH), _Ecol. Evol._ 12:e8554 ·
Schaffeld et al. 2016, _MEPS_ · Teilmann 2003, _JCRM_ 5(1) · Gilles et al. 2023 (SCANS-IV) ·
Wisniewska et al. 2018, _Proc. R. Soc. B_ 285:20172314 · Dyndo et al. 2015, _Sci. Rep._ 5:11083 ·
Smith et al. 2026, _JASA_ 159(3) · Gutiérrez-Muñoz et al. 2021, _Front. Mar. Sci._ 8:642386 ·
IPCC SROCC 2019 · HELCOM Harbour Porpoise Indicator 2023
