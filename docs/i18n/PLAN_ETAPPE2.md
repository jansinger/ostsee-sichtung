# Etappe 2 — Schicht C (Markup), Formatierung, Plurale, hreflang

**Stand der Planung: 2026-08-11.** Etappe 1 (Schichten A und B) ist abgeschlossen,
siehe `ARBEITSPROTOKOLL_ETAPPE1.md`.

## Umfang — gemessen, nicht aus dem Entwurf übernommen

Der Entwurf nennt für Schicht C **448 Botschaften über rund 72 Dateien**. Gemessen
über `docs/i18n-inventory.json`, ohne `/styleguide`, `/docs` und
`ApiDocumentation.svelte` (Entwurf 4.2):

|                                                           |   Funde | Dateien |
| --------------------------------------------------------- | ------: | ------: |
| Svelte gesamt im Umfang                                   | **449** |      68 |
| davon Textknoten                                          |     346 |         |
| davon Attribute                                           |     103 |         |
| mit dynamischer Interpolation — **nicht mechanisch**      |       9 |         |
| mit Ziffer — Plural-Kandidaten, menschlich zu entscheiden |      12 |         |

**Korrektur am Entwurf:** Von den 449 gehören 98 zu Dateien, die Entwurf §3 selbst
der Schicht E zuordnet — `routes/about/+page.svelte` (67),
`SpeciesIdentificationHelp.svelte` (25), `routes/bestimmungshilfe/+page.svelte` (6).
Die Zahl 448 zählt sie mit. Echte Schicht C sind **351 über 65 Dateien**.

**Entscheidung vom 2026-08-11:** Die Struktur dieser 98 wird trotzdem in Etappe 2
mitgenommen — dieselbe Mechanik, dieselben Dateien, einmal angefasst statt zweimal.
Der **Inhalt** bleibt offen: `messages/en.json` trägt weiter den deutschen
Wortlaut, die englischen Fachtexte liefert das Museum später als Diff auf einer
Datei. Etappe 4 schrumpft damit auf „Inhalt einpflegen".

## Reihenfolge (Entscheidung vom 2026-08-11)

1. **Formatierung und `en-GB`** — klein, unabhängig, berührt einen bestehenden
   Charakterisierungstest. Jetzt, damit sie nicht zwischen 65 Dateiumbauten verloren geht.
2. **Der Extraktor lernt Svelte** — Trockenlauf, Diff-Vorschau, kein Schreiben.
3. **Markup in Wellen** — 68 Dateien, nach Nutzersichtbarkeit.
4. **Plurale** — die 12 Kandidaten, ICU, von Hand.
5. **`hreflang` und `og:locale`** — je Route.

Der Rollout-Schalter `TRANSLATION_ROLLOUT_COMPLETE` bleibt `false`. Er hängt an
drei Schritten, die zusammengehören (`src/lib/i18n/translationRolloutStage.ts`);
`hreflang` ist einer davon, die englischen Inhalte fehlen weiterhin.

## Was aus Etappe 1 hier weitergilt

- **Die Locale-Falle.** Dreimal zugeschlagen (Legacy-API, CSV-Export,
  Benachrichtigungsmail). Vor jedem Umbau die echten Verbraucher selbst prüfen;
  eine Grep-Aussage von mir hat sich dreimal als falsch erwiesen.
- **Positive Nachweise.** `localeSwitchProof.test.ts` ist das Muster: Eine
  Zusicherung, die nur `not.toBe(…)` prüft, belegt nicht, dass der Sprachwechsel
  wirkt.
- **Der Hartcodiert-Guard** (`hardcodedStringScan.test.ts`) deckt heute nur
  Schicht A und B. Er ist in Teil 3 um die Markup-Dateien zu erweitern.

---

## Aufgabe 2.1 — Anzeigesprache `en-GB`

