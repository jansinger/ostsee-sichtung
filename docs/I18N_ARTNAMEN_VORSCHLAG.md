# Englische Artnamen und Gruppen — Vorschlag zur fachlichen Prüfung

> **Status: VORSCHLAG, NICHT FREIGEGEBEN.**
>
> Dieses Dokument ist eine recherchierte Empfehlung, keine autorisierte
> Übersetzung. Es wurde ohne fachliche Rückmeldung des Deutschen Meeresmuseums
> erstellt. Jeder Eintrag ist mit Quelle und — wo vorhanden — mit der
> konkurrierenden Variante belegt, damit ein Fachmensch **abnicken oder
> korrigieren** kann, ohne die Recherche zu wiederholen.
>
> **Vor dem Einsatz zu erledigen:**
>
> 1. Fachliche Durchsicht durch die Meeressäuger-Fachbetreuung des Museums.
>    Ein Häkchen pro Zeile genügt; Korrekturen bitte direkt in der Spalte
>    „Vorschlag (EN)" eintragen.
> 2. Entscheidung zu britischem Englisch (Abschnitt 1) bestätigen oder
>    umdrehen — sie betrifft vier Namen gleichzeitig und muss zur
>    Datums-/Uhrzeit-Formatierung passen (Abschnitt 1, Punkt 3).
> 3. Erst danach die Werte in eine Übersetzungsdatei übernehmen.
>    `src/lib/report/formOptions/species.ts` bleibt bis dahin unverändert.
>
> Quelle des Ist-Zustands: `src/lib/report/formOptions/species.ts` (Stand
> `main`, 11 Arten, 3 Gruppen). Die numerischen Artcodes (`SpeciesEnum`) sind
> Datenbankwerte und werden hier **nicht** angefasst.

---

## 1. Entscheidung: Britisches Englisch

**Empfehlung: Britisches Englisch (`harbour`, `grey`, `-ise`).**

Drei Gründe, in der Reihenfolge ihres Gewichts:

1. **Die zuständigen Institutionen schreiben so.** HELCOM — die
   Ostsee-Umweltkommission, an die das Museum die Sichtungsdaten weitergibt
   (steht so im `valueText` von `notes` im Schema) — verwendet in ihren
   Kernindikatoren durchgängig „harbour seal", „grey seal", „harbour porpoise".
   ASCOBANS ebenso. Wenn die englische Fassung dieser Plattform Daten für genau
   diese Gremien erhebt, sollte sie deren Vokabular sprechen.
2. **Das Publikum ist europäisch.** Ostsee-Anrainer, Touristen aus Skandinavien,
   Polen, dem Baltikum und Großbritannien. Englisch ist hier Verkehrssprache,
   und die in Europa gelehrte und gelesene Varietät ist die britische.
3. **Konsistenz mit dem Rest der Oberfläche.** Die Anwendung liefert für Locale
   `en` derzeit **US-Formatierung** bei Datum und Uhrzeit (`MM/DD/YYYY`,
   12-Stunden-Uhr). Das ist ein separat notierter Punkt — aber er zeigt in die
   falsche Richtung. Eine Fassung mit britischen Artnamen **und**
   US-Datumsformat ist in sich widersprüchlich. **Empfehlung: mit dieser
   Entscheidung auch die Formatierung auf `en-GB` ziehen** (`DD/MM/YYYY`,
   24-Stunden-Uhr — Letzteres ist für Sichtungszeitpunkte ohnehin die
   eindeutigere Angabe und entspricht dem, was die deutsche Fassung zeigt).

**Die Gegenposition, damit sie geprüft werden kann:** Die _Society for Marine
Mammalogy_ — die die maßgebliche Liste anerkannter Trivialnamen führt — schreibt
amerikanisch („Harbor Porpoise"). Wer der Taxonomie-Autorität folgen will, müsste
`harbor` wählen. Wir folgen ihr **nicht**, weil die SMM-Liste die _Namen_
festlegt (welcher Trivialname zu welchem Taxon gehört), nicht die
_Rechtschreibvarietät_; und weil die regionale Zuständigkeit hier bei
HELCOM/ASCOBANS liegt. Die Entscheidung ist umkehrbar: Sie betrifft genau vier
Zeilen (`harbour porpoise`, `harbour seal`, `grey seal`, und den Gruppennamen
falls dort ein `-ise` auftaucht).

---

## 2. Die elf Arten

Sortiert wie im Quellcode. Spalte „Code" ist der `SpeciesEnum`-Wert (DB-Wert,
unveränderlich).

