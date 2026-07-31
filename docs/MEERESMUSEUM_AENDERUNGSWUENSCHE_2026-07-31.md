# Anpassungswünsche Sichtungswebsite — Analyse und Einordnung

**Quelle:** `Sichtungs-Webseite_SL.docx` (Deutsches Meeresmuseum)
**Analyse:** 2026-07-31, gegen Branch `claude/meeresmuseum-website-changes-d47405` (Stand `11a4e87`, Release 2.6.2)
**Zweck:** Jeden Wunsch nach Aufwand einordnen, fachlich prüfen und die Punkte benennen, die vor der Umsetzung geklärt werden müssen.

---

## 0. Kurzfassung

Von den **43 Einzelwünschen** sind:

| Kategorie                        | Anzahl | Charakter                                                       |
| -------------------------------- | -----: | --------------------------------------------------------------- |
| **A — Quick Wins**               |     24 | Texte, Labels, Feld-Sichtbarkeit, Validierungsgrenzen           |
| **B — Mittelgroße Umstellungen** |      8 | Hintergrund-Seite, Foto-Reihenfolge, Video, zweite Einwilligung |
| **C — Große Umbauten**           |      5 | Trennung Tot-/Lebendfund inkl. Einstiegsseite                   |
| **? — Rückfragen nötig**         |      6 | siehe Abschnitt 6                                               |

Zwei Dinge vorweg, die die ganze Liste betreffen:

1. **Der Text der Startseiten-Überschrift ist im eingebetteten Zustand unsichtbar.** `ModernReportForm.svelte:381` rendert Titel und Untertitel nur, wenn die Seite _nicht_ im iframe läuft. Auf meeresmuseum.de läuft sie im iframe. Die gewünschte neue Überschrift „Sichtung von Meeressäugetieren melden" ändert dort also nichts, solange wir das nicht bewusst umstellen. → Rückfrage 1.
2. **Ein Menüpunkt „Hintergrund" oben rechts ist im Embed ebenfalls unsichtbar.** `PublicNavbar.svelte:61` blendet die komplette Navigation im iframe aus — auch „Karte". Wer die Seite über meeresmuseum.de nutzt, sieht diese Navigation nicht. → Rückfrage 2.

Beides ist lösbar, aber die Lösung ist eine Entscheidung des Museums, keine technische.

---

## 1. Kategorie A — Quick Wins

Umsetzbar ohne Datenmodell-Änderung, in ein bis zwei PRs bündelbar. Reihenfolge wie im Dokument.

### A1 Startseite

| #    | Wunsch                                                                                                       | Fundstelle                                                                                                                           | Bewertung                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1.1 | Überschrift → „Sichtung von Meeressäugetieren melden" / „für die Forschung des Deutschen Meeresmuseums"      | `ModernReportForm.svelte:384-389`                                                                                                    | Sinnvoll. „Meeressäugetiere" ist präziser als das heutige „Meerestier". **Aber:** greift im Embed nicht (siehe Kurzfassung).                                                                                                            |
| A1.2 | Die vier Schritte umbenennen: Position & Zeitpunkt / Angaben zum Tier / Weitere Informationen / Kontaktdaten | `formConfig.ts:43-122` (Titel) + Kopfzeilen in `steps/Step*.svelte` + `FormHelp.svelte`                                              | Sinnvoll und konsistenter als heute („Position & Zeit", „Sichtungsdetails", „Beobachtungen", „Kontaktdaten"). Die Titel stehen an **drei** Stellen — alle drei mitziehen, sonst driften Stepper, Schrittkopf und Hilfetext auseinander. |
| A1.3 | „Schritt X von 4 …"-Badge löschen (alle vier Schritte)                                                       | `Step1LocationTime.svelte:20-24`, `Step2SightingDetails.svelte:20-24`, `Step3Observations.svelte:66-72`, `Step4Contact.svelte:46-52` | Uneingeschränkt sinnvoll: Der Fortschritt steht bereits im Stepper (Desktop) bzw. in der ortsfesten Leiste (Mobil, „Schritt X von Y"). Das Badge ist eine dritte Anzeige derselben Information.                                         |

### A2 Lebendes Tier — Position & Zeitpunkt

