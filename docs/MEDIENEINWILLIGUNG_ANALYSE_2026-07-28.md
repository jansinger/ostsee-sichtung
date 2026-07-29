# Einwilligung zur Mediennutzung — Analyse und Lösungsoptionen

**Stand:** 2026-07-28
**Status:** Analyse, keine Implementierung
**Betrifft:** Sichtungsformular, Datei-Upload, `sichtungen_files`

---

## 1. Kurzfassung

Das Formular holt für hochgeladene Fotos und Videos **keine belastbare
Einwilligung** ein. Drei Dinge greifen ineinander:

1. Die **Pflicht-Einwilligung** (`privacyConsent`) zählt die abgedeckten Daten
   abschließend auf und **nennt Medien nicht**.
2. Die **optionale Medien-Einwilligung** (`mediaConsent`) wird zwar abgefragt,
   aber **nirgends gespeichert** — der Wert wird beim Absenden verworfen.
3. Die Datei liegt **schon vor der Abfrage** auf dem Server, weil der Upload in
   Schritt 1 sofort ausgeführt wird.

Befund 2 ist neu und wiegt am schwersten: Selbst wenn eine Nutzerin zustimmt,
kann das Museum diese Zustimmung weder nachweisen (Art. 7 Abs. 1 DSGVO) noch im
Betrieb auswerten — es gibt keine Spalte, in der stünde, welches Foto verwendet
werden darf und welches nicht.

Die externe Datenschutzerklärung schließt die Lücke **nicht**: Sie hat einen
Abschnitt „Sichtungsmeldungen", nennt aber Foto-/Video-Uploads, EXIF-Auswertung
und Veröffentlichung von Nutzerbildern nicht — und delegiert den Umfang der
Einwilligung ausdrücklich an das Formular. Damit ist der Formulartext das
maßgebliche Dokument, und dieser Text deckt Medien nicht ab.

---

## 2. Verifizierter Ist-Zustand

### B1 — `privacyConsent` nennt Medien nicht

`src/lib/form/validation/sightingSchema.ts:1182`

> „Ich stimme zu, dass meine Sichtungsdaten (Datum, Position, Tierart, Anzahl)
> öffentlich auf der Karte angezeigt und wissenschaftlich ausgewertet werden.
> Meine Kontaktdaten werden nur für Rückfragen verwendet."

Die Klammer wirkt abschließend. Fotos und Videos kommen nicht vor.

### B2 — `mediaConsent` bündelt zwei Zwecke und ist optional

`src/lib/form/validation/sightingSchema.ts:850` — `.default(false)`, kein
`.required()`. Der `valueText` nennt „wissenschaftliche Auswertung **und** die
Öffentlichkeitsarbeit des Meeresmuseums" in **einer** Checkbox. Das sind zwei
verschiedene Zwecke mit sehr unterschiedlicher Eingriffstiefe (interne
Artbestimmung vs. Verwendung in Museumskommunikation).

### B3 — `mediaConsent` wird nie persistiert _(neu)_

`src/lib/server/db/mapFormToSighting.ts:167–171` bildet ab:
`shipNameConsent`, `nameConsent`, `privacyConsent` — **`mediaConsent` fehlt**.

`src/lib/server/db/schema.ts` hat entsprechend keine Spalte: vorhanden sind
`namensnennung`, `schiffnamensnennung`, `datenschutz_einverstaendnis`; nichts für
Medien.

Konsequenz: Der Haken ist derzeit **funktionslos**. Er beeinflusst weder
Speicherung noch Auslieferung noch Admin-Ansicht.

### B4 — Upload passiert sofort, in Schritt 1

`DropzoneEnhanced.handleFilesAdded` → `MediaFile.createMediaFile`
(`src/lib/utils/media/MediaFile.ts:41`) → `uploadFileDirect` →
`POST /api/files/upload`. Der Endpunkt schreibt die Datei in den Storage **und**
legt sofort eine Zeile in `sichtungen_files` an
(`saveUploadedFile`, `src/lib/server/db/sightingFilesRepository.ts:18`) — mit
`sightingId = null`.

Die Dropzone in `form/position/PositionPanel.svelte` (Schritt 1; bis #590 in
`sections/PositionAndTime.svelte`) und die in `sections/Media.svelte` (Schritt 3)
schreiben beide in dasselbe `$form.uploadedFiles`. `mediaConsent` wird erst in
Schritt 3 gezeigt.