### Kleinwale / Small cetaceans

| Code | Deutsch (Ist) | Vorschlag (EN)       | Wissenschaftlich        | Quelle                | Konkurrierende Variante                                                                                                                                         |
| ---- | ------------- | -------------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Schweinswal   | **Harbour porpoise** | _Phocoena phocoena_     | ASCOBANS, HELCOM, IWC | `Harbor porpoise` (Society for Marine Mammalogy) — verworfen nach Abschnitt 1. Auch `common porpoise` ist belegt, aber deutlich seltener.                       |
| 3    | Delfin        | **Dolphin**          | —                       | —                     | Siehe Anmerkung unten — hier ist **keine** Artangabe gemeint.                                                                                                   |
| 4    | Beluga        | **Beluga**           | _Delphinapterus leucas_ | IUCN, SMM             | `Beluga whale` und `white whale`. Empfehlung: das nackte `Beluga`, weil die deutsche Fassung ebenfalls nur „Beluga" sagt — gleiche Länge, gleiche Registerhöhe. |

**Zu `Delfin` (Code 3):** Der deutsche Eintrag ist bewusst **unbestimmt** — er
nennt keine Art, sondern die umgangssprachliche Kategorie. Das ist für die
Ostsee auch sachlich richtig: Delfine sind hier Irrgäste, und welche Art es war
(Großer Tümmler _Tursiops truncatus_, Weißschnauzendelfin _Lagenorhynchus
albirostris_, Gemeiner Delfin _Delphinus delphis_) kann ein Melder vom Ufer aus
in aller Regel nicht entscheiden. `Dolphin` (Singular, ohne Zusatz) hält diese
Unbestimmtheit exakt. **Nicht** `Bottlenose dolphin` oder eine andere Art
einsetzen — das wäre keine Übersetzung, sondern eine Bestimmung, die der
deutsche Text nicht vornimmt. ⚠️ **Prüfpunkt fürs Museum:** Falls hier fachlich
doch eine bestimmte Art gemeint ist, muss zuerst der _deutsche_ Eintrag
präzisiert werden, nicht der englische.

### Großwale / Large whales

| Code | Deutsch (Ist)     | Vorschlag (EN)                     | Wissenschaftlich             | Quelle    | Konkurrierende Variante                                                                                                                                                        |
| ---- | ----------------- | ---------------------------------- | ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5    | Zwergwal          | **Minke whale**                    | _Balaenoptera acutorostrata_ | IUCN, SMM | `Common minke whale` / `Northern minke whale`. Der Zusatz unterscheidet von _B. bonaerensis_ (Antarktis) — in der Ostsee irrelevant. Empfehlung: kurze Form, wie im Deutschen. |
| 6    | Finnwal           | **Fin whale**                      | _Balaenoptera physalus_      | IUCN, SMM | `Finback whale`, `common rorqual` — beide veraltet/selten.                                                                                                                     |
| 7    | Buckelwal         | **Humpback whale**                 | _Megaptera novaeangliae_     | IUCN, SMM | keine ernsthafte.                                                                                                                                                              |
| 8    | Unbekannte Walart | **Whale — species not identified** | —                            | —         | Siehe Abschnitt 4.                                                                                                                                                             |

### Robben / Seals

| Code | Deutsch (Ist)        | Vorschlag (EN)                    | Wissenschaftlich     | Quelle       | Konkurrierende Variante                                                                                                                                                                  |
| ---- | -------------------- | --------------------------------- | -------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Kegelrobbe           | **Grey seal**                     | _Halichoerus grypus_ | HELCOM, IUCN | `Gray seal` (US). Verworfen nach Abschnitt 1. `Atlantic grey seal` ist präziser, aber im Ostsee-Kontext redundant.                                                                       |
| 2    | Seehund              | **Harbour seal**                  | _Phoca vitulina_     | HELCOM, IUCN | `Harbor seal` (US), `common seal` (in Großbritannien verbreitet). HELCOM schreibt `harbour seal` — deshalb diese Form.                                                                   |
| 9    | Ringelrobbe          | **Ringed seal**                   | _Pusa hispida_       | HELCOM, IUCN | Älteres Synonym _Phoca hispida_ kommt in HELCOM-Dokumenten noch vor. `Baltic ringed seal` bezeichnet die Unterart _P. h. botnica_ — nicht verwenden, der deutsche Eintrag meint die Art. |
| 10   | Unbekannte Robbenart | **Seal — species not identified** | —                    | —            | Siehe Abschnitt 4.                                                                                                                                                                       |