| #    | Wunsch                                                                             | Fundstelle                                                          | Bewertung                                                                                                                                                                                                                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2.1 | Einleitungstext „Wo und wann fand die Sichtung statt? …"                           | `Step1LocationTime.svelte:14-19`                                    | Sinnvoll. Deutlich kürzer als heute.                                                                                                                                                                                                                                                                                      |
| A2.2 | „Aktuellen Standort" prominenter darstellen                                        | `PositionPanel.svelte:507-525`                                      | Sinnvoll — der Button steht heute unter der Foto-Karte und dem Trenner. Umsetzung: Reihenfolge tauschen, Button auf `btn-primary`. **Achtung Design-Regel:** pro Bereich nur _eine_ Primäraktion — „Weiter" ist bereits primär. Empfehlung: `btn-outline` mit größerer Fläche + Icon, oder die Karte als Ganzes als Hero. |
| A2.3 | Koordinaten-Eingabe immer sichtbar statt aufklappbar, plus Hinweistext             | `PositionPanel.svelte:557-562` (`collapsibleCoordinates={true}`)    | Sinnvoll und trivial (Prop auf `false`). Der vorgeschlagene Satz ist gut.                                                                                                                                                                                                                                                 |
| A2.4 | Ortsbeschreibung als **ein** Freitextfeld                                          | `LocationDescription.svelte:633-634` (heute `waterway` + `seaMark`) | Sinnvoll für den **Lebendfund**. Beim Totfund würde ich das Seezeichen-/Orientierungspunkt-Feld eher behalten (Bergung) — das Museum wünscht dort ohnehin eine ausführlichere Beschreibung. Die DB-Spalte `seezeichen` bleibt in jedem Fall (Legacy-API).                                                                 |
| A2.5 | Ortsbeschreibung-Text anpassen („Nicht jede Sichtung lässt sich exakt verorten …") | `LocationDescription.svelte:627-631`                                | Sinnvoll, kürzer als heute.                                                                                                                                                                                                                                                                                               |

### A3 Lebendes Tier — Angaben zum Tier

| #    | Wunsch                                        | Fundstelle                                                                  | Bewertung                                                                                                                                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A3.1 | Einleitungstext „Was haben Sie beobachtet? …" | `Step2SightingDetails.svelte:16-20`                                         | Sinnvoll. **Aber:** Der Text sagt „wählen Sie ‚Unbekannt'" — diese Option gibt es nicht. Die Liste kennt „Unbekannte Walart" und „Unbekannte Robbenart" (`species.ts:35-38`). Formulierung anpassen.                                                                                                                                                                  |
| A3.2 | Anderes Icon statt Fisch bei der Artauswahl   | `sightingSchema.ts:395` (`icon: Fish`)                                      | Nachvollziehbar — ein Fisch ist bei Meeressäugern das falsche Signal. Lucide (das Projekt-Icon-Set) hat keine Robbe. `@iconify/json` ist installiert, andere Sets sind also verfügbar; das wäre eine bewusste Abweichung von der Icon-Regel (`design-system.md`). Alternativen ohne Set-Wechsel: `lucide:waves` oder `lucide:binoculars`. → Vorschlag zur Abstimmung. |
| A3.3 | „Delfin" statt „Delphin"                      | `species.ts:31`                                                             | Sinnvoll (heutige Rechtschreibung). **Wichtig:** Die Legacy-REST-API führt `"3": "Delphin (mehrere Arten)"` als Vertragskonstante (`docs/LEGACY_API_SPECIFICATION.md:199`, `kmlExport.ts:376`). Dort bleibt der Wortlaut unverändert.                                                                                                                                 |
| A3.4 | Bestimmungshilfe zunächst herausnehmen        | `FormHelp.svelte:139` (`<SpeciesIdentificationHelp />`)                     | Sinnvoll — deckt sich mit dem Fachreview vom 2026-07-27 (u. a. falsches Artfoto: Seelöwe statt Kegelrobbe). Empfehlung: **ausblenden, nicht löschen**, damit die überarbeitete Fassung ohne Neuaufbau zurückkommen kann.                                                                                                                                              |
| A3.5 | Anzahl Tiere darf nicht unter 1 sein          | `sightingSchema.ts:406` (`min(0)`)                                          | **Berechtigt und heute falsch.** Eine Sichtung mit 0 Tieren ist keine Sichtung. Fix: `min(1, …)` — **nur in `sightingSchema`**, nicht in der Legacy-API, wo `0` „Totfund" bedeutet (siehe 5a b).                                                                                                                                                                      |
| A3.6 | Jungtiere nicht größer als Anzahl Tiere       | `sightingSchema.ts:423-437`                                                 | **Berechtigt, fehlt heute komplett.** Umsetzung als Yup-`when`/`test` gegen `totalCount`. Achtung: Beide Felder sind bei > 15 gekappt („Bei mehr als 15 bitte 15 eintragen") — bei genau 15/15 muss die Regel weiter greifen.                                                                                                                                         |
| A3.7 | Bei „Entfernung zum Tier" den Tipp weglassen  | `sightingSchema.ts:600-601` („Größe einer Münze = 50m, Streichholz = 200m") | Sinnvoll. Der Tipp ist ohne Angabe des Armabstands tatsächlich mehrdeutig.                                                                                                                                                                                                                                                                                            |

### A4 Lebendes Tier — Weitere Informationen

| #    | Wunsch                                                  | Fundstelle                                              | Bewertung                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A4.1 | Einleitungstext                                         | `Step3Observations.svelte:59-63`                        | Der gewünschte Text ist bis auf zwei Wörter der heutige. Nur „Fotos/Videos" streichen (weil sie nach vorn wandern) und „Meerestiere" → „Meeressäuger".                                                                                                                                                                                                                   |
| A4.2 | „Verteilung der Tiere" entfällt                         | `OptionalSightingDetails.svelte:10`, `formConfig.ts:84` | **Rückfrage 4.** „Mutter mit Jungtier" ist die fachlich wertvollste Ausprägung und ergänzt „Davon Jungtiere" um die räumliche Beobachtung. Wenn das Feld raus soll: technisch trivial (Spalte `verteilung` bleibt, Server schreibt dann `UNKNOWN`).                                                                                                                      |
| A4.3 | „Anzahl anderer Schiffe" → Zusatz „in näherer Umgebung" | `sightingSchema.ts:927`                                 | Sinnvoll, reine Label-Ergänzung.                                                                                                                                                                                                                                                                                                                                         |
| A4.4 | „Sonstiges Verhalten" ans Ende der Auswahlliste         | `animalBehavior.ts:52-55`                               | Sinnvoll. Rein die Reihenfolge der Optionen — der gespeicherte Wert (`0`) bleibt gleich.                                                                                                                                                                                                                                                                                 |
| A4.5 | „Sonstige Auffälligkeiten" entfällt                     | `Behavior.svelte:29`, `formConfig.ts:87`                | Sinnvoll: das Feld überschneidet sich stark mit „Bemerkungen" auf Seite 4. Spalte `sonstige_auffaelligkeiten` bleibt.                                                                                                                                                                                                                                                    |
| A4.6 | Windrichtung entfällt                                   | `Environment.svelte:83`, `formConfig.ts:92`             | Sinnvoll — **und ohne Datenverlust**: Die Wetter-API füllt `windDirection` weiterhin automatisch (`Environment.svelte:26-33`), das Feld war ohnehin überwiegend API-befüllt.                                                                                                                                                                                             |
| A4.7 | „Sichtweite" → „Sichtbedingungen"                       | `sightingSchema.ts:744`                                 | Sinnvoll. Kleiner Widerspruch: Die Optionen sind Entfernungen („Klar (bis 20km)", „Nebel (bis 1km)"). Empfehlung: Label „Sichtbedingungen", Hilfetext „Wie weit konnten Sie sehen?" beibehalten — dann passt beides zusammen.                                                                                                                                            |
| A4.8 | Boot-/Schiffsinformationen von Seite 4 hierher          | `Step4Contact.svelte:132-147` → Seite 3                 | Sinnvoll (thematisch gehören sie zur Beobachtungssituation, nicht zur Person). Zu beachten: `shipName`, `homePort`, `boatType` sind Teil der dauerhaft gespeicherten Kontaktdaten (`formConfig.ts:27-41`) — die Funktion „Kontaktdaten löschen" auf Seite 4 löscht sie weiterhin mit, obwohl sie dann auf Seite 3 stehen. Das ist erklärungsbedürftig, aber kein Fehler. |

### A5 Kontaktdaten

| #    | Wunsch                                                                                   | Fundstelle                                                        | Bewertung                                                                                                                                                                                                                     |
| ---- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A5.1 | Adresse entfällt                                                                         | `Step4Contact.svelte:112-128`                                     | Sinnvoll — Straße/PLZ/Ort werden für Rückfragen nicht gebraucht, und weniger personenbezogene Daten sind datenschutzrechtlich immer die bessere Wahl. Schema und DB-Spalten bleiben (Legacy-API führt `strasse`/`plz`/`ort`). |
| A5.2 | Einleitungstext                                                                          | `Step4Contact.svelte:41-45`                                       | **Nicht in der vorgeschlagenen Form** — siehe Abschnitt 5.1.                                                                                                                                                                  |
| A5.3 | Texte so formulieren, dass sie für Sichtung und Fund passen („Meldung" statt „Sichtung") | quer durch Schritt 4, `SubmissionSuccess.svelte`, E-Mail-Vorlagen | Sinnvoll und die billigere Variante gegenüber zwei Textfassungen.                                                                                                                                                             |

---

## 2. Kategorie B — Mittelgroße Umstellungen

### B1 Hintergrund-Seite für die Erklärtexte

**Wunsch:** Die Texte aus „Hilfe & Tipps für eine wertvolle Sichtungsmeldung" (heute aufklappbar unter dem Formular, `FormHelp.svelte`) auf eine eigene Seite „Hintergrund" — erreichbar wie „Karte" oben rechts.

**Bewertung:** Fachlich richtig. Der Block ist heute 300 Zeilen lang, steht ganz unten und wird von den meisten nie geöffnet.

**Aufwand:** Neue Route `/hintergrund` + Navigationseintrag + Inhalte umziehen. Zu klären:

- Die Seite `/about` existiert bereits und enthält inhaltlich Verwandtes („Über Ostsee-Tiere", Mission). **Frage: neue Seite oder `/about` ausbauen und umbenennen?** (Rückfrage 3)
- Die Statistik-Kacheln im Hilfeblock ziehen ihre Zahlen live aus `/api/statistics` — die wandern mit.
- Der Navigationseintrag ist im iframe unsichtbar (siehe Kurzfassung). Ohne Lösung erreicht die Seite genau die Nutzergruppe nicht, für die sie gedacht ist.

### B2 Foto-Upload als erste Abfrage auf Seite 2

**Wunsch:** Fotos/Videos vor Tierinformation und Sichtungsdetails abfragen; auf Seite 3 entfallen sie.

**Bewertung:** Sinnvoll — wer ein Foto hat, lädt es als Erstes hoch, und das Foto stützt anschließend die Artangabe.

**Aufwand:** `Media`-Sektion von `Step3Observations.svelte` nach `Step2SightingDetails.svelte` verschieben, Feldliste in `formConfig.ts` umhängen (`mediaFile`, `mediaUpload`, `mediaConsent` von Schritt 3 nach Schritt 2). Die Schritt-Validierung und die Fehler-Navigation lesen dieselbe Liste, ziehen also automatisch mit.

**Konflikt, der dabei entsteht:** siehe Rückfrage 5 („Foto mit GPS entfällt").

### B3 Video-Upload ermöglichen

**Wunsch:** „Foto und Video hochladen ermöglichen (wenn das geht und GPS Info entnehmen)".

**Ist-Zustand — das geht heute nicht:** Für nicht angemeldete Melder erlaubt `uploadDefaults.ts` genau vier Bildformate (JPEG, PNG, GIF, WebP) bei **10 MB**. Videos sind zwar im System vorgesehen (`constants/upload.ts` kennt acht Videoformate, der Server akzeptiert sie), aber die öffentliche Konfiguration lässt sie nicht durch — und die beiden Werte müssen übereinstimmen, sonst nimmt das Formular eine Datei an, die der Server mit 413 ablehnt (durch `uploadLimitConsistency.test.ts` abgesichert).

**Aufwand:**

- Videoformate in die öffentliche Liste aufnehmen: klein.
- **Größenlimit:** 10 MB reicht für Video nicht. Ein 30-Sekunden-Handyvideo liegt bei 40–80 MB. Realistisch sind 100–200 MB — das betrifft Upload-Route, Speicherplatz und Proxy-Limits. → Rückfrage 6.
- **GPS aus Video: heute nicht implementiert.** Die EXIF-Auswertung ist bildbasiert. Videos tragen ihre Position in einem anderen Container-Feld (MP4/QuickTime-Atom). Das ist machbar, aber eigener Aufwand — nicht Teil dieses Wunschs im engeren Sinn.

### B4 Zwei getrennte Foto-Einwilligungen

**Wunsch:** Zwei Checkboxen — (1) Speicherung + interne wissenschaftliche Nutzung, (2) Verwendung in Veröffentlichungen.

**Ist-Zustand:** Es gibt **eine** Checkbox (`mediaConsent`, Veröffentlichung). Speicherung und fachliche Prüfung sind bewusst durch die Pflicht-Einwilligung `privacyConsent` gedeckt — das ist eine dokumentierte Entscheidung vom 2026-07-28 (`schema.ts:92-96`).

**Bewertung:** Der Wunsch ist verständlich, wirft aber eine Grundsatzfrage auf: **Wenn Checkbox 1 optional ist — was tun wir mit einem Foto, dessen Melder sie nicht setzt?** Löschen? Dann ist der Upload sinnlos. Behalten? Dann ist die Checkbox keine echte Einwilligung. → Rückfrage 7, gehört zusammen mit Maik geklärt.

**Aufwand bei „ja":** neue Spalte plus Zeitstempel und Textversion (Nachweispflicht Art. 7 Abs. 1 DSGVO — für `mediaConsent` gibt es das bereits als `medien_einwilligung_am`/`_version`), Migration, Anpassung von Formular, Admin-Ansicht, E-Mail und Export.

### B5 Zurück-Button auch oberhalb

**Ist-Zustand — teilweise schon da:**

- Ab 768px Breite ist der Stepper am Seitenkopf klickbar; bereits besuchte Schritte lassen sich direkt anspringen (`FormSteps.svelte:51-64`).
- Unterhalb 768px liegt die Navigation in einer **ortsfesten Leiste am unteren Rand** — „Zurück" ist dort immer sichtbar, ohne Scrollen (`app.css:461`).

**Bewertung:** Der eigentliche Bedarf ist vermutlich, dass der klickbare Stepper nicht als Navigation erkennbar ist. Empfehlung statt eines zweiten Buttons: den Stepper deutlicher als bedienbar auszeichnen. Ein zweiter „Zurück"-Button für dieselbe Aktion widerspricht der Button-Hierarchie im Design-System.

### B6–B8 Übriges

| #   | Wunsch                                                                                           | Bewertung                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B6  | Positionsangabe auf zwei Wege reduzieren (Standort / Karte), Foto-mit-GPS entfällt               | Mittel. Baut die heutige Hero-Karte zurück. → Rückfrage 5, weil sich der Wunsch mit B2 beißt.                                                                                                                                                                                                                                   |
| B7  | Sichtungsdetails: Land/Boot/Sonstiges, bei Boot „Motor an (ja/nein)" und „unter Segel (ja/nein)" | **Datenmodell-Eingriff.** → Abschnitt 5.4 und Rückfrage 8.                                                                                                                                                                                                                                                                      |
| B8  | „Wurde das Meeresmuseum bereits informiert?" mit drei Optionen (telefonisch / E-Mail / nein)     | Heute ein Ja-Nein-Feld (`deadPhoneContact` → Spalte `totfund_telefon`). Die Spalte ist ein `smallint`, kann also 0/1/2 tragen — die Erweiterung ist ohne Migration möglich. **Aber:** Die Legacy-API dokumentiert `totfund_telefon` als 0/1 (`legacy-api/types.ts:100`). Ein Wert `2` bräuchte dort eine bewusste Entscheidung. |

---

## 3. Kategorie C — Große Umbauten

### C1 Trennung Totfund / Lebendfund

**Wunsch:** Einstiegsseite mit zwei Schaltflächen („Beobachtung eines lebenden Tieres" / „Fund eines toten Tieres"), danach zwei unterschiedliche Formulare.

**Bewertung: fachlich klar richtig.** Heute ist der Totfund eine Checkbox mitten in Schritt 2, die nachträglich vier Zusatzfelder aufklappt — und danach durchläuft der Melder trotzdem Fragen zu Verhalten, Reaktion auf das Boot und Verteilung, die bei einem toten Tier sinnlos sind. Die Trennung entfernt genau diesen Unsinn.

**Was daran groß ist:**

1. **Einstiegsseite.** Neue Route, plus die Frage, was mit `/` passiert. Für den iframe auf meeresmuseum.de: Ändert sich die einzubettende URL? Wird die Einbettung höher? Bleiben Direktlinks auf das Formular gültig?
2. **Zwei Schrittkonfigurationen.** `formStepsConfig` ist heute _eine_ Liste, aus der die Schritt-Validierung (`stepValidation.ts`), die Fehler-Navigation (`findStepForErrors.ts`), die Zuordnung von Server-Feldfehlern (`serverFieldErrors.ts`) und beide Fortschrittsanzeigen ihre Wahrheit ziehen. Daraus werden zwei — jede dieser Stellen muss wissen, welche gerade gilt.
3. **Wiederherstellung angefangener Meldungen.** Das Formular speichert Eingaben und den aktuellen Schritt im Browser (`localStorage.ts`). Der Meldungstyp muss mitgespeichert werden, sonst landet jemand nach dem Neuladen im falschen Formular. Und: Was passiert, wenn jemand nachträglich den Typ wechselt?
4. **Bedingte Pflichtfelder umbauen.** Heute hängen `deadCondition` und `deadSex` an `isDead` (`sightingSchema.ts:457-503`). Wird `isDead` nicht mehr gefragt, sondern durch die Einstiegswahl gesetzt, müssen diese Bedingungen daran hängen.
5. **Folgewirkungen.** Admin-Ansicht, Bestätigungs-E-Mail, `SubmissionSuccess`, E2E-Tests. Die Sektionen werden vom Admin-Formular mitbenutzt.

**Aufwandsschätzung:** Das ist kein einzelner PR. Realistisch drei Schritte:

1. Schrittkonfiguration mehrfähig machen (ohne sichtbare Änderung),
2. Einstiegsseite + Weiche + Totfund-Variante,
3. Texte und Detailfelder je Variante.

### C2–C5 Totfund-spezifische Inhalte

Alle abhängig von C1, danach jeweils klein bis mittel:

| #   | Wunsch                                                                                                                       | Bewertung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C2  | Eigene Texte für Position/Tier/Fund, „Funddatum" statt „Sichtungsdatum"                                                      | Sinnvoll, reine Texte — sobald es zwei Formulare gibt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| C3  | Ostsee-Hinweis umdrehen: Totfunde liegen meist an Land; bei Marker im Wasser nachfragen, plus „Im Wasser treibend / liegend" | **Berechtigt, aber die Lage ist besser als gedacht.** Die Ostsee-Geometrie wurde mit PR #647 bereinigt: Bodden, Förden, Strelasund und Eckernförder Bucht liegen jetzt **innerhalb**, dazu kommt ein **200-m-Uferstreifen genau für Strandfunde** (`balticGeometry.test.ts`, alle 20 Prüfpunkte grün). Der Hinweis feuert also nicht mehr bei jedem Strandfund, sondern erst weiter landeinwärts — etwa an einer Düne, einem Parkplatz oder wenn die Position ungenau gesetzt wurde. Der Wunsch bleibt sinnvoll (die Formulierung passt fachlich nicht zum Totfund), aber er behebt kein systematisches Problem mehr. Zwei zusätzliche Ankreuzfelder („treibend"/„liegend") wären **neue Datenfelder** — dafür gibt es heute keine Spalte. → Rückfrage 9. |
| C4  | Funddetails: Zustand, Körperlänge; **Geschlecht entfällt**                                                                   | **Achtung, technischer Blocker:** `deadSex` ist heute _Pflichtfeld_, sobald `isDead` gesetzt ist (`sightingSchema.ts:483-495`). Wird das Feld ohne Schema-Anpassung aus dem Formular genommen, lässt sich keine Totfund-Meldung mehr absenden. Muss zwingend mitgemacht werden. Fachlich ist der Wunsch nachvollziehbar — Laien können das Geschlecht am Strand kaum bestimmen, das Feld liefert überwiegend „Unbekannt".                                                                                                                                                                                                                                                                                                                                 |
| C5  | Ausführlichere Ortsbeschreibung „wichtig zur Bergung von Totfunden"                                                          | Sinnvoll und ein starkes Argument, beim Totfund **nicht** auf ein einzelnes Feld zu reduzieren (vgl. A2.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

---

## 4. Was ich nicht bzw. anders umsetzen würde

1. **„Ihre persönlichen Daten … nie öffentlich angezeigt!"** — sachlich falsch, siehe 5.1. Muss neu formuliert werden.
2. **Zweiter „Zurück"-Button** — der Bedarf ist real, ein zweiter Button ist die falsche Antwort (siehe B5).
3. **„Verteilung der Tiere" ersatzlos streichen** — bitte vorher gegenrechnen, was dabei verloren geht (Rückfrage 4).
4. **„Fähre" aus den Beobachtungsorten entfernen** — die vorgeschlagene Struktur Land/Boot/Sonstiges lässt sie stillschweigend wegfallen (siehe 5.4).
5. **Bestimmungshilfe löschen** — ausblenden statt löschen, sie soll ja zurückkommen.

---

## 5. Inkonsistenzen in den vorgeschlagenen Texten

### 5.1 „Ihre persönlichen Daten … nicht mit Dritten geteilt und nie öffentlich angezeigt!"

Der Satz enthält drei Zusagen. **Mindestens eine ist nachweislich falsch, die beiden anderen sind nicht in dieser Absolutheit haltbar.**

**a) „nie öffentlich angezeigt" — falsch.**

Direkt unter diesem Satz stehen im selben Schritt zwei Ankreuzfelder, deren Text das Gegenteil sagt:

> „Ich stimme zu, dass mein Name (Vor- und Nachname) **öffentlich auf der Karte angezeigt** wird und in Berichten genannt werden darf." (`sightingSchema.ts:1155-1156`)

Und das ist keine leere Ankündigung — es passiert tatsächlich:

- `/api/map/sightings` liefert Vor- und Nachnamen aus, sobald `nameConsent` gesetzt ist (`mapUtils.ts:164-165`).
- Die Kartensuche durchsucht diese Namen (`api/map/sightings/+server.ts:47-52`).
- CSV-, XML- und KML-Export tragen den Namen ebenfalls (`csvExport.ts:110`, `xmlExport.ts:259`, `kmlExport.ts:227-231`).

Dasselbe gilt für den Schiffsnamen. **Dieser Widerspruch steht bereits heute so im Formular** — der neue Vorschlag verschärft ihn nur, weil er noch bestimmter formuliert ist.

**b) „nur auf Servern des Deutschen Meeresmuseums gespeichert" — kommt auf den Betrieb an.**

Die Anwendung kann Mediendateien wahlweise lokal oder bei einem Cloud-Anbieter ablegen (`STORAGE_PROVIDER`, `storage/factory.ts`). Im Docker-Betrieb ist die Voreinstellung lokal. Ob der Server dem Museum gehört, ist eine Hosting-Frage, die ich hier nicht beantworten kann. Zusätzlich sind unabhängig davon beteiligt: der E-Mail-Versand (SMTP-Dienstleister), die Admin-Anmeldung (Auth0) und der Wetterdienst Open-Meteo, an den — serverseitig — Koordinaten und Datum gehen (keine personenbezogenen Daten).

**c) „nicht mit Dritten geteilt" — für die Kontaktdaten vermutlich richtig, für die Meldung nicht.**