### B5 — EXIF-Auswertung braucht den Upload gar nicht _(neu, entscheidend)_

Die GPS- und Zeitstempel-Extraktion läuft **im Browser** über `exifr`:
`analyzeClientFile` in `src/lib/utils/client/fileAnalysis.ts:71–74`, aufgerufen
in `MediaFile.createMediaFile:42`. Auch das Vorschaubild entsteht clientseitig.
Der Server-EXIF-Pfad (`readImageExifData` im Upload-Endpunkt) ist nur Fallback:
`mediaFile.exifData = mediaFile.exifData ?? fileInfo.exifData`
(`MediaFile.ts:54`).

**Das Positions-Feature funktioniert vollständig ohne Serverkontakt.** Der
sofortige Upload in Schritt 1 ist eine Bequemlichkeits-Entscheidung, keine
technische Notwendigkeit.

### B6 — Verwaiste Dateien werden nie aufgeräumt _(neu)_

Bricht jemand das Formular nach Schritt 1 ab, bleibt die Zeile in
`sichtungen_files` mit `sightingId = null` und die Datei im Storage — dauerhaft.
Eine Suche nach Cleanup-/Orphan-Logik in `src/` und `scripts/` ergibt nichts.
Löschung passiert nur bei aktiver Nutzeraktion (`handleFileRemoved`,
`handleClear`).

Das ist personenbezogenes Material (Foto mit GPS-Position) ohne
Einwilligungsnachweis, ohne Zweckbindung und ohne Bezug zu einer Person, über
den ein Auskunfts- oder Löschbegehren erfüllbar wäre.

### B7 — Storage schreibt öffentlich

`src/lib/server/storage/vercel-blob.ts:136`: `access: 'public'`. Die
Blob-URL ist nicht erratbar, aber ohne Authentifizierung abrufbar, und sie wird
in `sichtungen_files.url` gespeichert.

Der abgesicherte Weg `/api/media/[...path]` prüft korrekt (`innerJoin` auf
`sichtungen`, dadurch 404 für Dateien ohne Sichtung; öffentlicher Zugriff erst
ab `freigegeben_am`) — er schützt aber nur den eigenen Pfad, nicht die
Blob-URL daneben.

### B8 — Legacy-API behauptet Zustimmung

`src/lib/legacy-api/field-mapping.ts:106`: `mediaConsent: true // Legacy API
users consent to media handling`. Heute folgenlos, weil das Feld ohnehin
verworfen wird. Sobald `mediaConsent` persistiert wird, entsteht daraus ein
falscher Einwilligungsnachweis. Muss in jeder Lösungsvariante mit angefasst
werden.

### B9 — Öffentliche Anzeige von Medien ist heute nicht gebaut

`MediaGallery` wird nur in `AdminSightingView.svelte` verwendet; die
Kartenpopups zeigen keine Fotos. Die Berechtigung dafür ist im Media-Endpunkt
aber bereits angelegt (öffentlich ab Freigabe). Der Zustand ist also: _Fähigkeit
vorhanden, Oberfläche fehlt_ — was die Einwilligungsfrage vorwegzuklären lohnt,
bevor jemand die Galerie ins Frontend zieht.

---

## 3. Die externe Datenschutzerklärung — Prüfergebnis

Geprüft: <https://www.deutsches-meeresmuseum.de/datenschutz> (Abruf 2026-07-28),
verlinkt in `src/routes/about/+page.svelte:247`.

**Vorhanden:** ein Abschnitt „Sichtungsmeldungen". Rechtsgrundlage Einwilligung
(Art. 6 Abs. 1 lit. a DSGVO). Zwecke: „Bereitstellung der Sichtungsinformationen
im Internet" und Rückfragen durch Wissenschaftler des Museums. Erwähnt wird
außerdem die App „OstSeeTiere".

**Nicht vorhanden:**

- kein Wort zu hochgeladenen Fotos oder Videos,
- nichts zur Auswertung von EXIF-/Standortdaten aus Bildern,
- kein Abschnitt zu Bildrechten, Öffentlichkeitsarbeit oder Social Media,
- keine Speicherdauer.

