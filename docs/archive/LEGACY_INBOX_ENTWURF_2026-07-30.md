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

1. **Rate-Limit** pro IP prüfen — 20 pro Stunde, entsprechend
   `RATE_LIMITS.SIGHTING_SUBMISSION` in der Hauptanwendung
2. **Body lesen** mit hartem Abbruch bei 64 KB. Der Abbruch erfolgt am Stream,
   nicht anhand von `Content-Length` — der Header ist eine Behauptung des Clients
3. **Parsen**: JSON **oder** `application/x-www-form-urlencoded`. Die
   Hauptanwendung akzeptiert beides ausdrücklich für Mobile-Clients, die keinen
   `Content-Type` senden (`src/routes/rest_sichtungen/+server.ts:54`); dieses
   Verhalten wird übernommen
4. **Validieren** → bei Fehler `400` mit der flachen Fehlerform aus 2.1
5. **Schreiben**: in `.tmp`-Datei schreiben → `fsync` → `rename`
6. **Erst danach** `201`, `Location`-Header, `{"message":"Saved"}`

Schritt 6 ist die zentrale Zusage des Dienstes: **Ein `201` wird erst gesendet,
wenn die Sichtung sicher auf der Platte liegt.** Schlägt das Schreiben fehl, gibt
es `500`, damit der Client es erneut versuchen kann. Eine Empfangsbestätigung für
eine Sichtung, die nirgends liegt, wäre der schwerwiegendste denkbare Fehler
dieses Dienstes.

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
	"payload": {
		"…": "roher Legacy-Body, unverändert, einschließlich unbekannter Felder"
	}
}
```

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

- 64-KB-Grenze für den Body, hart am Stream durchgesetzt
- Rate-Limit von 20/Stunde pro IP, dazu 500/Stunde über alle IPs als Reißleine.
  Beide antworten mit `429`. Der Vertrag kennt diesen Fall nicht — die
  Hauptanwendung antwortet ebenfalls mit `429`, und ein anderer Code wäre
  gegenüber einem Client irreführender. Der globale Wert liegt weit über dem
  bisherigen Aufkommen und greift nur bei einem Angriff; er ist über eine
  Umgebungsvariable änderbar, damit eine echte Meldewelle nicht abgewiesen wird
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

Dazu:

- Drift-Test für die eingefrorenen `antworten.json`-Dateien (Abschnitt 7)
- Body-Grenze: 64 KB + 1 Byte wird abgewiesen, ohne den Prozess zu belasten
- Rate-Limit greift und gibt den korrekten Statuscode
- kaputtes JSON → 400
- `x-www-form-urlencoded` ohne `Content-Type` → wird angenommen
- leerer Body → 400 mit den erwarteten deutschen Feldmeldungen
- gleichzeitige Requests erzeugen eindeutige Dateinamen, keine Lücken in der Sequenz
- **Schreibfehler ergibt 500, nicht 201** — ausdrücklich geprüft
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

## 11. Bewusst nicht enthalten

- **Keine Datenbank, kein PostGIS, keine Zugangsdaten** auf dem Plesk-Server
- **Kein E-Mail-Versand** — die Hauptanwendung benachrichtigt beim Import
- **Kein `showreports.json`** (Abschnitt 1)
- **Kein Medien-Upload** — nicht Teil des Vertrags
- **Kein Mapping ins neue Schema** — der Payload bleibt roh (Abschnitt 5)
- **Keine Admin-Oberfläche** — die Dateien liegen im Dateisystem