An anderer Stelle im Formular steht ausdrücklich:

> „Das Deutsche Meeresmuseum gibt die Sichtungsdaten direkt an die internationalen Gremien für den Schutz der Ostsee-Schweinswale weiter (HELCOM und ASCOBANS)." (`sightingSchema.ts:1178-1179`)

Der Satz muss also mindestens auf die **Kontaktdaten** eingegrenzt werden.

**Formulierungsvorschlag (zur Abstimmung mit Maik):**

> **Datenschutz:** Ihre Kontaktdaten verwenden wir ausschließlich für Rückfragen zu Ihrer Meldung und geben sie nicht an Dritte weiter. Öffentlich sichtbar werden nur die Sichtungsdaten selbst — Datum, Position, Tierart und Anzahl. Ihr Name erscheint nur, wenn Sie das unten ausdrücklich erlauben.

Das ist prüfbar wahr, erklärt die beiden Ankreuzfelder darunter statt ihnen zu widersprechen, und bleibt kurz.

### 5.2 „Bei Unsicherheit wählen Sie ‚Unbekannt'"

Steht so in den Vorschlägen für Seite 2 (lebend **und** tot). Die Auswahlliste kennt kein „Unbekannt", sondern „Unbekannte Walart" und „Unbekannte Robbenart" — die Unterscheidung ist gewollt und fachlich relevant. Vorschlag: _„Bei Unsicherheit wählen Sie ‚Unbekannte Walart' bzw. ‚Unbekannte Robbenart'"_.