**Dateien:** `src/lib/utils/format/dateTime.ts`, `dateTime.test.ts`, die
öffentlichen `Intl.NumberFormat`-Aufrufstellen.

### Der Kern: Anzeigesprache ist nicht Zeitzone

Entwurf 5.6 nennt das die wichtigste Regel des Abschnitts, weil ihr Bruch keine
kaputte Oberfläche erzeugt, sondern **falsche Daten**: Der Sichtungstag ist
fachlich immer Berliner Ortszeit.

Etappe 0 hat dafür bereits einen Guard gebaut, und zwei Planfehler dabei
gefunden, die hier wieder drohen (`ARBEITSPROTOKOLL_ETAPPE0.md`, Task 7):

- Der erste Testzeitpunkt lag in einem Fenster, in dem Berlin und London
  denselben Kalendertag zeigen — die naheliegendste falsche Kopplung
  (`en` → `Europe/London`) wäre grün geblieben. Deshalb 22:30 UTC.
- Der Test prüfte `de-DE`/`en-GB`, die App reicht aber `de`/`en` durch. Eine
  Zone-Map auf die kurzen Tags mit Berlin-Fallback wäre grün geblieben.

**Beide Fallen gelten für diese Aufgabe unverändert.** `en-GB` ist eine
Anzeigesprache. Die Zone bleibt `Europe/Berlin`, für jede Locale.

- [x] **Schritt 1: Den Charakterisierungstest auf `en-GB` ziehen**

`dateTime.test.ts` hält heute für `'en'` das US-Format fest (`07/16/2026`,
`12:30 AM`) — ein bewusst dokumentierter Bestandsstand aus Etappe 0, kein
Versehen. Er wird auf `en-GB` gezogen (`16/07/2026`, `00:30`).

Der Test ist **zuerst** zu ändern und rot laufen zu lassen. Ein
Charakterisierungstest, der nach der Implementierung angepasst wird, hält nichts
fest.

- [x] **Schritt 2: Die Zuordnung**

Eine benannte Abbildung von der Paraglide-Locale auf die Anzeigesprache:
`de → de-DE`, `en → en-GB`. Sie gehört an **eine** Stelle, nicht in jede
Aufrufstelle. `APP_LOCALE` (`dateTime.ts:24`) wird ihr Default für `de`.

**`sv-SE` bleibt, wo es steht** (`dateTime.ts:304`, `:346`, `berlinToday()` in
`sightingSchema.ts`). Das ist eine Rechnung, keine Darstellung — `sv-SE` liefert
die ISO-Reihenfolge, und der Vergleich hängt danach an keiner Zeitzone.

- [x] **Schritt 3: Die Zeitzonen-Invariante schärfen**

Der vorhandene Guard aus Etappe 0 muss auch nach der Umstellung die vier
Bruch-Varianten rot machen. Zusätzlich ein Fall, den es vorher nicht geben
konnte: **`en-GB` darf nicht `Europe/London` nach sich ziehen.** Testzeitpunkt so
wählen, dass Berlin und London verschiedene Kalendertage zeigen — sonst ist der
Test grün, ohne etwas zu belegen (das ist Planfehler 8 aus Etappe 0, wörtlich).

- [x] **Schritt 4: Die öffentlichen Zahlformate**

`routes/about/+page.svelte:517` und `:532` formatieren
`Intl.NumberFormat('de-DE')` — öffentlich sichtbar, folgt also der Locale.

`routes/admin/statistics/statisticsFormat.ts` und `activityHeatmap.ts` liegen im
**Admin-Bereich** und bleiben unverändert (Entwurf 4.2: Admin wird nicht
lokalisiert). Das ist zu belegen, nicht anzunehmen — kurz prüfen, ob die Dateien
wirklich nur von `/admin` aus erreichbar sind.

