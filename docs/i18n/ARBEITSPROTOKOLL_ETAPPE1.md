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
