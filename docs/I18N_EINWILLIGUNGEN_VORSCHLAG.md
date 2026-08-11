# Englische Einwilligungstexte — Vorschlag zur Prüfung

> **Status: VORSCHLAG, NICHT FREIGEGEBEN. NICHT EINSETZEN.**
>
> Dies ist ein sprachlich-juristischer Entwurf ohne datenschutzrechtliche
> Abnahme. Er darf **nicht** in die Anwendung übernommen werden, bevor die
> folgenden drei Schritte erledigt sind:
>
> 1. **Datenschutz-Abnahme.** Die Texte sind Einwilligungserklärungen nach
>    Art. 6 Abs. 1 lit. a und Art. 7 DSGVO. Sie brauchen die Freigabe der
>    zuständigen Stelle beim Deutschen Meeresmuseum
>    (`datenschutz@meeresmuseum.de`), nicht nur eine sprachliche Durchsicht.
>    Die mit ⚠️ markierten Stellen in diesem Dokument sind die Punkte, an denen
>    diese Abnahme etwas zu entscheiden hat.
> 2. **Fachliche Durchsicht des Wortlauts** durch jemanden mit
>    Englisch-Muttersprachniveau — Art. 12 Abs. 1 DSGVO verlangt „klare und
>    einfache Sprache", und das ist bei einer Einwilligung eine
>    Wirksamkeitsvoraussetzung, keine Stilfrage.
> 3. **Neue Fassungskennungen vergeben.** Siehe Abschnitt „Fassungskennungen"
>    unten — die englischen Texte sind ein **eigener** Wortlaut mit **eigenen**
>    Kennungen, keine Beilage zu den deutschen.
>
> Quellen des Ist-Zustands (Stand `main`):
> `src/lib/form/validation/sightingSchema.ts` (Ankreuztexte),
> `src/lib/report/components/steps/Step4Contact.svelte` und
> `src/lib/report/components/form/RequiredConsent.svelte` (Rahmentexte der
> gelesenen Flächen), `src/lib/form/consent/consentVersions.ts` (Kennungen).

---

## Warum das kein Übersetzungsauftrag ist

Drei Randbedingungen, die den Auftrag von einer Übersetzung unterscheiden:

**1. Nachweisbarkeit (Art. 7 Abs. 1 DSGVO).** Das Projekt weist Einwilligungen
über hash-gepinnte Fassungen der **gelesenen Fläche** nach — nicht über die
Zeichenkette im Schema. `consentSurfaces.svelte.test.ts` hasht pro Feld die
äußere Fläche, die Gruppe und den Ankreuztext. Eine englische Fassung ist
deshalb eine **zweite, eigenständige Einwilligungsfläche** mit eigener
Kennung. Wer sie als „Übersetzung derselben Einwilligung" behandelt, kann für
eine englischsprachige Meldung nicht belegen, welchem Wortlaut zugestimmt
wurde.

**2. Klare und einfache Sprache (Art. 12 Abs. 1 DSGVO).** Die deutschen Texte
sind teils lange Satzgefüge. Wörtlich übertragen ergäben sie englische
Schachtelsätze, die die Anforderung **verfehlen**. Die englische Fassung darf
und soll anders gebaut sein — kürzere Sätze, mehr Punkte statt Semikola —
solange sie dasselbe zusagt. Die Vorschläge unten nutzen diesen Spielraum
bewusst und weisen bei jedem Text aus, wo sie es tun.

**3. Der Umfang muss exakt derselbe sein.** Die deutsche Fassung unterscheidet
an einer Stelle ausdrücklich zwischen **Übertragung zur fachlichen Prüfung**
und **Veröffentlichung** (`privacyConsent`, Satz 2). Das ist eine bewusste,
im Code dokumentierte Entscheidung: Aufnahmen werden immer übertragen und
geprüft, veröffentlicht werden sie nur mit `mediaConsent`. Diese Trennung muss
die englische Fassung genauso deutlich führen — sie ist der Grund, warum es
zwei getrennte Ankreuzfelder gibt.

