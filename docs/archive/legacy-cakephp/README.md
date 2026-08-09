# Originalquellen der abgelösten CakePHP-Anwendung

Ausschnitt aus `sichtungen.tgz` (1,6 GB, nicht im Repo). Hier liegen nur die
Dateien, die den Vertrag der Legacy-API festlegen — als Beleg, nicht zum
Ausführen.

> **Eine Änderung gegenüber dem Original:** In drei Dateien stand im
> `@author`-Tag die private E-Mail-Adresse des ursprünglichen Entwicklers. Sie
> ist entfernt, der Name bleibt stehen. Dieses Repository ist öffentlich, und
> die Adresse gehört einer dritten Person, die dem nie zugestimmt hat — die
> Urheberschaft ist ohne sie genauso belegt. Wer die Dateien erneut aus dem
> Archiv zieht, muss das wiederholen.
>
> Die Rolladresse `sichtungen@meeresmuseum.de` in `SichtungenController.php`
> steht bewusst noch drin: Sie ist die Absenderadresse der damaligen
> Bestätigungsmails, also Teil des dokumentierten Verhaltens, und keine
> personenbezogene Adresse.

| Datei                          | wofür                                                    |
| ------------------------------ | -------------------------------------------------------- |
| `routes.php`                   | Routenabbildung, Sprachpräfix                            |
| `RestSichtungenController.php` | `/rest_sichtungen` — `add`, `index`, `view`, `antworten` |
| `SichtungenController.php`     | `/sichtungen/showreports.json` (`showReports()`)         |
| `QueryParserComponent.php`     | `parseList()` — Filter, Felder, Sichtbarkeit             |
| `Sichtung.php`                 | `getReports()` und die übrigen Modellmethoden            |
| `ReportUtils.php`              | `mapReport()` — die Ausgabeform der Sichtungsdaten       |

## Der Befund, wegen dem diese Dateien hier liegen

**`GET /rest_sichtungen` und `GET /sichtungen/showreports.json` sind derselbe
Endpunkt unter zwei Namen.** Beide Aktionen bestehen aus denselben zwei Zeilen:

```php
$options = $this->QueryParser->parseList($this->Sichtung->getDefaultYear(), $this->Auth->user());
$data    = $this->Sichtung->getReports($options, $this->Auth->user());
```

`getReports()` schickt jeden Datensatz durch `ReportUtils::mapReport()`, und
das erzeugt die kompakte Form, die die heutige Anwendung unter
`showreports.json` bereits ausliefert:

```
ts, id, dt, ti, lat, lon, ct, yo, ta, tf
ar   nur wenn fahrwasser gesetzt
sh   nur wenn schiffsname gesetzt UND (namensnennung ODER schiffnamensnennung)
na   nur wenn namensnennung
di   nur bei Umkreissuche (Distanz)
bm, ba, va   nur für angemeldete Admins
```

Die 31 Feldnamen in `parseList()` sind die **Datenbankspalten** für das
`SELECT`, nicht die Ausgabe. Wer nur `parseList()` liest, hält `index` für
einen Endpunkt mit vollem Feldumfang — er ist es nicht.

## Was daraus folgt

Die iOS-App (`OstSeeTiere/8`) fragt `GET /rest_sichtungen` an und bekommt von
der heutigen Anwendung `405` (`src/routes/rest_sichtungen/+server.ts`) — auf
hawking wie auf Produktion. Damit ist die Karte in der App tot. Der Endpunkt
fehlt außerdem in `docs/LEGACY_API_SPECIFICATION.md` vollständig.

Die Behebung ist deshalb keine Neuentwicklung, sondern ein zweiter Name für
vorhandene Logik: Der `GET`-Handler von
`src/routes/sichtungen/showreports.json/+server.ts` muss unter
`GET /rest_sichtungen` erreichbar werden, statt `405` zu liefern.

Vor der Umsetzung zu klären:

1. **Antwortform.** `showReports()` rendert über die View `export`,
   `index` über `_serialize => 'Sichtungen'` (Zeichenkette, nicht Feld — in
   CakePHP 2 serialisiert das den Wert direkt, also ein blankes Array). Die
   heutige `showreports.json` liefert ein blankes Array. Das passt zusammen,
   ist aber am Original zu verifizieren, bevor man sich darauf verlässt: Eine
   Umhüllung `{"Sichtungen": […]}` wäre ein anderer Vertrag, und der Client
   ist nicht testbar.
2. **Jahresfilter.** `parseList()` schränkt ohne `year`-Parameter auf
   `getDefaultYear()` ein. Prüfen, ob `showreports.json` das heute genauso
   tut — sonst liefern die beiden Namen unterschiedliche Mengen.
3. **`GET /rest_sichtungen/:id`.** `mapResources` bildet auch `view` ab, und
   der Schreibpfad verweist im `Location`-Header darauf
   (`/rest_sichtungen/view/<id>.json`). Diese Route fehlt heute ebenfalls
   (404). Eigener Vorgang, aber im selben Zug zu entscheiden.
4. **Rate-Limit.** `POST /rest_sichtungen` ist auf 20 Anfragen pro Stunde und
   IP begrenzt. Das Limit sitzt am Anfang des `POST`-Handlers und darf den
   neuen `GET`-Pfad nicht mitbegrenzen — eine Karte, die sich nach 20 Aufrufen
   abschaltet, wäre schlimmer als gar keine.

## Sprachpräfix

`routes.php` akzeptiert `/de/` und `/en/` vor **jedem** Pfad, nicht nur vor
`antworten.json`. Das ist ein eigener Vorgang und als Aufgabe hinterlegt.