### 5.3 „Sichtweite" → „Sichtbedingungen" bei unveränderten Optionen

Die Auswahl enthält Entfernungsangaben. Siehe A4.7.

### 5.4 „Motor an (ja/nein)" und „unter Segel (ja/nein)" bilden das heutige Modell nicht ab

Heute zwei getrennte Angaben:

- **Von wo:** Sonstiges / Segelschiff / Motorboot / **Land** / **Fähre**
- **Antrieb** (nur bei Segelschiff/Motorboot): Sonstiger / Motor / Segel / **Treibend** / **Vor Anker**

Zwei Ja/Nein-Fragen können daraus drei Dinge nicht mehr ausdrücken:

1. **„Treibend" und „Vor Anker" fallen zusammen** — beide wären „Motor: nein / Segel: nein". Für die Einordnung von Unterwasserlärm ist das ein Unterschied (ein ankerndes Boot liegt fest, ein treibendes bewegt sich mit der Strömung).
2. **„Fähre" verschwindet** — Fähren sind eine eigene Meldergruppe mit regelmäßigen Linien und hohem Beobachtungsaufwand; die Angabe trägt Information, die „Boot" nicht trägt.
3. **Zwei unabhängige Ja/Nein-Felder brauchen zwei neue DB-Spalten**, während die heutige Antriebsangabe eine einzige ist.

