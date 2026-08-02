# Legacy REST API Specification

**CRITICAL: 100% Compliance Required**

This specification is derived from the original schweinswalsichtung.de API documentation. The legacy APIs MUST maintain 100% compatibility with it, so that mobile clients built against the original API keep working.

**Status 2026-07-30: a client is connected.** A rebuilt iOS app identifying itself as `OstSeeTiere/8` is submitting sightings through `POST /rest_sichtungen`. The "nothing breaks" reasoning from earlier snapshots of this document no longer applies — a deviation now costs real data and cannot be repaired from this side, because the previous app is no longer available for testing and every behaviour it relies on must keep working exactly as documented. Field names, URL paths and data types must only change deliberately and documented; obvious defects may of course be fixed, but only as additions, never as replacements of an existing code path.

This is a dated status, not a standing guarantee — re-check whether further clients have been connected before making larger changes.

## Base URLs

- Test System: `http://test.schweinswalsichtung.de`
- Production System: `http://schweinswalsichtung.de`

## 1. Creating Sightings

### Endpoint

- **URL**: `/rest_sichtungen`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body (JSON Object)

| Attribute                   | Description                                                                                                  | Data Type / Range                   | Required                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------- |
| `sichtungsdatum`            | Date and time of sighting (German local time, Europe/Berlin — see [Zeitzonen-Semantik](#zeitzonen-semantik)) | DateTime, "YYYY-MM-DD HH:MI"        | Yes                                |
| `anzahl_gesamt`             | Total number of sighted animals. 0 is allowed and interpreted as death finding.                              | Integer                             | Yes                                |
| `vorname`                   | First name                                                                                                   | String (64)                         | Yes                                |
| `name`                      | Last name                                                                                                    | String (64)                         | Yes                                |
| `email`                     | Email address                                                                                                | E-Mail                              | Yes                                |
| `gps_breite`                | Latitude decimal                                                                                             | Decimal, -90 – 90                   | No                                 |
| `gps_laenge`                | Longitude decimal                                                                                            | Decimal, -180 – 180                 | No                                 |
| `fahrwasser`                | Waterway or area                                                                                             | Text                                | No                                 |
| `seezeichen`                | Sea mark or beach section                                                                                    | Text                                | No                                 |
| `vonwo`                     | Sighting location (4 = ferry, 5 = not specified, see note below)                                             | Integer-Range, 0-5                  | No                                 |
| `vonwo_text`                | Other sighting location (when vonwo = 0)                                                                     | Text                                | No                                 |
| `entfernung`                | Distance                                                                                                     | Integer-Range, 1-5                  | No                                 |
| `anzahl_schiffe`            | Number of ships in vicinity                                                                                  | Integer                             | No                                 |
| `anzahl_jung`               | Number of juvenile animals                                                                                   | Integer                             | No                                 |
| `verteilung`                | Distribution of animals (4 = not specified, see note below)                                                  | Integer-Range, 0-4                  | No                                 |
| `verteilung_text`           | Other distribution (when verteilung = 0)                                                                     | Text                                | No                                 |
| `aufnahme`                  | Filename of uploaded media                                                                                   | String (255)                        | No                                 |
| `aufnahmeHochladen`         | Media uploaded flag                                                                                          | Boolean, 0 = false, 1 = true        | No                                 |
| `verhalten`                 | Behavior of animals (4 = not specified, see note below)                                                      | Integer-Range, 0-4                  | No                                 |
| `verhalten_text`            | Other behavior (when verhalten = 0)                                                                          | Text                                | No                                 |
| `reaktion`                  | Reaction of animals                                                                                          | Text                                | No                                 |
| `sonstige_auffaelligkeiten` | Other observations                                                                                           | Text                                | No                                 |
| `seegang`                   | Sea state                                                                                                    | Integer-Range, 0-5                  | No                                 |
| `windrichtung`              | Wind direction                                                                                               | 'N','NW','W','SW','S','SO','O','NO' | No                                 |
| `windstaerke`               | Wind force in Beaufort                                                                                       | 0-12                                | No                                 |
| `sichtweite`                | Visibility                                                                                                   | Integer-Range, 1-4                  | No                                 |
| `schiffsname`               | Ship name                                                                                                    | String (64)                         | No, Yes if schiffnamensnennung = 1 |
| `heimathafen`               | Home port                                                                                                    | String (64)                         | No                                 |
| `bootstyp`                  | Boat type                                                                                                    | String (64)                         | No                                 |
| `bootsantrieb`              | Boat drive (5 = no boat, see note below)                                                                     | Integer-Range, 0-5                  | No                                 |
| `bootsantrieb_text`         | Other boat drive (when bootsantrieb = 0)                                                                     | Text                                | No                                 |
| `strasse`                   | Street                                                                                                       | String (64)                         | No                                 |
| `plz`                       | ZIP code                                                                                                     | String (5)                          | No                                 |
| `ort`                       | City                                                                                                         | String (64)                         | No                                 |
| `telefon`                   | Phone number                                                                                                 | String (64)                         | No                                 |
| `fax`                       | Fax number                                                                                                   | String (64)                         | No                                 |
| `namensnennung`             | Name mention desired?                                                                                        | Boolean, 0 = false, 1 = true        | No                                 |
| `schiffnamensnennung`       | Ship name display allowed?                                                                                   | Boolean, 0 = false, 1 = true        | No                                 |
| `bemerkungen`               | Comments                                                                                                     | Text                                | No                                 |
| `eingangskanal`             | Entry channel of report                                                                                      | Integer-Range, 0-5                  | No                                 |
| `tierart`                   | Reported animal species                                                                                      | Integer-Range, 0-10                 | No, Default = 0                    |
| `totfund`                   | Death finding                                                                                                | Boolean, 0 = false, 1 = true        | No                                 |
| `totfund_zustand`           | Condition of animal                                                                                          | Integer-Range, 0-5                  | No                                 |
| `totfund_geschlecht`        | Sex of animal                                                                                                | Integer-Range, 0-2                  | No                                 |
| `totfund_groesse`           | Size of animal in cm                                                                                         | Integer                             | No                                 |
| `totfund_telefon`           | DMM already informed by phone                                                                                | Boolean, 0 = false, 1 = true        | No                                 |

### Response

#### Successful Creation

- **HTTP Status**: `201 Created`
- **Headers**: `Location` header set to resource URL
- **Body**:

```json
{
	"message": "Saved"
}
```

#### Validation Errors

- **HTTP Status**: `400 Bad Request`
- **Body** (example):

```json
{
	"message": "Validation failed.",
	"errors": {
		"anzahl_gesamt": ["Dieses Feld kann nicht leer gelassen werden."]
	}
}
```

#### Server Errors

- **HTTP Status**: `500`

## 2. Retrieving Response Options

Retrieves response options for numeric fields as JSON array.

### Endpoint

- **URL**: `/rest_sichtungen/antworten.json`
- **URL (English)**: `/en/rest_sichtungen/antworten.json`
- **Method**: `GET`

### Response Format

JSON Object with the following structure:

```json
{
	"verteilung": {
		"0": "Sonstige Verteilung",
		"1": "einzeln",
		"2": "Mutter mit Jungtier",
		"3": "deutliche Schulen",
		"4": "Keine Angabe"
	},
	"verhalten": {
		"0": "Sonstiges Verhalten",
		"1": "Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)",
		"2": "Unterschiedlicher Kurs, kreisend, unregelmäßiges Tauchen (futtersuchend)",
		"3": "Langsames Schwimmen, längere Zeit an der Wasseroberfläche (ruhend)",
		"4": "Keine Angabe"
	},
	"seegang": {
		"0": "Keine Angabe",
		"1": "Glatte See, keine Wellen",
		"2": "Ruhige See, gekräuselte, kurze Wellen",
		"3": "Leicht bewegte See, Schaumköpfe",
		"4": "Grobe See, lange, brechende Wellen",
		"5": "Hohe See, Wellenberge und Gischt"
	},
	"bootsantrieb": {
		"0": "Sonstiger Bootsantrieb",
		"1": "Motor",
		"2": "Segel",
		"3": "treibend",
		"4": "vor Anker",
		"5": "Kein Boot"
	},
	"eingangskanal": {
		"0": "Web",
		"1": "E-Mail",
		"2": "Post",
		"3": "Fax",
		"4": "App",
		"5": "Telefon"
	},
	"entfernung": {
		"1": "weniger als 10 Meter",
		"2": "10 bis 50 Meter",
		"3": "50 bis 100 Meter",
		"4": "100 bis 500 Meter",
		"5": "mehr als 500 Meter"
	},
	"vonwo": {
		"0": "Sonstiges",
		"1": "Segelschiff",
		"2": "Motorboot",
		"3": "Land",
		"4": "Fähre",
		"5": "Keine Angabe"
	},
	"sichtweite": {
		"1": "Außergewöhnlich klar (mehr als 20km)",
		"2": "Klar (bis 20km)",
		"3": "Diesig (bis 4km)",
		"4": "Nebel (bis 1km)"
	},
	"totfund_zustand": {
		"0": "unbekannt",
		"1": "keine Anzeichen von Verwesung",
		"2": "sehr frisch, als ob gerade gestorben",
		"3": "Aufblähung, leichte Hautablösungen",
		"4": "Fortgeschrittene Verwesung, starke Aufblähung",
		"5": "Starke Verwesung, mumifiziert oder Skelettteile"
	},
	"totfund_geschlecht": {
		"0": "unbekannt",
		"1": "weiblich",
		"2": "männlich"
	},
	"tierart": {
		"0": "Schweinswal",
		"1": "Kegelrobbe",
		"2": "Seehund",
		"3": "Delphin (mehrere Arten)",
		"4": "Beluga",
		"5": "Zwergwal",
		"6": "Finnwal",
		"7": "Buckelwal",
		"8": "Unbekannte Walart",
		"9": "Ringelrobbe",
		"10": "Unbekannte Robbenart"
	}
}
```

## 3. Position Checking

Checks if a position (coordinates) lies in the Baltic Sea or in the live sighting map area.

### Endpoint

- **URL**: `/rest_sichtungen/inBaltic.json`
- **Method**: `GET`

### Parameters

| Parameter  | Description                                                     | Data Type / Range | Required |
| ---------- | --------------------------------------------------------------- | ----------------- | -------- |
| `location` | Position specification: Latitude and longitude, comma separated | Decimal, Decimal  | Yes      |

### Response

JSON Object:

| Attribute     | Description                                  | Data Type / Range |
| ------------- | -------------------------------------------- | ----------------- |
| `inbaltic`    | True if position is in Baltic Sea (in water) | Boolean           |
| `inchartarea` | True if position is in displayed map area    | Boolean           |

### Example

**Request**: `/rest_sichtungen/inBaltic.json?location=53,10`

**Response** (aktuell):

```json
{
	"inbaltic": false,
	"inchartarea": false
}
```

> **Abweichung vom Ursprungs-PDF.** Dort lautet die Antwort auf dieselbe Anfrage
> `{"inbaltic": false, "inchartarea": true}`. Seit der Bereinigung der
> Ostsee-Geometrie am 2026-07-30 liegt die Südgrenze des Kartenbereichs bei
> **53,55° N** statt bei 53,0° — die Beispielkoordinate 53,10 (Raum Hamburg)
> fällt damit aus dem Kartenbereich heraus.
>
> Die Antwort selbst ist also unverändert korrekt berechnet; nur das im PDF
> gewählte Beispiel liegt inzwischen jenseits der Grenze. Wer eine Koordinate
> zum Prüfen von `inchartarea: true` braucht, nimmt einen Punkt innerhalb der
> Ostsee-Bounding-Box, etwa `location=53.63,11.41` (Schwerin).

## 4. Retrieving Sighting Data

Returns all reports of a year that are approved and marked as lying in the Baltic Sea. Only "public" data is returned. Name, first name and ship name fields are only included if the user has released this data.

### Endpoint

- **URL**: `/sichtungen/showreports.json`
- **Method**: `GET`

### Parameters

| Parameter  | Description                                                                                                                                                                                                                  | Data Type / Range                                                | Required |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------- |
| `year`     | Year                                                                                                                                                                                                                         | Year YYYY                                                        | No       |
| `location` | Position specification: Latitude and longitude, comma separated. Returns all reports within radius of this position (default radius 100 km)                                                                                  | Latitude, Longitude                                              | No       |
| `distance` | Distance in meters for radius search, only used with "location"                                                                                                                                                              | Integer                                                          | No       |
| `bbox`     | Area specification defined by lower left and upper right corner in degrees, separated by commas. Format: Longitude lower left, Latitude lower left, Longitude upper right, Latitude upper right. Compatible with OpenLayers. | Longitude min_x, Latitude min_y, Longitude max_x, Latitude max_y | No       |
| `search`   | Searches for given text in fields Email, Name, First name and Ship name. Partial string search (%<text>%). **Restricted for anonymous callers — see [Deviation: consent-gated search](#deviation-consent-gated-search).**    | String                                                           | No       |

### Deviation: consent-gated search

This is the **one deliberate deviation** from the original specification in this
endpoint. Introduced 2026-07-31 after a data-protection review.

| Caller              | Fields searched                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Anonymous (default) | First name + Last name **only if `namensnennung = 1`**, Ship name **only if `schiffnamensnennung = 1`**. Email is **not** searched at all. |
| Logged-in admin     | Email, First name, Last name, Ship name — unrestricted, exactly as specified above.                                                        |

**Why.** The _response_ has always been consent-gated: `na` is only emitted when
the reporter released their name, `sh` only when they released the ship name.
The _result count_ was not. A `search=` request therefore let any anonymous
caller confirm whether a given email address or name exists in the database —
including for reporters who never consented to being named. That is a membership
oracle over personal data and contradicts the promise made in the reporting form
("Ihre Kontaktdaten verwenden wir ausschließlich für Rückfragen zu Ihrer
Meldung"). Email is dropped entirely rather than gated, because the field is
never part of any response and searching it serves no legitimate purpose for a
public client.

The gating mirrors `/api/map/sightings`, so both public surfaces expose the same
subset. Additionally, LIKE wildcards (`%`, `_`, `\`) in the search term are
escaped and matched literally; previously `search=%` matched every record.

Both surfaces build the predicate from `src/lib/server/db/consentGatedSearch.ts`
rather than each spelling it out, so the "same subset" claim above cannot drift
apart in a later edit. The one intended difference stays explicit: this endpoint
passes `ILIKE` (case-insensitive, as specified), the map passes `LIKE`.

**Impact on clients.** A client searching by email, or by the name of a reporter
without consent, now receives an empty array instead of results. No field name,
URL path, data type or response structure changed. Admin clients are unaffected.

Pinned by `src/routes/sichtungen/showreports.json/showreports.test.ts`
(`Datenschutz - Suche über personenbezogene Felder`).

### Response Format

JSON Array with JSON Objects:

| Attribute | Description                                                                             | Data Type / Range                                   |
| --------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `ts`      | Unix Timestamp                                                                          | Unix Timestamp                                      |
| `id`      | Report ID                                                                               | Integer                                             |
| `dt`      | Date (German local time, Europe/Berlin — see [Zeitzonen-Semantik](#zeitzonen-semantik)) | String, DD.MM.YY                                    |
| `ti`      | Time (German local time, Europe/Berlin — see [Zeitzonen-Semantik](#zeitzonen-semantik)) | String, HH:MI                                       |
| `lat`     | Latitude                                                                                | Decimal (as string)                                 |
| `lon`     | Longitude                                                                               | Decimal (as string)                                 |
| `ct`      | Total number of sighted animals                                                         | Integer                                             |
| `yo`      | Number of juveniles                                                                     | Integer                                             |
| `sh`      | Ship name                                                                               | String                                              |
| `na`      | Sighter name (First name + Last name)                                                   | String                                              |
| `ar`      | Waterway / Area                                                                         | String                                              |
| `bm`      | Result of position check; only delivered for logged in admin                            | Integer: 0 = Outside, 1 = inchartarea, 2 = inbaltic |
| `va`      | Entry checked; only delivered for logged in admin                                       | Boolean: 0 = False, 1 = True                        |

### Example Response

```json
[
	{
		"ts": 1327499400,
		"id": 817,
		"dt": "25.01.12",
		"ti": "14:50",
		"lat": "54.646667",
		"lon": "11.333333",
		"ct": 1,
		"yo": 0,
		"sh": "Fährschiff \"Deutschland\"",
		"na": "Jörg Schneider"
	},
	{
		"ts": 1333116600,
		"id": 826,
		"dt": "30.03.12",
		"ti": "16:10",
		"lat": "56.093587",
		"lon": "10.512543",
		"ct": 1,
		"yo": 0,
		"na": "Jörg Hiller"
	}
]
```

## Critical Implementation Notes

1. **Field Names**: All field names MUST match exactly as specified. Mobile apps depend on exact field names.

2. **Data Types**: Pay special attention to data types:
   - Coordinates in showreports.json MUST be strings, not numbers
   - Boolean fields use 0/1 integers, not true/false
   - Date formats must match exactly (DD.MM.YY for showreports, YYYY-MM-DD HH:MI for input)
   - All date/time values are German local time (Europe/Berlin), never UTC — see [Zeitzonen-Semantik](#zeitzonen-semantik)

3. **URL Paths**: URLs must match exactly - no additional prefixes like `/api/legacy/`

4. **Response Formats**: Response structures must match exactly, including field order and naming

5. **Wind Direction**: Must include all values: 'N','NW','W','SW','S','SO','O','NO' (note 'SO' for southeast)

6. **Backward Compatibility**: Any changes that break existing mobile app functionality are strictly forbidden.

## Abweichung von der Ursprungs-PDF: `verteilung = 4` und `verhalten = 4`

Beide Felder kannten ursprünglich nur **0–3**. Seit dem 2026-07-29 gibt es
jeweils zusätzlich **`4` = „Keine Angabe"**.

**Warum:** `verteilung` und `verhalten` sind `integer default(0) notNull`, und
`0` bedeutet dort „Sonstige Verteilung" bzw. „Sonstiges Verhalten" — echte
Kategorien. Beide Felder sind im Formular **nicht** verpflichtend; eine fehlende
Antwort wurde trotzdem als aktive Aussage gespeichert.

Messung 2026-07-29 (19.880 Zeilen):

| Feld         | Zeilen mit `0`  | davon mit Freitext | Freitext-Quote der übrigen Werte |
| ------------ | --------------- | ------------------ | -------------------------------- |
| `verteilung` | 15.129 (76,1 %) | 632 (4,2 %)        | 0,0–0,6 %                        |
| `verhalten`  | 9.192 (46,2 %)  | 892 (9,7 %)        | 0,0–0,4 %                        |

Bei `verteilung` war „Sonstige Verteilung" dadurch mit 76 % die dominierende
Kategorie — vor „Einzeln" (3.046). Rechnet man die Nicht-Antworten heraus, ist
„Einzeln" die häufigste Verteilung und „Sonstige" die seltenste.

**Der Bestand wurde NICHT umgeschrieben.** Die Zeilen mit Freitext sind echte
„Sonstige"-Antworten, und für die übrigen gibt es keine Spalte, aus der
hervorginge, welche nie beantwortet wurden. `4` verhindert nur, dass **neue**
Zeilen dieselbe Doppeldeutigkeit erben.

**Auswirkung auf Clients:** `antworten.json` liefert je einen zusätzlichen
Schlüssel, `POST` akzeptiert `4` zusätzlich, bestehende Werte bleiben
unverändert. Im Formular ist `4` nicht auswählbar.

## Abweichung von der Ursprungs-PDF: `vonwo = 5`

Die Feldtabelle dieses Dokuments nannte für `vonwo` bis zum 2026-07-29 den
Bereich **0–3**. Das war schon vorher falsch: `4` = „Fähre" existiert seit jeher
und wird von 281 Bestandszeilen benutzt. Korrigiert auf **0–5**.

Neu ist **`5` = „Keine Angabe"**.

**Warum:** Die Spalte `vonwo` ist `integer default(0) notNull`, und `0` bedeutet
„Sonstiges". Wurde nichts angegeben, entstand trotzdem eine `0` — der Datensatz
behauptete also eine Antwort, die nie gegeben wurde.

**Wichtig — der Bestand wurde bewusst NICHT umgeschrieben.** Anders als beim
Bootsantrieb ist „Sonstiges" hier eine echte, häufig genutzte Kategorie: 713 der
1.833 Null-Zeilen tragen einen Freitext in `vonwo_text` (Kajak 91×,
Mehrzweckschiff 37×, SUP 31×, Ruderboot 24×, Seekajak 20× …), 538 einen
Schiffsnamen. Zum Vergleich: bei allen anderen `vonwo`-Werten ist `vonwo_text`
in unter 0,5 % der Zeilen gefüllt. Für die verbleibenden Zeilen ohne jedes Indiz
(709) gibt es keine ableitbare Wahrheit — es existiert keine zweite Spalte, aus
der hervorginge, wo jemand stand. `5` verhindert deshalb nur, dass **neue**
Zeilen dieselbe Doppeldeutigkeit erben.

**Auswirkung auf Clients:** analog zu `bootsantrieb = 5` (siehe unten) —
`antworten.json` liefert einen zusätzlichen Schlüssel, `POST` akzeptiert den
Wert zusätzlich, bestehende Werte bleiben unverändert. `5` ist im Formular nicht
auswählbar und entsteht ausschließlich serverseitig.

## Abweichung von der Ursprungs-PDF: `bootsantrieb = 5`

Die Original-Spezifikation kennt für `bootsantrieb` nur den Bereich **0–4**.
Seit dem 2026-07-29 gibt es zusätzlich **`5` = „Kein Boot"**.

**Warum:** Die Spalte `bootsantrieb` ist `integer default(0) notNull`, und `0`
bedeutet „Sonstiger Bootsantrieb" — nicht „unbekannt" und nicht „kein Boot".
Jede Sichtung von Land (`vonwo = 3`) trug dadurch die aktive Behauptung, es habe
ein Boot mit ungewöhnlichem Antrieb gegeben. Betroffen waren 5.858 von 19.880
Zeilen (29,5 %); „Sonstiger" war dadurch in jeder Antriebs-Auswertung fälschlich
die häufigste Kategorie, vor Motor und Segel.

**Auswirkung auf Clients:**

- `GET /rest_sichtungen/antworten.json` liefert einen zusätzlichen Schlüssel
  `"5": "Kein Boot"`. Clients, die die Liste dynamisch rendern, brauchen keine
  Änderung; Clients mit fest verdrahteter 0–4-Tabelle zeigen für `5` keinen
  Text an und müssen den Wert nachtragen.
- `POST /rest_sichtungen` akzeptiert `5` zusätzlich zu 0–4. Bestehende Werte
  behalten ihre Bedeutung unverändert — es wurde nichts umnummeriert.
- `GET /sichtungen/showreports.json` kann `5` in Bestandsdaten zurückgeben.

**Nicht auswählbar im Formular:** `5` entsteht ausschließlich serverseitig
(`mapFormToSighting`). Im Antriebs-Dropdown wird der Wert bewusst nicht
angeboten — dort stehen weiterhin nur 0–4.

**Seit 2026-07-29 ist `5` der generelle Fallback**, nicht nur bei
Land-Sichtungen: Wurde kein Antrieb angegeben, wird `5` geschrieben statt `0`.
`0` entsteht damit nur noch durch eine aktive Auswahl des Melders.

Bekannte Unschärfe: `5` heißt wörtlich „Kein Boot". Bei einer Sichtung von einer
Fähre oder von „Sonstiges" (Kajak, SUP) ist ein Fahrzeug im Spiel, dessen
Antrieb nur niemand angegeben hat — dort ist `5` streng genommen zu stark.
Bewusst in Kauf genommen: Ein eigener Wert „Antrieb unbekannt" wäre eine dritte
Vertragsänderung an derselben Spalte, und eine erfundene Antriebsart wiegt
schwerer als „kein Boot" bei einem Kajak.

## Abweichung von der Ursprungs-PDF: `windrichtung` akzeptiert englische Abkürzungen

Der neu gebaute iOS-Client (`OstSeeTiere/8`) sendet Windrichtungen als englische
Abkürzungen, nicht als die in diesem Dokument spezifizierten deutschen. Seit
dem 2026-07-30 akzeptiert `POST /rest_sichtungen` beide Schreibweisen und
normalisiert englische Eingaben serverseitig auf die deutsche Form, weil die
DB-Spalte, das Formular und `antworten.json` ausschließlich die deutsche Form
kennen.

Deutsch und Englisch unterscheiden sich in genau drei der acht Werte:

| Deutsch (Vertrag) | Englisch (neuer Client) |
| ----------------- | ----------------------- |
| `NO`              | `NE`                    |
| `O`               | `E`                     |
| `SO`              | `SE`                    |

`N`, `S`, `W`, `NW` und `SW` sind in beiden Sprachen identisch und brauchen
keine Abbildung.

**Auswirkung auf Clients:** Deutsche Eingaben laufen unverändert durch — für
den alten Client, der nicht mehr testbar ist, ändert sich nichts. Ein
unbekannter Wert (weder eine der acht deutschen Formen noch eine der drei
englischen Abkürzungen) ergibt weiterhin `''`, wie bisher.

## Abweichung von der Ursprungs-PDF: `windstaerke` akzeptiert 0

Die Feldtabelle dieses Dokuments nannte für `windstaerke` bis zum 2026-07-30
den Bereich **1-12**. Das war falsch: Die Beaufort-Skala beginnt bei **0**
(Windstille), und der neue iOS-Client sendet diesen Wert tatsächlich
(beobachtet in fünf Einreichungen). Korrigiert auf **0-12**.

**Warum das vorher brach:** Die serverseitige Umwandlung prüfte `windstaerke`
auf Wahrheitswert (`legacyData.windstaerke ? Number(...) : undefined`). Eine
aktiv gemeldete `0` ist in JavaScript falsy und wurde deshalb wie ein fehlendes
Feld behandelt — die Windstärke ging verloren.

**Auswirkung auf Clients:** `windstaerke: 0` wird jetzt als `0` übernommen,
nicht mehr verworfen. Fehlende Angabe (`undefined`, `null`, leerer String)
ergibt weiterhin `undefined`, wie bisher. Das Feld kommt als Zahl aus
JSON-Submissions oder als String aus Formular-Encoding — beide Formen werden
akzeptiert.

## `namensnennung` und `schiffnamensnennung`: nur eine explizite `1` ist Zustimmung

Der neue iOS-Client sendet weder `namensnennung` noch `schiffnamensnennung`.
Beide werden serverseitig als Zustimmungs-Flags interpretiert
(`nameConsent`/`shipNameConsent`), und ein fehlendes Feld ergibt „nein" (`0`
bzw. `false`) — nicht „ja".

**Das ist beabsichtigt und dient dem Datenschutz.** Name und Schiffsname eines
Melders dürfen nur veröffentlicht werden, wenn eine ausdrückliche Zustimmung
vorliegt. Ein fehlendes Feld ist keine Zustimmung. Würde man das Fehlen als
`1` interpretieren, würde für jede Meldung des neuen Clients eine Einwilligung
erfunden, die nie gegeben wurde.

**Die drei Fälle im Einzelnen** — sie waren bis zum 2026-07-30 nicht sauber
getrennt und dürfen nicht wieder zusammenfallen:

| Übermittelter Wert                     | Ergebnis         |
| -------------------------------------- | ---------------- |
| Feld fehlt (`undefined`, `null`, `''`) | keine Zustimmung |
| explizit `0` bzw. `'0'`                | keine Zustimmung |
| explizit `1` bzw. `'1'`                | **Zustimmung**   |

**Korrektur 2026-07-30:** Der mittlere Fall war fehlerhaft. Die Umwandlung
lautete `legacyData.namensnennung ? true : false`, und über den
Formulardaten-Pfad (`application/x-www-form-urlencoded`, ausgepackt mit
`Object.fromEntries(formData.entries())`) kommt jeder Wert als **String** an.
Ein vertragskonformes `namensnennung=0` war damit `'0'` — in JavaScript
truthy. Ein Melder, der die Veröffentlichung seines Namens ausdrücklich
untersagt hatte, wurde in `showreports.json` mit Namen geführt. Betroffen
waren fünf Flags: `namensnennung`, `schiffnamensnennung`,
`datenschutzEinverstaendnis`, `aufnahmeHochladen` und `totfund_telefon`. Alle
werden jetzt numerisch ausgewertet, wie `totfund` schon vorher.

**Auswirkung auf Clients:** JSON-Submissions mit den Zahlen `0` und `1`
verhalten sich unverändert. Formular-Submissions mit `'0'` werden jetzt als
Ablehnung gewertet statt als Zustimmung.

**Für spätere Bearbeitung festgehalten:** Dass ein **fehlendes** Feld keine
Zustimmung ergibt, ist kein Bug und soll nicht durch einen Default auf `true`
„korrigiert" werden. Wenn der Client diese Felder künftig sendet, greift die
Zustimmung des Melders wie gewohnt.

## Zusätzlich akzeptiert: `sonstige_auffälligkeiten` (Umlaut-Variante)

Vertragsname ist und bleibt `sonstige_auffaelligkeiten` (mit `ae`), so wie ihn
das Originaldokument nennt.

Diese Implementierung las bis zum 2026-07-30 **ausschließlich** die
Umlaut-Schreibweise `sonstige_auffälligkeiten` (`src/lib/legacy-api/types.ts`,
`yup-validation.ts`, `field-mapping.ts`). Ein spec-konformer Client verlor
seinen Freitext dadurch kommentarlos — `otherObservations` wurde `''`, ohne
Validierungsfehler.

**Seit dem 2026-07-30 werden beide Schreibweisen gelesen**, der Vertragsname hat
Vorrang, wenn beide im selben Request stehen. Die Umlaut-Variante ist in
`static/openapi.yml` als `deprecated` markiert und existiert nur, damit bereits
gegen diese App gebaute Clients nichts verlieren. Neue Clients benutzen
`sonstige_auffaelligkeiten`.

Kein Effekt auf Ausgaben: `showreports.json` liefert dieses Feld nicht.

## Korrektur 2026-07-30: Form der Fehlerantwort

Der Abschnitt [Validation Errors](#validation-errors) war schon immer die
verbindliche Form (`message` als String, `errors` daneben) — die
Implementierung wich davon ab und schachtelte
`{"message": {"message": …, "errors": …}}`. `static/openapi.yml` beschrieb mit
`{"error": …, "message": …}` eine dritte, wieder andere Struktur ohne
`errors`-Objekt.

Beide sind seit dem 2026-07-30 auf die flache Form des Originaldokuments
korrigiert. Ein Client, der `message` vertragsgemäß als Text liest, bekam vorher
ein Objekt.

Betroffen sind der 400er-Validierungsfehler, die `"No data send."`-Antwort
(die dieser Endpunkt mit Status **200** ausliefert) und der 500er-Pfad für
unerwartete Fehler.

**Nicht** betroffen ist der 500er nach einem fehlgeschlagenen Schreibvorgang: Er
liefert weiterhin `{"error": "Failed to save sighting", "message": "Internal
server error occurred"}` und damit einen `error`-Schlüssel, den die flache
Vertragsform nicht kennt. `static/openapi.yml` dokumentiert für 500 deshalb
beide Formen.

## Korrektur 2026-07-30: `fax` und `totfund` wurden verworfen

Beide Felder standen in der Validierung, landeten aber nirgends — dieselbe
Fehlerklasse wie bei `sonstige_auffaelligkeiten` oben.

- **`fax`**: Die DB-Spalte `fax` existiert seit immer, aber das Feld fehlte im
  Formular-Schema (`sightingSchema`) und damit in `SightingFormData`. Der
  Legacy-Adapter hatte kein Ziel für den Wert. `fax` ist jetzt im Schema (ohne
  `.meta()`, also kein Formularfeld) und wird von `mapFormToSighting`
  geschrieben.
- **`totfund`**: `isDead` wurde ausschließlich aus `anzahl_gesamt = 0`
  abgeleitet. Ein explizites `totfund: 1` bei `anzahl_gesamt > 0` verschwand.
  Beide Wege gelten jetzt, und beide werden string-tolerant ausgewertet — der
  Formulardaten-Pfad liefert `Object.fromEntries(formData.entries())`, also
  Strings, und `'0' === 0` ist in TypeScript false.

Genau das trifft den neuen iOS-Client: Er sendet `totfund: 1` zusammen mit einem
`anzahl_gesamt` > 0 (beobachtet: 1, 2, 3, 7). Ein Totfund neben lebenden Tieren
ist eine reale Situation (z. B. ein verendetes Jungtier neben einer Gruppe).
Solche Meldungen wurden vorher als lebende Sichtung gespeichert, obwohl sie
gleichzeitig `totfund_zustand`, `totfund_geschlecht`, `totfund_groesse` und
`totfund_telefon` trugen — ein in sich widersprüchlicher Datensatz. Da Totfunde
die zeitkritischen Meldungen für das Deutsche Meeresmuseum sind, war das mehr
als ein Ordnungsproblem.

`totfund` ersetzt die `anzahl_gesamt = 0`-Konvention nicht, sondern ergänzt sie:
Beide sind gleichberechtigte Wege zu einem Totfund. Der alte Client kennt
`totfund` nicht und meldet Totfunde weiterhin ausschließlich über
`anzahl_gesamt = 0`; dieser Weg bleibt unverändert funktionsfähig.

## Bewusst nicht umgesetzt: der Ostsee-Filter in `showreports.json`

Abschnitt 4 beschreibt die Grundmenge als „approved **and marked as lying in the
Baltic Sea**". Der zweite Teil ist **absichtlich nicht implementiert**. Der
Endpunkt filtert ausschließlich `freigegeben_am IS NOT NULL`.

**Grund 1 — `ostsee = 0` heißt „nicht berechnet", nicht „nicht in der Ostsee".**
Die Berechnung des Wertes wurde erst nachträglich eingeführt; für den davor
entstandenen Bestand steht der Default `0` in der Spalte, ohne dass je eine
Positionsprüfung stattgefunden hätte. Der Wert ist damit **kein** Prädikat, auf
das man filtern kann — er ist teilweise unbefüllt.

Messung am 2026-07-30 über die 19.262 freigegebenen Zeilen der lokalen DB:

| Spalte       | `= 1`  | `= 0` | `NULL` |
| ------------ | ------ | ----- | ------ |
| `ostsee`     | 10.028 | 9.234 | 0      |
| `ostsee_geo` | 3.838  |       |        |

Von den 9.234 Zeilen mit `ostsee = 0` liegen **9.135 (98,9 %) im Kartenbereich**
(53–66 N, 9–31 O) — es sind plausible Ostsee-Sichtungen, für die nur niemand die
Prüfung gerechnet hat. Umgekehrt tragen 179 Zeilen mit `ostsee = 1` überhaupt
keine Koordinaten.

Die Quote schwankt jahrgangsweise stark und **nicht monoton** (2012: 93 %, 2020:
27 %, 2021: 73 %). Sie folgt also nicht einfach dem Einführungszeitpunkt — für
einen Backfill heißt das, dass die vorhandenen `1`-Werte nicht automatisch
vertrauenswürdiger sind als die `0`-Werte und die Herkunft der Altwerte mit
geklärt werden muss.

Ein Filter auf `ostsee = 1` würde damit rund **9.100 echte Sichtungen (48 %)**
aus der öffentlichen Ausgabe entfernen. `ostsee = 1 OR ostsee_geo = 1` wären
immer noch 7.383 (38 %).

**Grund 2 — `.claude/rules/api.md` verbietet es.** Dort ist die öffentliche
Grundmenge verbindlich auf `approvedAt IS NOT NULL` festgelegt, ausdrücklich für
die Legacy-API **und** die moderne Karte, mit der Begründung, dass zwei
verschiedene Filter für zwei öffentliche Flächen zwangsläufig auseinanderlaufen.
Beide Flächen beziehen das Prädikat inzwischen aus derselben Quelle —
`approvedOnly()` in `src/lib/server/db/approvalFilter.ts` —, dieser Endpunkt
ebenso wie `/api/map/sightings`. Ein zusätzlicher Marker-Filter nur hier wäre
genau der Divergenzfall, den das verhindern soll.

**Was das für Clients heißt:** Die Ergebnismenge ist eine Obermenge dessen, was
die Spec beschreibt. Ein Client bekommt zusätzliche Meldungen, keine fehlenden —
die verträglichere Richtung. Die Felder `bm`/`va` wären der vertragsgemäße Weg,
das Ergebnis der Positionsprüfung an Clients zu übermitteln — sie werden derzeit
gar nicht ausgeliefert, auch nicht an eingeloggte Admins.

**Offen — Backfill, aber erst nach der Überarbeitung der Geo-Funktion.** Der
Bestand muss nachgerechnet werden, bevor der Filter überhaupt bewertbar ist. Das
darf aber nicht mit der heutigen Prüfung passieren: Die Küstenabgrenzung wird
gerade überarbeitet (Stand `docs/archive/`-Analyse vom 2026-07-29: eine
Distanzschwelle taugt nicht als Kriterium, weil Schlei, Elbe und Trave bis 74 km
„binnenlands" liegen — brauchbar ist nur eine ungeteilte OSM-Küstenlinie). Ein
Backfill mit der alten Funktion müsste danach ein zweites Mal laufen und würde
zwischenzeitlich falsche Werte als geprüft ausweisen.

Reihenfolge also: Geo-Funktion überarbeiten → Backfill → Marker bewerten →
Filter entscheiden. Bis dahin bleibt der Filter aus.

## Zeitzonen-Semantik

Alle Datums-/Uhrzeitwerte dieser Legacy API sind **deutsche Ortszeit
(Europe/Berlin)** — nie UTC. Das gilt für Eingabe und Ausgabe gleichermaßen:

- **Eingabe** — `sichtungsdatum` (`POST /rest_sichtungen`, Format
  `"YYYY-MM-DD HH:MI"`): Der Wert wird als deutsche Wanduhrzeit interpretiert
  und serverseitig nach UTC umgerechnet, bevor er in der Datenbank
  (`sichtungsdatum`, `timestamp without time zone`, echtes UTC) gespeichert
  wird.
- **Ausgabe** — `dt`/`ti` (`GET /sichtungen/showreports.json`): Beide Felder
  werden aus dem gespeicherten UTC-Zeitpunkt zurück nach Europe/Berlin
  konvertiert, nicht roh ausgegeben.

**Warum deutsche Ortszeit und nicht UTC:** Die Ostsee-Daten haben als
fachliche Konvention einen einheitlichen Bezugszeitpunkt — deutsche Ortszeit.
Das gilt bewusst auch für Sichtungen in östlichen Randgewässern (z. B.
estnische/finnische Küste, EET/EEST), die eine Stunde vor Berlin liegen: Es
wird nicht nach Sichtungsort umgerechnet, sondern einheitlich die deutsche
Ortszeit als Referenz verwendet.

Die interne Speicherung als UTC (seit der Migration
`src/tools/migrate-timestamps-to-utc.js`, siehe
`docs/DATABASE_MIGRATION.md`) ist reine Implementierungsdetail und ändert an
dieser vertraglichen Ein-/Ausgabe-Semantik nichts. Referenz für die
zugrundeliegende Zeitzonen-Konvention: `docs/ENVIRONMENT.md`, Abschnitt `TZ`.
