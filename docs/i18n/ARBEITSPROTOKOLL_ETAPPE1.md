# Arbeitsprotokoll Etappe 1 — Mehrsprachigkeit DE/EN

> **Was das ist.** Das laufende Protokoll der Umsetzung von Etappe 1 (Schichten A
> und B). Es entstand als Arbeitsdatei des Ausführungs-Ledgers und liegt hier,
> weil es die einzige Aufzeichnung der Befunde ist — auch derer, die nicht im
> Code landeten, sondern in korrigierten Annahmen.
>
> **Gleiche Bauart wie `ARBEITSPROTOKOLL_ETAPPE0.md`.** Der Entwurf steht in
> `ENTWURF_ETAPPE1.md`, die Pläne in `PLAN_ETAPPE1_AUFGABE*.md`.
>
> **Stand: Aufgabe 1 und 2 komplett, Aufgabe 3 zur Hälfte.** Offen ist 3.3 —
> die übrigen 16 formOptions-Dateien.

---

## i18n Etappe 1, Aufgabe 1 (Plan: docs/superpowers/plans/2026-08-11-i18n-etappe1-task1-extraktor.md)

Basis: 3d28f95c

- Task 1.1: complete (commit 54945322, review clean, beide Verdikte erfüllt, keine Befunde)
- Task 1.2: complete (commit b7fc0677, review clean). Gegenprobe am echten sightingSchema.ts: ['latitude'], nicht ['then'].
  Minor -> an Task 1.3 weitergegeben: register() ist ordnungsabhaengig; der Aufrufer muss eine stabile
  Traversierungsreihenfolge garantieren. Genau das leistet der Zwei-Durchgang in collect.ts (Sortierung nach start).
- Task 1.3: complete (commit feac48e5, review clean). 259 Botschaften am echten Schema, exakt die
  Entwurfsvorhersage; Reviewer hat alle 259 Offsets unabhaengig gegen die quotierten Literale geprueft (0 Abweichungen).
- Task 1.4: complete (commits 37a64ff3, 82af38c3, review clean). 17 Dateien / 120 Botschaften, vom Reviewer
  unabhaengig nachgerechnet. Die Zusatz-Mutation deckte eine echte Testluecke auf (StringKeyword-Zweig
  unerreicht) -> Fix-Commit 82af38c3 schliesst sie, per Mutation belegt.
- Task 1.5: complete (commits de6b9b73, 6d52ae63, re-review abnahmefaehig). 379 Botschaften / 54 uebersprungen,
  test:quick gruen. Important-Befund: renderDryRunReport war ungetestet (Planfehler) -> Tests nachgereicht,
  per Mutation belegt. Minor: Zeilenumbruch-Annahme in renderUnifiedDiff jetzt kommentiert.
  ALLE FUENF TEILAUFGABEN KOMPLETT. Naechster Schritt: Abschluss-Review ueber 3d28f95c..HEAD.

### Planfehler aus Aufgabe 1, in den Plan zurueckzuschreiben

1. Der CLI-Docstring im Plan enthielt woertlich '--apply', waehrend der Test desselben Plans die
   Zeichenkette in der Datei verbietet. Woertliche Uebernahme waere rot geblieben.
2. Schritt 1.5/10 erwartete ~52 uebersprungene meta.icon. Falsch: icon-Werte sind Identifier, keine
   String-Literale, sie erzeugen daher gar keinen skip-Eintrag. Real: 0.
3. Der Plan sah keinen Test fuer renderDryRunReport vor - die Funktion, die den einzigen menschlichen
   Kontrollpunkt rendert. Vom Reviewer per Mutation gefunden.
4. Der Plan sah fuer Aufgabe 1.4 keine Mutation vor; die zusaetzlich angeordnete deckte eine echte
   Testluecke auf (StringKeyword-Zweig). Jede Teilaufgabe braucht ihre Mutation.

## Abschluss-Review Aufgabe 1: mergefaehig, kein Critical.

Fix-Welle: ef19cf4a, 5283ca18, 3f65205e, a7da1e30, 2adbfd84, 0412d0ac. 106 Tests gruen, test:quick gruen,
379 Botschaften unveraendert, 55 uebersprungen (vorher 54 - der neue Eintrag ist sightingSchema.ts:1422).

### OFFEN, Entscheidung des Menschen noetig (vor Aufgabe 3)

1. speciesIdentification.ts: Hauptexport `Record<SpeciesEnum, SpeciesIdentificationEntry>` traegt mehrere
   hundert Zeilen deutschen Anzeigetext (Bestimmungshilfe). Wird weder eingesammelt noch gemeldet; der
   Bericht zeigt fuer die Datei "7" und liest sich damit wie "erledigt". Nach Entwurf ist das Schicht E /
   Etappe 4 - aber der stille Nullbefund ist gefaehrlich. Mindestens im Bericht ausweisen.
2. boatDrive.ts:89 PUBLIC_BOAT_DRIVE_OPTIONS ('Motor lief'/'Motor lief nicht') und die
   getXLabel-Rueckfaelle 'Nicht angegeben'/'Unbekannt' in ALLEN 14 formOptions-Dateien. Entwurf 5 nennt
   nur das Paar in species.ts - die Liste der sechs Handgriffe ist zu kurz.
3. CLI laesst Dateien mit 0 Funden und 0 Skips ganz aus dem Bericht fallen -> eine formOptions-Datei, auf
   die das Record-Muster nicht passt, erscheint nirgends. Jede gescannte Datei auflisten, auch mit 0.
4. Die Schicht-B-Diffs schlagen `[SexEnum.FEMALE]: m.formoptions_sex_female(...)` INNERHALB der
   Modulkonstante vor - genau die Form, die Entwurf 2.3/4.1 als Defekt benennt. Aufgabe 3 muss diese
   Diffs fuer Schicht B verwerfen, nicht anwenden.

## Nachtrag: alle vier offenen Punkte geloest (nicht an den Menschen delegiert)

Commits 659fcf8c, 950664c4, 6615a2e9. 379 Botschaften unveraendert, uebersprungen 55 -> 89.

- Punkt 1+3 (dieselbe Wurzel): das Werkzeug meldet jetzt nicht getroffene Exporte und listet jede
  gescannte Datei, auch mit 0. Befund dadurch: speciesIdentification.ts:66 traegt 316 String-Literale,
  vorher unsichtbar hinter der Zahl "7". Gehoert nach Etappe 4, ist aber jetzt sichtbar.
- Punkt 2: Entwurf Abschnitt 5 korrigiert - die getXLabel-Rueckfaelle stehen in ALLEN 17 Dateien,
  PUBLIC_BOAT_DRIVE_OPTIONS fehlte ganz. Die Liste hiess zu Unrecht "sechs Handgriffe".
- Punkt 4: Schicht-B-Diffs tragen jetzt einen Warnhinweis, dass die gezeigte Ersetzungsform NICHT die
  Zielform ist (Modulkonstante friert die Sprache ein, Entwurf 2.3/4.1).

## i18n Etappe 1, Aufgabe 2 (Plan: docs/superpowers/plans/2026-08-11-i18n-etappe1-task2-schnappschuss.md)

- Task 2.1: complete (3df1d9b6) + Fixes (06c2dc38). Review: 2 Important, beide behoben.
- Task 2.2: complete (d24954db, review clean bis auf 1 Important -> f5c374a9).
  ERGEBNIS: alle 73 Meldungen provozierbar, UNPROVOKABLE_MESSAGES leer - kein toter Validierungstext.
- Task 2.3: complete (d3d222e6). germanBaseline.json: 29.711 Bytes, 56 Felder, 17 Label-Dateien,
  65 Meldungen. Entscheidende Mutation belegt: Meldung in sightingSchema.ts um ein Zeichen geaendert
  -> Schnappschuss-Test ROT. Damit ist der Wortlaut festgenagelt.
  AUFGABE 2 KOMPLETT. Produktionscode unveraendert. test:quick gruen.

### Planfehler Aufgabe 2, zurueckzuschreiben

1. germanBaseline.json stand im Dateiblock von 2.1, gehoert aber zu 2.3.
2. Die vorgeschriebene Mutation in 2.2 (Meldung in sightingSchema.ts aendern -> Abdeckungstest rot)
   war LOGISCH FALSCH: Extraktor und Batterie lesen beide live aus derselben Datei und bewegen sich
   gemeinsam. Erst der eingecheckte JSON aus 2.3 nagelt den Wortlaut fest. Vom Umsetzer gefunden.
3. Der Sortier-Fix in collectDomainLabels war selbst ungetestet - vom Review gefunden.

## i18n Etappe 1, Aufgabe 3 (Plan: docs/superpowers/plans/2026-08-11-i18n-etappe1-task3-schichtB.md)

Entscheidung 2026-08-11: PUBLIC_BOAT_DRIVE_OPTIONS und die getXLabel-Rueckfaelle sind IM Umfang;
speciesIdentification (316 Literale) bleibt bestaetigt Etappe 4.

- Task 3.1: complete (58339954, 6442b33c, review clean bis auf 2 Minor -> c8d4a104).
  messages/de.json + en.json: je 381 Schluessel. i18n:compile laeuft. Extraktor darf jetzt GENAU
  diese zwei Dateien schreiben (--write-messages), nichts sonst; Waechtertest per Mutation belegt.
- Task 3.2: complete (c8d4a104, 46682619). species.ts liefert aus dem Katalog, germanBaseline.json
  unveraendert, Mutation belegt (de.json-Wert geaendert -> Schnappschuss rot).

### CRITICAL, gefunden und behoben: cc392d96

Meine Praemisse "null direkte Importe der *Labels-Records" war FALSCH. Zwei echte Verbraucher:
src/routes/rest_sichtungen/antworten.json/+server.ts (LEGACY-API!) und SightingsMapView.svelte.
Der Umbau auf getSpeciesLabel() haengte die Legacy-Antwort an getLocale(). Heute unauffaellig, weil
en.json noch deutschen Text traegt - mit der ersten echten Uebersetzung haette /en/rest_sichtungen
englische Artnamen geliefert. Angebundener iOS-Client, von hier nicht reparierbar.
Behoben an DREI Stellen (antworten.json, showreports.json, csvExport.ts) per baseLocale-Festnagelung
plus localePinning.test.ts, der die englische Botschaft kuenstlich abweichen laesst - er ist also
NICHT gruen, nur weil de und en heute gleich sind.
LEHRE FUER 3.3: Vor jedem Modulumbau die echten Verbraucher pruefen, nicht meiner Grep-Aussage
glauben. Die 7 uebrigen *Labels-Records in antworten.json/+server.ts sind DIESELBE Falle.

## Aufgabe 4 — Schicht A (`sightingSchema.ts`)

Commits: 3b00af47 (Sprachwechsel-Beweis), 38e6408a + 285b6fc9 (Schema-Fabrik und
Aufrufstellen), a9858c74 + 765fea02 (Werkzeug-Nachbesserungen), d167a24a (Plan).
`germanBaseline.json` über alle Commits bitgleich.