Belegt: `statisticsFormat.ts`/`activityHeatmap.ts` haben genau einen Importer,
`routes/admin/statistics/+page.svelte`, unter `/admin` und damit hinter
`requireUserRole` (`admin/+layout.server.ts`). `about/+page.svelte` folgt jetzt
`resolveDisplayLocale(getLocale())` statt fest `'de-DE'`.

> **Korrektur (2026-08-11, Etappe-2-Nacharbeit).** Dieser Schritt hatte
> `about/+page.svelte` faktisch als einzige öffentlich sichtbare
> Formatierungsstelle behandelt — das war falsch, und die eigentliche Messung
> war zu kurz. Ein **Review**, nicht die ursprüngliche Erhebung, fand neun
> weitere hartcodierte `'de-DE'`-Stellen auf öffentlichen Flächen (Karte,
> Meldeformular):
>
> - `src/lib/map/optimizedMapController.ts:1010`, `:1018`
> - `src/lib/map/listViewUtils.ts:108`
> - `src/lib/map/dateUtils.ts:37`
> - `src/lib/map/popupContent.ts:29`
> - `src/lib/report/components/FormHelp.svelte:98`, `:228`, `:249`, `:272`
> - `src/lib/report/components/form/fields/DropzoneEnhanced.svelte:712`,
>   `:792`, `:925`
>
> Alle neun sind inzwischen auf `resolveDisplayLocale(getLocale())`
> umgestellt (Etappe-2-Nacharbeit) und durch
> `src/lib/i18n/hardcodedDisplayLocaleScan.test.ts` als Guard abgesichert —
> ein Rückfall auf ein hartcodiertes Sprach-Tag in einem `Intl`-/`toLocale*`-
> Aufruf im öffentlichen Code wird jetzt rot statt unbemerkt zu bleiben.

- [x] **Schritt 5: Nachweise**

- Beide Richtungen: unter `de` deutsches Format, unter `en` britisches. Positiv
  formuliert, nicht nur `not.toBe`.
- Mutation: die Zuordnung auf `en → en-US` ändern → Charakterisierungstest rot →
  zurücksetzen.
- Mutation: `en → Europe/London` erzwingen → Zeitzonen-Guard rot → zurücksetzen.
- `npm run test:quick` grün, `germanBaseline.json` unverändert.

**Aufgabe 2.1 abgeschlossen** (2026-08-11). Alle fünf Schritte umgesetzt und
verifiziert, siehe Nachweise oben.

---

## Aufgaben 2.2 bis 2.5