**Der Knackpunkt:** Die Erklärung legt den Umfang der Einwilligung nicht selbst
fest, sondern verweist darauf, dass die Nutzerin ihn _im Formular_ erklärt.
Damit ist der Formulartext die operative Einwilligungserklärung — und genau
dieser Text nennt Medien nicht (B1), während der Text, der sie nennt, optional
ist und weggeworfen wird (B2, B3).

Es ist also **beides**: eine widersprüchliche Formulierung im Formular _und_ —
weil die externe Erklärung nicht auffängt, was das Formular auslässt — eine
Lücke in der dokumentierten Rechtsgrundlage für die Medienverarbeitung. Die
abschließende rechtliche Bewertung steht dem Museum zu (siehe Abschnitt 6).

---

## 4. Was eigentlich auseinanderzuhalten ist

Der Kern des Problems ist, dass „Medieneinwilligung" heute vier Vorgänge in
einen Haken presst. Jeder hat eine andere Eingriffstiefe:

| #   | Vorgang                                               | Heute                                           | Braucht plausibel                                          |
| --- | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| V1  | EXIF im Browser lesen, um Position/Zeit vorzuschlagen | clientseitig, Datei verlässt das Gerät nicht    | nichts Zusätzliches — kein Serverkontakt (B5)              |
| V2  | Datei auf den Server übertragen und dort ablegen      | sofort, ungefragt (B4)                          | mindestens Transparenz, je nach Bewertung eigene Grundlage |
| V3  | Foto zur fachlichen Prüfung/Artbestimmung ansehen     | Admin-Ansicht                                   | ist das der Kernzweck der Meldung? → Museumsentscheidung   |
| V4  | Foto veröffentlichen (Karte, Öffentlichkeitsarbeit)   | technisch möglich ab Freigabe (B7/B9), UI fehlt | eigene, getrennte, nachweisbare Einwilligung               |

Die heutige Checkbox bündelt V3 und V4 und ignoriert V2. Jede Lösung sollte
diese Ebenen trennen — sonst verschiebt man das Problem nur.

---

## 5. Lösungsoptionen

Zwei unabhängige Achsen. Sie lassen sich frei kombinieren.

### Achse A — Zeitpunkt: wann wird eingewilligt, relativ zum Upload

#### A1 — Einwilligungs-Gate vor dem Upload

Dropzone in Schritt 1 bleibt gesperrt, bis eine Checkbox direkt darüber gesetzt
ist. Erst dann nimmt sie Dateien an.

- **Pro:** kleinster Eingriff; Reihenfolge wird formal korrekt; Upload-Verhalten
  bleibt unverändert.
- **Contra:** setzt der geplanten Aufwertung des Foto-Wegs (Befund 4 der
  Vorab-Analyse) ausgerechnet eine Hürde vor die prominenteste Aktion. Wer die
  Hürde nimmt, hat noch nichts gesehen — die Einwilligung steht _vor_ dem
  Nutzen, was Zustimmungsraten drückt und die Freiwilligkeit eher schwächt als
  stärkt.
- **Aufwand:** klein.

#### A2 — Upload verzögern bis zum Absenden ⭐

Datei bleibt im Browser. EXIF/GPS/Vorschau laufen wie heute clientseitig (B5).
Hochgeladen wird erst beim Absenden, gemeinsam mit der Sichtung — zu einem
Zeitpunkt, an dem die Einwilligung vorliegt.

- **Pro:** löst das Zeitproblem an der Wurzel statt es zu verwalten. Ohne
  Absenden liegt nie eine fremde Datei auf dem Server — Befund B6 (Verwaiste)
  und ein guter Teil von B7 (öffentliche Blob-URL für Unbeteiligte) entfallen
  ersatzlos. Datenminimierung nach Art. 5 Abs. 1 lit. c wird eingehalten,
  nicht nur behauptet. Der Foto-Weg in Schritt 1 bleibt hürdenlos.
- **Contra:** Der Upload wandert in den Absende-Vorgang — bei Mobilfunk an Deck
  dauert der spürbar länger und kann scheitern, nachdem der Nutzer „Absenden"
  gedrückt hat. Braucht Fortschrittsanzeige und einen belastbaren
  Wiederholungs-Pfad.
  Zweiter Punkt: Ein Reload mitten im Formular verliert die Datei — ein `File`
  ist nicht nach `localStorage` persistierbar, während `$form.uploadedFiles`
  heute einen Reload übersteht. Abmilderung: Datei-Handles in IndexedDB halten,
  oder den Verlust bewusst in Kauf nehmen und beim Wiederherstellen sichtbar
  vermerken.