⚠️ **Prüfpunkt fürs Museum — Kegelrobbe:** `Grey seal` ist unstrittig. Zu
prüfen wäre nur, ob das Museum in eigenen englischen Materialien bereits eine
Form verwendet; dann geht die dortige vor.

---

## 3. Die drei Gruppennamen

Das ist die schwierigere Entscheidung. `Kleinwale`, `Großwale` und `Robben` sind
**deutsche Ordnungskategorien für die Formularbedienung**, keine taxonomischen
Ränge. Sie ordnen 11 Auswahlwerte in drei Gruppen, damit die Liste bedienbar
bleibt. Eine wörtliche Übersetzung kann fachlich schiefgehen.

| Deutsch (Ist) | Vorschlag (EN)      | Begründung                                                                                                                                                                                                                                                                                                          |
| ------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kleinwale     | **Small cetaceans** | Das ist **exakt** der ASCOBANS-Terminus: „any species, subspecies or population of toothed whales (Odontoceti), except the sperm whale". Die drei Einträge der Gruppe (Schweinswal, Delfin, Beluga) sind alle Zahnwale — die Zuordnung stimmt also nicht nur ungefähr, sondern trifft die Definition des Abkommens. |
| Großwale      | **Large whales**    | Siehe ausführliche Begründung unten.                                                                                                                                                                                                                                                                                |
| Robben        | **Seals**           | Unproblematisch. `Pinnipeds` wäre der Fachbegriff, ist für Laien aber sperrig und deckt zusätzlich Ohrenrobben und Walrosse ab, die hier nicht vorkommen. `Seals` ist genau so weit gefasst wie das deutsche „Robben".                                                                                              |

### Warum `Large whales` und nicht `Baleen whales`

Die vier Einträge der Gruppe sind Zwergwal, Finnwal, Buckelwal — allesamt
Bartenwale (Mysticeti) — **und `Unbekannte Walart`**. Genau dieser vierte
Eintrag verbietet ein taxonomisches Gruppenlabel:

> Wer eine Walart **nicht bestimmen konnte**, kann erst recht nicht wissen, ob
> es ein Bartenwal war. `Baleen whales` als Gruppenüberschrift behauptete eine
> Bestimmung, die der Melder gerade nicht vorgenommen hat.

`Large whales` ist demgegenüber eine Größenaussage, keine Verwandtschaftsaussage
— es ist auch der Ausdruck, den ASCOBANS als Gegenbegriff zu „small cetaceans"
verwendet. Es passt damit zur Nachbargruppe und bleibt für den unbestimmten
Eintrag ehrlich.

⚠️ **Bekannte Schwäche, die das Museum kennen sollte:** Der Zwergwal ist mit
7–10 m der _kleinste_ Bartenwal. Ihn unter „Large whales" zu führen, ist für
einen Fachmenschen leicht irritierend. Das ist aber dieselbe Irritation, die
das deutsche „Großwale" bereits erzeugt — die englische Fassung erbt sie, statt
sie neu einzuführen. Eine Alternative wäre `Whales (other than small cetaceans)`
— präzise, aber als Gruppenüberschrift in einem Bürgerformular unbrauchbar.
**Falls das Museum die Gruppierung ohnehin überdenken will, ist das der Punkt,
an dem es sich lohnt — dann aber in beiden Sprachen.**

---

## 4. Die zwei Sonderfälle

`Unbekannte Walart` (Code 8) und `Unbekannte Robbenart` (Code 10) sind
**Auswahlwerte**, keine Leerwerte. Sie stehen für: „Ich habe ein Tier gesehen,
ich weiß sicher, dass es ein Wal (bzw. eine Robbe) war, und ich konnte die Art
nicht bestimmen." Das ist eine wertvolle Meldung — und für die Ostsee die
statistisch häufige.