Werden einzeln geplant, sobald 2.1 abgenommen ist — nach der Lehre aus Etappe 0
(„Pläne klein schneiden. Neun Tasks in einem Dokument waren zu viel.").

---

## Aufgabe 2.2 — Der Extraktor lernt Svelte

**Ziel:** Der Extraktor findet die Botschaften im Markup, vergibt Schlüssel und
zeigt einen Diff — **im Trockenlauf, ohne zu schreiben**. Der Umbau der 68 Dateien
ist Aufgabe 2.3.

### Warum Markup anders ist als Schicht A und B

In Schicht A und B war die Ersetzung ein Literaltausch an einer Aufrufstelle. Im
Markup ist sie ein Formwechsel, und er ist je Position verschieden:

```svelte
<p>Ein Text</p>
→
<p>{m.key()}</p>
placeholder="Ein Text" → placeholder={m.key()}
```

Bei Attributen müssen die **Anführungszeichen mit ersetzt** werden:
`placeholder="{m.key()}"` wäre eine Zeichenketten-Interpolation, nicht der Wert.

Zweiter Unterschied: In Komponenten gibt es **kein `locale`-Argument**. Paraglide
löst über die aktive Locale auf, `m.key()` genügt. Das ist richtig so — eine
Komponente rendert immer in der Sprache der Anfrage.

Dritter Unterschied, und der wiegt am schwersten: **In Schicht A und B gab es ein
strukturelles Signal** (Aufrufstelle, Argumentposition). Im Markup ist ein
Textknoten ein Textknoten. Eine gewisse Inhaltsabhängigkeit ist deshalb
unvermeidbar — sie bleibt auf das Minimum beschränkt: mindestens eine
Buchstabengruppe. **Keine Sprachheuristik**, aus demselben Grund wie in Etappe 1.

### Was extrahiert wird

| Fall                                                                               | Ersetzung        |
| ---------------------------------------------------------------------------------- | ---------------- |
| Textknoten, **einziges Kind** seines Elements, mit ≥1 Buchstabengruppe, ohne `{…}` | `{m.key()}`      |
| Attribut `placeholder`/`title`/`aria-label`/`alt` mit rein statischem Wert         | `attr={m.key()}` |

### Was verweigert und gemeldet wird

Jeder Fall mit Grund im Abschnitt „Übersprungen — bitte durchsehen":

1. **Satzfragment** — der Textknoten hat Geschwister-Elemente. `Vielen Dank für
Ihre <strong>Meldung</strong>!` zerfällt in drei Knoten; sie einzeln zu
   übersetzen bricht die Wortstellung in jeder Zielsprache. Das ist **kein
   Randfall**: allein in drei Dateien stehen 53 Inline-Elemente. Diese Stellen
   brauchen eine Botschaft über das ganze Element, mit Auszeichnung als Parameter
   — Handarbeit in Aufgabe 2.3.
2. **Interpolation** — der Knoten enthält `{…}`. Braucht eine ICU-Botschaft mit
   Parameter (9 Fälle laut Inventar).
3. **Plural-Kandidat** — der Text enthält eine Ziffer (12 Fälle). Menschliche
   Entscheidung, ob ICU-Plural nötig ist; Aufgabe 2.4.
4. **Keine Buchstabengruppe** — reine Satzzeichen, Symbole, Zahlen.
5. **Dynamisches Attribut** — der Attributwert ist kein reines Literal.

### Schritte

- [x] **1. Tests zuerst**, gegen konstruiertes Markup: je Fall der Tabelle eine
      Positivprobe, je Verweigerungsgrund eine Gegenprobe. Dazu die Probe, die in
      Etappe 1 den Ausschlag gab: **ein deutscher Satz im Markup-Kommentar
      (`<!-- … -->`) darf nicht gefunden werden.** Dieses Projekt schreibt
      Begründungen konventionsgemäß ins Markup (CLAUDE.md); ein Scanner ohne
      diesen Fall wäre von Anfang an unbrauchbar. Der AST macht das von selbst —
      `Comment`-Knoten tragen ihren Inhalt in `data`, die Traversierung steigt
      dort nie ab. Genau deshalb AST und nicht Regex.
- [x] **2. `collectSvelteSites`** in `src/tools/i18n-extract/collect.ts`,
      Rückgabe wie die beiden bestehenden Sammler (`ExtractionSite[]`,
      `SkippedSite[]`). Parsen über `svelte/compiler`, wie
      `analyzeSvelteSource` es im Inventar-Werkzeug bereits tut — die dortige
      Traversierung ist die Vorlage, nicht der Import.
- [x] **3. Schlüsselschema** wie in Etappe 1 beibehalten, damit
      `docs/i18n-inventory.md` lesbar bleibt: Pfadpräfix plus Aspekt plus Slug,
      z. B. `report_components_submissionsuccess_text_vielen_dank`. Kollisionen
      mit Zählsuffix, Vergabe in Quelltextreihenfolge (zwei Durchgänge, wie in
      `collectSchemaSites`).
- [x] **4. Ersetzungsform je Position** in `apply.ts`: Textknoten bekommen
      `{m.key()}`, Attribute `attr={m.key()}` **einschließlich der
      Anführungszeichen**. Ein Test je Form, der die erzeugte Quelle mit dem
      Svelte-Compiler wieder parst — erzeugt die Ersetzung gültiges Markup?
- [x] **5. Trockenlauf über alle 68 Dateien.** Zahlen (per Skript im
      Scratchpad erhoben, nicht Teil des Werkzeugs — der strukturelle Umbau
      ist Aufgabe 2.3):

      | | Anzahl |
          | --- | ---: |
          | Dateien im Umfang | 68 |
          | Gefunden (extrahierbar) | 325 |
          | Übersprungen gesamt | 362 |
          | davon Satzfragment | **244** |
          | davon Interpolation | 65 |
          | davon dynamisches Attribut | 35 |
          | davon keine Buchstabengruppe | 11 |
          | davon Plural-Kandidat | 7 |

          **244 Satzfragmente** sind die Planungsgrundlage für Aufgabe 2.3 — mehr
          als die 53 Inline-Elemente aus der ursprünglichen Schätzung, weil jedes
          betroffene Element mehrere Textknoten gleichzeitig verwirft (z. B. drei
          Knoten für ein Element mit einem ausgezeichneten Wort).

          **Nacharbeit während des Trockenlaufs:** Die ursprüngliche Regel prüfte
          nur direkte Geschwister eines Textknotens. Ein Textknoten, der
          innerhalb eines Inline-Elements (`<strong>`) tatsächlich einziges Kind
          ist, wurde dadurch trotzdem extrahiert, obwohl das umschließende
          Element (`<p>`) gemischten Inhalt hat — die Regel griff eine Ebene zu
          flach. Behoben durch Weiterreichen eines `ancestorMixed`-Flags durch
          die Fragment-Traversierung: Ein Fragment gilt als gemischt, wenn es
          sowohl einen Textknoten mit Buchstaben als auch ein Element-/Ausdrucks-
          Kind enthält; dieser Status vererbt sich auf jedes Fragment darunter.
          Verschachtelung allein (`<div><p>Text</p></div>`) bleibt unberührt —
          keines der beiden beteiligten Fragmente ist für sich gemischt.

- [x] **6. Nachweise.** Mutation je Verweigerungsgrund (Regel entfernen → die
      zugehörige Gegenprobe wird rot). `npm run test:quick` grün.
      `germanBaseline.json` unverändert. Der Arbeitsbaum enthält **keine**
      Änderung an einer `.svelte`-Datei — dies ist ein Trockenlauf.

### Abnahme

1. Der Trockenlauf schreibt nichts ausser `messages/*.json`, und auch das nur mit
   `--write-messages`.
2. Die erzeugten Ersetzungen parsen als gültiges Svelte.
3. Jede Verweigerungskategorie ist per Mutation belegt.
4. Die Zahl der Satzfragmente ist erhoben — sie ist die Planungsgrundlage für 2.3.

**Aufgabe 2.2 abgeschlossen** (2026-08-12). Alle sechs Schritte umgesetzt und
verifiziert; Zahlen und Mutationsergebnisse siehe oben und
`src/tools/i18n-extract/collectSvelte.test.ts`. Beurteilung des
„Übersprungen"-Abschnitts (Auftrag): Ein Teil der 244 Satzfragmente und 65
Interpolationen sind Einzelwörter neben einem reinen Icon-Element ohne Text
(z. B. „Abmelden“, „Offline“ neben einem `~icons/...`-Svelte-Icon) — dort
trüge eine Wortstellungs-Verschiebung kein Risiko, weil das Geschwister keinen
Text besitzt. Die aktuelle Regel unterscheidet das bewusst nicht (keine
Sprachheuristik, siehe Dateikopf `collect.ts`) und verwirft sie trotzdem —
mechanisch enger als nötig, aber sicher in die falsche Richtung. Umgekehrt: In
der Stichprobe der 325 extrahierten Fundstellen war nichts, das besser
Handarbeit gewesen wäre — jede geprüfte Fundstelle ist ein eigenständiger,
kontextfreier Anzeigetext (Navigationseinträge, Labels, Logo-`alt`-Texte,
Meldungen).
