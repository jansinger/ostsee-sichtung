# Entwurf: Legacy-Posteingang auf dem Plesk-Server

**Stand:** 2026-07-30 — Entwurf, noch nicht umgesetzt.

Ein eigenständiger Node-Dienst auf dem Hetzner-Server (Plesk), der die Legacy-API
von schweinswalsichtung.de bedient und eingehende Sichtungen als JSON-Dateien auf
die Platte schreibt. Die Dateien werden später in die Hauptanwendung importiert.

Der Dienst hat **keine Datenbankverbindung**. Bis zum Import ist die Platte des
Plesk-Servers der einzige Ort, an dem eine eingegangene Sichtung existiert — das
prägt jede Entscheidung in diesem Dokument.

---

## 1. Umfang

| Endpunkt                                          | Im Dienst enthalten           |
| ------------------------------------------------- | ----------------------------- |
| `POST /rest_sichtungen`                           | ja — der eigentliche Zweck    |
| `GET /rest_sichtungen/antworten.json` (+ `/en/…`) | ja — statische Enum-Tabelle   |
| `GET /rest_sichtungen/inBaltic.json`              | ja — reine Geometrie, ohne DB |
| `GET /sichtungen/showreports.json`                | **nein**                      |

`showreports.json` liefert per Vertrag alle freigegebenen Sichtungen eines Jahres.
Ohne Datenbank könnte der Dienst nur ein leeres Array zurückgeben — formal gültig,
inhaltlich falsch. Der Pfad bleibt deshalb unbedient (404) und gehört weiterhin dem
System, das die Daten tatsächlich hält.

Der Vertrag kennt **keinen Medien-Upload**. `aufnahme` ist nur ein Dateiname,
`aufnahmeHochladen` ein Kennzeichen. Der Dienst nimmt keine Dateien entgegen.

---

## 2. Vertragsgrundlage

Verbindlich ist `docs/LEGACY_API_SPECIFICATION.md`, in Zweifelsfällen das
Originaldokument `docs/archive/Sichtungsdb-Web-Schnittstelle.pdf`.

### Der Client-Status ändert sich mit diesem Dienst

`docs/LEGACY_API_SPECIFICATION.md:7` und `.claude/rules/legacy-api.md` halten
fest: „keine Clients angebunden" (Stand 2026-07-28). Auf dieser Notiz beruht die
projektweite Einschätzung, Abweichungen am Legacy-Vertrag seien derzeit
unkritisch, weil sie nichts Laufendes brechen.

**Mit der Inbetriebnahme dieses Dienstes gilt das nicht mehr.** Ab dann liefern
Apps echte Sichtungen, und jede Vertragsabweichung kostet Daten, die von dieser
Seite aus nicht zu reparieren sind. Beide Dateien sind zum Zeitpunkt der
Inbetriebnahme entsprechend zu aktualisieren — das ist keine Formalie, sondern
die Grundlage, auf der künftige Änderungen an diesen Endpunkten bewertet werden.

Bei der Entwurfsarbeit sind **zwei Abweichungen der bestehenden SvelteKit-
Implementierung vom Original** aufgefallen. Beide wurden am PDF geprüft und
entschieden. Sie betreffen den neuen Dienst unmittelbar, weil er nicht zu beiden
Varianten gleichzeitig kompatibel sein kann.

### 2.1 Form der Fehlerantwort — flach