**Wie die Rückübersetzung zu lesen ist:** Zu jedem Vorschlag steht eine
möglichst wörtliche Rückübersetzung ins Deutsche. Sie ist **kein**
Textvorschlag und soll bewusst etwas holprig klingen — ihr Zweck ist, dass ein
deutschsprachiger Prüfer die inhaltliche Äquivalenz zum Ist-Text beurteilen
kann, ohne Englisch bewerten zu müssen. Weicht die Rückübersetzung inhaltlich
vom Ist-Text ab, ist das ein Befund.

---

## 1. `privacyConsent` — Pflicht-Einwilligung

**Fassungskennung heute:** `PRIVACY_CONSENT_VERSION = '2026-08-04'`
**Fläche:** `RequiredConsent.svelte` (Rahmen) + Ankreuztext aus dem Schema.
Beides gehört zur gelesenen Fläche und muss übersetzt werden.

### 1a. Ankreuztext

**Deutsch (Ist):**

> Ich stimme zu, dass meine Sichtungsdaten (Datum, Position, Tierart, Anzahl)
> öffentlich auf der Karte angezeigt und wissenschaftlich ausgewertet werden.
> Von mir hochgeladene Aufnahmen werden übertragen und zur fachlichen Prüfung
> meiner Meldung verwendet; über eine Veröffentlichung entscheide ich gesondert.
> Meine Kontaktdaten werden nur für Rückfragen verwendet. Ich bestätige die
> Richtigkeit meiner Angaben.

**Vorschlag (EN):**

> I agree that my sighting data — date, position, species and number of animals
> — may be shown publicly on the map and used for scientific analysis. Any
> photos or videos I upload are transmitted to the museum and used to check my
> report; whether they are published is a separate decision that I make myself.
> My contact details are used only to get back to me about this report. I
> confirm that the information I have given is correct.

**Rückübersetzung (wörtlich, nur zur Prüfung):**

> Ich stimme zu, dass meine Sichtungsdaten — Datum, Position, Art und Anzahl
> der Tiere — öffentlich auf der Karte gezeigt und für wissenschaftliche
> Auswertung verwendet werden dürfen. Alle Fotos oder Videos, die ich hochlade,
> werden an das Museum übertragen und verwendet, um meine Meldung zu prüfen;
> ob sie veröffentlicht werden, ist eine gesonderte Entscheidung, die ich selbst
> treffe. Meine Kontaktdaten werden nur verwendet, um mich zu dieser Meldung
> zurückzukontaktieren. Ich bestätige, dass die Angaben, die ich gemacht habe,
> richtig sind.

**Bewusste Abweichungen vom Satzbau:**