**Gegenvorschlag ohne Datenverlust:** Erste Frage wie gewünscht „Land / Boot / Sonstiges". Bei „Boot" dann zwei Folgefragen: **Art des Bootes** (Segelboot / Motorboot / Fähre / Sonstiges) und **Antrieb während der Sichtung** (Motor / Segel / Treibend / Vor Anker). Das ist für den Melder genauso einfach, ergibt aber dieselben Daten wie heute.

### 5.5 „Foto mit GPS entfällt" vs. „Foto hochladen … und GPS Info entnehmen"

Die Wünsche auf Seite 1 und Seite 2 widersprechen sich. Auflösung siehe Rückfrage 5.

### 5.6 Totfund, Seite 3 enthält nur noch eine Frage

Nach dem Vorschlag bleibt für den Totfund auf Seite 3 einzig „Wurde das Meeresmuseum bereits informiert?". Ein eigener Schritt für eine Frage wirkt umständlich. Vorschlag: beim Totfund drei statt vier Schritte, die Frage wandert ans Ende von „Angaben zum Tier".

---

## 5a. Verträglichkeit mit der Legacy-API (Mobile App)

**Kurzantwort: Die Formularänderungen berühren die Legacy-API nicht.** Der Grund ist struktureller Art und wurde für diese Analyse verifiziert:

