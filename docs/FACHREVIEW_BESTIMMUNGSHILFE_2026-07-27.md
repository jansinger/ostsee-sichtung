# Fachreview: Bestimmungshilfe für Meerestiere

**Datum:** 2026-07-27
**Geprüfte Datei:** `src/lib/report/components/form/fields/SpeciesIdentificationHelp.svelte`
**Bilder:** `static/species/`
**Eingebunden in:** `FieldRenderer.svelte:344` (Tierart-Feld), `FormHelp.svelte:123` (Hilfe-Panel)

> **Status 2026-07-27:** Alle in diesem Report beschriebenen Punkte wurden umgesetzt. Die Inhalte
> liegen jetzt in `src/lib/report/formOptions/speciesIdentification.ts` und sind durch
> `speciesIdentification.test.ts` abgesichert. Die fachliche Abnahme durch das Deutsche
> Meeresmuseum steht weiterhin aus (siehe Abschnitt E).
>
> **Nachkontrolle 2026-07-28:** Erneuter Abgleich gegen die vier DMM-Steckbriefe
> (Schweinswal, Kegelrobbe, Seehund, Ringelrobbe — mehr gibt es dort nicht). Rest-Abweichungen
> ausschließlich beim Schweinswal: Maximallänge ohne den Zusatz „sehr selten auch 2 m",
> Kälbergröße 70–90 statt 65–90 cm, unbelegte Spannen „meist 1,4–1,7 m" und
> „Ostsee-Tiere meist 45–60 kg", fehlender Größendimorphismus. Alle fünf Punkte korrigiert
> und in `speciesIdentification.test.ts` (Block „Abgleich mit den DMM-Artensteckbriefen")
> festgeschrieben. Für die übrigen sieben Formular-Einträge existiert beim DMM kein
> Steckbrief; sie bleiben auf die in den Quellen genannten Referenzen gestützt.

## Zusammenfassung

Die Bestimmungshilfe ist als **Steckbrief-Sammlung** aufgebaut (Größe, Gewicht, Körpermerkmale), nicht als **Feldbestimmungshilfe**. Das ist das strukturelle Kernproblem: Der überwiegende Teil der gelisteten Merkmale ist in der realen Sichtungssituation — Tier für 1–2 Sekunden an der Oberfläche, Entfernung 50–500 m, bewegte See — nicht beobachtbar. Genau die Merkmale, die im Feld tatsächlich zur Bestimmung führen (Auftauchbild, Finnenform und -position, Blas, Fluke ja/nein, Kopfprofil bei Robben), fehlen ganz oder sind falsch gewichtet.

Dazu kommen **sachliche Fehler**, von denen mehrere aktiv zu Fehl- oder Nichtmeldungen führen, sowie ein **falsch bestimmtes Artfoto**.

Referenzquelle für die Prüfung sind vorrangig die Artensteckbriefe des **Deutschen Meeresmuseums Stralsund** — der Trägerinstitution des Portals. Die App sollte nicht von der eigenen Fachinstitution abweichen.

---

## A. Blocker

### A1. Falsches Artfoto: Seelöwe statt Kegelrobbe

`SpeciesIdentificationHelp.svelte:107` bindet `karsten-madsen-unsplash.jpg` mit dem Alt-Text
„Kegelrobbe Kopfdetail - charakteristische Nasenlöcher" ein.

Das Foto zeigt **keine Kegelrobbe**, sondern eine **Ohrenrobbe (Otariidae — Seelöwe/Seebär)**:

- deutlich sichtbare **äußere Ohrmuschel** — Hundsrobben (Seehund, Kegelrobbe, Ringelrobbe) haben ausschließlich eine Ohröffnung ohne Muschel
- langer, aufrichtbarer Hals, Tier stützt sich auf der Vorderflosse auf
- die Quelle betitelt das Bild selbst als **„wildlife photography of sea lion"** (Unsplash, Karsten Madsen, aufgenommen in Odense/Dänemark — mit hoher Wahrscheinlichkeit im Zoo Odense)

Verschärfend: Das Bild soll ausgerechnet das **diagnostische Nasenlochmerkmal** illustrieren — und zeigt unten zusammenlaufende Nasenlöcher, also das **Gegenteil** des Kegelrobben-Merkmals. In einer Bestimmungshilfe bringt das den Nutzern aktiv das falsche Tier bei. Ohrenrobben kommen in der Ostsee überhaupt nicht vor.

**Fix:** Bild ersetzen durch eine echte Kegelrobbe im **Profil** (Seitenansicht des Kopfes), da nur dort die gerade Stirn-Nasen-Linie erkennbar ist.

### A2. Schweinswal „Atmen alle 2–4 Sekunden" — Faktor ~10 daneben

`SpeciesIdentificationHelp.svelte:72`

Das Meeresmuseum schreibt: _„Zum Atmen kommen die Schweinswale **2- bis 4-mal pro Minute** für etwa 2 Sekunden an die Wasseroberfläche."_
Daraus wurde in der App „Atmen alle 2–4 **Sekunden**".

Das ist der schädlichste Einzelfehler der Liste: Wer auf ein alle paar Sekunden auftauchendes Tier wartet, verwirft eine echte Schweinswalsichtung als Fehlbeobachtung. Direkte Auswirkung auf die Datenqualität.

**Fix:** „2–4 Atemzüge pro Minute; pro Auftauchen nur ca. 1–2 Sekunden sichtbar."

### A3. Seehund „Neugierig, nähern sich oft Booten" — sachlich falsch

`SpeciesIdentificationHelp.svelte:125`

Meeresmuseum: _„teilweise reagieren sie schon auf 500 m entfernte Boote mit einer Flucht ins Wasser"_.

Die Aussage ist nicht nur falsch, sondern naturschutzfachlich bedenklich — sie lädt zur Annäherung an störungsempfindliche Tiere ein. Zudem hat sie null Trennschärfe (Kegelrobben verhalten sich auf See ähnlich neugierig).

---

## B. Sachliche Fehler in den Artangaben

Direkt gegen die Artensteckbriefe des Deutschen Meeresmuseums geprüft.

| Art         | Angabe in der App                  | Korrekt                                                                                   | Bewertung                                                            |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Schweinswal | Größe „1,5–2 m"                    | bis 1,85 m, sehr selten 2 m, **Ø 1,60 m**; Kälber 70–90 cm                                | zu hoch angesetzt, Jungtiere fallen raus                             |
| Schweinswal | Gewicht „50–70 kg"                 | **40–90 kg**; Ostsee-Männchen ca. 48 kg                                                   | schneidet Ostsee-Tiere unten ab                                      |
| Schweinswal | „Kurze Tauchgänge (1–2 Min.)"      | meist **unter 1 Minute**, Ausnahmen bis 5–6 Min.                                          | trifft weder Normalfall noch Maximum                                 |
| Kegelrobbe  | „Männchen bis 3 m"                 | Ostsee-Bullen **bis 230 cm**                                                              | für die Ostsee nicht belegt                                          |
| Kegelrobbe  | „Weibchen bis 150 kg"              | 150 kg ist der **Durchschnitt**, nicht das Maximum                                        | „bis" ist falsch                                                     |
| Kegelrobbe  | „Grau mit dunklen Flecken"         | **Weibchen hell mit dunklen Flecken, Männchen dunkel mit hellen Flecken**                 | verschenkt ein gutes Zusatzmerkmal                                   |
| Seehund     | Gewicht „50–100 kg"                | Männchen **bis 120 kg**                                                                   | Obergrenze zu niedrig                                                |
| Ringelrobbe | Gewicht „50–70 kg"                 | **bis 100 kg** (Ostsee-Unterart ist die größte)                                           | klar falsch                                                          |
| Ringelrobbe | Größe „1–1,5 m"                    | max. **140 cm**                                                                           | 1 m ist Jungtiergröße                                                |
| Ringelrobbe | „Seltene Sichtungen"               | _„als einzige baltische Robbenart **fast nie in deutschen Gewässern** zu sehen"_          | massiv untertrieben                                                  |
| Zwergwal    | „Kleinster Bartenwal"              | **falsch** — das ist der Zwergglattwal (_Caperea marginata_, 5,9–6,3 m, nur Südhalbkugel) | → „kleinster Furchenwal" bzw. „kleinster Bartenwal unserer Gewässer" |
| Zwergwal    | „Kurze Tauchgänge"                 | normal **6–12 Min.**                                                                      | irreführend                                                          |
| Zwergwal    | Gewicht „5–10 t"                   | max. ca. 9,2 t                                                                            | Obergrenze wird nicht erreicht                                       |
| Beluga      | Größe „3–5 m"                      | Männchen bis **5,5 m**                                                                    | Obergrenze zu niedrig                                                |
| Beluga      | „Seltene Gäste in der Ostsee"      | ca. **fünf Nachweise seit 1900**, stets Einzeltiere                                       | Irrgast, nicht „seltener Gast"                                       |
| Delphin     | Gewicht „150–500 kg"               | Große Tümmler bis **650 kg**                                                              | Obergrenze zu niedrig                                                |
| Finnwal     | „Hohe, sichelförmige Rückenflosse" | ca. 61 cm an einem 20-m-Tier → **relativ klein, flach ansteigend, weit hinten**           | trennt nicht vom Zwergwal, der ebenfalls „sichelförmig" gelistet ist |
| Finnwal     | „Tiefe Tauchgänge"                 | in der flachen Ostsee nicht zutreffend                                                    | im Meldegebiet unbrauchbar                                           |
| Buckelwal   | „Sehr seltene Gäste"               | Meeresmuseum: _„seltene, aber regelmäßige Gäste"_ — häufigster Großwal der Ostsee         | untertrieben, kann Meldungen verhindern                              |

**Zur Prüfung durch Fachpersonal:** Die Angabe „Seehund: relativ kleine Augen" (`:121`) dürfte invertiert sein — Feldbestimmungsführer beschreiben den Seehund wegen des kleinen runden Kopfes als großäugig („Kulleraugen"), die Kegelrobbe wegen des langen Kopfes als kleinäugig. Der Meeresmuseum-Steckbrief äußert sich zu den Augen nicht, daher hier kein abschließendes Urteil.