- Das deutsche Semikolon-Gefüge in Satz 2 ist auf zwei Aussagen mit klarem
  Subjekt aufgeteilt („are transmitted … and used to check" / „whether they are
  published is a separate decision"). Der Umfang bleibt identisch, die
  Trennung Prüfung ↔ Veröffentlichung wird sogar **deutlicher** als im
  Deutschen.
- „Aufnahmen" ist mit „photos or videos" konkretisiert. Das englische „recordings"
  wäre missverständlich (Ton), „uploads" zu technisch. Der Umfang ändert sich
  nicht — die Anwendung nimmt Bild und Video entgegen.

**⚠️ Unsicherheiten / Prüfpunkte:**

- ⚠️ **„transmitted to the museum" ergänzt einen Empfänger, den der deutsche
  Text nicht nennt.** Das Deutsche sagt nur „werden übertragen" — passivisch,
  ohne Ziel. Auf Englisch klingt ein zielloses „are transmitted" unvollständig
  bis beunruhigend. Die Ergänzung ist inhaltlich richtig (der Empfänger _ist_
  das Museum), erweitert den Text aber um eine Angabe. **Entscheidung durch die
  Datenschutz-Abnahme:** entweder so übernehmen — dann sollte der deutsche Text
  bei nächster Gelegenheit gleichziehen —, oder auf „are transmitted and used
  to check my report" kürzen.
- ⚠️ **„used only to get back to me about this report" ist enger als
  „nur für Rückfragen verwendet".** Das deutsche „Rückfragen" ist nicht auf
  _diese_ Meldung beschränkt; mein Vorschlag bindet es daran. Das ist
  datenschutzrechtlich die **vorsichtigere** Zusage, aber es ist eine
  Verengung des Umfangs. Falls das Museum Kontaktdaten auch für Rückfragen zu
  _früheren_ Meldungen nutzt, muss „about this report" gestrichen werden.
- ⚠️ **„wissenschaftlich ausgewertet"** ist mit „used for scientific analysis"
  wiedergegeben. Die Weitergabe an HELCOM und ASCOBANS, die an anderer Stelle
  im Formular erwähnt wird (`notes`-Hilfetext), steht in **keinem** der beiden
  Texte — deutsche wie englische Fassung schweigen dazu gleichermaßen. Das ist
  hier bewusst nicht „repariert" worden: Es wäre eine Umfangsänderung, und
  wenn sie kommt, muss sie in beiden Sprachen kommen. **Für die
  Datenschutz-Abnahme notiert.**

### 1b. Rahmentext der Fläche (`RequiredConsent.svelte`)

| Deutsch (Ist)                                                                                                          | Vorschlag (EN)                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Erforderliche Zustimmung zur Datenverwendung                                                                           | Consent required to use your data                                                                                             |
| **Diese Zustimmung ist erforderlich**, um Ihre Meldung zu speichern und für die wissenschaftliche Forschung zu nutzen. | **This consent is required** so that we can store your report and use it for scientific research.                             |
| Öffentliche Wissenschaftsdaten                                                                                         | Public research data                                                                                                          |
| Datum, Position, Tierart werden für Forschung öffentlich gezeigt                                                       | Date, position and species are shown publicly, for research                                                                   |
| Private Kontaktdaten                                                                                                   | Private contact details                                                                                                       |
| Ihre persönlichen Daten bleiben vertraulich, nur für Rückfragen                                                        | Your personal details stay confidential and are used only to get back to you                                                  |
| **Ohne diese Zustimmung kann Ihre Meldung nicht gespeichert werden.**                                                  | **Without this consent we cannot store your report.**                                                                         |
| Sie können diese Zustimmung jederzeit per E-Mail an datenschutz@meeresmuseum.de widerrufen.                            | You can withdraw this consent at any time by emailing datenschutz@meeresmuseum.de.                                            |
| Einzelheiten zur Verarbeitung stehen in der [Datenschutzerklärung](https://www.deutsches-meeresmuseum.de/datenschutz). | Details of how your data is processed are set out in the [privacy policy](https://www.deutsches-meeresmuseum.de/datenschutz). |

**⚠️ Prüfpunkte:**

- ⚠️ **Die verlinkte Datenschutzerklärung ist nur auf Deutsch verfügbar.**
  Art. 12 Abs. 1 DSGVO verlangt die Informationen in verständlicher Form; ein
  englischsprachiger Melder, der auf einen rein deutschen Text geleitet wird,
  bekommt sie faktisch nicht. Das ist der **gewichtigste offene Punkt dieses
  Dokuments** und von hier aus nicht lösbar — er betrifft die Website des
  Museums, nicht diese Anwendung. **Mindestens muss der Link kenntlich machen,
  dass die Zielseite deutschsprachig ist** (z. B. „privacy policy (in German)").
  Ohne das entsteht ein Verweis ins Leere.
- ⚠️ „Widerruf per E-Mail" — die Adresse `datenschutz@meeresmuseum.de` bleibt
  unverändert. Ob dort englischsprachige Widerrufe bearbeitet werden können,
  ist eine organisatorische Frage, die das Museum beantworten muss.

---

## 2. `nameConsent` — Veröffentlichung des Namens

**Fassungskennung heute:** `NAME_CONSENT_VERSION = '2026-08-06'`

**Deutsch (Ist), Label:** Namen veröffentlichen
**Deutsch (Ist), Ankreuztext:**

> Ich stimme zu, dass mein Name (Vor- und Nachname) öffentlich auf der Karte
> angezeigt wird und in Berichten genannt werden darf.

**Vorschlag (EN), Label:** Publish my name
**Vorschlag (EN), Ankreuztext:**

> I agree that my name — first name and surname — may be shown publicly on the
> map and named in reports.

**Rückübersetzung:**

> Ich stimme zu, dass mein Name — Vorname und Nachname — öffentlich auf der
> Karte gezeigt und in Berichten genannt werden darf.

Inhaltlich deckungsgleich, keine Umfangsberührung. Die Klammer ist zu einem
Einschub geworden, weil eine Klammer im Englischen an dieser Stelle wie ein
technischer Nachtrag wirkt.

**⚠️ Prüfpunkt:**

- ⚠️ „in Berichten genannt werden **darf**" — das deutsche Modalverb macht
  deutlich, dass es eine Möglichkeit ist, keine Zusage. „may be … named in
  reports" trägt dieselbe Modalität. Falls die Abnahme die Möglichkeit stärker
  betonen will: „may be … and may be named in reports" (Wiederholung des
  Modals). Ich halte die kürzere Form für ausreichend, aber es ist eine
  Ermessensfrage.

---

## 3. `shipNameConsent` — Veröffentlichung des Schiffsnamens

**Fassungskennung heute:** `SHIP_NAME_CONSENT_VERSION = '2026-08-06'`

**Deutsch (Ist), Label:** Schiffsname veröffentlichen
**Deutsch (Ist), Ankreuztext:**

> Ich stimme zu, dass der Schiffsname öffentlich auf der Karte angezeigt wird
> und in Berichten genannt werden darf.

**Vorschlag (EN), Label:** Publish the vessel name
**Vorschlag (EN), Ankreuztext:**

> I agree that the vessel's name may be shown publicly on the map and named in
> reports.

**Rückübersetzung:**

> Ich stimme zu, dass der Name des Schiffes öffentlich auf der Karte gezeigt
> und in Berichten genannt werden darf.

**⚠️ Prüfpunkt — Wortwahl `vessel` gegen `ship`:**

- ⚠️ Das Feld wird auch von Sportbooten, Kuttern und Fähren ausgefüllt — das
  Formular fragt Boots- **und** Schiffsangaben ab. `ship` bezeichnet im
  Englischen enger ein größeres Seeschiff; ein Segler mit einem 8-m-Boot
  könnte das Feld dann für sich als unzutreffend lesen und die Einwilligung
  gar nicht erst geben. `vessel` deckt beides ab und ist der Begriff, den die
  englischsprachige Seefahrt dafür verwendet.
- Die **Kehrseite**, die die Abnahme kennen sollte: `vessel` ist formeller und
  etwas amtlicher als das deutsche „Schiffsname". Wer bewusst näher am
  deutschen Wort bleiben will, nimmt `ship's name` — dann aber konsistent auch
  im Label und in den Feldbeschriftungen der Boot-Sektion, sonst stehen zwei
  Begriffe für dieselbe Sache im selben Formular.

---

## 4. `mediaConsent` — Veröffentlichung von Aufnahmen

**Fassungskennung heute:** In `src/lib/form/consent/mediaConsentVersion.ts`
(eigener Lebenszyklus, siehe Kopfkommentar in `consentVersions.ts`).

**Deutsch (Ist), Label:** Veröffentlichung meiner Aufnahmen
**Deutsch (Ist), Ankreuztext:**

> Dürfen wir Ihre Aufnahmen veröffentlichen — etwa auf der Sichtungskarte oder
> in der Öffentlichkeitsarbeit des Meeresmuseums?

**Deutsch (Ist), Zusatztext (`valueText`):**

> Ohne Ihre Zustimmung dienen die Aufnahmen ausschließlich der Prüfung Ihrer
> Meldung

**Vorschlag (EN), Label:** Publishing my photos and videos
**Vorschlag (EN), Ankreuztext:**

> May we publish your photos and videos — for example on the sightings map or
> in the museum's public communications?

**Vorschlag (EN), Zusatztext:**

> Without your consent, they are used only to check your report

**Rückübersetzung:**

> Dürfen wir Ihre Fotos und Videos veröffentlichen — zum Beispiel auf der
> Sichtungskarte oder in der Öffentlichkeitsarbeit des Museums?
>
> Ohne Ihre Zustimmung werden sie nur verwendet, um Ihre Meldung zu prüfen.

**Zur Konstruktion:** Dieser Text ist als **Frage** gebaut, nicht als
Ich-Aussage — anders als `nameConsent` und `shipNameConsent`. Das ist im
Deutschen so und bleibt im Englischen so; die Uneinheitlichkeit stammt aus dem
Ist-Zustand und wird hier nicht stillschweigend geglättet. Wer sie beheben
will, muss beide Sprachen ändern und beide Kennungen heben.

**⚠️ Prüfpunkte:**

- ⚠️ **„Öffentlichkeitsarbeit" ist der schwierigste Begriff des ganzen
  Dokuments.** Er umfasst im Deutschen Pressearbeit, Ausstellung, Website,
  Social Media, Broschüren. Kein englisches Einzelwort deckt das deckungsgleich
  ab. Kandidaten und ihre Probleme:
  - `public relations` — im Englischen stark nach Unternehmenskommunikation,
    teils negativ konnotiert.
  - `outreach` — im Wissenschaftskontext üblich, aber enger (Vermittlung,
    Bildung) und schließt Pressefotos nicht sicher ein.
  - `public communications` (mein Vorschlag) — breit und neutral, deckt Presse,
    Website und Ausstellung ab.
  - **Das ist eine echte Umfangsfrage, keine Stilfrage.** Wenn die englische
    Formulierung enger ist als die deutsche, ist die Einwilligung für einen Teil
    der tatsächlichen Nutzung nicht gedeckt. **Diese Zeile braucht die
    Datenschutz-Abnahme ausdrücklich.** Erwägenswert wäre auch eine explizite
    Aufzählung statt eines Oberbegriffs („on the sightings map, on our website,
    in exhibitions and in press and educational material") — länger, aber ohne
    Auslegungsrisiko.
- ⚠️ „des Meeresmuseums" ist zu „the museum's" verkürzt. In der englischen
  Fassung sollte an mindestens einer Stelle der volle Name stehen
  (`Deutsches Meeresmuseum` — Eigenname, nicht übersetzen). Wo genau, hängt vom
  Rahmentext ab und ist bei der Umsetzung zu klären.
- ⚠️ **Diese Einwilligung ist der Gegenpol zur Trennung in `privacyConsent`.**
  Beide Texte müssen zusammen geprüft werden: `privacyConsent` sagt „Prüfung ja,
  Veröffentlichung gesondert", `mediaConsent` ist dieses Gesonderte. Wird einer
  der beiden Texte geändert, ist der andere mitbetroffen.

---

## 5. `persistentDataConsent` — dauerhafte Speicherung im Browser

Der Vollständigkeit halber, obwohl nicht ausdrücklich beauftragt: Dieses Feld
steht in derselben Einwilligungsfläche und trägt ebenfalls Nachweisspalten. Wer
die vier oben übersetzt und dieses auslässt, hinterlässt eine deutsche Zeile
mitten in der englischen Fläche.

**Deutsch (Ist), Label:** Kontaktdaten dauerhaft speichern
**Deutsch (Ist), Ankreuztext:**

> Ich stimme zu, dass meine Kontaktdaten dauerhaft auf diesem Gerät gespeichert
> werden, um sie bei zukünftigen Meldungen automatisch zu verwenden. Ohne diese
> Zustimmung werden die Daten beim Schließen des Browsers gelöscht.

**Vorschlag (EN), Label:** Remember my contact details
**Vorschlag (EN), Ankreuztext:**

> I agree that my contact details may be stored permanently on this device, so
> that they can be filled in automatically for future reports. Without this
> consent, the details are deleted when I close my browser.

**Rückübersetzung:**

> Ich stimme zu, dass meine Kontaktdaten dauerhaft auf diesem Gerät gespeichert
> werden dürfen, damit sie für zukünftige Meldungen automatisch eingetragen
> werden können. Ohne diese Zustimmung werden die Daten gelöscht, wenn ich
> meinen Browser schließe.

**⚠️ Prüfpunkt:** Das Label „Remember my contact details" ist bewusst freier
als „Kontaktdaten dauerhaft speichern" — es ist die Formulierung, die
englischsprachige Nutzer aus Anmeldeformularen kennen. Wer die Nähe zum
Deutschen vorzieht: „Store my contact details permanently". Kein
Umfangsunterschied, reine Registerfrage.

---

## Fassungskennungen — was vor dem Einsatz passieren muss

Die englischen Texte sind **eigene Wortlaute**. Sie brauchen deshalb eigene
Kennungen, und die vorhandenen deutschen Kennungen dürfen dafür **nicht**
wiederverwendet werden.

**Warum:** Art. 7 Abs. 1 DSGVO verlangt den Nachweis, dass eine bestimmte
Person einer bestimmten Erklärung zugestimmt hat. Wenn eine englischsprachige
Meldung mit `PRIVACY_CONSENT_VERSION = '2026-08-04'` gespeichert wird, weist
die Datenbank auf den **deutschen** Wortlaut vom 2026-08-04 — den der Melder nie
gesehen hat. Der Nachweis zeigt dann auf den falschen Text.

**Konkret zu klären, bevor Code entsteht** (das ist bewusst offen gelassen —
es ist eine Architekturentscheidung, keine Textfrage):

1. **Kennung pro Sprache oder eine Kennung über beide Fassungen?** Eine Kennung
   pro Sprache (`PRIVACY_CONSENT_VERSION_EN`) ist der ehrlichere Nachweis. Eine
   gemeinsame Kennung wäre nur dann vertretbar, wenn die Fassungen strikt
   synchron gepflegt werden — was sich erfahrungsgemäß nicht durchhalten lässt.
2. **Muss die Sprache mitgespeichert werden?** Ohne ein Feld „in welcher Sprache
   wurde zugestimmt" nützt selbst eine sprachspezifische Kennung wenig, sobald
   man vom gespeicherten Datensatz zurück auf den gelesenen Text schließen will.
   Wahrscheinlich braucht es beides.
3. **`consentSurfaces.svelte.test.ts` muss die englische Fläche mit-pinnen.**
   Sonst gilt für die englische Fassung die Zusage nicht, die den ganzen
   Mechanismus trägt: dass eine Wortlautänderung den Test rot macht.
4. **Startwert der Kennungen** ist das Datum der Datenschutz-Abnahme, nicht das
   Datum dieses Dokuments und nicht das Datum der deutschen Fassung.

---

## Zusammenstellung der offenen ⚠️-Punkte

Zum Abarbeiten in der Datenschutz-Abnahme:

| #   | Text                    | Punkt                                                                           | Art                     |
| --- | ----------------------- | ------------------------------------------------------------------------------- | ----------------------- |
| 1   | Rahmentext `privacy`    | Datenschutzerklärung nur auf Deutsch verfügbar                                  | **Umfang / Art. 12**    |
| 2   | `mediaConsent`          | „Öffentlichkeitsarbeit" — kein deckungsgleiches englisches Wort                 | **Umfang**              |
| 3   | `privacyConsent`        | „about this report" verengt „für Rückfragen"                                    | **Umfang**              |
| 4   | `privacyConsent`        | „transmitted to the museum" nennt einen Empfänger, den das Deutsche nicht nennt | Umfang (Erweiterung)    |
| 5   | `privacyConsent`        | Weitergabe an HELCOM/ASCOBANS steht in **keiner** Fassung                       | Umfang (Bestandsbefund) |
| 6   | `shipNameConsent`       | `vessel` gegen `ship's name`                                                    | Wortwahl                |
| 7   | `mediaConsent`          | Voller Museumsname mindestens einmal in der Fläche                              | Redaktionell            |
| 8   | alle                    | Eigene Fassungskennungen + Sprache mitspeichern + Test-Pinning                  | **Nachweis / Art. 7**   |
| 9   | `nameConsent`           | Modalverb-Wiederholung („may … and may be named")                               | Ermessen                |
| 10  | `persistentDataConsent` | „Remember my contact details" gegen wörtlichere Fassung                         | Ermessen                |

Die fett markierten Zeilen sind die, bei denen ein Fehler die Einwilligung
angreifbar macht. Die übrigen sind Geschmacks- oder Redaktionsfragen.
</content>