Der Legacy-Schreibpfad (`POST /rest_sichtungen`) validiert mit einem **eigenen** Yup-Schema (`legacy-api/yup-validation.ts` → `legacyApiSchema`) und schreibt über `mapLegacyToCurrentSchema` direkt in die Datenbank. Er benutzt `sightingSchema` — also das Schema des Web-Formulars — an **keiner** Stelle. Änderungen an Labels, Hilfetexten, Pflichtfeldern oder Validierungsgrenzen des Formulars laufen daher an der App vorbei.

Vier Stellen, an denen man das trotzdem kaputt machen könnte:

### a) Artbezeichnungen („Delfin" statt „Delphin")

Die Legacy-API führt ihre Artenliste als eigene Konstante — `"3": "Delphin (mehrere Arten)"` (`docs/LEGACY_API_SPECIFICATION.md:199`, gespiegelt in `kmlExport.ts:376`). **Diese Strings bleiben unverändert.** Umbenannt wird nur `speciesLabels` in `formOptions/species.ts`, das ausschließlich die Formularauswahl speist. Der gespeicherte Zahlenwert (`3`) ist ohnehin identisch.

### b) „Anzahl Tiere mindestens 1" — hier steckt eine Falle

In der Legacy-API ist **`anzahl_gesamt = 0` eine tragende Bedeutung: es kennzeichnet einen Totfund** (`LEGACY_API_SPECIFICATION.md:29`, `field-mapping.ts:152`, `validation.ts`). Der alte iOS-Client meldet Totfunde ausschließlich auf diesem Weg.