Das übliche englische `Unknown` wäre hier falsch: In Formularen liest sich
`Unknown` wie ein Platzhalter für eine **fehlende Angabe** — als hätte der
Melder das Feld nicht ausgefüllt. Genau das soll die Auswahl nicht ausdrücken.

| Code | Deutsch              | Vorschlag (EN)                     | Warum                                                                                                                                                                                                      |
| ---- | -------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8    | Unbekannte Walart    | **Whale — species not identified** | Nennt zuerst, was **feststeht** („Whale"), und danach, was offenblieb. Die Formulierung „not identified" beschreibt den Bestimmungsvorgang, nicht einen Datenmangel — sie liest sich als bewusste Aussage. |
| 10   | Unbekannte Robbenart | **Seal — species not identified**  | Dieselbe Konstruktion, damit die beiden Fälle als Paar erkennbar bleiben.                                                                                                                                  |

**Geprüfte und verworfene Alternativen:**

| Variante                         | Warum verworfen                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Unknown whale`                  | Klingt nach fehlender Angabe; „unknown" qualifiziert außerdem den Wal, nicht die Bestimmung.                            |
| `Unidentified whale`             | Besser, aber „unidentified" ist im Englischen an „unidentified object" angelehnt und wirkt distanziert.                 |
| `Whale (species unknown)`        | Vertretbare Zweitwahl. Klammer wirkt aber wie ein technischer Nachtrag.                                                 |
| `Whale — not sure which species` | Sprachlich am nächsten am Melder, aber zu umgangssprachlich für einen Datensatzwert, der in Exporte und an HELCOM geht. |

⚠️ **Prüfpunkt:** Der Gedankenstrich (`—`, U+2014) ist typografisch richtig,
kann aber in CSV-Exporten und in der Legacy-API unschön sein. Falls die Werte
dort auftauchen, ist ein einfacher Doppelpunkt (`Whale: species not identified`)
die robustere Variante. Vor der Umsetzung prüfen, wohin diese Labels fließen.

---

## 5. Vollständige Vorschlagsliste zum Abnicken

Zum schnellen Durchgehen, ohne Begründungen:

```
Small cetaceans
  0   Harbour porpoise
  3   Dolphin
  4   Beluga

Large whales
  5   Minke whale
  6   Fin whale
  7   Humpback whale
  8   Whale — species not identified

Seals
  1   Grey seal
  2   Harbour seal
  9   Ringed seal
 10   Seal — species not identified
```

---

## 6. Quellen

- ASCOBANS — Agreement on the Conservation of Small Cetaceans of the Baltic,
  North East Atlantic, Irish and North Seas:
  [Species](https://www.ascobans.org/basic-page/species),
  [Agreement Text](https://www.ascobans.org/documents/agreement-text),
  [Baltic Proper Harbour Porpoise in Focus](https://www.ascobans.org/en/news/baltic-proper-harbour-porpoise-focus)
- HELCOM — Baltic Marine Environment Protection Commission:
  [Harbour seal distribution](https://indicators.helcom.fi/indicator/harbour-seal-distribution/),
  [Grey seal abundance](https://indicators.helcom.fi/indicator/grey-seal-abundance/),
  [Ringed seal abundance](https://indicators.helcom.fi/indicator/ringed-seal-abundance/),
  [Distribution of Baltic seals (Kernindikator 2018, PDF)](https://helcom.fi/wp-content/uploads/2019/08/Distribution-of-Baltic-seals-HELCOM-core-indicator-2018.pdf)
- Society for Marine Mammalogy — Committee on Taxonomy:
  [_Phocoena phocoena_](https://marinemammalscience.org/facts/phocoena-phocoena/)
  (verwendet `Harbor Porpoise`, US-Schreibung — siehe Abschnitt 1)
- IUCN Red List: [_Phocoena phocoena_](https://www.iucnredlist.org/species/pdf/247632759)
- IWC Whale Watching Handbook: [Harbour porpoise](https://wwhandbook.iwc.int/en/species/harbour-porpoise)