---

## C. Was fehlt — die eigentliche Lücke

### C1. Das Auftauchbild des Schweinswals

Die mit Abstand wichtigste Ergänzung, denn der Schweinswal ist die einzige dauerhaft in der Ostsee lebende Walart und damit Gegenstand fast aller Meldungen. Es fehlt vollständig:

- **rollendes Auftauchen** — der Rücken rollt wie ein Rad durch die Oberfläche, man sieht nie das ganze Tier
- **Sichtdauer 1–2 Sekunden** pro Auftauchen
- **kein sichtbarer Blas**, aber bei ruhiger See **hörbares Schnaufen** (namensgebend, engl. „puffing pig")
- **Fluke wird nie gezeigt** — sichtbare Fluke schließt den Schweinswal aus
- **keine Sprünge, kein Bugwellenreiten, keine Bootsannäherung**
- **Finne mittig auf dem Rücken** mit **stumpfer/abgerundeter Spitze** — genau das trennt sie von der spitzen, zurückgebogenen Delfinfinne
- **Mutter-Kalb-Paare** als häufigste Sozialform — direkt relevant für das Legacy-Feld `anzahl_jung`

Laienregel, die tragfähig ist: _„War es spektakulär, war es kein Schweinswal."_

### C2. Blas und Fluke bei Großwalen

Bei Großwalen ist der Blas das erste und oft einzige Zeichen, kilometerweit sichtbar — er fehlt komplett:

| Art       | Blas                                  | Fluke beim Abtauchen               |
| --------- | ------------------------------------- | ---------------------------------- |
| Zwergwal  | < 2 m, diffus, **kaum sichtbar**      | nein                               |
| Finnwal   | **4–6 m, hoch, schmal, säulenförmig** | nein (Rücken wölbt sich stark auf) |
| Buckelwal | ca. 3 m, **buschig/ballonförmig**     | **ja, regelmäßig und hoch**        |

Ebenfalls wertvoll und distanztauglich: **Blas-zu-Finne-Timing** — beim Zwergwal erscheinen Blas und Finne nahezu gleichzeitig, beim Finnwal folgt die Finne deutlich verzögert (sie sitzt weit hinten).

Einschränkung, die mitgegeben werden muss: Ab ca. 3–4 Beaufort verweht der Blas und ist unbrauchbar.

### C3. Kopfprofil bei Robben

Das wichtigste Feldmerkmal für Robben fehlt bei beiden Arten:

- **Kegelrobbe:** gerade Stirn-Nasen-Linie, Schnauze läuft ohne Absatz in die Stirn („Pferdekopf")
- **Seehund:** deutlicher Absatz, eingebuchteter Nasenrücken, runde Stirn („Hundekopf")

Das ist auch auf 100–200 m mit Fernglas erkennbar — im Gegensatz zu den Nasenlöchern, die zwar das sicherste, aber nur bei Nahsicht oder auf einem Foto nutzbare Merkmal sind. Der Hinweiskasten am Ende der Komponente (`:546–548`) nennt ausschließlich die Nasenlöcher.

Das Meeresmuseum weist ausdrücklich darauf hin, dass **junge und weibliche Kegelrobben Seehunden in Größe und Gestalt sehr ähnlich** sind — die Größenangaben in der App suggerieren eine Trennschärfe, die es nicht gibt.

### C4. Verwechslungen

Es existiert nur ein Hinweiskasten „Unterscheidungshilfe für Robben". Es fehlen die praktisch häufigsten Fehlbestimmungen:

- **Robbenkopf vs. Schweinswal** — auf genau diesem Portal die relevanteste Verwechslung. Robbe: runder Kopf steht senkrecht aus dem Wasser, schaut, **keine Finne**. Schweinswal: nie ein Kopf, nur rollender Rücken mit dreieckiger Finne.
- **Schweinswal vs. Delfin** in beide Richtungen — Laien melden Schweinswale häufig als „Delfin", weil das Wort geläufiger ist.
- Wellenkämme (ab Beaufort 3), Treibgut, Bojen, tauchende Wasservögel (Kormoran, Seetaucher), springende Fische.
- **Wiederholtes Auftauchen eines Einzeltiers** wird regelmäßig fälschlich als „Mutter mit Kind" gemeldet — verfälscht `anzahl_jung`.

### C5. Häufigkeits-Einordnung

Alle elf Arten stehen gleichrangig nebeneinander. Für die Datenqualität wäre die Einordnung die wertvollste Einzelinformation:

- **Schweinswal:** einzige heimische Walart, betrifft die weit überwiegende Zahl der Meldungen
- **Kegelrobbe:** häufigste Robbe an der deutschen Ostseeküste (Schwerpunkt Greifswalder Bodden/Rügen), **Seehund** seltener
- **Ringelrobbe:** in deutschen Gewässern faktisch nicht vorkommend — sollte einen expliziten Warnhinweis tragen („Ausnahmeerscheinung, bitte nur mit Foto melden"), sonst erzeugt sie systematische Falschmeldungen
- **Großwale und Beluga:** Irrgäste — aber Meldung ausdrücklich erwünscht

Wichtig ist dabei die Doppelbotschaft: seltene Arten realistisch einordnen, **ohne** vom Melden abzuschrecken. Formulierung in Richtung: _„Im Zweifel melden und fotografieren — eine unsichere Meldung mit Foto ist wertvoller als keine Meldung."_

### C6. Foto-Aufforderung und konservative Meldelogik

Fehlt bislang völlig, obwohl es der praktisch wirksamste Hinweis wäre: „Wenn möglich Foto machen, auch unscharf." Bei Großwalen zusätzlich die **Fluke beim Abtauchen** fotografieren — deren Unterseite ist individuell gemustert und Grundlage der Foto-Identifikation.

Ebenso fehlt die Ermutigung, im Zweifel „Unbekannte Wal-/Robbenart" zu wählen statt zu raten.

---

## D. Konsistenzprobleme im Formular

### D1. Nicht existierende Auswahloption

- `FormHelp.svelte:123`: „Bei Unsicherheit **'Unbekannt'** wählen"
- `sightingSchema.ts:342`: „Bei Unsicherheit wählen Sie **'Unbekannte Wal- oder Robbenart'**"

Beide Optionen existieren nicht. Vorhanden sind ausschließlich `UNKNOWN_WHALE` (8) und `UNKNOWN_SEAL` (10) als **getrennte** Einträge. Wer nicht einmal Wal von Robbe unterscheiden kann — der häufigste Unsicherheitsfall — findet keine passende Option. Da die Legacy-API den Wertebereich `tierart` 0–10 fixiert, ist eine neue Enum-Option nicht möglich; die Hilfetexte müssen also an die tatsächlichen Optionen angepasst werden.

### D2. Irreführende Vorauswahl im Hilfe-Panel

`FormHelp.svelte:124` übergibt hart `currentValue={0}`. Im generischen Hilfe-Panel wird dadurch „Schweinswal" als vermeintlich gewählte Art hervorgehoben.

### D3. Alt-Texte versprechen Merkmale, die die Bilder nicht zeigen

- `harbor-porpoise.png` — Alt „Schweinswal **Seitenansicht**": tatsächlich Aufsicht auf Kopf/Kinn eines auftauchenden Tieres in einer Anlage (grünes Wasser). Die **dreieckige Finne — das Hauptmerkmal — ist nicht im Bild.** Für die typische Feldsituation nicht repräsentativ.
- `ringed-seal.jpg` — Alt „Ringelrobbe mit **charakteristischen Ringen**": nur der Kopf über Wasser, **Ringe nicht sichtbar**.
- `Two_seals_in_the_water.jpg` — Alt „Kopfform gut erkennbar": Kopf **frontal**, die kegelförmige Kopfform ist aber nur im Profil beurteilbar. (Art und Herkunft korrekt: Kegelrobbe, Måkläppen/Falsterbo, Ostsee.)

### D4. Platzhalter-Grafiken und leere Copyright-Felder

`minke-whale.svg` und `fin-whale.svg` sind schematische Eigenzeichnungen mit anatomischen Fehlern — beim Zwergwal sitzen die Brustflossen ober- und unterhalb des Körpers, beim Finnwal steht die Rückenflosse mittig statt im hinteren Drittel (also genau falsch zum wichtigsten Positionsmerkmal). Beide sind für eine Bestimmungshilfe unbrauchbar.

Beide tragen zudem `copyright: '© '` (`:233`, `:258`) — der leere String ist truthy und rendert sichtbar als „© " unter dem Bild.

### D5. Verwaiste Assets

Sieben ungenutzte SVGs in `static/species/`: `beluga.svg`, `dolphin.svg`, `grey-seal.svg`, `harbor-porpoise.svg`, `harbor-seal.svg`, `humpback-whale.svg`, `ringed-seal.svg`.

### D6. Kleinere Punkte

- `:347–348` verwenden hartkodiertes `text-black` statt Theme-Tokens — bricht in dunklen Themes.
- `:371` nutzt `bg-base-50`, das in DaisyUI nicht existiert (gültig sind `base-100/200/300`); die Klasse ist wirkungslos.
- Kein Test deckt `identificationData` ab — es gibt keine Zusicherung, dass jede `SpeciesEnum`-Option Bestimmungsdaten besitzt.
- Die Bestimmungshilfe ist nur auf Deutsch verfügbar, obwohl die Legacy-API einen englischen Pfad (`/en/rest_sichtungen/antworten.json`) vorsieht.

---

## E. Empfohlene Reihenfolge

1. **A1–A3** beheben (falsches Foto, Atemfrequenz, Seehund-Verhalten) — sachlich falsch bzw. datenqualitätsrelevant.
2. **Abschnitt B** abarbeiten: Zahlen und Formulierungen an die Meeresmuseum-Steckbriefe angleichen.
3. **C1 + C4** ergänzen: Auftauchbild des Schweinswals und Verwechslungsblock — der größte Hebel für die Datenqualität, da der Schweinswal fast alle Meldungen ausmacht.
4. **C3 + C5** ergänzen: Kopfprofil bei Robben, Häufigkeits-Einordnung inklusive Warnhinweis bei der Ringelrobbe.
5. **C2 + D4**: Blas/Fluke bei Großwalen ergänzen, Platzhalter-SVGs durch brauchbare Abbildungen ersetzen.
6. **D1/D2** korrigieren, **C6** ergänzen.
7. Strukturell erwägen: Merkmale nach **Beobachtbarkeit** kennzeichnen — „aus der Ferne erkennbar" / „nur bei Nahsicht oder Foto" / „Hintergrundwissen". Merkmale wie „V-förmiger Kopf von oben" (nur aus der Luft), „Warzen am Kopf" (unter ~50 m), „komplexe Gesänge" (über Wasser nicht hörbar) und sämtliche Gewichtsangaben gehören nicht in dieselbe Liste wie Finnenform und Auftauchverhalten.

**Empfehlung:** Die überarbeiteten Texte vor dem Deployment durch die Meeressäuger-Fachabteilung des Deutschen Meeresmuseums gegenlesen lassen. Die Fehlerdichte deutet darauf hin, dass die Inhalte bisher ohne fachliche Abnahme entstanden sind.

---

## Quellen

- [Deutsches Meeresmuseum — Schweinswale](https://www.deutsches-meeresmuseum.de/wissenschaft/infothek/artensteckbriefe/schweinswale)
- [Deutsches Meeresmuseum — Kegelrobben](https://www.deutsches-meeresmuseum.de/wissenschaft/infothek/artensteckbriefe/kegelrobben)
- [Deutsches Meeresmuseum — Seehunde](https://www.deutsches-meeresmuseum.de/wissenschaft/infothek/artensteckbriefe/seehunde)
- [Deutsches Meeresmuseum — Ringelrobben](https://www.deutsches-meeresmuseum.de/wissenschaft/infothek/artensteckbriefe/ringelrobben)
- [Deutsches Meeresmuseum — Buckelwale in der Ostsee](https://www.deutsches-meeresmuseum.de/wissenschaft/sichtungen/buckelwal-in-der-ostsee/sichtungen-von-buckelwalen-in-der-ostsee)
- [Jensen & Kinze, Meer und Museum Bd. 23 (PDF)](https://www.deutsches-meeresmuseum.de/fileadmin/01_Stiftung_DMM/04_Wissenschaft/Infothek/Sichtungen/Buckelwale_Ostsee/Jensen-Kinze_MuM_Band_23_185-198.pdf)
- [NABU — Schweinswal](https://www.nabu.de/tiere-und-pflanzen/saeugetiere/robben-und-wale/24398.html) · [NABU — Kegelrobbe](https://www.nabu.de/tiere-und-pflanzen/saeugetiere/robben-und-wale/24355.html)
- [WDC — Schweinswal](https://de.whales.org/wale-delfine/artenfuehrer/schweinswal/)
- [LUNG MV — Robbenmonitoring (PDF)](https://www.lung.mv-regierung.de/static/LUNG/Dateien/fachinformationen/natur/natura-2000/artikel_robben.pdf)
- [HELCOM — Harbour porpoise abundance](https://indicators.helcom.fi/indicator/harbour-porpoises-abundance/)
- [Wikipedia — Zwergglattwal](https://de.wikipedia.org/wiki/Zwergglattwal)
- Bildquelle A1: [Unsplash — „wildlife photography of sea lion", Karsten Madsen](https://unsplash.com/photos/ZnmrTUzFIks)