Das Original (PDF, Abschnitt „Bei Validierungsfehlern") schreibt:

```json
{
	"message": "Validation failed.",
	"errors": {
		"anzahl_gesamt": ["Dieses Feld kann nicht leer gelassen werden."]
	}
}
```

`src/lib/legacy-api/error-messages.ts:26` erzeugt dagegen eine geschachtelte
Struktur (`{"message":{"message":…,"errors":…}}`), und
`src/routes/rest_sichtungen/rest_sichtungen.test.ts:230` schreibt diese als
„PDF compliance" fest. Der Kommentar ist nachweislich falsch — das PDF zeigt die
flache Form.

`static/openapi.yml:2733` beschreibt eine **dritte**, wieder andere Struktur:
`LegacyErrorResponse` verlangt `error` und `message` als Strings und kennt gar
kein `errors`-Objekt.

Damit existieren drei einander widersprechende Beschreibungen desselben
Response-Bodys:

| Quelle                                   | Form                                           |
| ---------------------------------------- | ---------------------------------------------- |
| PDF / `docs/LEGACY_API_SPECIFICATION.md` | `{"message": "…", "errors": {…}}`              |
| `src/lib/legacy-api/error-messages.ts`   | `{"message": {"message": "…", "errors": {…}}}` |
| `static/openapi.yml`                     | `{"error": "…", "message": "…"}`               |

**Entscheidung: Der neue Dienst antwortet flach, wie das Original.** Ein Client,
der `message` als Text liest, bekommt sonst ein Objekt.

**Offen, außerhalb dieses Projekts:** SvelteKit-App und OpenAPI-Spec weichen
beide von der verbindlichen Referenz ab. Das gehört korrigiert, ist aber eine
eigene Änderung an einem anderen System. Für die Testplanung ist es relevant —
siehe Abschnitt 8.

### 2.2 Feldname `sonstige_auffaelligkeiten` — mit `ae`

Das PDF nennt das Feld `sonstige_auffaelligkeiten`. Die SvelteKit-Implementierung
benutzt durchgehend den Umlaut `sonstige_auffälligkeiten`
(`types.ts:48`, `yup-validation.ts:84`, `field-mapping.ts:91`). Ein
spec-konformer Client verliert damit seinen Freitext kommentarlos:
`otherObservations` wird `''`.

**Entscheidung: Der Dienst nimmt beide Schreibweisen an und speichert unverändert.**
Da der Payload roh abgelegt wird und unbekannte Felder erhalten bleiben, kann in
keinem Fall etwas verloren gehen. Die Zusammenführung übernimmt der Import.

---

## 3. Architektur

Schlichtes ESM-JavaScript, `node:http`, **kein Build-Schritt**. Plesk zeigt mit
seiner Node.js-Extension direkt auf `app.js`.

Begründung für den Zuschnitt: Der Dienst ist der Datenspeicher. Je weniger Code
und je weniger fremde Pakete zwischen Request und `fsync` liegen, desto weniger
kann dazwischen etwas verlieren. Für drei Routen bringt ein Framework keinen
Gewinn, kostet aber einige Dutzend transitive Abhängigkeiten auf einem Server,
der ungesicherte personenbezogene Rohdaten vorhält.

```
legacy-inbox/
├── package.json           # type: module — Abhängigkeiten: rbush, @turf/*, yup
├── app.js                 # Passenger-Einstiegspunkt, listen(process.env.PORT)
├── src/
│   ├── server.js          # Router: bekannte Pfade, sonst 404; falsche Methode → 405
│   ├── routes/
│   │   ├── createSighting.js
│   │   ├── antworten.js   # liefert die eingefrorenen JSON-Dateien aus
│   │   └── inBaltic.js
│   ├── readBody.js        # Stream mit hartem Größen-Abbruch, JSON + form-urlencoded
│   ├── validate.js        # Yup-Port, wortgleiche deutsche Meldungen
│   ├── store.js           # atomares Schreiben, Sequenz, fsync
│   ├── rateLimit.js       # In-Memory-Fenster pro IP
│   └── geo/               # Port von checkBalticSeaFile + rbush-index.json (33 MB)
├── data/
│   ├── antworten.de.json  # eingefroren, generiert — siehe Abschnitt 7
│   └── antworten.en.json
└── test/
```

Die Module sind einzeln testbar: `store.js` kennt kein HTTP, `validate.js` kennt
keine Platte, `geo/` kennt weder das eine noch das andere.

`inBaltic` ist portabel, weil `src/lib/server/geo/checkBalticSeaFile.ts` nur an
`@turf/boolean-point-in-polygon`, `@turf/helpers`, `rbush` und dem vorkompilierten
Index `rbush-index.json` hängt — kein PostGIS, keine Datenbank. Zu portieren sind
zusätzlich `GEO_LIMITS` und `isInBalticArea` aus
`src/lib/utils/geo/checkBalticSea.ts`.

---

## 4. Datenfluss `POST /rest_sichtungen`

### Der Leitsatz

**Was den Dienst erreicht hat, wird geschrieben — ausnahmslos, auch wenn es
ungültig, unparsbar oder Unsinn ist.** Die Validierung entscheidet nur über die
**Antwort** an den Client, niemals über die Existenz der Daten.

Der Grund ist unbequem, aber zwingend: Ein `400` ist ein Client-Fehler, und eine
korrekt gebaute App wiederholt ihn nicht — zu Recht, denn beim zweiten Versuch
käme dasselbe heraus. Verwirft der Dienst bei `400` den Body, ist die Sichtung
endgültig weg, und zwar lautlos. Das passiert genau dann, wenn der portierte
Validierer an irgendeiner Stelle strenger ist als das Original: ein Datumsformat
mit Sekunden, eine E-Mail mit 65 Zeichen, ein Feldname, den die App anders
schreibt als das PDF.

Diese Sorge ist nicht hypothetisch. In diesem Projekt gibt es drei einander
widersprechende Beschreibungen allein der Fehlerantwort (Abschnitt 2.1) und einen
Feldnamen, den die Hauptanwendung anders schreibt als der Vertrag (2.2). Die
Annahme, ein Neubau träfe in jedem Detail exakt das, was die reale App sendet,
trägt nicht.

Der Vertrag bleibt davon unberührt: Der Client bekommt weiterhin sein `400` mit
den korrekten deutschen Feldmeldungen und merkt keinen Unterschied.

### Ablauf

1. **Body lesen**, Obergrenze 256 KB, hart am Stream durchgesetzt — nicht anhand
   von `Content-Length`, der ist eine Behauptung des Clients. Wird die Grenze
   erreicht, wird **das Gelesene behalten** und im Umschlag als abgeschnitten
   vermerkt, nicht verworfen
2. **Parsen** nach Kräften: JSON **oder** `application/x-www-form-urlencoded`.
   Die Hauptanwendung akzeptiert beides ausdrücklich für Mobile-Clients ohne
   `Content-Type` (`src/routes/rest_sichtungen/+server.ts:54`); das wird
   übernommen. Scheitert das Parsen, geht es ohne `payload` weiter — der
   Rohtext bleibt im Umschlag
3. **Validieren** — das Ergebnis wird im Umschlag festgehalten, nicht zur
   Abbruchbedingung gemacht
4. **Schreiben**: `.tmp` → `fsync` der Datei → `rename` → `fsync` des
   Verzeichnisses. Zielverzeichnis nach Ergebnis: `posteingang/` bei gültigen,
   `abgewiesen/` bei ungültigen Daten
5. **Erst danach antworten**: `201` mit `Location` und `{"message":"Saved"}` bei
   gültigen Daten, `400` mit der flachen Fehlerform aus 2.1 bei ungültigen

Der `fsync` des **Verzeichnisses** in Schritt 4 ist kein Detail: Ohne ihn kann
bei einem Stromausfall die Datei zwar geschrieben, der Verzeichniseintrag aber
noch nicht dauerhaft sein — die Datei ist dann nach dem Neustart verschwunden.

Schritt 5 ist die zentrale Zusage: **Es wird nie geantwortet, bevor die Daten
sicher auf der Platte liegen.** Schlägt das Schreiben fehl, gibt es `500`, damit
der Client es erneut versuchen kann — Doppel sind beim Import erkennbar und
allemal besser als Verlust. Eine Empfangsbestätigung für eine Sichtung, die
nirgends liegt, wäre der schwerwiegendste denkbare Fehler dieses Dienstes.

### Verbleibendes Restrisiko

Zwischen dem vollständigen Lesen des Bodys und dem Schreiben liegt reine
Rechenarbeit ohne Ein-/Ausgabe. Stirbt der Prozess genau in diesem Fenster —
Stromausfall, `OOM-Killer` —, ist der Request verloren. Das Fenster auf null zu
bringen erforderte zwei Schreibvorgänge je Request (erst roh, dann angereichert);
das Verhältnis von Aufwand zu gewonnener Sicherheit rechtfertigt das hier nicht.
Der Fall ist bewusst in Kauf genommen und hier festgehalten, damit er eine
Entscheidung bleibt und nicht zur Überraschung wird.

### `Location`-Header

Der Vertrag verlangt ihn; das PDF zeigt als Beispiel
`http://sichtungen/rest_sichtungen/view/1878.json`. Eine Datenbank-ID gibt es hier
nicht. Der Dienst vergibt eine fortlaufende Posteingangs-Nummer und setzt
`/rest_sichtungen/view/<lfd_nr>.json` — derselbe Pfad, den auch die
Hauptanwendung setzt und der in beiden Systemen auf eine nicht implementierte
Ressource zeigt. Beim Import erhalten die Sichtungen ihre echten IDs; die
Posteingangs-Nummer bleibt als Herkunftsnachweis erhalten.

### Bewusste Abweichung von der Hauptanwendung

`src/routes/rest_sichtungen/+server.ts:73` antwortet bei unparsbarem Body mit
HTTP **200** und `{"message":{"message":"No data send."}}`, bei leerem Objekt
dagegen mit 400. Ein `200` für einen nicht verarbeiteten Request ist irreführend —
ein Client darf daraus schließen, die Sichtung sei angekommen. Der neue Dienst
antwortet in beiden Fällen mit **400**, wie es der Vertrag für Validierungsfehler
vorsieht.

---

## 5. Ablage

Eine Datei je Sichtung. Der Dateiname entsteht aus Sequenz und Zeitstempel —
**niemals aus Nutzereingaben**:

```
000042__2026-07-30T09-12-33-123Z.json
```

```json
{
	"empfangen_am": "2026-07-30T09:12:33.123Z",
	"lfd_nr": 42,
	"quelle": {
		"ip": "…",
		"user_agent": "…",
		"content_type": "application/json"
	},
	"roh": "…Body als Text, exakt wie empfangen…",
	"abgeschnitten": false,
	"payload": {
		"…": "geparster Legacy-Body, unverändert, einschließlich unbekannter Felder"
	},
	"validierung": { "gueltig": true, "fehler": {} }
}
```

`roh` ist der Rückfallweg und der eigentliche Grund, warum nichts verloren gehen
kann: Selbst wenn Parsen und Validierung beide scheitern, steht der Text hier
Zeichen für Zeichen. `payload` fehlt dann ganz. Die Angabe `abgeschnitten`
markiert Bodys, die an der 256-KB-Grenze abgeschnitten wurden — die dürften
praktisch nicht vorkommen, aber wenn doch, soll das sichtbar sein und nicht
stillschweigend als vollständige Sichtung durchgehen.

### Verzeichnisse

```
<datenverzeichnis>/
├── posteingang/   # gültig, wartet auf Import
├── abgewiesen/    # Validierung fehlgeschlagen — braucht einen Menschen
└── importiert/    # erledigt, bleibt als Nachweis liegen
```

`abgewiesen/` ist kein Papierkorb, sondern eine Arbeitsliste. Was dort landet,
ist entweder Missbrauch — dann kann es weg — oder eine echte Sichtung, die der
Validierer zu Unrecht abgelehnt hat. Der zweite Fall ist genau der, dessentwegen
dieser Entwurf überarbeitet wurde, und er muss auffallen. **Das Verzeichnis
gehört deshalb in die Überwachung** (Abschnitt 11): Jeder Eintrag ist ein Hinweis
darauf, dass der Validierer und die reale App auseinanderliegen.

### Die laufende Nummer

`lfd_nr` wird **nicht** in einer eigenen Zählerdatei geführt — eine solche Datei
kann von den Sichtungsdateien abweichen und ist dann eine zweite Wahrheit. Der
Dienst ermittelt die höchste vorhandene Nummer beim Start aus den Dateinamen
(einschließlich `importiert/`) und zählt im Speicher weiter. Die Vergabe erfolgt
über eine serialisierte Warteschlange, sodass zwei gleichzeitige Requests nie
dieselbe Nummer bekommen.

Der Dateiname bleibt auch bei einem Fehler in der Nummernvergabe eindeutig, weil
der Zeitstempel in Millisekunden mit einfließt; die Nummer dient der
Nachvollziehbarkeit, nicht der Eindeutigkeit.

### Roher Payload

`payload` wird nicht umgeformt, nicht gemappt und nicht von unbekannten Feldern
bereinigt. Der Import kann ihn deshalb unverändert an `POST /rest_sichtungen` der
Hauptanwendung weiterreichen — kein zweites Mapping, keine Interpretation auf dem
Plesk-Server, keine Logik, die auseinanderaltern kann.

### Ablageort

Das Datenverzeichnis liegt **außerhalb des Plesk-Document-Roots**, `chmod 700`,
Pfad über Umgebungsvariable konfigurierbar. Andernfalls wären Namen,
E-Mail-Adressen, Anschriften und Telefonnummern der Melder über die Domain
abrufbar. **Das ist die wichtigste einzelne Einstellung des gesamten Aufbaus.**

Beim Start prüft der Dienst einmal, dass das Verzeichnis existiert und beschreibbar
ist, und bricht sonst mit klarer Meldung ab — ein Konfigurationsfehler soll beim
Deploy auffallen, nicht bei der ersten echten Sichtung.

### Personenbezug

Die IP im Umschlag ist personenbezogen. Sie ist gegenüber dem Payload — Name,
E-Mail, Anschrift, Telefon — das kleinere Thema und für die Missbrauchsabwehr das
einzige verfügbare Merkmal. Sie verschwindet mit dem Umschlag beim Import.

---

## 6. Härtung

Der Endpunkt bleibt ohne Authentifizierung, wie vom Vertrag vorgegeben. Der Schutz
liegt woanders:

- 256-KB-Grenze für den Body, hart am Stream durchgesetzt. Das Gelesene wird
  behalten und als abgeschnitten vermerkt (Abschnitt 4)
- **Rate-Limit pro IP: 100/Stunde, und es weist nichts ab, was schon gelesen
  wurde** — der Request wird geschrieben, die Antwort ist `429`. Zwei Gründe für
  beides: Mobilfunkanbieter setzen CGNAT ein, hunderte Nutzer teilen sich eine
  öffentliche IP, und der Wert der Hauptanwendung (20/Stunde,
  `RATE_LIMITS.SIGHTING_SUBMISSION`) ist für eine Mobile-App darum zu scharf. Und
  ein `429` an eine echte Meldewelle nach einem Zeitungsartikel wäre derselbe
  stille Verlust wie ein zu Unrecht vergebenes `400`
- **Globale Reißleine: 1.000/Stunde über alle IPs — die weist als einzige Regel
  ab, ohne zu schreiben.** Das ist die bewusste Ausnahme vom Leitsatz: Sie
  schützt nicht vor Missbrauch, sondern davor, dass eine Flut die Platte füllt
  und damit _alle_ nachfolgenden Sichtungen unschreibbar macht. Ein Angriff darf
  einzelne Requests kosten, aber nicht den gesamten Posteingang. Der Wert liegt
  weit über jedem realistischen Aufkommen und ist über eine Umgebungsvariable
  änderbar
- keine Nutzereingabe in Dateipfaden
- `X-Content-Type-Options: nosniff`
- kein CORS — die Legacy-Routen der Hauptanwendung haben ebenfalls keins
- TLS über Plesk/Let's Encrypt

**Kein erzwungener HTTPS-Redirect auf `/rest_sichtungen`.** Die Spec nennt
`http://` als Basis-URL. Ein `301` auf ein POST führt bei etlichen HTTP-Clients
dazu, dass der Body verloren geht — die Sichtung käme leer an. TLS anbieten ja,
erzwingen nein.

---

## 7. `antworten.json`

Die Hauptanwendung setzt diese Antwort aus vierzehn `formOptions`-Enums zusammen
(`src/routes/rest_sichtungen/antworten.json/+server.ts`). Das wird nicht
abgeschrieben.

Stattdessen: Die Antwort wird **einmal aus der laufenden Anwendung erzeugt** und
als eingefrorene `data/antworten.de.json` bzw. `antworten.en.json` mitgeliefert.
Dazu kommt ein Test **im Hauptrepo**, der bei jedem Lauf prüft, dass die
eingefrorenen Dateien noch exakt dem entsprechen, was die Route erzeugt.

Ändert jemand ein Label, wird der Test rot und nennt die Datei, die nachzuziehen
ist. Kein doppelt gepflegter Datenbestand, aber auch kein stilles Auseinanderdriften.

Die Enum-Erweiterungen `verteilung=4`, `verhalten=4`, `vonwo=5` und
`bootsantrieb=5` (siehe `docs/LEGACY_API_SPECIFICATION.md`, Abschnitte
„Abweichung von der Ursprungs-PDF") sind damit automatisch enthalten.

---

## 8. Tests

Der Kern ist ein **Vertragstest gegen die SvelteKit-Implementierung**: dieselben
Requests durch beide Systeme, die Antworten müssen übereinstimmen — mit Ausnahme
der in Abschnitt 2 und 4 begründeten, dokumentierten Abweichungen. Das ist der
einzige Mechanismus, der „100 % kompatibel" nachweist statt behauptet.

Das Hauptrepo hat dafür bereits eine Grundlage: `src/tests/contract/` prüft
Antworten mit `vitest-openapi` gegen `static/openapi.yml`
(`helpers/specSetup.ts`), und `legacy.contract.test.ts` deckt die Legacy-Routen
ab. Diese Mechanik lässt sich für `antworten.json` und `inBaltic.json`
weiterverwenden — die Schemata `LegacyLocationResponse` und
`LegacyAnswerOptions` beschreiben dort dasselbe, was der neue Dienst liefern muss.

**Für den Fehlerpfad taugt sie nicht.** `LegacyErrorResponse` in
`static/openapi.yml` beschreibt eine dritte, von PDF und Implementierung
abweichende Struktur (Abschnitt 2.1). Der Fehlerpfad wird deshalb direkt gegen
das PDF getestet, nicht gegen die OpenAPI-Spec. Solange die Spec nicht
korrigiert ist, wäre `toSatisfyApiSpec()` dort ein Test, der das Falsche
festschreibt.

### Der wichtigste Test

**Ein Request mit vollständigem Unsinn im Body hinterlässt trotzdem eine Datei.**

Dieser eine Test hält den Leitsatz aus Abschnitt 4 fest. Fällt er weg oder wird
er später „vereinfacht", ist der Dienst wieder einer, der Daten verwerfen kann.
Dazu gehören als Varianten: kaputtes JSON, leerer Body, Body ohne
`Content-Type`, Body in einem Format, das der Dienst gar nicht kennt — jedes Mal
liegt danach eine Datei in `abgewiesen/`, und `roh` enthält den gesendeten Text
unverändert.

### Weitere Fälle

- Drift-Test für die eingefrorenen `antworten.json`-Dateien (Abschnitt 7)
- Body-Grenze: 256 KB + 1 Byte wird abgeschnitten, geschrieben und als
  `abgeschnitten` markiert — **nicht** verworfen
- Rate-Limit pro IP: antwortet `429`, **schreibt aber trotzdem**
- globale Reißleine: weist ab, ohne zu schreiben — die einzige Regel, die das darf
- `x-www-form-urlencoded` ohne `Content-Type` → wird angenommen
- gültiger Body → `201`, Datei in `posteingang/`, `Location` gesetzt
- ungültiger Body → `400` mit den erwarteten deutschen Feldmeldungen, Datei in
  `abgewiesen/`
- gleichzeitige Requests erzeugen eindeutige Dateinamen, keine Lücken in der Sequenz
- **Schreibfehler ergibt 500, nicht 201** — ausdrücklich geprüft
- Umlaute in Namen überstehen JSON und Formularkodierung unverändert
- `inBaltic`: dieselben Koordinaten ergeben dieselbe Antwort wie in der Hauptanwendung

Testverfahren nach Projektregel `.claude/rules/testing.md`: Test zuerst, dann
Implementierung.

---

## 9. Import

Ein Skript im Hauptrepo liest das Verzeichnis und schickt jeden `payload`
unverändert an `POST /rest_sichtungen` der Hauptanwendung. Kein zweites Mapping.

Erfolgreich importierte Dateien wandern in ein Unterverzeichnis `importiert/`.
Die Datei selbst ist damit das Protokoll: Ein zweiter Lauf kann nichts doppelt
anlegen, und was liegen bleibt, ist genau das, was noch offen ist.

Beim Import ist die Feldnamen-Frage aus 2.2 zu berücksichtigen: Kommt
`sonstige_auffaelligkeiten` (mit `ae`) an, muss der Wert übernommen werden — die
Hauptanwendung erwartet derzeit den Umlaut.

---

## 10. Plesk-Einrichtung

Ausgangslage: Die Altanwendung auf schweinswalsichtung.de ist abgeschaltet, die
Node-Anwendung erhält die Domain. Damit sind alle Pfade frei und es braucht keine
Proxy-Sonderregeln.

Schritte:

1. Node.js-Extension der Domain aktivieren, Anwendungswurzel und Startdatei
   (`app.js`) setzen
2. `npm ci` über die Plesk-Oberfläche oder per SSH
3. Datenverzeichnis außerhalb des Document-Roots anlegen, `chmod 700`, Eigentümer
   ist der Anwendungsbenutzer der Domain; Pfad als Umgebungsvariable eintragen
4. Let's Encrypt aktivieren, **ohne** erzwungene HTTPS-Umleitung (Abschnitt 6)
5. Prüfen: `GET /rest_sichtungen/antworten.json` liefert die Enum-Tabelle,
   `GET /rest_sichtungen/inBaltic.json?location=53,10` liefert
   `{"inbaltic":false,"inchartarea":true}` (Beispiel aus dem PDF)

Deploy: Auschecken bzw. Kopieren des Unterordners, `npm ci`, Neustart der
Anwendung über Plesk.

---

## 11. Betrieb — Voraussetzung für die Inbetriebnahme

Die drei folgenden Punkte fängt **kein Code ab**. Ohne sie ist die Zusage
„es geht nichts verloren" nicht haltbar, egal wie sorgfältig der Dienst
geschrieben ist. Sie gehören deshalb zur Inbetriebnahme, nicht auf eine Liste
für später.

### Sicherung

Bis zum Import ist die Platte dieses Servers der **einzige** Ort, an dem eine
eingegangene Sichtung existiert. Ein Plattenausfall, ein versehentliches `rm`,
ein misslungenes Plesk-Update — und alles seit dem letzten Import ist weg.

Nötig sind beide Hälften:

- eine Sicherung des Datenverzeichnisses **auf einen anderen Rechner**, nicht nur
  ein Plesk-Backup auf derselben Maschine
- ein **regelmäßiger, kurz getakteter Import**, damit das ungesicherte Zeitfenster
  klein bleibt. Der Import ist damit nicht nur Datenübernahme, sondern der
  eigentliche Schutzmechanismus: Was importiert ist, liegt in der Datenbank der
  Hauptanwendung und fällt unter deren Sicherung

### Überwachung

Scheitert `app.js` beim Start — Datenverzeichnis fehlt, Rechte nach einem Update
falsch —, antwortet jeder Request mit `500`. Die App versucht es einige Male und
gibt auf. Das kann tagelang laufen, ohne dass es jemandem auffällt.

Nötig ist eine **externe** Überwachung, die den Dienst regelmäßig anspricht und
Alarm schlägt — extern, weil eine Überwachung auf demselben Server genau dann
mit ausfällt, wenn sie gebraucht wird. Dafür bekommt der Dienst einen
Health-Endpunkt, der prüft, ob das Datenverzeichnis beschreibbar ist, und nicht
nur, ob der Prozess antwortet.

Mit zu überwachen: **die Anzahl der Dateien in `abgewiesen/`.** Jeder Eintrag
dort ist ein Hinweis, dass Validierer und reale App auseinanderliegen — und damit
ein Frühwarnsignal für genau die Art Verlust, gegen die Abschnitt 4 gebaut ist.

### Plattenplatz

Plesk-Domains haben oft Kontingente. Ist die Platte voll, schlägt jedes Schreiben
fehl — und dann greift die einzige Schutzschicht, die es dagegen gibt, nämlich
`500` statt `201`. Der Client kann es wiederholen, aber irgendwann gibt er auf.

Nötig: eine Prüfung beim Start, eine laufende Überwachung des freien Platzes und
ein Alarm mit genug Vorlauf, um zu reagieren. Zu bedenken beim Bemessen: allein
der Geo-Index belegt 33 MB, dazu kommen die Protokolldateien.

---

## 12. Bewusst nicht enthalten

- **Keine Datenbank, kein PostGIS, keine Zugangsdaten** auf dem Plesk-Server
- **Kein E-Mail-Versand** — die Hauptanwendung benachrichtigt beim Import
- **Kein `showreports.json`** (Abschnitt 1)
- **Kein Medien-Upload** — nicht Teil des Vertrags
- **Kein Mapping ins neue Schema** — der Payload bleibt roh (Abschnitt 5)
- **Keine Admin-Oberfläche** — die Dateien liegen im Dateisystem