- **Aufwand:** mittel. `MediaFile` trennt Upload- und Metadaten-Promise bereits
  sauber (`MediaFile.ts:35–56`), der Schnitt liegt also günstig. Betroffen sind
  `DropzoneEnhanced`, `ModernReportForm.onSubmit` und die Zuordnung
  `referenceId → sightingId`.

#### A3 — `mediaConsent` nach Schritt 1 ziehen

Checkbox direkt an die Dropzone in Schritt 1, Upload bleibt sofort.

- **Pro:** klein; die Frage steht dort, wo die Entscheidung fällt.
- **Contra:** Löst die Reihenfolge nur, wenn die Checkbox auch _sperrt_ — dann
  ist es A1. Sperrt sie nicht, liegt die Datei weiterhin vor der Zustimmung auf
  dem Server. Zusätzlich: Schritt-3-Uploads bräuchten die Checkbox weiterhin,
  sonst ist sie je nach Pfad mal da, mal nicht.
- **Aufwand:** klein. **Als alleinige Maßnahme unzureichend.**

#### A4 — Vorläufiger Upload mit eigener Grundlage und kurzer Frist

Upload bleibt sofort, wird aber ausdrücklich als _vorläufige_ Verarbeitung zur
Bereitstellung der Funktion deklariert (Hinweis an der Dropzone, Abschnitt in
der Datenschutzerklärung). Ohne abgesendete Sichtung und ohne Einwilligung wird
die Datei nach einer festen Frist (z. B. 24 h) automatisch gelöscht.

- **Pro:** behält die heutige UX vollständig; räumt B6 auf; ehrlicher als der
  Status quo.
- **Contra:** braucht eine Rechtsgrundlage für die Zwischenspeicherung, die
  heute weder im Formular noch in der Erklärung steht — also genau die
  Museumsentscheidung, die man umgehen wollte. Zusätzlich neue Betriebsteile:
  Cleanup-Job, Monitoring, Frist-Dokumentation.
- **Aufwand:** mittel bis hoch.

> Unabhängig von der Wahl: Ein Cleanup für verwaiste Dateien (B6) wird gebraucht,
> solange sofortige Uploads irgendwo bestehen bleiben. Bei A2 entfällt er für den
> Normalfall, bleibt aber als Aufräumer für Altbestand sinnvoll.

### Achse B — Inhalt: wozu wird eingewilligt, und wo steht das

#### B-I — `mediaConsent` persistieren _(nicht optional)_

Neue Spalte(n) in `sichtungen`, Mapping in `mapFormToSighting`, Migration via
`npm run db:generate`. Ohne diesen Schritt bleibt jede andere Maßnahme
wirkungslos, weil das Ergebnis der Frage verloren geht.