### Der wichtigste Befund der ganzen Etappe

**Bis Aufgabe 4.1 gab es keinen einzigen Nachweis, dass die Zweisprachigkeit
überhaupt funktioniert.** Alle siebzehn Locale-Zusicherungen im Projekt waren
negativ formuliert (`expect(x).not.toBe(DIVERGED_EN_LABEL)`) — sie schützten das
Deutsche dort, wo es deutsch bleiben muss, prüften aber nie, ob das Englische
ankommt.

Belegt per Mutation: Mit ignoriertem Locale-Argument in `memoizePerLocale`
blieben `germanBaseline.test.ts` und alle drei `*LocalePinning.test.ts` grün —
4 Dateien, 29 Tests, keiner bemerkte es. Die Anwendung wäre einsprachig gewesen,
und nichts hätte es gesagt. Geschlossen durch `src/lib/i18n/localeSwitchProof.test.ts`
(positive Richtung, Schicht A und B).

Das ist strukturell die Etappe-0-Lehre eine Ebene höher: Dort waren einzelne
Tests blind, hier war die gesamte Testmenge in eine Richtung blind.

### Zwei Lücken im Extraktor, beide von der Umsetzung gefunden

1. `.integer(message)` stand in keiner der beiden Methodenlisten — vier Meldungen
   waren weder Fund noch Übersprungen, also unsichtbar. Ursache war die bewusste
   Asymmetrie aus Aufgabe 1 (meta-Liste geschlossen, Methodenliste offen) mit der
   Begründung, der Hartcodiert-Scan aus Aufgabe 5 fange den Rest. Die Begründung
   trug nicht: Aufgabe 5 existiert nicht. Behoben — unbekannte Methoden mit
   String-Literal werden jetzt GEMELDET statt still übergangen.
2. Nach dem Umbau meldete der Extraktor 132 bereits übersetzte `m.*()`-Aufrufe als
   „von Hand prüfen" — der Prüf-Abschnitt bestand zu 70 % aus Rauschen über
   erledigte Arbeit. Behoben: `already-translated` wird gezählt, nicht aufgeführt.
   Verbliebener Abschnitt: 56 Zeilen, alle technisch begründet.

### Fehler in meinem eigenen Auftrag an die Umsetzung

Ich schrieb, `/api` sei von der Lokalisierung ausgenommen. Der Entwurf sagt das
Gegenteil: Ein englischer Melder SOLL englische Validierungsfehler bekommen. Die
Umsetzung ist dem Entwurf gefolgt, nicht meiner Kurzfassung. Richtig so.

### Erledigt, kein offener Fall

`sightingSchema.ts:1413` (`meta(sightingFromTextBase.spec.meta ?? {})`) erscheint
im Trockenlauf als zu prüfen. Es ist korrekt: `sightingFromTextBase` ist
`base.fields.sightingFromText` (Zeile 1374) aus demselben, je Locale gebauten
Basis-Schema. Das Werkzeug kann diese Herkunft nur nicht sehen. Nicht erneut
untersuchen.

### E2E-Nachweis Aufgabe 4

Zwei saubere Vollläufe: 478 grün / 1 rot (`admin-spam-check.spec.ts:121`), dann
479 grün / 0 rot. Der Spec besteht isoliert 3/3. Damit ist er unter Parallellast
flaky, keine Regression des Umbaus — belegt durch den zweiten Vollauf mit
identischem Code, nicht durch Deutung.

Bemerkenswert: In drei Vollläufen dieser Etappe trafen die Fehlschläge drei
VERSCHIEDENE Specs (`design-tokens`, `admin-queue`, `admin-spam-check`), nie
zweimal denselben. Eine echte Regression trifft dieselbe Stelle reproduzierbar.
Wer hier künftig einen roten Lauf sieht: erst isoliert wiederholen, dann urteilen.

## STAND ETAPPE 1

Aufgaben 1-4 komplett. OFFEN: Aufgabe 5 aus dem Entwurf — `hardcodedStringScan`
für Schicht A und B (Entwurf Abschnitt 7). Sie ist das Netz gegen den Rückfall:
die Zeile, die drei Monate später jemand schnell noch einfügt. Ohne sie hängt
alles an der Sorgfalt beim Extrahieren.

## Aufgabe 5 — Hartcodiert-Scan (Schicht A und B)

Commits: e041c229 (Plan), 9fbf9945 (Guard), d3ecb6be (blinder Fleck behoben).
`src/lib/form/validation/hardcodedStringScan.test.ts`, 24 Tests.

### Zwei Entwurfsentscheidungen, die nicht offensichtlich waren

1. **Der Guard benutzt den Extraktor NICHT.** Naheliegend waere gewesen,
   `collectSchemaSites` wiederzuverwenden — es meldet fuer diese Dateien 0 Funde,
   der Guard waere eine Zeile. Aber `.integer(message)` war fuer den Extraktor
   unsichtbar (Aufgabe 4); ein darauf gestuetzter Guard waere fuer genau dasselbe
   blind gewesen. Zwei unabhaengige Mechanismen sind Redundanz, einer doppelt
   gezaehlt ist keine. Der Guard laeuft ueber `sourceScan.testutil.ts` wie die
   vier bestehenden Scans des Projekts.
2. **Keine Sprachheuristik, keine Ausnahmeliste.** Regel: ein Literal mit
   Leerzeichen und mindestens zwei Buchstabengruppen. Trifft 'Bitte waehlen Sie
   eine Tierart' und 'Please select a species' gleichermassen — der Entwurf
   verbietet die Umlaut-Heuristik, weil ein versehentlich englischer Text keine
   Umlaute hat. Gemessen: ausserhalb `speciesIdentification.ts` gibt es davon
   derzeit NULL. Der Guard ist ab Tag eins gruen; das war die Bedingung dafuer,
   dass er nicht nach einer Woche abgeschaltet wird (Entwurf Abschnitt 7).

### Der Befund des Reviews

Die erste Fassung geriet ueber `sightingSchema.ts` in katastrophales Backtracking
(unverpaartes Backtick, >60 s). Behoben mit einer festen Randgrenze
`MAX_LITERAL_EDGE = 300` — die aber einen blinden Fleck erzeugte: ein
637-Zeichen-Literal mit langem nicht-buchstaeblichem Nachlauf entkam, reiner
Fliesstext ab ~650 Zeichen. Folgenlos beim heutigen Bestand (laengstes Literal
218 Zeichen), aber der Guard ist fuer die Zukunft gebaut.

Behoben durch Trennung von Extraktion und Pruefung: lineares Muster sammelt die
Literale, JavaScript prueft die Zwei-Wort-Bedingung. Die verschachtelten
Quantoren, die BEIDE Probleme verursachten, entfallen. End-to-end verifiziert:
729-Zeichen-Fliesstext und der Nachlauf-Fall werden beide gemeldet.

## ETAPPE 1 ABGESCHLOSSEN

Aufgaben 1-5 komplett. Schicht A (259 Botschaften) und Schicht B (17 Dateien)
liefern aus dem Botschaftskatalog; `messages/en.json` traegt vorerst den
deutschen Wortlaut. `germanBaseline.json` ist seit dem Einfrieren bitgleich.

### Was als Naechstes zu entscheiden ist

- Die eigentliche Uebersetzung ist jetzt ein Diff auf EINER Datei
  (`messages/en.json`), ohne Quelltextaenderung. Die englischen Artnamen sind
  weiterhin ein ungepruefter Vorschlag (`I18N_ARTNAMEN_VORSCHLAG.md`).
- `TRANSLATION_ROLLOUT_COMPLETE` bleibt `false`, bis Etappe 2 (Schicht C) und
  `hreflang` folgen — die drei Schritte gehoeren zusammen, siehe
  `src/lib/i18n/translationRolloutStage.ts`.
- Etappe 2 erbt drei Dinge aus dieser Etappe: die Locale-Falle (dreimal
  zugeschlagen), den positiven Sprachwechsel-Nachweis als Muster, und den
  Hartcodiert-Scan, der um Schicht C zu erweitern ist.

---

# Etappe 2 — Fortsetzung (Protokoll läuft hier weiter)

## Aufgabe 2.1 — Anzeigesprache en-GB

Commits: f1c6e09a (Plan), 27ef62d5 (Zuordnung), 12a0fd18 + f4ea8959 + 5cc1bb40
(uebersehene Stellen + Scan), 9959490a (Verhaltenstests).

`resolveDisplayLocale()` in dateTime.ts bildet de -> de-DE, en -> en-GB. Die Zone
bleibt in jedem Fall Europe/Berlin — per Mutation belegt (en -> Europe/London
macht den Guard rot: London zeigt den 15., Berlin den 16.).

### Mein vierter Fundstellen-Irrtum in dieser Etappe

Ich hatte behauptet, `routes/about/+page.svelte` sei die einzige oeffentliche
Formatierungsstelle. Ein Review fand neun weitere (Kartensteuerung, Listenansicht,
Popup, FormHelp, DropzoneEnhanced), die Umsetzung danach vier weitere. Alle waeren
unter /en deutsch formatiert geblieben, ohne dass etwas rot wird.

Konsequenz war diesmal nicht "sorgfaeltiger grepen", sondern ein Scan:
`hardcodedDisplayLocaleScan.test.ts` wird rot, wenn jemand wieder einen Sprach-Tag
in oeffentlichem Code hartcodiert. Ausnahmen mit Begruendungspflicht, darunter
bewusst: der Legacy-DD/MM/YY-Kontrakt (legacy-api/date-utils.ts, en-GB FEST fuer
die iOS-App), der Admin-Bereich, die Export-Pfade.

### Beilaeufiger Befund, NICHT Teil der Mehrsprachigkeit

`DropzoneEnhanced.svelte`: Ein gesetzter `mediaFile.timestamp` im Positions-Zweig
treibt den `applyExifDateTime`-$effect in eine Endlosschleife
(`effect_update_depth_exceeded`). Vorbestehend, unabhaengig von der Locale-Frage.
Er verhindert, dass zwei der drei Formatierungsstellen dort testbar sind — sie
sind mit Kommentar an der `aufnahmeLocale`-Deklaration als Luecke dokumentiert.
Zu klaeren: Tritt die Schleife auch im Browser auf? Dann ist es ein echter Fehler
im Meldeformular. Reproduzierender Test zuerst.

## OFFEN in Etappe 2

2.2 Extraktor lernt Svelte (Trockenlauf) — 2.3 Markup in Wellen, 68 Dateien,
449 Botschaften — 2.4 Plurale (12 Kandidaten, ICU) — 2.5 hreflang und og:locale.

## Aufgabe 2.2 — Der Extraktor lernt Svelte

Commits: 8f880564 (Sammler), 44698ff1 (Fragment-Regel geschaerft),
7e481573 (Umfang im Werkzeug verankert), a4f4d88a (Kontrollfluss-Luecke).