Konsequenz:

- Die Untergrenze `min(1)` gehört **nur** in `sightingSchema` (Web-Formular). `legacyApiSchema.anzahl_gesamt` behält `min(0)`. Die beiden Schemata sind unabhängig, das ist ohne Zusatzaufwand möglich.
- Beim späteren Umbau auf zwei Formulare (C1) darf die Konvention „0 = Totfund" **nicht** in den Web-Pfad zurückkommen: Der Totfund entsteht dort aus der Einstiegswahl und schreibt `totfund = 1` bei einer Anzahl ≥ 1. Beide Wege sind seit PR #651 gleichberechtigt (`field-mapping.ts:147-152`), der neue iOS-Client nutzt bereits `totfund: 1` zusammen mit `anzahl_gesamt > 0`.
- Der Bestand enthält Zeilen mit `anzahl_gesamt = 0`. Die bleiben gültig und werden weiter ausgeliefert.

### c) Aus dem Formular entfernte Felder

Verteilung, Windrichtung, Sonstige Auffälligkeiten, Adresse, Geschlecht bei Totfund: Alle behalten Schema-Eintrag und DB-Spalte, sie verschwinden nur aus der Anzeige. Die Legacy-API nimmt sie unverändert entgegen (`verteilung`, `windrichtung`, `sonstige_auffaelligkeiten`, `strasse`/`plz`/`ort`, `totfund_geschlecht`) und `showreports.json` liefert sie unverändert aus. **Kein Feld darf dabei aus `sightingSchema` gelöscht werden** — nur aus `formStepsConfig` und dem Markup.

### d) „Wurde das Museum informiert?" mit drei Antworten (B8)

Das ist der **einzige** Punkt der ganzen Liste mit echtem Konfliktpotenzial. Die Spalte `totfund_telefon` ist ein `smallint` und könnte 0/1/2 tragen — aber:

- Die Legacy-Spezifikation dokumentiert `totfund_telefon` als 0/1 (`legacy-api/types.ts:100`).
- `isLegacyFlagSet` wertet **ausschließlich `=== 1`** als „ja" (`field-mapping.ts:39-41`). Eine 2 aus dem Web-Formular wäre für den Legacy-Lesepfad damit „nein".
- Entwarnung beim Ausliefern: `showreports.json` gibt das Feld gar nicht aus — ein Wert 2 in der Datenbank erreicht die App also nie.

Empfehlung: Werte so belegen, dass 1 weiterhin „ja, telefonisch" heißt (0 = nein, 1 = telefonisch, 2 = per E-Mail). Dann bleibt jeder Altdatensatz und jede App-Meldung korrekt interpretiert, und nur der neue dritte Zustand ist zusätzlich.

### Was die Legacy-API **nicht** absichert