Sinnvoll gleich mit: Zeitstempel und Textversion der Einwilligung mitschreiben
(Art. 7 Abs. 1 verlangt Nachweisbarkeit — „ja" allein belegt nicht, _wozu_).
Wenn die Einwilligung pro Datei unterschiedlich sein soll, gehört sie an
`sichtungen_files` statt an `sichtungen`; das ist eine Produktentscheidung.

Und: `field-mapping.ts:106` (B8) muss von `true` auf einen ehrlichen Wert —
Legacy-Clients erklären nichts.

#### B-II — Wissenschaft und Öffentlichkeitsarbeit trennen

Aus einer Checkbox werden zwei Felder, z. B. `mediaScientificConsent` und
`mediaPublicationConsent`.

- **Pro:** Art. 7 Abs. 2 verlangt für die Einwilligung eine verständliche,
  vom übrigen Text abgegrenzte Form; getrennte Zwecke getrennt abzufragen ist
  der belastbarere Weg. Praktisch relevant: Wer sein Foto zur Artbestimmung
  gern beisteuert, will es nicht zwingend im Museums-Instagram sehen. Bündelung
  kostet in der Praxis Zustimmungen zu _beidem_.
- **Contra:** ein Feld mehr im Formular; Admin-Ansicht, Export und
  Media-Auslieferung müssen beide Werte auswerten, sonst ist die Trennung
  Dekoration.
- **Aufwand:** klein im Formular, mittel in der Auswertung.

#### B-III — `privacyConsent`-Text um Medien ergänzen

Die abschließende Aufzählung so erweitern, dass hochgeladene Aufnahmen
vorkommen — und zwar in der Rolle, die das Museum ihnen gibt (siehe Abschnitt 6,
Frage 1). Beispielrichtung, **nicht** juristisch geprüft:

> „… dass meine Sichtungsdaten (Datum, Position, Tierart, Anzahl) öffentlich auf
> der Karte angezeigt und wissenschaftlich ausgewertet werden. Von mir
> hochgeladene Aufnahmen werden zur fachlichen Prüfung der Meldung verwendet;
> über jede darüber hinausgehende Nutzung entscheide ich gesondert."

- **Pro:** beseitigt den inneren Widerspruch des Formulars; ohne diesen Schritt
  bleibt die Pflicht-Einwilligung falsch, egal wie gut `mediaConsent` gebaut ist.
- **Contra:** verlängert den ohnehin dichten Pflichttext.
- **Aufwand:** klein — aber **inhaltlich vom Museum freizugeben**, nicht von der
  Entwicklung zu formulieren.

#### B-IV — Datenschutzerklärung nachziehen

Der Abschnitt „Sichtungsmeldungen" der externen Erklärung wird um Uploads,
EXIF-Auswertung, Speicherdauer und Veröffentlichungspraxis ergänzt. Liegt
außerhalb dieses Repos (Museums-CMS), gehört aber in dasselbe Arbeitspaket —
sonst widersprechen sich Formular und Erklärung nach dem Fix in die andere
Richtung.

---

## 6. Was das Museum entscheiden muss — nicht die Entwicklung

Die folgenden Punkte sind **keine** technischen Fragen. Sie bestimmen, welche
der obigen Optionen überhaupt gebaut werden darf, und sollten vor der
Umsetzung beantwortet sein.

1. **Ist die fachliche Prüfung eines Fotos Teil der Sichtungsmeldung selbst
   oder eine eigene Nutzung?**
   Davon hängt ab, ob ein Foto ohne `mediaConsent` überhaupt hochgeladen und
   angesehen werden darf — und damit, ob A2 die Datei bei fehlender Zustimmung
   verwirft oder mit eingeschränktem Nutzungsvermerk überträgt. Das ist die
   Weiche für den gesamten Entwurf.

2. **Auf welche Rechtsgrundlage stützt sich die Verarbeitung hochgeladener
   Medien?** Die externe Erklärung nennt Einwilligung und delegiert den Umfang
   ans Formular; das Formular deckt Medien nicht ab. Diese Lücke muss geschlossen
   werden — im Formulartext, in der Erklärung oder in beiden.

3. **Darf ein vorläufiger Upload vor der Einwilligung stattfinden (A4), und wenn
   ja, mit welcher Frist?** Betrifft auch den Altbestand verwaister Dateien
   (B6): Was passiert mit dem, was heute schon ohne Einwilligung im Storage
   liegt?

4. **Sollen Wissenschaft und Öffentlichkeitsarbeit getrennt abgefragt werden
   (B-II)?** Produkt- und Rechtsfrage zugleich.

5. **Ist die öffentliche Blob-URL (B7) akzeptabel?** Nicht erratbar, aber ohne
   Authentifizierung abrufbar — auch für nicht freigegebene und für verwaiste
   Dateien, die der geschützte Endpunkt korrekt blockiert.

6. **Wie lange werden Medien aufbewahrt, und wie wird ein Widerruf umgesetzt?**
   Der Pflichttext verspricht Widerruf per E-Mail an
   `datenschutz@meeresmuseum.de` (`RequiredConsent.svelte:57`). Für Medien gibt
   es dafür heute keinen technischen Weg — kein gespeicherter
   Einwilligungsstatus, der widerrufen werden könnte.

7. **Wortlaut aller Einwilligungstexte.** Die Formulierungsvorschläge in diesem
   Dokument sind Richtungsangaben, keine geprüften Texte.

8. **Nachrangig:** Fotos von Bord zeigen häufig Mitfahrende. Ob eine
   Veröffentlichungspraxis dafür etwas vorsehen muss, ist zu klären, sobald
   V4 (Abschnitt 4) tatsächlich gebaut wird.

---

## 7. Empfehlung

> **Überholt durch Abschnitt 9.** Die ursprüngliche Empfehlung sprach sich für
> „Upload verzögern" (A2) aus. Nachdem das Museum Frage 1 entschieden hat
> (`mediaConsent` gilt **nur** der Veröffentlichung) und der verzögerte Upload
> technisch durchgeprüft wurde, ist die Empfehlung **A4** — siehe Abschnitt 9.
> Die Sofortmaßnahmen 1–3 gelten unverändert.

Als Paket, in dieser Reihenfolge:

**Sofort, unabhängig von allen offenen Rechtsfragen — der Status quo ist in
jeder Auslegung falsch:**

1. **B-I** — `mediaConsent` persistieren (Spalte, Mapping, Migration,
   Zeitstempel + Textversion). Behebt B3 und B8.
2. **B-III** — `privacyConsent`-Text so korrigieren, dass er nicht länger
   abschließend etwas anderes behauptet. Text vom Museum freigeben lassen.
3. **Cleanup für verwaiste Dateien** — behebt B6 und begrenzt den Altbestand.

**Nach Beantwortung von Frage 1 und 2:** ursprünglich A2, revidiert → siehe
Abschnitt 9.

4. **B-II** entfällt in dieser Form: Mit der Museumsentscheidung bekommt
   `mediaConsent` **einen** Zweck (Veröffentlichung), `privacyConsent` deckt
   Upload und fachliche Prüfung. Keine zwei neuen Felder nötig.
5. **B-IV** — Datenschutzerklärung im Museums-CMS nachziehen.

---

## 8. Umsetzungsskizze und Testplan

Erst nach Freigabe der Optionen — hier nur, um den Aufwand einschätzbar zu
machen. Das Projekt schreibt Test-First vor (`.claude/rules/testing.md`).

**Berührte Dateien je Maßnahme**

| Maßnahme | Dateien                                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| B-I      | `schema.ts`, `mapFormToSighting.ts`, `drizzle/` (via `db:generate`), `field-mapping.ts`, `AdminSightingView.svelte`, `csvExport.ts` |
| B-III    | `sightingSchema.ts:1182` (+ `sightingSchemaClaims.test.ts` beachten)                                                                |
| A2       | `MediaFile.ts`, `DropzoneEnhanced.svelte`, `ModernReportForm.svelte`, `api/sightings/+server.ts`, `sightingFilesRepository.ts`      |
| A1       | `form/position/PositionPanel.svelte` (seit #590; vorher `PositionAndTime.svelte`), `Media.svelte`, `sightingSchema.ts`              |
| Cleanup  | neues Skript unter `scripts/`, `sightingFilesRepository.ts`                                                                         |

**Testabdeckung, die zuerst rot sein muss**

- `mapFormToSighting`: Einwilligung landet in der Sichtung — heute nicht der Fall,
  der Test schlägt sofort fehl und dokumentiert B3.
- Legacy-Mapping erklärt **keine** Medieneinwilligung (B8).
- A2: kein Netzwerkaufruf an `/api/files/upload` beim Ablegen einer Datei in
  Schritt 1; EXIF-Position wird trotzdem übernommen (deckt B5 ab).
- A2/A1: Absenden ohne Medieneinwilligung verhält sich so, wie Frage 1 es
  entscheidet.
- E2E: kompletter Foto-Weg über Schritt 1 bis Absenden, inklusive Reload
  mittendrin (Regression für die A2-Schwäche).
- Cleanup: Datei ohne `sightingId` und älter als die Frist verschwindet aus
  Storage **und** `sichtungen_files`; eine zugeordnete Datei bleibt.

---

## Anhang — Quellen

Alle Zeilenangaben gegen `d345453` (Branch `claude/practical-grothendieck-0704ef`).

| Befund | Fundstelle                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| B1     | `src/lib/form/validation/sightingSchema.ts:1182`                                                                                   |
| B2     | `src/lib/form/validation/sightingSchema.ts:850`                                                                                    |
| B3     | `src/lib/server/db/mapFormToSighting.ts:167–171`; `src/lib/server/db/schema.ts:71–88`                                              |
| B4     | `DropzoneEnhanced.svelte:194–216`; `MediaFile.ts:35–56`; `src/routes/api/files/upload/+server.ts`; `sightingFilesRepository.ts:18` |
| B5     | `src/lib/utils/client/fileAnalysis.ts:71–74`; `MediaFile.ts:42,54`                                                                 |
| B6     | keine Fundstelle — Cleanup existiert nicht                                                                                         |
| B7     | `src/lib/server/storage/vercel-blob.ts:136`; `src/routes/api/media/[...path]/+server.ts:66–106`                                    |
| B8     | `src/lib/legacy-api/field-mapping.ts:106`                                                                                          |
| B9     | `MediaGallery` nur in `AdminSightingView.svelte:572`                                                                               |
| Extern | <https://www.deutsches-meeresmuseum.de/datenschutz>, Abschnitt „Sichtungsmeldungen", Abruf 2026-07-28                              |

---

## 9. Nachtrag: Ist der verzögerte Upload wirklich sinnvoll?

**Ergebnis: nein.** Die Empfehlung aus Abschnitt 7 wird zurückgezogen. Grund
ist nicht in erster Linie ein technisches Hindernis, sondern die
Museumsentscheidung zu Frage 1 — sie nimmt dem verzögerten Upload den Zweck.
Die technische Prüfung liefert zusätzlich drei Risiken, die vorher nicht
sichtbar waren.

### 9.1 Kann der Browser die Datei halten?

Technisch ja, und billiger als erwartet: Ein `File` ist eine **Referenz** auf
die Bytes auf der Platte, keine Kopie im JS-Heap. Ob 200 KB oder 5 MB ändert am
Speicherverbrauch praktisch nichts — gelesen wird erst beim Upload. Auch die
Formularschritte sprechen nicht dagegen: Das Formular ist eine **einzige Seite**,
`currentStep` ist State (`FormSteps.svelte`), es gibt zwischen den Schritten
keinen Reload. Eine gehaltene Referenz überlebt Schritt 1 bis 4 problemlos.

Und die Größen sind kleiner als gedacht:

| Grenze                            | Wert            | Fundstelle                                        |
| --------------------------------- | --------------- | ------------------------------------------------- |
| Client-Konfiguration (DB-Default) | 10 MB           | `configService.ts:25`, `configInitializer.ts:258` |
| Server, **anonym**                | **5 MB** (hart) | `api/files/upload/+server.ts`                     |
| Server, angemeldet                | 50 MB           | ebd.                                              |
| GPS-Foto Schritt 1                | 10 MB, 1 Datei  | `UPLOAD_LIMITS.PHOTO_GPS_MAX_SIZE`                |
| Erlaubte Videoformate             | nur `video/mp4` | `configService.ts:26`                             |

Für Bürgerinnen und Bürger — der Normalfall, anonym — liegt die reale Grenze
also bei **5 MB**, auch für Videos. Die 50 MB aus
`FILE_VALIDATION_PRESETS.MEDIA` greifen nur für angemeldete Nutzer.

**Nebenbefund (eigener Bug, unabhängig vom Einwilligungsthema):** Client und
Server widersprechen sich. Die Dropzone akzeptiert nach DB-Konfiguration 10 MB,
der Server lehnt oberhalb 5 MB mit 413 ab. Eine 6-MB-Datei kommt also durch die
Client-Validierung und scheitert danach. Heute fällt das sofort als Fehler-Toast
auf; bei verzögertem Upload würde es erst beim Absenden auffallen. Sollte in
jedem Fall behoben werden.

### 9.2 Die drei Risiken, die gegen A2 sprechen

**R1 — Verlust beim App-Wechsel (der schwerwiegendste).**
Der typische Ablauf ist: Formular offen → Foto aufnehmen oder aus der Galerie
wählen → zurück zur Seite. Unter Speicherdruck verwerfen mobile Browser
Hintergrund-Tabs und laden die Seite beim Zurückkehren neu. Heute ist das
harmlos: Der Upload ist bereits durch, und `sessionStorage` stellt
`$form.uploadedFiles` wieder her (`ModernReportForm.svelte:59–70`, Key
`FORM_DATA` liegt laut `localStorage.ts:54` in `sessionStorage`). Bei
verzögertem Upload wäre die `File`-Referenz weg — das Formular käme
wiederhergestellt zurück, das Foto still verschwunden. Genau in der Situation,
für die das Formular gebaut ist: an Deck, ein Gerät, wechselnde Apps.

**R2 — Wartezeit landet am schlechtesten Zeitpunkt.**
Heute läuft der Upload im Hintergrund, während Schritt 2 bis 4 ausgefüllt werden
— Minuten, in denen die Leitung ohnehin nichts anderes tut. Verzögert man ihn,
wird daraus Leerlauf nach dem Druck auf „Absenden": 5 MB bei schwachem
Mobilfunk sind je nach Verbindung deutlich über eine Minute. Und das
Fehlschlagen trifft den Nutzer im schlechtesten Moment — nach der gefühlt
letzten Handlung.

**R3 — `File` kann später unlesbar sein.**
Ein `File` ist ein Schnappschuss auf einen Pfad. Ändert oder entfernt das
Betriebssystem die Datei zwischenzeitlich (Kamera-Temp-Verzeichnisse,
Aufräumen unter Speicherdruck), scheitert das spätere Lesen. Selten, aber
diagnostisch unangenehm, weil es erst beim Absenden auftritt.

Zum Rate-Limit (20 Uploads/h anonym): kein echtes Gegenargument. Die Zahl der
Requests bleibt gleich, sie kommen nur gebündelt. Erwähnenswert, nicht
entscheidend.

### 9.3 Warum A2 seinen Zweck verliert

Der einzige Grund für A2 war: Die Datei liegt vor der Einwilligung auf dem
Server. Mit der Museumsentscheidung gilt aber:

- **Upload und fachliche Prüfung** sind Teil der Sichtungsmeldung selbst und
  von `privacyConsent` gedeckt.
- **`mediaConsent`** betrifft ausschließlich die Veröffentlichung — und die
  findet frühestens nach Freigabe durch die Admins statt, also lange nach dem
  Absenden.

Für den eigentlich heiklen Vorgang (V4 in Abschnitt 4) ist die Reihenfolge
damit **von sich aus korrekt**. Übrig bleibt nur der Zwischenzustand: Datei auf
dem Server, Formular noch nicht abgeschickt. Und dieser Zustand ist kein
Einwilligungsproblem, sondern ein **Aufbewahrungsproblem** — gelöst durch den
Cleanup, der ohnehin gebaut wird (Sofortmaßnahme 3).

Ein Umbau des Upload-Wegs würde also drei neue Fehlerquellen einführen, um ein
Problem zu lösen, das die Museumsentscheidung plus Cleanup bereits abräumt.

### 9.4 Revidierte Empfehlung: A4

Sofortmaßnahmen 1–3 aus Abschnitt 7 bleiben unverändert. Statt A2:

**A4 — sofortiger Upload bleibt, wird aber deklariert und befristet.**

1. **Hinweis an der Dropzone in Schritt 1**, kurz und ohne Sperre: dass die
   Datei zur Auswertung übertragen wird und ohne abgeschickte Meldung nach
   kurzer Frist gelöscht wird. Kein Gate — der Foto-Weg bleibt hürdenlos.
2. **Cleanup mit fester Frist** für Dateien ohne `sightingId` (Sofortmaßnahme 3,
   hier bekommt sie ihre Begründung).
3. **`mediaConsent` mit einem Zweck** — Veröffentlichung — in Schritt 3, wo es
   heute steht. Persistiert (Sofortmaßnahme 1) und im Media-Endpunkt sowie in
   der Admin-Ansicht ausgewertet.
4. **`privacyConsent`-Text** deckt Upload und fachliche Prüfung ab
   (Sofortmaßnahme 2).
5. **Datenschutzerklärung** nennt Uploads, EXIF-Auswertung, Frist für nicht
   abgeschickte Dateien und die Veröffentlichungspraxis (B-IV).

Der Kritikpunkt aus Abschnitt 5 — A4 brauche eine Rechtsgrundlage, die es nicht
gibt — ist mit der Museumsentscheidung ausgeräumt: Der Upload gehört zur
Meldung, ist also von der Pflicht-Einwilligung getragen. Zu leisten bleibt
Transparenz und Befristung, nicht die Konstruktion einer neuen Grundlage.

**Wann A2 doch wieder aufzurufen wäre:** wenn das Limit für anonyme Uploads
deutlich angehoben wird (dann wächst R2), oder wenn sich zeigt, dass
substanziell viele Uploads nie zu einer Meldung führen. Letzteres lässt sich
nach Einführung des Cleanups messen — die Zahl der abgeräumten Waisen ist genau
diese Kennzahl.