REPRODUZIERBARE ZAHLEN, aus dem Werkzeug (npm run i18n:extract), Stand 2026-08-12:
102 gescannte Dateien (1 Schema + 17 formOptions + 84 Svelte)
399 Botschaften, 488 uebersprungen
davon Satzfragment 165, Interpolation 68, dynamisches Attribut 44,
Plural-Kandidat 11, keine Buchstabengruppe 12
Kontrollrechnung: 120 .svelte unter src/ minus 36 ausgeschlossene (Admin 30,
Styleguide 1, Docs 4, ApiDocumentation 1) = 84.

### Drei Befunde, jeder von der stillen Sorte

1. FRAGMENT-REGEL WAR ZU BREIT. Sie verwarf 244 Stellen, darunter 'Speichern',
   'Kontakt', 'Karte' — eigenstaendige Beschriftungen neben einem ICON. Ein Icon
   hat keine Wortstellung. Richtiger Unterscheider: Nur ein Geschwister-Element,
   das SELBST Text enthaelt, erzeugt ein Fragment. Verschob 147 Stellen von
   Handarbeit auf mechanisch.
2. DER UMFANG STAND IN EINEM WEGGEWORFENEN SKRIPT. Beide fruehen Messungen
   (68 Dateien / 449, dann 689/827) liefen ueber Scratchpad-Skripte und waren
   nicht nachrechenbar — der zweite Umsetzer konnte die erste Auswahl nicht
   reproduzieren. Jetzt kennt planExtraction den Umfang selbst, mit benannter
   Ausschlussliste und Begruendung je Eintrag.
