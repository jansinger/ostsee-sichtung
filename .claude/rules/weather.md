---
paths:
  - 'src/lib/components/weather/**'
  - 'src/lib/server/services/weather*.ts'
  - 'src/lib/utils/weather/**'
  - 'src/routes/api/weather/**'
  - 'src/routes/api/admin/weather/**'
---

# Weather System

Regeln für Wetterdaten-Abruf und -Anzeige.

---

## Architektur

Open-Meteo API → Deduplication/Cache → DB-Speicherung → UI-Anzeige

---

## API-Strategie

| Datum         | API                                                        |
| ------------- | ---------------------------------------------------------- |
| Heute/Zukunft | `api.open-meteo.com/v1/forecast`                           |
| Vergangenheit | `archive-api.open-meteo.com/v1/archive`                    |
| Meeresdaten   | `marine-api.open-meteo.com/v1/marine` (parallel, optional) |

Timezone: `Europe/Berlin` (hardcoded). Marine-Daten: graceful fallback bei Fehler.

---

## Deduplication (`weatherDeduplication.ts`)

```typescript
getCachedWeatherData(lat, lng, date, maxAgeHours = 24): Promise<StoredWeatherData | null>
```

Prüft: ST_DWithin(1000m) + gleiches Datum + Alter < maxAgeHours.

---

## Komponenten

| Komponente                  | Zweck                                    |
| --------------------------- | ---------------------------------------- |
| `WeatherDataFetcher.svelte` | Fetch + Auto-Fetch + "Übernehmen" Button |
| `WeatherDisplay.svelte`     | Flexible Anzeige (compact/full)          |

**WeatherDataFetcher Props:** `latitude, longitude, date, time, onWeatherFetched, autoFetch`

---

## Abgerufene Felder

Temperatur, Windgeschwindigkeit/-richtung, Wetter-Code, Sichtweite, Luftfeuchtigkeit, Druck, Niederschlag, Bewölkung. Optional: Wellenhöhe, -richtung, -periode.

---

## Best Practices

- Zeitabgleich: "nächste volle Stunde", nicht exakt
- Forecast-Daten ändern sich stündlich (Hinweis im UI)
- Cache-Toleranz: 1km Radius + gleiches Datum
- Keine Timezone-Konvertierung im Archive API (lokale Zeit)