Der Vollständigkeit halber: Die Endpunkte sind laut `CLAUDE.md` seit dem 2026-07-28 **nicht in Betrieb**. Eine Abweichung bricht heute also nichts Laufendes — sie entwertet aber den Vertrag, sobald Clients angebunden werden. Die Regeln oben gelten deshalb unverändert.

---

## 6. Fragen an das Museum

1. **Überschrift im Embed:** Die neue Überschrift „Sichtung von Meeressäugetieren melden" wird auf meeresmuseum.de derzeit _nicht_ angezeigt, weil die Seite dort im iframe läuft und der Titel dann bewusst unterdrückt wird (die umgebende Museumsseite bringt ihre eigene Überschrift mit). Soll das so bleiben, oder soll die Überschrift künftig auch im eingebetteten Formular erscheinen?

2. **Erreichbarkeit der Hintergrund-Seite:** Die Navigation („Meldung", „Karte") ist im eingebetteten Zustand ausgeblendet. Wie sollen eingebettete Nutzer die Hintergrund-Seite erreichen — über einen Link **innerhalb** des Formulars, oder nimmt das Museum die Seite in seine eigene Website-Navigation auf?

3. **`/about` oder neue Seite?** Es gibt bereits eine Seite „Über uns" mit verwandtem Inhalt. Soll „Hintergrund" eine zusätzliche dritte Seite werden, oder sollen beide Inhalte auf einer Seite zusammengeführt werden?

4. **Verteilung der Tiere:** Die Option „Mutter mit Jungtier" ist der wissenschaftlich aussagekräftigste Wert dieses Feldes. Soll das Feld wirklich vollständig entfallen, oder genügt es, es auf „Einzeln / Mutter mit Jungtier / Gruppe" zu verkürzen?

5. **Foto mit GPS:** Auf Seite 1 soll die Foto-Option entfallen, auf Seite 2 sollen Fotos zuerst abgefragt und „GPS-Info entnommen" werden. Ist gemeint: _Die Position wird nicht mehr über ein Foto abgefragt, aber wenn ein auf Seite 2 hochgeladenes Foto GPS-Daten enthält, übernehmen wir sie (mit Rückfrage) für die Position?_ Das wäre technisch gut machbar und würde beide Wünsche erfüllen.

6. **Videogröße:** Videos brauchen deutlich mehr als das heutige Limit von 10 MB — realistisch 100–200 MB pro Datei. Ist das aus Sicht des Museums gewollt (Speicherplatz, Sichtungsprüfung)? Und: Sollen Videos auch dann angenommen werden, wenn wir daraus (zunächst) keine GPS-Daten auslesen können?

7. **Zwei Foto-Einwilligungen:** Wenn jemand nur die Veröffentlichung ablehnt, ist das klar. Was soll passieren, wenn jemand **auch die interne Nutzung** nicht ankreuzt — soll das Foto dann gar nicht erst gespeichert bzw. wieder gelöscht werden? (Frage bitte mit Maik zusammen, sie entscheidet über die technische Umsetzung.)

8. **Boot-Angaben:** Sind „Fähre" als Beobachtungsort und die Unterscheidung „treibend" / „vor Anker" verzichtbar? Wenn nicht, siehe den Gegenvorschlag in 5.4.

9. **„Im Wasser treibend / liegend":** Sollen diese beiden Angaben dauerhaft gespeichert werden (dann brauchen sie ein neues Datenfeld), oder sind sie nur eine Rückfrage zur Bestätigung der Position, deren Antwort nicht erhalten bleiben muss?

10. **Datenschutztext:** Bitte den Formulierungsvorschlag aus 5.1 gegenlesen — die bisherige Zusage „nie öffentlich angezeigt" widerspricht den Einwilligungen zur Namensnennung, die direkt darunter stehen.

---

## 7. Vorschlag für die Reihenfolge

| Schritt | Inhalt                                                        | Warum zuerst                                                                         |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **1**   | Alle Quick Wins aus Kategorie A **außer** dem Datenschutztext | Sofort sichtbarer Fortschritt, kein Risiko, keine Rückfrage nötig. Ein bis zwei PRs. |
| **2**   | Datenschutztext (A5.2) nach Rückmeldung zu Frage 10           | Hängt an einer inhaltlichen Freigabe, nicht an Technik.                              |
| **3**   | Foto-Upload nach vorn (B2) + Hintergrund-Seite (B1)           | Unabhängig voneinander, beide ohne Datenmodell-Eingriff.                             |
| **4**   | Video-Upload (B3) und zweite Einwilligung (B4)                | Brauchen Antworten auf die Fragen 6 und 7.                                           |
| **5**   | Trennung Tot-/Lebendfund (C1–C5)                              | Größter Brocken, sollte auf einem aufgeräumten Formular aufsetzen.                   |
| **6**   | Boot-Angaben umbauen (B7)                                     | Nur falls nach Frage 8 gewünscht; berührt das Datenmodell und die Legacy-API.        |

**Erledigt, nicht mehr offen:** Die Ostsee-Geometrie ist mit PR #647 bereinigt — Bodden, Förden und ein 200-m-Uferstreifen für Strandfunde sind eingeschlossen, die Binnenwasser-Artefakte (Ladoga, Onega, Weichsel) draußen. Der Ostsee-Hinweis erscheint bei Küstenpositionen also nicht mehr systematisch zu Unrecht. Wunsch C3 bleibt trotzdem sinnvoll, aber als reine Textfrage.