3. KONTROLLFLUSS-BLINDHEIT. Ein dynamischer Ausdruck in {#if}/{#each}/{#await}
   war fuer Fragment- UND Interpolationsregel unsichtbar. Das Review hielt es
   fuer hypothetisch (kein Vorkommen des exakten {#each}-Musters); der Fix fand
   DREI echte Stellen der allgemeineren Klasse — ein Geschwister, dessen einziger
   Inhalt ein Ausdruck ist: WeatherDisplay.svelte 'Wetter:' und 'Windrichtung:'
   neben <strong>{ausdruck}</strong>, plus eine in FormHelp.svelte. Sie waeren
   als eigenstaendige Botschaften extrahiert worden und haetten auf Englisch ihre
   Fortsetzung verloren.

Belegt im Review: Die Ersetzung wurde auf ALLE 84 Dateien angewandt und jedes
Ergebnis mit dem Svelte-Compiler neu geparst — null Fehler.

## OFFEN in Etappe 2

2.3 Markup-Umbau: 399 mechanische Ersetzungen ueber 84 Dateien, dazu 165
Satzfragmente + 68 Interpolationen + 11 Plurale als Handarbeit.
2.4 Plurale (ICU) — 2.5 hreflang und og:locale.

## Aufgabe 2.3a — Markup-Umbau, mechanischer Teil: ABGESCHLOSSEN

Commits: e29cc6ed (--write-sources), bb910c27 (Welle 1, 9 Dateien/56),
4e9b70ad (Attribut-Zaehler), d8a5d0f5 (Welle 2, 18 Dateien/167),
3087599e (Welle 3, 36 Dateien/114), 86e14fca (Welle 4, 3 Inhaltsseiten/62).

ENDSTAND: 102 gescannte Dateien, 0 mechanische Botschaften offen. 821 Schluessel
in de.json und en.json, identische Schluesselmenge; nur i18n_selbsttest
unterscheidet sich (bewusst, aus Etappe 0). E2E nach JEDER Welle 479/479 gruen.

### Die Invariante, die das Signal traegt — und meine zwei Fehlversuche davor

Mein erstes Abnahmekriterium lautete "Uebersprungene bleiben bei 488". Falsch:
`already-translated` zaehlt bewusst in die Gesamtsumme und waechst mit jeder
Welle. Die Umsetzung von Welle 2 hat der Vorgabe WIDERSPROCHEN statt die Zahl
passend zu machen — richtig so.
Mein zweiter Versuch ("die offenen Kategorien bleiben unveraendert") war auch
falsch: Sie verschieben sich, weil ein ersetzter Textknoten fuer seine
Geschwister zu dynamischem Inhalt wird. sentence-fragment fiel 165->147,
interpolation stieg 68->87.
Was haelt, ist die SUMME der fuenf offenen Kategorien. Sie stand vor Welle 1 bei
300 und steht nach Welle 4 bei 300 — dieselben Stellen, anders einsortiert,
keine verloren.

### Der Beweis aus Aufgabe 2.2 war notwendig, aber nicht hinreichend

Dort hiess es: "alle 84 Dateien parsen nach der Ersetzung neu, null Fehler".
Der Live-Lauf von Welle 1 zeigte zwei Fehler, die dieser Beweis nicht sehen
konnte, weil beide GUELTIGE Syntax erzeugen:

1. `svelteMessageKey` slugifizierte den Aspekt nicht. `aria-label` ergab
   `m.foo_aria-label_bar()` — eine SUBTRAKTION, kein Methodenaufruf. Parst
   einwandfrei, bedeutet etwas anderes.
2. Der `import * as m from '$lib/paraglide/messages'` wurde nie ergaenzt.
   Gefunden hat beides erst `svelte-check`. LEHRE: Gueltige Syntax ist kein Beleg
   fuer richtigen Code; der Typ-Check ist das eigentliche Gate.

### Fuer Schicht C gibt es kein germanBaseline.json

In Schicht A/B machte ein einziges geaendertes Zeichen den Schnappschuss rot.
Fuer Markup traegt nur: die Konstruktion (m.key() liefert den Text aus de.json,
woertlich aus dem Markup), der Typ-Check, und die E2E-Suite. Deshalb wurde nach
JEDER Welle die vollstaendige Suite gefahren, und in den Reviews wurden
Textstellen ZEICHENWEISE verglichen — inklusive Tabs, Entities, Halbgeviertstrich
und Guillemets.

## OFFEN in Etappe 2

2.3b Handarbeit: 300 Stellen — 147 Satzfragmente, 87 Interpolationen,
44 dynamische Attribute, 11 ohne Buchstabengruppe. Jede braucht eine Botschaft
ueber das ganze Element mit Auszeichnung/Wert als Parameter.
2.4 Plurale (11 Kandidaten, ICU) — 2.5 hreflang und og:locale.

## Aufgabe 2.3b — die vier Handarbeits-Muster

Commits: 3ec39c1e (Format-Drift abgetrennt), 1820e98c (Muster an 15 Faellen),
a6a25216 (zwei Werkzeugregeln daraus).

### Die vier Muster

A BEGRIFF UND ERLAEUTERUNG. `<li><strong>GPS-Koordinaten:</strong> Am wertvollsten
  fuer die Forschung</li>` — kein Satz, sondern Begriff mit Glosse. Die
Wortstellung wandert nicht. Zwei getrennte Botschaften genuegen.
MECHANISCH ERKENNBAR: ja, ueber `<strong>…:</strong>`. 30 Instanzen gefunden,
jede erzeugt zwei Fragment-Eintraege — rund 60 der 147, etwa 40 Prozent.
Bewusst NICHT gebaut; das ist die naechste Werkzeug-Verbesserung.
B HANDGEBAUTER PLURAL. `{files.length} Datei{files.length !== 1 ? 'en' : ''}
  hochgeladen` — deutsche Grammatik im Markup zusammengesetzt.
inlang nutzt NICHT das ICU-String-Literal `{count, plural, …}` (das ist ein
anderes Plugin), sondern sein eigenes Variantenformat:
"declarations": ["input count", "local countPlural = count: plural"],
"selectors": ["countPlural"],
"match": { "countPlural=one": "…", "countPlural=other": "…" }
Wiederverwendbar; nur `input <name>` und die Texte aendern sich.
C AUSZEICHNUNG MITTEN IM SATZ. Geloest durch Markup-Umbau, NICHT durch {@html}.
Begruendung: {@html} auf einer Botschaft ist eine Tuer, die dauerhaft offen
bleibt, fuer einen Fall, der sich strukturell loesen laesst. Das einzige
{@html} im Projekt steht mit sanitizeHtml() an DB-Inhalten — kein Praezedenzfall.
WICHTIGE ABGRENZUNG, die die Umsetzung herausgearbeitet hat: Ein Element am
SATZENDE laesst sich oft ohne Wortlautaenderung abtrennen. Ein Element MITTEN
im Satz grundsaetzlich nicht — zwei feste Fragmente koennen nicht gleichzeitig
„dann H druecken" und „then press H" ergeben. Dort ist Umformulieren zwingend.
Genau eine deutsche Textstelle wurde dafuer geaendert (LoadingOverlay), im
Markup-Kommentar begruendet.
D SATZZEICHEN ALS FUNDSTELLE. `(`, `)`, `/` neben dynamischen Werten.

### Zwei Werkzeugfehler, aus der Musterarbeit gefallen

1. `LETTER_GROUP = /\p{L}/u` — der Name sagte „Gruppe", das Muster traf einen
   EINZELNEN Buchstaben. Deshalb wurde die Tastaturtaste `H` als Botschaft
   extrahiert. Jetzt sind zwei Buchstaben noetig; `MB`, `NO`, `SW` bleiben
   Botschaften (Gegentest).
2. In `handleText` lief die Geschwister-Pruefung VOR der Buchstabenpruefung.
   Reine Satzzeichen neben einem dynamischen Wert landeten dadurch unter
   `interpolation` statt `no-letter-group` und verstellten den Blick auf die
   echten Faelle. Reihenfolge gedreht: interpolation 84->58, no-letter-group
   11->44.

### KORREKTUR: `plural-candidate` ist eine Falsch-Positiv-Kategorie

Alle 11 Eintraege sind reine Ziffern-Treffer („Schritt 1", „54.5042 Grad N") —
KEIN echter Plural. Die echten Plurale stecken in `interpolation`. Aufgabe 2.4
darf diese 11 NICHT als Pluralarbeit einplanen.

### Stand der Handarbeit

sentence-fragment 130 | interpolation 58 | dynamic-attribute 44 |
no-letter-group 44 (Struktur, nie uebersetzt) | plural-candidate 11 (falsch-positiv)
Echte Restarbeit: rund 232, davon ~60 durch die Muster-A-Erkennung mechanisierbar.

## Muster A mechanisiert

Commits: 7937f43a (Regel), a51c7f88 (Welle), 5d21f1c9 (Formatierung).

Die Regel verlangt DREI Bedingungen zusammen, keine reicht allein:
(a) das textbehaftete Geschwister ist das ERSTE Kind des Elternelements
(b) sein Text endet mit einem Doppelpunkt
(c) die Glosse folgt unmittelbar, danach kommt nichts mehr
Ohne (a) faellt `<p>Bitte <strong>hier:</strong> klicken</p>` durch — ein echter
Satz mit Doppelpunkt in der Auszeichnung. Interpolation behaelt Vorrang:
`<strong>Achtung:</strong> Der Wert {n} ist zu hoch` bleibt Handarbeit.

ERGEBNIS: Satzfragmente 130 -> 78. 45 Botschaften in sechs Dateien.
Die AST-Regel fand 23 Instanzen gegen 30 aus der Regex-Vorerhebung — die
strukturelle Pruefung verwirft, was ein `<strong>…:</strong>`-Grep nicht filtern
kann, weil er die Stellung im Elternelement nicht sieht.

### Die Buchfuehrung, zum vierten Mal praezisiert

Meine Abnahmekriterien waren dreimal zu grob (erst "uebersprungen bleibt bei
488", dann "die offenen Kategorien bleiben unveraendert", dann "die Gesamtsumme
bleibt konstant"). Richtig ist:
Nach einer Welle faellt die GESAMTSUMME um genau die Zahl der ersetzten
Stellen — ein ersetzter Textknoten ist danach ein Ausdruck und verschwindet
aus der Zaehlung. Was halten MUSS, ist die Zahl der Uebersprungenen und jede
einzelne Kategorie darin.
Gemessen: vor der Welle 45 Botschaften + 518 uebersprungen, danach 0 + 518,
jede Kategorie identisch.

### Zwei eigene Fehler in diesem Abschnitt

1. Ich habe mit `git stash` gemessen und dabei uebersehen, dass
   `src/lib/paraglide/` generiert und gitignoriert ist — es wurde nicht
   mitgestasht und war danach gegen die Kataloge veraltet. Der naechste
   Testlauf brach in generiertem Code ab. `npm run i18n:compile` behebt es;
   wer mit stash misst, muss danach neu uebersetzen.
2. Ich habe unformatierten Code committet, obwohl Prettier acht Dateien
   angemahnt hatte — genau der Punkt, den ich kurz zuvor einem Umsetzer
   angestrichen hatte. Nachgezogen in 5d21f1c9, mit dem Beleg, dass sich kein
   Botschaftswert geaendert hat (Schluesselmenge identisch, null inhaltliche
   Abweichungen).

### Beobachtung fuer spaeter

Die Botschaften tragen die Quelltext-Einrueckung als eingebettete Zeilenumbrueche
und Tabs mit. Fuer die Darstellung folgenlos (HTML kollabiert Leerraum), aber wer
uebersetzt, sieht `\n\t\t\t\t` mitten im Satz. Kosmetisch, separat zu bereinigen
— nicht mitten in einer Welle, weil es die deutschen Werte anfasst.

### Stand der Handarbeit

sentence-fragment 78 | interpolation 58 | dynamic-attribute 44 |
no-letter-group 44 (Struktur, nie uebersetzt) | plural-candidate 12 (falsch-positiv)
Echte Restarbeit: rund 180.

## Aufgabe 2.3c — dynamische Attribute

Commits: 96ce1282 (Dreiteilung), f482341b (14 mechanisiert), 50a8da41
(Laufzeit-Test), c31fbe97 (Formatierung).

Die 44 `dynamic-attribute` zerfielen in drei Gruppen:
23 Durchreichung — `title={file.name}`, `aria-label={title}`. KEIN deutscher
Text. Neue Kategorie `attribute-no-static-text`; nie Uebersetzungsarbeit,
stand aber in der Liste und liess die Restarbeit groesser aussehen.
14 Text mit eingebettetem Wert — mechanisiert zu parametrisierten Botschaften.
7 Ternary — bleibt Handarbeit.
Ergebnis: dynamic-attribute 44 -> 7. Echte Restarbeit 143 statt 300.

Die Regel fuer Parameternamen (letzter bedeutungstragender Teil des Ausdrucks,
`||`/`??` vorher aufgeloest) traegt auch fuer die verbleibenden 58
Interpolationen — sie haengt nur an der Ausdrucksform, nicht am Satz.

Beilaeufig gefunden: `LegendPanel.svelte` hatte eine vorbestehende Typluecke
(`value` aus Object.entries war `unknown` trotz `Record<string,string>`), bisher
unsichtbar, weil `String(value)` jeden Typ klaglos nimmt. Erst die
parametrisierte Botschaft machte sie sichtbar.

## Aufgabe 2.3d — Hartcodiert-Guard für Schicht C

Neu: `src/lib/i18n/hardcodedMarkupScan.test.ts`, 13 Tests, 1,9 s. Kein
Produktionscode angefasst — der Arbeitsbaum enthält keine `.svelte`-Änderung,
deshalb ist hier auch kein E2E-Vollauf fällig.

### Warum nicht die Regel aus Schicht A/B

Die dortige Regel („mehrwortiges Literal") auf rohes Markup angewandt wäre
**heute an 136 Stellen rot** — den 78 Satzfragmenten und 58 Interpolationen, die
als bewusst offene Handarbeit anstehen. Ein Guard, der ab Tag eins rot ist, wird
abgeschaltet. Deshalb drei Zusicherungen:

1. **Mechanisch**: der Extraktor meldet für die 84 Dateien null Fundstellen.
2. **Bestandszähler** je offener Kategorie (`sentence-fragment` 78,
   `interpolation` 58, `dynamic-attribute` 7, `no-letter-group` 44,
   `plural-candidate` 12, `attribute-no-static-text` 24). `already-translated`
   steht bewusst NICHT darin — es wächst mit jeder Welle und wäre kein Signal.
3. **Unabhängiger Zweitmechanismus**: statischer Text in Attributen, die der
   Extraktor gar nicht kennt.

Jede Zusicherung per Mutation belegt, jede traf **genau ihre eigene** und keine
andere: `<p>Ein neuer deutscher Hinweis</p>` → nur (1) rot.
`<p>Vielen Dank <strong>für Ihre Meldung</strong></p>` → nur (2) rot (78→79).
`<Hinweis description="…" />` → nur (3) rot. Danach zurückgesetzt, 13/13 grün.

### BEFUND A: 27 Attribute, die diese Etappe nie gezählt hat

Der Sammler betrachtet **vier** Attribute (`SVELTE_TARGET_ATTRIBUTES`:
placeholder/title/aria-label/alt). Alles andere ist für ihn nicht vorhanden.
Zusicherung 3 fand auf Anhieb 27 statische deutsche Texte:

- **20× `content`** in `<svelte:head>` (Titel, Beschreibung, Schlagwörter der
  fünf öffentlichen Seiten). Gehört zu Aufgabe 2.5 — dort wird der Kopfbereich
  je Route ohnehin angefasst.
- **7× Anzeigetext an Komponenten-Props**: `description` (SightingsMapView 2,
  WeatherDataFetcher 1, FormHelp 1), `coordinatesHint`/`actionLabel`
  (PositionPanel 2), `label` (SightingDetails 1). Echte Schicht-C-Stellen,
  offene Arbeit, in keiner Zahl dieser Etappe enthalten.

Das ist genau die Redundanz, für die der Guard von Schicht A/B den Extraktor
nicht benutzt (dort: `.integer()`). Beide Male hat der zweite Mechanismus
gefunden, wofür der erste blind war.

### BEFUND B, der schwerere: der `<script>`-Block ist für alles unsichtbar

Der Extraktor liest von einer `.svelte`-Datei **nur das Markup**. Deutscher
Anzeigetext in einer Konstante des `<script>`-Blocks ist für ihn — und damit für
alle drei Zusicherungen oben — nicht vorhanden. „0 mechanische Fundstellen"
liest sich als „Schicht C ist mechanisch fertig". Sie ist es nicht.

Gemessen (2026-08-12, Regel aus Schicht A/B auf die `<script>`-Blöcke der 84
Dateien): **158 mehrwortige Literale in 35 Dateien**. Darunter neben
Tailwind-Klassenlisten und englischen Logmeldungen echter Anzeigetext:

- `routes/+error.svelte` — vier Fehlerseiten-Titel und -Texte („Seite nicht
  gefunden", „Zugriff verweigert", …)
- `BaseSelect.svelte` / `FieldRenderer.svelte` — `'Bitte wählen…'`
- `DropzoneEnhanced.svelte` — drei Toasts („Datei erfolgreich hochgeladen.")
- `ReportKindChoice.svelte` — die vier Texte der Einstiegsseite
- `ConnectionBadge`, `OLMap`, `LoadingOverlay`, `LazyMapWrapper`,
  `WeatherDataFetcher`, `SightingsMapView`, `SubmitStatus`, `FormActions`,
  `Media`, `Step4Contact`, `Behavior`, `bestimmungshilfe/+page.svelte`

Ein Guard dafür ist mit der Zwei-Buchstabengruppen-Regel **nicht** zu bauen:
`'alert alert-warning items-start'` und `'bg-base-200/95 rounded-box flex'`
erfüllen sie genauso. Das ist deshalb keine Lücke des Guards, sondern
unerledigte Übersetzungsarbeit mit eigenem Umfang — sie gehört vor oder neben
die 143 Handarbeitsfälle eingeplant, nicht danach.

### Nebenbefund: drei Tests sind unter Volllast flaky

`localePinning` (beide) und `legacy.contract` liefen im ersten Vollauf rot,
alle drei mit `Test timed out in 5000ms` — kein Assertion-Fehlschlag. **Auf dem
sauberen Baum ohne die neue Datei reproduziert** (3 rot), im Wiederholungslauf
grün (4942/4942 + 780/780). Also Lastartefakt wie in Etappe 1 dreimal zuvor,
keine Regression. Wer sie rot sieht: erst isoliert wiederholen.

## Aufgabe 2.3e — Befund B abarbeiten (Anzeigetext im `<script>`-Block)

Commits: ef7254f9 (Zähler), deceb209 (Welle 1).

### Die Klassifikation, jetzt im Guard statt im Scratchpad

Von 158 mehrwortigen Literalen in den `<script>`-Blöcken der 84 Dateien sind
**41 Tailwind-Klassenlisten** und **39 Logmeldungen**; es bleiben **78 Kandidaten
in 25 Dateien**. Beide Ausschlüsse stehen als benannte Regel im Guard
(`STRUCTURAL_LITERAL`, `logCallRanges`), nicht in einem Messskript — die Lehre
aus Aufgabe 2.2, Befund 2 („DER UMFANG STAND IN EINEM WEGGEWORFENEN SKRIPT").

Der Log-Ausschluss rechnet **Klammerbilanz statt Zeile**. Eine zeilenweise
Prüfung zählte vier Logmeldungen als Anzeigetext, weil `logger.warn('…', { … })`
regelmäßig umbricht — darunter `'User contact data saved with consent-based
persistence'`.

Die Regel selbst ist jetzt **geteilt**: `multiWordLiterals` liegt in
`sourceScan.testutil.ts`, beide Guards rufen sie auf. Vorher stand sie als Kopie
in `hardcodedStringScan.test.ts` — genau die Lage, gegen die das Datei-Doc jener
testutil-Datei argumentiert („Zwei Verfahren für dieselbe Aufgabe altern
getrennt").

### Welle 1: `routes/+error.svelte`, 9 → 0

Zehn Literale (fünf Titel, fünf Beschreibungen) in `getErrorMessage()`. Neun
davon zählte der Guard; `'Serverfehler'` ist ein Einzelwort und stand nie darin
— trotzdem übersetzt. Die Zwei-Wort-Regel ist eine **untere Schranke** für
Anzeigetext, keine Definition davon.

Schlüssel von Hand, aber nach derselben Regel wie das Werkzeug
(`slugify(text, 40)`), damit der Katalog neben den maschinell erzeugten
Einträgen lesbar bleibt.

Nachweise: `test:quick` grün (4948 + 780), **alle drei E2E-Shards grün ohne
`CI=1`** (229 + 94 + 156 = 479, 0 rot).

### Zwei Fehler von mir in diesem Abschnitt

1. Ich habe `git checkout` auf eine Datei mit **uncommitteten** Änderungen
   gefahren, um eine Mutation zurückzunehmen — und damit die halbe Arbeit
   gelöscht. Für Mutationen an noch nicht committetem Code gilt: vorher
   kopieren, danach zurückkopieren. `git checkout` nimmt nur eine Mutation an
   committetem Code zurück.
2. Ich habe die Kataloge mit `json.dump` geschrieben und dabei die
   Einrückung der bestehenden ICU-Plural-Einträge verändert. Prettier hat es
   gemeldet, der Commit lief trotzdem durch (der Hook prüft es nicht).
   Nachgezogen per `--amend`, mit dem Beleg, dass beide Dateien danach
   unverändert 907 Schlüssel tragen und der Diff rein weißraumhaft ist.

### Welle 2: `SightingsMapView` 9 → 0, `DropzoneEnhanced` 8 → 0

Commit e94a3d3a, 26 neue Schlüssel.

**Der Zähler hat hier zu wenig gemeldet, und das war absehbar.**
`SightingsMapView` trägt die gesamte Lokalisierungs-Naht der Karte in einem
Objektliteral: `const translations: MapTranslations` versorgt
`popupContent.ts`, `countManager.ts` und die Legende. Gezählt wurden davon
sechs Einträge — die übrigen („Tierart", „Position", „Name", „Totfund", …)
sind Einzelwörter und fallen unter die Zwei-Buchstabengruppen-Regel. Nur die
sechs zu übersetzen hätte das Popup unter `/en` halb deutsch gelassen.
Deshalb sind alle fünfzehn Textfelder jetzt Botschaften. Gleiche Begründung
wie bei `'Serverfehler'` in Welle 1: **Die Regel ist eine untere Schranke für
Anzeigetext, keine Definition davon.** Wer eine Datei anfasst, liest sie
ganz — der Zähler sagt nur, wo man anfangen muss.

Drei Stellen brauchten Parameter statt einer festen Botschaft: der
Art-Chip-Rückfall (`Art {id}`), der Anzahl-Chip (`Anzahl {name}`) und der
Dateilimit-Toast der Dropzone (`Nur {allowed} von {total} … {max}`).

### Zwei Befunde aus Welle 2, beide offen

1. **`translations.language: 'de'` hat keinen einzigen Verbraucher.** Kein
   Treffer in `src/lib/map/**`. Ein totes Feld auf der Schnittstelle
   `MapTranslations` — stehen gelassen statt geraten, was es bedeuten soll.
2. **`popupContent.ts` hartcodiert `'Ja'` und `'Unbekannte Art'`.** Die Datei
   ist `.ts` und liegt damit außerhalb des Schicht-C-Guards, der nur `.svelte`
   liest. Das ist dieselbe Bauart blinder Fleck wie Befund B eine Ebene höher:
   Der Umfang ist über die Dateiendung definiert, der Anzeigetext hält sich
   nicht daran. Eine spätere Ausweitung auf die `.ts`-Dateien unter
   `src/lib/map/` und `src/lib/report/` ist der nächste logische Schritt —
   erst messen, dann entscheiden.

### Zur Flakiness, damit sie nicht als Befund missverstanden wird

Erster Vollauf nach Welle 2: drei Zeitüberschreitungen im Unit-Lauf
(`localePinning` ×2, `legacy.contract`), im Wiederholungslauf einer, isoliert
2/2 grün. E2E: `smoke` 229 und `form` 94 grün, `map` einmal rot mit einer
`toHaveAttribute`-Zusicherung und danach **156/156 grün bei identischem
Code**. Der Spec-Name wurde nicht festgehalten — das ist ein Versäumnis der
Messung, kein Beleg für Harmlosigkeit; festgehalten statt weggeredet.

### Welle 3: `ModernReportForm` 4 → 0, `UnifiedDropzone` 6 → 1

Commit e1abc3cb, 10 neue Schlüssel.

**Eine Stelle bleibt bewusst im Zähler.** Die erzeugte Element-ID
`dropzone-${Math.random()…}` erfüllt die Zwei-Buchstabengruppen-Regel, ist
aber kein Anzeigetext. Sie steht mit Begründung als Kommentar an der
Zähler-Zeile statt auf einer Ausnahmeliste — die soll leer bleiben. Wer die
Datei das nächste Mal öffnet, sieht sofort, dass die 1 kein Rest ist.

**`dropPrompt` war deutsche Grammatik im Code**:
`${multiple ? 'Dateien' : 'Datei'} hier ablegen!`. Aufgelöst in zwei ganze
Botschaften, ausgewählt über den Booleschen Wert — **kein ICU-Plural**:
`multiple` ist ein Modus, keine Anzahl, und wer übersetzt, braucht beide
Sätze ganz. (Muster B aus 2.3b gilt für Zählungen, nicht hierfür.)

### `svelte-check` hat wieder gefunden, was vitest nicht sieht — zum dritten Mal

`let submitTitle = $state(m.…())` leitet den Typ aus dem Startwert ab, und
eine Paraglide-Botschaft liefert die Marke `LocalizedString`. Alle späteren
Zuweisungen an `submitTitle` (Servermeldung, Fehlertext aus dem Catch) sind
gewöhnliche Zeichenketten und wurden dadurch abgelehnt — zwei Fehler in
`ModernReportForm.svelte`. Behoben mit `$state<string>` und Begründung an
der Deklaration.

Die Lehre aus 2.3a steht damit zum dritten Mal: **Gültige Syntax und grüne
Unit-Tests sind kein Beleg für richtigen Code; der Typ-Check ist das Gate.**
Wer in diesem Vorhaben eine Botschaft in einen `$state` legt, annotiert den
Typ.

Nachweise: `test:quick` grün (4948 + 780), **alle drei E2E-Shards im ersten
Lauf grün** (229 + 94 + 156 = 479, 0 rot).

### Welle 4: die vier Vierer-Dateien in einem Zug

Commit d3d4f80e, 12 neue Schlüssel. `ReportKindChoice` 4 → 0,
`VerifyLocation` 4 → 0, `WeatherDataFetcher` 4 → 1, `Media` 4 → 1.

**Befund: `VerifyLocation` zeigte Englisch auf einer öffentlichen Fläche.**
Antwortet `/api/geo/inBaltic` mit `!ok`, ist die Meldung des geworfenen
`Error` genau das, was der Melder zu sehen bekommt — und das war
`'Unknown error'` (wenn das JSON nicht lesbar war) oder ein nacktes
`HTTP 500`. Die deutsche Servermeldung wird weiterhin durchgereicht;
geändert wurde nur der Rückfall, auf einen deutschen Satz mit dem
Statuscode als Parameter. Das war kein Übersetzungsversäumnis dieser
Etappe, sondern lag seit jeher so — sichtbar geworden ist es erst, weil
der Zähler die Datei überhaupt in den Blick nahm.

**Zwei Einträge bleiben bewusst stehen**, je mit Begründung an der
Zähler-Zeile: der Cache-Schlüssel aus Koordinaten und Zeit
(`WeatherDataFetcher`) und `'JPG, PNG, GIF, WEBP'` (`Media`) —
Dateiformat-Kürzel, sprachneutral.

`Media` setzte seine Größenhinweise im Code zusammen („Bilder max. X MB,
Videos max. Y MB"). Jetzt parametrisierte Botschaften: Wer übersetzt,
bekommt beide Zahlen in einem Satz und kann sie umstellen.

**Reihenfolge geändert, nach der Lehre aus Welle 3:** `npm run check`
läuft jetzt vor dem Gate, nicht mittendrin. Diesmal 0 Fehler — aber der
Lauf kostet 40 Sekunden und hätte in Welle 3 zwei Gate-Durchläufe gespart.

**Flakiness, diesmal namentlich.** `form` fiel einmal aus mit
`admin-queue.spec.ts:147` — der Admin-Bereich, der von der Lokalisierung
gar nicht berührt wird, und einer der drei Specs, die dieses Vorhaben
bereits als lastabhängig verzeichnet hat. Isoliert 2/2 grün (je 4
passed). `smoke` 229 und `map` 156 grün.

### Welle 5: der Rest — Befund B ist abgeschlossen

Commit d1cdf63a. 21 Stellen über 12 Dateien, 19 neue Schlüssel. Der Zähler
schließt bei **8**, und jede dieser acht Stellen trägt ihre Begründung an
der eigenen Zeile: zwei Cookie-Zeichenketten, zwei erzeugte Element-IDs,
ein Cache-Schlüssel, zwei geworfene Entwicklerfehler (die den Programmierer
erreichen, nie den Melder) und eine Liste von Dateiformat-Kürzeln.

**Bilanz Befund B: 78 Stellen in 25 Dateien → 8 begründete Reste in 7
Dateien**, über fünf Wellen, jede mit `test:quick` und vollständiger
E2E-Suite ohne `CI=1`.

### Die ersten von Hand geschriebenen ICU-Plurale

`Step4Contact` („Ihre hochgeladene Aufnahme:" / „Ihre {count} hochgeladenen
Aufnahmen:") und der Fehler-Toast in `StepNavigation`. Beide waren deutsche
Grammatik, im Code mit `length === 1 ? … : …` zusammengesetzt — das legt die
Einzahl-/Mehrzahl-Grenze bei eins fest, und dort liegt sie nicht in jeder
Sprache. Muster B aus 2.3b, zum ersten Mal angewandt; `StepNavigation`
braucht dabei **zwei** `input`-Deklarationen (`count` und der Schrittname).

Gegen die kompilierte Ausgabe geprüft, nicht bloß gegen den Katalog:
`count` 1/3/0 und 1/2 wählen den richtigen Zweig, und der deutsche Wortlaut
ist zeichengleich das, was der Ternär vorher erzeugt hat — **einschließlich
`count = 0` → „Ihre 0 hochgeladenen Aufnahmen:"**, dem Verhalten der alten
`=== 1`-Abfrage.

### Zwei Entscheidungen, die keine Fleißarbeit waren

1. **`OLMap` setzte seinen Hinweis aus `${base} Der GPS-Button …` zusammen.**
   Aufgelöst in zwei GANZE Sätze statt Fragment plus Anhang: Ein festes
   Fragment zwingt jede Zielsprache in die deutsche Satzfolge (Muster C).
   Der erste Satz steht dadurch zweimal im Katalog — bewusst.
2. **`'Wieder online.'` kollidierte mit der Markup-Botschaft `'Wieder
online'`** (ohne Punkt, also ein anderer String). Aufgelöst wie im
   Werkzeug, mit Zählsuffix — nicht durch stilles Zusammenlegen zweier
   Texte, die zufällig ähnlich aussehen.

### `svelte-check` zum dritten Mal, und diesmal war ich selbst schuld

Zwei fehlende `import * as m`. Meine eigene Import-Prüfung lief über die
**verbliebenen** Kandidaten-Dateien statt über die **geänderten** — eine
Messung, die die falsche Menge betrachtet, genau wie die Fundstellen-Irrtümer
weiter oben. Der Typ-Check hat es gefunden, die grünen Unit-Tests nicht.

## Befund C — Anzeigetext in `.ts`-Dateien: die Messung

Erhoben 2026-08-12 mit derselben Regel wie der Schicht-C-Guard
(`multiWordLiterals`, abzüglich Klassenlisten und Logmeldungen), angewandt
auf alle `.ts` unter `src/` ohne `paraglide/`, `tools/`, `tests/` und
Testdateien.

### Die Rohzahl ist unbrauchbar, und das ist die eigentliche Aussage

**981 Kandidaten in 146 Dateien.** Wer damit plant, plant an der Sache
vorbei: Die Zahl mischt Zielgruppen, die einander ausschliessen — Text, der
den Melder erreicht, mit Text, der deutsch bleiben MUSS (Legacy-API,
CSV-Export), mit Admin-Oberfläche, mit Serverinterna. Erst die Aufteilung
nach **Zielgruppe** ergibt eine Arbeitsgrundlage.

| Bereich                                                     |           Kandidaten | Umgang                                              |
| ----------------------------------------------------------- | -------------------: | --------------------------------------------------- |
| **A — öffentlicher Client-Code**                            | **138** (30 Dateien) | zu lokalisieren                                     |
| **E — `/api` ohne `/api/admin`**                            | **119** (30 Dateien) | je Endpunkt zu entscheiden                          |
| Serverintern (Mailvorlagen, Konfiguration, Spam)            |                  211 | eigene Frage, Empfänger ist das Museum              |
| `speciesIdentification.ts`                                  |                  208 | Schicht E, Etappe 4 — bestätigt                     |
| Admin (Oberfläche und Endpunkte)                            |                  155 | wird nicht lokalisiert                              |
| Legacy-API (`rest_sichtungen`, `sichtungen`, `legacy-api/`) |                   68 | **deutsch festgenagelt** — drei angebundene Clients |
| `server/export/`                                            |                   25 | **deutsch festgenagelt** (Locale-Falle)             |
| `hooks.server.ts`, `+page.server.ts`                        |                   18 | einzeln zu prüfen                                   |
| Entwicklerflächen                                           |                    5 | nie lokalisiert                                     |

### Drei Rauschklassen, die erst beim Hinsehen auffielen

Die Regel zählte in `.ts` deutlich mehr Fehltreffer als in `.svelte`, weil
dort andere Literalsorten vorkommen. Ausgeschlossen und benannt:
**HTML-Vorlagen** (`popupContent.ts` baut sein Popup als Zeichenkette),
**SQL-Fragmente** (`CASE WHEN …`, `${sightings.…}`) und **HTTP-Kopfwerte**
(`inline; filename=…`, `public, max-age=…`). Das senkte A von 158 auf 138
und E von 131 auf 119. `popupContent.ts` fiel dadurch von 22 auf 8 — sein
sichtbarer Text kommt fast vollständig aus `MapTranslations`, also seit
Welle 2 aus dem Katalog.

### KORREKTUR zu Welle 5: der Kartenhinweis steht zweimal

`wording.ts:94 mapHint()` erzeugt **denselben** Hinweistext, den ich in
Welle 5 in `OLMap.svelte` übersetzt habe — mit einem zusätzlichen
Zweig-Verb (`gefunden haben` / `gesehen haben`). Geprüft, nicht vermutet:
`PositionPanel.svelte:60` ruft `mapHint(...)` und reicht das Ergebnis über
`LocationInput` als `hintOverride` an `OLMap` durch (`:304`, `:491`).

**Im Meldeformular gewinnt also immer `wording.ts`.** Was ich in Welle 5
übersetzt habe, ist der Rückfall für Aufrufer ohne `PositionPanel`. Die
Aussage „Befund B abgeschlossen" bleibt richtig — sie galt den
`<script>`-Blöcken —, aber sie bedeutet **nicht**, dass der Melder diesen
Hinweis auf Englisch sähe. Wer glaubt, die Karte sei fertig, irrt.

### Die dicksten Posten in A, mit Charakter

- `constants/weather.ts` **24** — die Wetterbeschreibungen zum Wettercode
  („Leichter Nieselregen", „Gewitter mit starkem Hagel"). Alle echt, alle
  sichtbar, geschlossene Liste. Der sauberste Einzelposten.
- `report/wording.ts` **16** — die zweigabhängige Wortwahl des
  Meldeformulars (lebend/Totfund). Echt, sichtbar, und mit dem Verb-Einschub
  ein Muster-C-Fall: `${verb}` steht MITTEN im Satz.
- `constants/upload.ts` **9**, `report/formConfig.ts` **7**,
  `map/controls/locationControlState.ts` **6**, `utils/uploadUtils.ts` **6**.

### E braucht eine Entscheidung, keine Welle

Die 119 in `/api` sind gemischt: deutsche Meldungen an den Melder
(Validierungsfehler, Ratenbegrenzung) neben englischen Maschinenmeldungen
(`File not found`, `Internal server error`, `Invalid form submission`).
Beides in einem Zug zu übersetzen wäre falsch — eine Fehlerantwort an einen
Client ist kein Anzeigetext. Vorschlag: erst je Endpunkt klären, welche
Antwort ein Mensch liest, dann lokalisieren; die englischen bleiben.

### Welle C1: `weather.ts` und `wording.ts`

Commit 6989eebc, 51 neue Schlüssel. A fällt von 138 auf 98.

#### Die Locale-Falle, zum vierten Mal — und diesmal an der schlimmsten Stelle

`getWeatherDescription()` hat zwei Verbraucher, die in entgegengesetzte
Richtungen ziehen: `weatherRefreshService.ts:250` und
`/api/weather/historical` legen den Text als Teil von `weatherData` in der
**JSONB-Spalte `weather_data`** ab (`schema.ts:111`); `WeatherDisplay.svelte`
zeigt ihn an. Was gespeichert wird, darf nicht davon abhängen, in welcher
Sprache der Melder unterwegs war — und anders als bei Legacy-API, CSV-Export
und Museums-Mail wäre ein Fehler hier **nicht durch erneutes Ausliefern zu
heilen**, weil er im Bestand steht.

Die Entscheidung steckt deshalb in der Signatur:
`getWeatherDescription(code, locale = baseLocale)`. Persistenz und
API-Antwort bekommen Deutsch, ohne danach zu fragen; nur die Anzeige reicht
`getLocale()` durch — und leitet aus dem **Code** ab, nicht aus der
gespeicherten deutschen Zeichenkette.

Der Record hält **Botschafts-Funktionen, keine aufgelösten Zeichenketten**.
Ein Record aus Strings würde beim Modulladen einmal aufgelöst und fröre die
Sprache für die Prozesslebensdauer ein — der Defekt, den Entwurf 2.3/4.1 für
die Modulkonstanten der Schicht B beschreibt.

#### Der Test war zuerst rot, und zwar an der richtigen Stelle

`weatherLocalePinning.test.ts` vor dem Umbau: Die **Gegenprobe** fiel aus
(`'Bedeckt'` statt der künstlich abweichenden englischen Fassung). Die beiden
Pinnungs-Zusicherungen waren schon vorher grün — für den falschen Grund,
weil die Funktion die Locale gar nicht kannte. Genau dafür steht die
Gegenprobe da; ohne sie hätte der Test einen Zustand bescheinigt, den es
nicht gab. Das ist der wichtigste Befund aus Etappe 1, hier zum zweiten Mal
angewandt.

#### `wording.ts`: `${verb}` mitten im Satz

`mapHint` setzte seinen Satz mit einem Verb-Einschub zusammen („… an der Sie
das Tier ${verb}"). Ein Parameter dort friert die deutsche Wortstellung ein;
Englisch stellt sie anders. **Sechs ganze Sätze** statt eines Musters —
Muster C, wie schon bei `OLMap` und `LoadingOverlay`.

`sightingFromQuestion` gibt im Lebend-Zweig jetzt **dieselbe** Botschaft
zurück, die das Schema als Label führt — nicht eine zweite mit gleichem
Wortlaut. `wording.test.ts` prüft die Gleichheit gegen das Schema; zwei
Kopien könnten in einer Zielsprache auseinanderlaufen, und der Test hätte es
gemerkt, aber erst nach der Übersetzung.

Geprüft, nicht angenommen: Alle Verbraucher von `wording.ts` sind
`.svelte`-Komponenten — keine Pinnung nötig.

Nachweise: `svelte-check` 0 Fehler, `test:quick` grün (4951 + 780), alle drei
E2E-Shards im ersten Lauf grün (229 + 94 + 156 = 479).

**Stand A: 98 Kandidaten in 28 Dateien** (vorher 138/30).

### Welle C2: `upload.ts` und `popupContent.ts`

Commit 676cd53d, 17 neue Schlüssel.

#### Verbraucher zuerst, wie immer

`UPLOAD_ERROR_MESSAGES` läuft auf **beiden** Seiten: `UnifiedDropzone` und
`Media` im Browser, `validateFile` innerhalb von `/api/files/upload`. Die
Serverseite ist ein Request-Handler — die Locale kommt dort aus der Anfrage,
ein englischer Melder bekommt eine englische Fehlermeldung. Nichts davon
wird gespeichert, also **keine** `baseLocale`-Pinnung wie in `weather.ts`.
`popupContent` baut OpenLayers-Popups, reiner Client.

#### `NO_FILE` und `UPLOAD_FAILED` sind jetzt Getter

Als einfache Felder wären sie beim Modulladen einmal aufgelöst worden und
hätten die Sprache für die Prozesslebensdauer eingefroren — derselbe Defekt,
den Entwurf 2.3/4.1 für die Modulkonstanten der Schicht B beschreibt, und
derselbe Grund, aus dem `weather.ts` Botschafts-Funktionen hält.

#### Das geschützte Leerzeichen gehört IN die Botschaft

`props.ct > 1 ? 'Tiere' : 'Tier'` und `{n} Sichtungen` sind jetzt
ICU-Plurale. Das `&nbsp;` zwischen Zahl und Substantiv stand vorher als
HTML-Entität **daneben**; es steht jetzt als echtes U+00A0 **in** der
Botschaft. Wer die Wortfolge beim Übersetzen umstellt, nimmt es mit. Gegen
die kompilierte Ausgabe geprüft: 1/3 und 1/4 wählen den richtigen Zweig, das
U+00A0 überlebt.

#### BUCHFÜHRUNG: 87 statt 81, und der Unterschied ist lehrreich

Nach 98 − 17 wären 81 zu erwarten. Gemessen: **87**. Die Differenz sind
**sechs Literale, die diese Änderung selbst erzeugt hat**: Eine Vorlage, die
nur noch `${m.key(...)}` enthält, hat weiterhin Leerzeichen und zwei
Buchstabengruppen — die Regel zählt sie erneut.

Das ist exakt der Effekt, den der Markup-Extraktor `already-translated`
nennt. **Ein künftiger `.ts`-Zähler braucht denselben Ausschluss**, sonst
wächst er bei jeder Übersetzung. Sechs Falsch-Positive, keine verlorene
Stelle — nachgerechnet, nicht behauptet: Meine erste Commit-Angabe („98 auf
82") war schlicht falsch und wurde per `--amend` korrigiert.

**Stand A: 87 Kandidaten in 28 Dateien**, davon mindestens 6 selbst erzeugte
Falsch-Positive.

### Welle C3: `dateTime.ts` — die Pinnung ohne zweiten Parameter

Commit siehe unten, 3 neue Schlüssel. A 87 → 83.

Diese Datei bedient beide Welten aus denselben Funktionen:

| Aufrufer                                    | erwartet                             |
| ------------------------------------------- | ------------------------------------ |
| `server/export/csvExport.ts`                | Deutsch — Vertrag mit dem Altbestand |
| `server/services/emailService.ts`           | Deutsch — Empfänger ist das Museum   |
| `formatForKmlExport` / `formatForXmlExport` | Deutsch — Exportformate              |
| Karte, Meldeformular, `about`               | die aktive Sprache                   |

Ein `m.key()` ohne Locale-Argument wäre in den Export-Pfaden an `getLocale()`
gekoppelt gewesen — derselbe Fehler wie dreimal zuvor, nur über eine
Hilfsfunktion statt direkt.

**Die Lösung braucht keinen zweiten Parameter.** `formatLocalDateTime` trägt
bereits ein `locale`-Argument für die Zahl- und Datumsformatierung; der
Ersatztext folgt jetzt demselben Argument über `messageLocale()`, die
Umkehrung von `resolveDisplayLocale`. Der Vorgabewert ist `APP_LOCALE`, also
sind alle Export- und Mailpfade **ohne Änderung** richtig. Die beiden
Export-Formatierer pinnen `baseLocale` ausdrücklich, mit Begründung an der
Zeile.

Test zuerst: `dateTimeLocalePinning.test.ts` war vor dem Umbau an **beiden
Gegenproben** rot, danach grün. Die Pinnungs-Zusicherungen waren schon vorher
grün — für den falschen Grund, weil die Zeichenketten hartcodiert waren.
Genau dafür steht die Gegenprobe.

Bewusst nicht angefasst: `formatISOLikeDatetime` und
`formatObservationTime` setzen `${day}.${month}.${year}` und eine
Wanduhrzeit zusammen. Das sind Berechnungen und ein Datums-FORMAT, kein
Anzeigetext; sie zu ändern wäre eine Formatierungsentscheidung, keine
Übersetzung.

**Stand A: 83 Kandidaten in 28 Dateien.**

### Welle C4: fünf Dateien, vier Modulkonstanten

Commit 6128040e, 27 neue Schlüssel. **A 83 → 56 in 24 Dateien.**

`formConfig.ts`, `locationControlState.ts`, `uploadUtils.ts`,
`submitSightingForm.ts`, `geolocation.ts`.

#### Der eigentliche Aufwand war nicht das Übersetzen

Vier **Modulkonstanten** hätten die Sprache eingefroren und mussten umgebaut
werden, bevor eine einzige Zeichenkette ersetzt wurde:

| vorher                                | nachher                                           |
| ------------------------------------- | ------------------------------------------------- |
| `formStepsConfig[].title/description` | Getter auf den Array-Einträgen                    |
| `LOCATION_LABEL_IDLE` / `_TRACKING`   | `locationLabelIdle()` / `locationLabelTracking()` |
| `FALLBACK_MESSAGE`                    | `fallbackMessage()`                               |
| `DISALLOWED_FIELD_MESSAGE`            | `disallowedFieldMessage()`                        |

Ein `const X = 'Text'` wird beim Modulladen **einmal** aufgelöst. Jeder spätere
Leser bekäme die Sprache, in der der Prozess gestartet ist — und kein Test
merkte es, weil der Wert stabil ist und richtig aussieht. Das ist der Defekt
aus Entwurf 2.3/4.1, hier zum ersten Mal außerhalb der Schicht B.

'Upload fehlgeschlagen. Versuchen Sie es erneut.' gab es bereits als Schlüssel
aus `constants/upload.ts` und wird **wiederverwendet** statt gedoppelt —
dieselbe Zeichenkette in zwei Dateien ist eine Botschaft, nicht zwei, die
auseinanderlaufen können.

#### BEWUSST NICHT übersetzt: `balticSeaStatus.ts`

Die 5 Kandidaten dort bleiben stehen, und zwar belegt: **Jeder** Verbraucher
ist Admin-Oberfläche, Museums-Mail oder ein Server-Filter —
`src/lib/components/admin/**`, `routes/admin/**`,
`server/templates/balticSeaEmailContext.ts`, `server/db/balticSeaFilter.ts`.
Keine öffentliche Fläche liest die Datei, und beide Zielgruppen werden
ausdrücklich nicht lokalisiert. Sie zu übersetzen hätte eine Locale-Falle
eingebaut, von der niemand etwas hätte.

Das ist der erste Fall in Befund C, in dem die **Verbraucher-Prüfung Arbeit
verhindert** statt sie zu formen — und damit ihr eigentlicher Zweck.

Nachweise: `svelte-check` 0 Fehler, `test:quick` grün (4955 + 780), alle drei
E2E-Shards im ersten Lauf grün (229 + 94 + 156 = 479).

### Welle C5: der Rest von Bereich A — abgeschlossen

Commit 11bb587a, 21 neue Schlüssel, drei wiederverwendet. **A 56 → 30.**

Zwei weitere Modulkonstanten mussten vor jeder Ersetzung umgebaut werden:
`UPLOAD_NOTICE` und die beiden `CLEAR_CONTACT_DATA_*`. `UPLOAD_NOTICE` war
zusätzlich **vier verkettete Template-Fragmente** — die Aufteilung war reine
Zeilenlänge, kein Satzbau. Daraus wurde EINE Botschaft mit `{hours}`. Wer
übersetzt, braucht den ganzen Absatz, nicht vier Stücke, die nur auf Deutsch
zusammenpassen.

Drei Zeichenketten gab es bereits als Schlüssel und werden
**wiederverwendet**: die beiden GPS-Beschriftungen (aus `map/controls`) und
`'Nicht angegeben'` (aus `dateTime`).

`fieldsOutsideReportKind` behält bewusst einen Parameter **mitten im Satz** —
gegen die sonstige Regel, mit Begründung an der Zeile: Der Einschub ist eine
**Nominalphrase** („zum Totfund"), kein Satzteil mit eigener Stellung, und
überlebt deshalb eine Umstellung.

#### Die verbleibenden 30 sind kein Rest, sondern Entscheidungen

| Anzahl | Datei(en)                                   | Grund                                                                                           |
| -----: | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
|      5 | `balticSeaStatus.ts`                        | Admin + Museums-Mail, belegt in Welle C4                                                        |
|      2 | `photoAnnouncement.ts`                      | dasselbe — Server-Filter, `emailService`, Admin-Labels                                          |
|      8 | `popupContent`, `upload`, `dateTime`        | HTML-/Format-Vorlagen, die nur noch `${m.key(...)}` enthalten — der `already-translated`-Effekt |
|      6 | `styleUtils`, `weatherIcons`, `dateUtils`   | Schrift- und CSS-Klassen-Zeichenketten                                                          |
|      5 | `fileAnalysis`, `mapContext`, `uploadUtils` | englische Interna, geworfene Entwicklerfehler, `HTTP ${status}`                                 |
|      4 | verstreut                                   | Berechnungen und Formatzeichenketten                                                            |

`svelte-check` hat sich erneut bezahlt gemacht: Die Umbenennung von
`UPLOAD_NOTICE` brach **drei** Verbraucher, die mein Grep nicht gezeigt
hatte — alle vor dem Gate gefunden. Das ist zum vierten Mal in dieser
Etappe dieselbe Lehre.

Nachweise: `svelte-check` 0 Fehler, `test:quick` grün (4955 + 780), alle drei
E2E-Shards im ersten Lauf grün (229 + 94 + 156 = 479).

## STAND BEFUND C

**Bereich A (öffentlicher Client-Code) ist abgearbeitet**: 138 → 30, und die
30 sind begründet. Offen bleibt **Bereich E** (`/api`, 119 Kandidaten in 30
Dateien) — und der braucht zuerst eine Entscheidung je Endpunkt, welche
Antwort ein Mensch liest und welche eine Maschine. Deutsche
Validierungsmeldungen an den Melder gehören übersetzt, `File not found` und
`Internal server error` nicht.

## Befund C, Bereich E — die Klassifikation vor der Arbeit

Erhoben 2026-08-12. **Keine Codeänderung**, das ist Absicht: Wer in `/api`
übersetzt, ohne vorher zu klären, wer die Antwort liest, übersetzt
Maschinenantworten — und das ist schlechter, als sie deutsch zu lassen.

### Mein erster Unterscheider war zu grob, und der Beleg steht daneben

Naheliegend war: „Endpunkt mit Auth-Guard = Admin, ohne = öffentlich."
Gemessen ergibt das 123 Kandidaten „Admin" und 24 „offen" — und die Zahl ist
falsch. `src/routes/api/sightings/+server.ts` erscheint darin als ADMIN,
weil die Datei einen admin-geschützten `GET` **und** den öffentlichen `POST`
enthält, mit dem jeder Melder seine Sichtung abschickt. Dasselbe gilt für
`/api/files/upload`.

**Die Zielgruppe hängt nicht an der Datei, nicht einmal am Endpunkt, sondern
an der einzelnen Antwort.** Ein Guard auf Dateiebene ist dafür blind.

### Der belastbare Weg: von der Anzeigestelle rückwärts

Tragfähig ist nur, was sich am Client belegen lässt — wer zeigt eine
Server-Meldung tatsächlich an? Fünf Pfade, jeder einzeln nachgesehen:

| Endpunkt                  | Anzeigestelle                              | Kandidaten |
| ------------------------- | ------------------------------------------ | ---------: |
| `POST /api/sightings`     | `submitSightingForm.ts` → `result.message` |          9 |
| `/api/files/upload`       | `uploadUtils.ts` → Toast                   |          9 |
| `/api/files/delete`       | `uploadUtils.ts` → Toast                   |          8 |
| `/api/geo/inBaltic`       | `VerifyLocation.svelte` → Fehlerzeile      |          5 |
| `/api/weather/historical` | `WeatherDataFetcher.svelte` → `data.error` |          5 |

**36 Kandidaten über fünf Dateien** — nicht 119. Alles Übrige ist Admin,
Export, Maschinenantwort (`csp-report`, `maintenance-status`) oder
Serverinternes.

### ZWEI BEFUNDE: englischer Text erreicht heute schon den Melder

Nicht Übersetzungsarbeit, sondern vorbestehende Fehler — sichtbar geworden,
weil die Klassifikation die Anzeigestellen abgelaufen ist:

1. `/api/weather/historical` antwortet dem Melder auf **Englisch**:
   `'Could not fetch weather data for the specified location and date'` und
   `'Internal server error'`. `WeatherDataFetcher` zeigt `data.error`
   unverändert an.
2. `/api/sightings:151` liefert `'Invalid form submission'`, und
   `submitSightingForm` zeigt `message` an.

Das ist dieselbe Klasse wie `'Unknown error'` in `VerifyLocation` (Welle C4,
behoben). Beide gehören in die nächste Welle — sie sind der Grund, warum die
Klassifikation mehr wert war als eine schnelle Ersetzung.

### Was die nächste Welle zu entscheiden hat

Innerhalb der 36 ist noch einmal zu trennen: `'Reference ID ist
erforderlich'` und `'Content-Type muss multipart/form-data sein'` sind
Programmierfehler-Meldungen an einen falsch gebauten Client, keine
Melder-Texte. `'Sie haben in der letzten Stunde bereits … MB'` und
`'Die Meldung enthält bereits … MB'` dagegen richten sich unmittelbar an den
Menschen. Diese Trennung geht nur von Hand, Zeile für Zeile.

### Welle E1: die Antworten, die der Melder wirklich sieht

Commit cf7276ef, 26 neue Schlüssel über die fünf Endpunkte aus der
Klassifikation — nicht über die 119 der Rohmessung.

#### Zwei vorbestehende Fehler mitbehoben

Beides englischer Text, der heute schon einem deutschen Melder angezeigt
wurde:

- `/api/weather/historical`: `'Could not fetch weather data for the
specified location and date'` und `'Internal server error'` —
  `WeatherDataFetcher` zeigt `data.error` unverändert an.
- `/api/sightings:151`: `'Invalid form submission'` — `submitSightingForm`
  zeigt `result.message` an.

Dieselbe Klasse wie `'Unknown error'` in `VerifyLocation` (Welle C4). **Eine
schnelle Suchen-und-Ersetzen-Welle hätte alle drei übersprungen**: Sie sehen
erledigt aus, weil sie schon englisch sind. Das ist der konkrete Ertrag der
Klassifikation.

#### Nicht übersetzt, Zeile für Zeile entschieden

Meldungen, die einen falsch gebauten **Client** beantworten, nicht einen
Menschen: `'Content-Type muss multipart/form-data sein'`, `'Reference ID ist
erforderlich'`, `'File path ist erforderlich'`, die `FORBIDDEN_FIELDS`-Liste.
Der admin-geschützte `GET`-Zweig von `/api/sightings` bleibt ebenfalls
deutsch.

#### Der Fallstrick: derselbe Satz in Logzeile UND Antwort

Zweimal stand derselbe deutsche Text sowohl in einem `logger.info(...)` als
auch im Antwortkörper (`files/delete`, `geo/inBaltic`). Nur die **Antwort**
ist eine Botschaft; die Logzeile bleibt deutsch, weil sie Entwicklertext ist.
Die Ersetzung zielt deshalb auf `message:`/`error:` statt auf das nackte
Literal — so kann eine Logmeldung nicht versehentlich übersetzt werden.
Gefunden hat das die Zähl-Zusicherung der Ersetzung (`count == 1`), nicht
die Aufmerksamkeit.

Serverseitig sind das Request-Handler: Paraglide löst die Locale aus der
Anfrage auf, ein englischer Melder bekommt eine englische Fehlermeldung ohne
ausdrückliches Locale-Argument — und gespeichert wird davon nichts.

Nachweise: `svelte-check` 0 Fehler, `test:quick` grün (4955 + 780), alle drei
E2E-Shards im ersten Lauf grün (229 + 94 + 156 = 479).

## ABSCHLUSS-REVIEW DES BRANCHES (2026-08-12)

26 Commits über 77af6e90, 62 Dateien, +2773/−449.

### Die vier Invarianten, geprüft statt behauptet

| Invariante                                               | Ergebnis                                                |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `germanBaseline.json` bitgleich                          | **ja** — `git diff` gegen die Basis ist leer            |
| Kein Altwert in `de.json`/`en.json` geändert             | **ja** — 897 → 1118 Schlüssel, 0 geänderte, 0 entfernte |
| Schlüsselmengen `de` und `en` identisch                  | **ja**                                                  |
| Kein `m.*`-Aufruf in Server-, Export- oder Legacy-Pfaden | **ja** — die Locale-Falle bleibt zu                     |

Zusätzlich geprüft: keine verbliebene Modulkonstante hält ein fertiges
Botschaftsergebnis (der Defekt aus Entwurf 2.3/4.1), und in den beiden
gepinnten Dateien (`weather.ts`, `dateTime.ts`) trägt jeder Aufruf sein
Locale-Argument.

### KORREKTUR am Protokoll: `en.json` ist nicht mehr durchgehend deutsch

An mehreren Stellen steht hier „nur `i18n_selbsttest` unterscheidet sich".
Das stimmt seit PR #861 nicht mehr: **18 Schlüssel tragen bereits echtes
Englisch** — die Muster-C-Umformulierungen (`LoadingOverlay`
„Tastaturkürzel …" / „Keyboard shortcut …"), die beiden ICU-Plurale und die
Begriff-Glosse-Paare aus `FormHelp` und `DeadAnimal`.

Nachgerechnet: Alle 18 bestanden **bereits auf `main`**, keine kam durch
diesen Branch hinzu. Die Aussage war also nicht falsch erhoben, sondern
überholt — dieselbe Sorte Fehler wie die vier zu groben Buchführungen weiter
oben, nur in der Dokumentation statt in der Messung.

Folge für die Weiterarbeit: Wer künftig behauptet, `en.json` trage
durchgehend den deutschen Wortlaut, prüft es nach. Der Vergleich ist eine
Zeile:

```
python3 -c "import json;d=json.load(open('messages/de.json'));e=json.load(open('messages/en.json'));print([k for k in d if d[k]!=e[k]])"
```

### Was dieser Branch NICHT geleistet hat

- Die **143 Handarbeitsfälle** der Schicht C (78 Satzfragmente, 58
  Interpolationen, 7 Attribut-Ternaries) sind unangetastet. Der Guard zählt
  sie, mehr nicht.
- **Befund A** (7 Anzeigetexte an Komponenten-Props, 20 `content`-Attribute)
  ist gezählt, nicht behoben.
- `TRANSLATION_ROLLOUT_COMPLETE` bleibt `false`. Alles hier ist Infrastruktur;
  die eigentliche Übersetzung bleibt ein Diff auf einer Datei.

---

### Was diese Messung NICHT ist

Kein Guard. Sie liegt als Zahl im Protokoll, nicht im Testlauf — der
Schicht-C-Guard liest weiterhin nur `.svelte`. Ein Zähler für `.ts` ist erst
sinnvoll, wenn die Zielgruppen-Aufteilung oben als Regel im Code steht;
sonst wäre er über 981 Stellen rot und würde abgeschaltet.

---

### Stand Befund B: abgeschlossen

Kein offener Anzeigetext mehr in den `<script>`-Blöcken der 84 Dateien. Die
verbliebenen 8 Zähler-Einträge sind namentlich begründet (siehe
`SCRIPT_TEXT_LEDGER` in `src/lib/i18n/hardcodedMarkupScan.test.ts`) und
stehen bewusst im Zähler statt auf einer Ausnahmeliste: Eine Ausnahme
verschwindet aus dem Blick, ein Zähler mit Begründung wird bei jeder
Änderung an der Datei wieder gelesen.

**Was offen bleibt** (nicht Befund B): Befund A mit 7 Anzeigetexten an
Komponenten-Props und 20 `content`-Attributen für Aufgabe 2.5, sowie die
143 Handarbeitsfälle (78 Satzfragmente, 58 Interpolationen, 7
Attribut-Ternaries).

**Und ein Befund, der aus Welle 2 offen ist:** `popupContent.ts` hartcodiert
`'Ja'` und `'Unbekannte Art'`. Der Guard liest nur `.svelte`; Anzeigetext in
`.ts`-Dateien unter `src/lib/map/` und `src/lib/report/` ist bisher von
niemandem gezählt worden. Das ist dieselbe Bauart blinder Fleck wie Befund B
selbst — erst messen, dann entscheiden.

---

---

# ZWEI BEFUNDE FUER DIE WEITERARBEIT (2026-08-12)

## 1. `.prettierignore` deckt die Generatordateien nicht ab

`npm run format` ist `prettier --write .` und formatiert damit auch erzeugte und
mitgelieferte Datenbestaende. Gemessen an einem versehentlichen Vollauf:
src/tools/iho.json 386.334 Zeilen
src/lib/server/geo/rbush-index.json 191.753 Zeilen
legacy-inbox/src/geo/rbush-index.json 191.753 Zeilen
src/css/weather-icons-wind.css 7.615 Zeilen
src/tools/baltic-inclusion-mask.geojson 4.545 Zeilen
Zusammen ueber 777.000 geaenderte Zeilen — ein unbrauchbarer Diff, in dem eine
echte Aenderung nicht mehr zu finden ist. Beim selben Lauf wurde auch
`germanBaseline.json` angefasst, also der eingefrorene Schnappschuss.

Die Datei .prettierignore existiert und schliesst bereits Lockfiles, /static/,
/drizzle/ und den erzeugten Paraglide-Code aus. Die obigen Pfade gehoeren
ebenfalls hinein. NICHT im Rahmen der Mehrsprachigkeit erledigt, weil es ein
eigenes Thema ist — aber wer als Naechstes formatiert, stolpert darueber.

## 2. Nicht selbst im Arbeitsbaum arbeiten, solange ein Agent darin laeuft

Ich habe `prettier --write` gefahren, waehrend ein Umsetzer-Agent noch im selben
Worktree arbeitete. Er fand meine Aenderungen, hielt sie fuer fremd und legte sie
in einen Stash — richtig gehandelt, beschriftet statt verworfen. Aber:

- mein `git add -A && git commit` schlug fehl, weil ihm der Index unter den
  Haenden weggezogen wurde;
- danach lag ein Arbeitsbaum mit 777.000 geaenderten Zeilen vor, dessen Herkunft
  sich nicht mehr eindeutig zuordnen liess;
- die Aufloesung kostete mehr Zeit als die Formatierung selbst.
  Der Skill verbietet parallele IMPLEMENTIERER aus genau diesem Grund. Die Regel
  gilt auch fuer den Koordinator: Solange ein Agent laeuft, wird im Arbeitsbaum
  nichts angefasst — auch nichts scheinbar Harmloses wie Formatierung. Lesende
  Befehle (git status, git diff, npm run i18n:extract) sind unproblematisch.

Dass HEAD dabei nie beschaedigt wurde, lag nicht an Vorsicht, sondern daran,
dass der Agent sauber gestasht hat. Verlass dich nicht darauf.
