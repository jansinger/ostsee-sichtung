# Legacy REST API Specification

**CRITICAL: 100% Compliance Required**

This specification is derived from the original schweinswalsichtung.de API documentation. The legacy APIs MUST maintain 100% compatibility with it, so that mobile clients built against the original API keep working.

**Status 2026-07-28: no clients are connected.** The endpoints are not in service and never have been. A deviation therefore breaks nothing that is currently running — but it does void the contract the moment a client is connected, and such a client cannot be fixed from this side. Field names, URL paths and data types must only change deliberately and documented; obvious defects may of course be fixed.

This is a dated status, not a standing guarantee — re-check whether clients have been connected before making larger changes.

## Base URLs

- Test System: `http://test.schweinswalsichtung.de`
- Production System: `http://schweinswalsichtung.de`

## 1. Creating Sightings

### Endpoint

- **URL**: `/rest_sichtungen`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Body (JSON Object)

| Attribute                   | Description                                                                     | Data Type / Range                   | Required                           |
| --------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------- |
| `sichtungsdatum`            | Date and time of sighting                                                       | DateTime, "YYYY-MM-DD HH:MI"        | Yes                                |
| `anzahl_gesamt`             | Total number of sighted animals. 0 is allowed and interpreted as death finding. | Integer                             | Yes                                |
| `vorname`                   | First name                                                                      | String (64)                         | Yes                                |
| `name`                      | Last name                                                                       | String (64)                         | Yes                                |
| `email`                     | Email address                                                                   | E-Mail                              | Yes                                |
| `gps_breite`                | Latitude decimal                                                                | Decimal, -90 – 90                   | No                                 |
| `gps_laenge`                | Longitude decimal                                                               | Decimal, -180 – 180                 | No                                 |
| `fahrwasser`                | Waterway or area                                                                | Text                                | No                                 |
| `seezeichen`                | Sea mark or beach section                                                       | Text                                | No                                 |
| `vonwo`                     | Sighting location                                                               | Integer-Range, 0-3                  | No                                 |
| `vonwo_text`                | Other sighting location (when vonwo = 0)                                        | Text                                | No                                 |
| `entfernung`                | Distance                                                                        | Integer-Range, 1-5                  | No                                 |
| `anzahl_schiffe`            | Number of ships in vicinity                                                     | Integer                             | No                                 |
| `anzahl_jung`               | Number of juvenile animals                                                      | Integer                             | No                                 |
| `verteilung`                | Distribution of animals                                                         | Integer-Range, 0-3                  | No                                 |
| `verteilung_text`           | Other distribution (when verteilung = 0)                                        | Text                                | No                                 |
| `aufnahme`                  | Filename of uploaded media                                                      | String (255)                        | No                                 |
| `aufnahmeHochladen`         | Media uploaded flag                                                             | Boolean, 0 = false, 1 = true        | No                                 |
| `verhalten`                 | Behavior of animals                                                             | Integer-Range, 0-3                  | No                                 |
| `verhalten_text`            | Other behavior (when verhalten = 0)                                             | Text                                | No                                 |
| `reaktion`                  | Reaction of animals                                                             | Text                                | No                                 |
| `sonstige_auffaelligkeiten` | Other observations                                                              | Text                                | No                                 |
| `seegang`                   | Sea state                                                                       | Integer-Range, 0-5                  | No                                 |
| `windrichtung`              | Wind direction                                                                  | 'N','NW','W','SW','S','SO','O','NO' | No                                 |
| `windstaerke`               | Wind force in Beaufort                                                          | 1-12                                | No                                 |
| `sichtweite`                | Visibility                                                                      | Integer-Range, 1-4                  | No                                 |
| `schiffsname`               | Ship name                                                                       | String (64)                         | No, Yes if schiffnamensnennung = 1 |
| `heimathafen`               | Home port                                                                       | String (64)                         | No                                 |
| `bootstyp`                  | Boat type                                                                       | String (64)                         | No                                 |
| `bootsantrieb`              | Boat drive                                                                      | Integer-Range, 0-4                  | No                                 |
| `bootsantrieb_text`         | Other boat drive (when bootsantrieb = 0)                                        | Text                                | No                                 |
| `strasse`                   | Street                                                                          | String (64)                         | No                                 |
| `plz`                       | ZIP code                                                                        | String (5)                          | No                                 |
| `ort`                       | City                                                                            | String (64)                         | No                                 |
| `telefon`                   | Phone number                                                                    | String (64)                         | No                                 |
| `fax`                       | Fax number                                                                      | String (64)                         | No                                 |
| `namensnennung`             | Name mention desired?                                                           | Boolean, 0 = false, 1 = true        | No                                 |
| `schiffnamensnennung`       | Ship name display allowed?                                                      | Boolean, 0 = false, 1 = true        | No                                 |
| `bemerkungen`               | Comments                                                                        | Text                                | No                                 |
| `eingangskanal`             | Entry channel of report                                                         | Integer-Range, 0-5                  | No                                 |
| `tierart`                   | Reported animal species                                                         | Integer-Range, 0-10                 | No, Default = 0                    |
| `totfund`                   | Death finding                                                                   | Boolean, 0 = false, 1 = true        | No                                 |
| `totfund_zustand`           | Condition of animal                                                             | Integer-Range, 0-5                  | No                                 |
| `totfund_geschlecht`        | Sex of animal                                                                   | Integer-Range, 0-2                  | No                                 |
| `totfund_groesse`           | Size of animal in cm                                                            | Integer                             | No                                 |
| `totfund_telefon`           | DMM already informed by phone                                                   | Boolean, 0 = false, 1 = true        | No                                 |

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
		"3": "deutliche Schulen"
	},
	"verhalten": {
		"0": "Sonstiges Verhalten",
		"1": "Konstanter Kurs, regelmäßiges Tauchen (schwimmen, ziehen)",
		"2": "Unterschiedlicher Kurs, kreisend, unregelmäßiges Tauchen (futtersuchend)",
		"3": "Langsames Schwimmen, längere Zeit an der Wasseroberfläche (ruhend)"
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
		"4": "vor Anker"
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
		"4": "Fähre"
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

**Response**:

```json
{
	"inbaltic": false,
	"inchartarea": true
}
```

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
| `search`   | Searches for given text in fields Email, Name, First name and Ship name. Partial string search (%<text>%).                                                                                                                   | String                                                           | No       |

### Response Format

JSON Array with JSON Objects:

| Attribute | Description                                                  | Data Type / Range                                   |
| --------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `ts`      | Unix Timestamp                                               | Unix Timestamp                                      |
| `id`      | Report ID                                                    | Integer                                             |
| `dt`      | Date                                                         | String, DD.MM.YY                                    |
| `ti`      | Time                                                         | String, HH:MI                                       |
| `lat`     | Latitude                                                     | Decimal (as string)                                 |
| `lon`     | Longitude                                                    | Decimal (as string)                                 |
| `ct`      | Total number of sighted animals                              | Integer                                             |
| `yo`      | Number of juveniles                                          | Integer                                             |
| `sh`      | Ship name                                                    | String                                              |
| `na`      | Sighter name (First name + Last name)                        | String                                              |
| `ar`      | Waterway / Area                                              | String                                              |
| `bm`      | Result of position check; only delivered for logged in admin | Integer: 0 = Outside, 1 = inchartarea, 2 = inbaltic |
| `va`      | Entry checked; only delivered for logged in admin            | Boolean: 0 = False, 1 = True                        |

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

3. **URL Paths**: URLs must match exactly - no additional prefixes like `/api/legacy/`

4. **Response Formats**: Response structures must match exactly, including field order and naming

5. **Wind Direction**: Must include all values: 'N','NW','W','SW','S','SO','O','NO' (note 'SO' for southeast)

6. **Backward Compatibility**: Any changes that break existing mobile app functionality are strictly forbidden.
