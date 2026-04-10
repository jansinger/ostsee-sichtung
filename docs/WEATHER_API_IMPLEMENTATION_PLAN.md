# Weather API Implementation Plan - Issue #110

## Übersicht

**AKTUALISIERT**: Basierend auf der bereits vorhandenen Weather API Integration in Formular Schritt 3. Erweitere die bestehende Implementierung zur Speicherung der Wetterdaten in der Datenbank als JSONB und vollständige Anzeige im Admin-Interface.

## 1. Analyse der bestehenden Codebase ✅

### Bereits implementiert

- ✅ **Weather API Service**: `/src/lib/services/weatherService.ts` - TypeScript Interfaces und Mapping-Funktionen
- ✅ **Historical Weather Endpoint**: `/src/routes/api/weather/historical/+server.ts` - Open-Meteo Integration
- ✅ **Weather Fetcher Component**: `/src/lib/components/weather/WeatherDataFetcher.svelte` - UI-Komponente für Step 3
- ✅ **Form Integration**: Environment.svelte verwendet WeatherDataFetcher für automatische Vorschläge
- ✅ **Open-Meteo Archive API**: Bereits für historische Daten implementiert

### Inzwischen implementiert

- ✅ **Database Storage**: Wetterdaten werden als JSONB in `sichtungen.weather_data` gespeichert, mit `weather_fetched_at`, `weather_provider`, `weather_api_version`, `weather_data_type` Feldern
- ✅ **Forecast vs. Historical**: Unterscheidung via `weather_data_type` Feld (default: `historical`)
- ✅ **Caching/Deduplication**: `weatherDeduplication.ts` mit Compound-Index auf Position+Datum
- ✅ **Admin Interface**: `WeatherDataDisplay.svelte` Komponente, Weather-Refresh per Sighting via `/api/admin/weather/[id]/refresh`
- ✅ **Weather Refresh Service**: `weatherRefreshService.ts` für On-Demand-Aktualisierung

## 2. Erweiterte API Integration 🔄

### Aktuelle Implementation: Open-Meteo Archive API ✅

- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Usage**: Bereits implementiert für historische Daten
- **Provider**: Open-Meteo (kostenlos, keine API-Keys)
- **Integration**: `/src/routes/api/weather/historical/+server.ts`

### Neue Anforderung: Forecast API für aktuelle Daten

Für Sichtungen mit heutigem Datum sollte die Forecast API verwendet werden:

```typescript
// Neue API für aktuelle Daten (heute)
GET https://api.open-meteo.com/v1/forecast?latitude=54.5&longitude=11.2&hourly=temperature_2m,windspeed_10m,winddirection_10m

// Bestehende API für historische Daten (vergangene Tage)
GET https://archive-api.open-meteo.com/v1/archive?latitude=54.5&longitude=11.2&start_date=2024-01-15&end_date=2024-01-15&hourly=temperature_2m,windspeed_10m,winddirection_10m
```

### API Logik-Erweiterung

```typescript
async function fetchWeatherData(lat: number, lng: number, date: string, time: string) {
	const sightingDate = new Date(date);
	const today = new Date();
	const isToday = sightingDate.toDateString() === today.toDateString();

	if (isToday) {
		// Verwende Forecast API mit Hinweis
		return await fetchForecastData(lat, lng, date, time);
	} else {
		// Verwende Archive API (bereits implementiert)
		return await fetchHistoricalData(lat, lng, date, time);
	}
}
```

## 3. Datenbank-Schema Erweiterung 🔄

### Migration Script - Optimiert für Single Fetch per Position/Tag

```sql
-- Migration: Add weather data fields to sightings table
ALTER TABLE sichtungen
ADD COLUMN weather_data JSONB,
ADD COLUMN weather_fetched_at TIMESTAMP,
ADD COLUMN weather_provider VARCHAR(50) DEFAULT 'open-meteo',
ADD COLUMN weather_api_version VARCHAR(20),
ADD COLUMN weather_data_type VARCHAR(20) DEFAULT 'historical'; -- 'historical' oder 'forecast'

-- Indexes für effiziente Abfragen und Deduplication
CREATE INDEX idx_weather_data_gin ON sichtungen USING GIN (weather_data);
CREATE INDEX idx_weather_fetched ON sichtungen (weather_fetched_at);
CREATE INDEX idx_weather_provider ON sichtungen (weather_provider);

-- Compound Index für Position+Datum Lookup (Deduplication)
CREATE INDEX idx_position_date_weather ON sichtungen (
  ROUND(gps_breite::numeric, 2),
  ROUND(gps_laenge::numeric, 2),
  DATE(sichtungsdatum)
) WHERE weather_data IS NOT NULL;
```

### Deduplication-Strategie

```typescript
// Prüfe vor API-Call, ob bereits Wetterdaten für ähnliche Position/Datum vorliegen
async function checkExistingWeatherData(
	latitude: number,
	longitude: number,
	date: string
): Promise<WeatherData | null> {
	const existingData = await db
		.select()
		.from(sightings)
		.where(
			and(
				// Ähnliche Position (±0.01 Grad ≈ ±1km Toleranz)
				between(sightings.latitude, latitude - 0.01, latitude + 0.01),
				between(sightings.longitude, longitude - 0.01, longitude + 0.01),
				// Gleiches Datum
				eq(sql`DATE(${sightings.sightingDate})`, date),
				// Hat Wetterdaten
				isNotNull(sightings.weatherData)
			)
		)
		.limit(1);

	return existingData[0]?.weatherData || null;
}
```

### JSONB Datenstruktur (erweitert basierend auf bestehender API)

```typescript
// Erweitere die bestehende WeatherData-Struktur für DB-Storage
interface StoredWeatherData extends WeatherData {
	// Zusätzliche Metadaten für die Datenbank
	provider: 'open-meteo';
	fetched_at: string; // ISO timestamp
	api_version: string;
	data_type: 'historical' | 'forecast'; // NEU: Unterscheidung der Datenquelle
	location: {
		latitude: number;
		longitude: number;
		elevation?: number;
	};
	observation_time: string; // ISO timestamp der Sichtung

	// Vollständige Rohdaten aus Open-Meteo API
	raw_data: {
		temperature_2m: number;
		wind_speed_10m: number;
		wind_direction_10m: number;
		weather_code: number;
		visibility: number;
		surface_pressure?: number;
		relative_humidity_2m?: number;
		precipitation?: number;
		cloud_cover?: number;

		// Zusätzliche Parameter für Marine API (falls verfügbar)
		wave_height?: number;
		wave_direction?: number;
		wave_period?: number;
		sea_surface_temperature?: number;
	};

	// Verarbeitete/berechnete Werte (wie aktuell implementiert)
	processed: {
		temperature: number; // °C
		windSpeed: number; // km/h
		windDirection: number; // degrees
		windDirectionCardinal: string; // N, NO, O, SO, S, SW, W, NW
		weatherCode: number;
		weatherDescription: string; // German description
		visibility: number; // meters
		seaState: number; // calculated from wind speed
		pressure?: number; // hPa
		humidity?: number; // %
	};

	// Qualitätsinformationen
	quality: {
		confidence: number; // 0.0 - 1.0
		data_source: string; // 'era5_reanalysis' oder 'gfs_forecast'
		notes?: string;
	};
}
```

### Schema Updates

```typescript
// src/lib/server/db/schema.ts
export const sightings = pgTable(
	'sichtungen',
	{
		// ... existing fields
		weatherData: jsonb('weather_data'),
		weatherFetchedAt: timestamp('weather_fetched_at', { mode: 'date' }),
		weatherProvider: varchar('weather_provider', { length: 50 }),
		weatherApiVersion: varchar('weather_api_version', { length: 20 })
	}
	// ... existing table config with new indexes
);
```

## 4. API Service Abstraction Layer 📋

### Service-Architektur

```
/src/lib/server/services/weather/
├── weatherService.ts           # Hauptservice mit Provider-Abstraktion
├── providers/
│   ├── openMeteoProvider.ts    # Open-Meteo Implementation
│   ├── visualCrossingProvider.ts # Backup Provider
│   └── weatherApiProvider.ts   # Weiterer Backup
├── types/
│   └── weatherTypes.ts         # TypeScript Interfaces
└── utils/
    ├── weatherMapper.ts        # Datenmapping zwischen Providern
    └── weatherValidator.ts     # Datenvalidierung
```

### Weather Service Interface

```typescript
// src/lib/server/services/weather/types/weatherTypes.ts
export interface WeatherProvider {
	name: string;
	getHistoricalWeather(latitude: number, longitude: number, date: Date): Promise<WeatherData>;
	isAvailable(): Promise<boolean>;
}

// src/lib/server/services/weather/weatherService.ts
export class WeatherService {
	private providers: WeatherProvider[];
	private primaryProvider: WeatherProvider;

	async fetchWeatherData(
		latitude: number,
		longitude: number,
		date: Date,
		fallbackEnabled = true
	): Promise<WeatherData | null> {
		// Implementation mit Fallback-Logik
	}

	async batchFetchWeatherData(
		sightings: Array<{ id: number; lat: number; lng: number; date: Date }>
	): Promise<Map<number, WeatherData>> {
		// Batch-Verarbeitung für historische Daten
	}
}
```

### Open-Meteo Provider Implementation

```typescript
// src/lib/server/services/weather/providers/openMeteoProvider.ts
export class OpenMeteoProvider implements WeatherProvider {
	name = 'open-meteo';

	async getHistoricalWeather(
		latitude: number,
		longitude: number,
		date: Date
	): Promise<WeatherData> {
		const dateStr = date.toISOString().split('T')[0];

		// Historical Weather API
		const weatherUrl =
			`https://archive-api.open-meteo.com/v1/era5?` +
			`latitude=${latitude}&longitude=${longitude}` +
			`&start_date=${dateStr}&end_date=${dateStr}` +
			`&hourly=temperature_2m,windspeed_10m,winddirection_10m,` +
			`pressure_msl,relative_humidity_2m,precipitation,cloudcover,` +
			`visibility&timezone=GMT`;

		// Marine Weather API für Küstengebiete
		const marineUrl =
			`https://marine-api.open-meteo.com/v1/marine?` +
			`latitude=${latitude}&longitude=${longitude}` +
			`&start_date=${dateStr}&end_date=${dateStr}` +
			`&hourly=wave_height,wave_direction,wave_period,` +
			`sea_surface_temperature&timezone=GMT`;

		const [weatherResponse, marineResponse] = await Promise.allSettled([
			fetch(weatherUrl),
			fetch(marineUrl)
		]);

		// Datenverarbeitung und Mapping zu WeatherData Interface
		return this.mapResponseToWeatherData(weatherResponse, marineResponse, date);
	}
}
```

## 5. Admin Interface Erweiterung 🔄

### Bestehende Struktur erweitern

Aktuell gibt es bereits eine funktionierende Weather-Integration in Step 3. Das Admin-Interface sollte diese konsistent erweitern.

### WeatherDataDisplay Component - Erweitert mit Data Source Indicators

```svelte
<!-- src/lib/components/admin/weather/WeatherDataDisplay.svelte -->
<script lang="ts">
	import type { StoredWeatherData } from '$lib/services/weatherService';

	interface Props {
		weatherData: StoredWeatherData | null;
		manualData: {
			seaState?: number;
			windDirection?: string;
			windForce?: string;
			visibility?: number;
		};
		sightingId: number;
		sightingDate: Date;
		canRefresh?: boolean;
	}

	let { weatherData, manualData, sightingId, sightingDate, canRefresh = false }: Props = $props();

	let isExpanded = $state(false);
	let isRefreshing = $state(false);

	// Prüfe ob Sichtungsdatum heute ist
	const isToday = $derived(() => {
		const today = new Date();
		return sightingDate.toDateString() === today.toDateString();
	});

	// Bestimme Datenquelle und passende Hinweise
	const dataSourceInfo = $derived(() => {
		if (!weatherData) return null;

		return {
			type: weatherData.data_type,
			label: weatherData.data_type === 'forecast' ? 'Vorhersagedaten (heute)' : 'Historische Daten',
			indicator: weatherData.data_type === 'forecast' ? '🔮' : '📊',
			className: weatherData.data_type === 'forecast' ? 'forecast-data' : 'historical-data',
			warning:
				weatherData.data_type === 'forecast' && isToday()
					? 'Die Wetterdaten basieren auf Vorhersagen, da die Sichtung heute stattfand.'
					: null
		};
	});

	async function refreshWeatherData() {
		isRefreshing = true;
		try {
			const response = await fetch(`/api/admin/weather/${sightingId}/refresh`, {
				method: 'POST'
			});
			if (response.ok) {
				location.reload();
			}
		} finally {
			isRefreshing = false;
		}
	}
</script>

<div class="weather-data-container">
	<h3>Umweltbedingungen</h3>

	<div class="weather-comparison">
		<div class="manual-data">
			<h4>Manuelle Eingaben</h4>
			<p>Seegang: {manualData.seaState || 'nicht angegeben'}</p>
			<p>Wind: {manualData.windDirection || 'nicht angegeben'}</p>
			<p>Sicht: {manualData.visibility || 'nicht angegeben'}</p>
		</div>

		{#if weatherData && dataSourceInfo}
			<div class="api-data {dataSourceInfo.className}">
				<h4 class="flex items-center gap-2">
					<span>{dataSourceInfo.indicator}</span>
					<span>{dataSourceInfo.label}</span>
					<span class="badge badge-sm badge-primary">Open-Meteo</span>
				</h4>

				{#if dataSourceInfo.warning}
					<div class="alert alert-info alert-sm mb-3">
						<span class="text-xs">{dataSourceInfo.warning}</span>
					</div>
				{/if}

				<p>
					Wind: {weatherData.processed.windDirection}° {weatherData.processed.windDirectionCardinal}
				</p>
				<p>{weatherData.processed.windSpeed} km/h</p>

				<button onclick={() => (isExpanded = !isExpanded)} class="btn btn-xs btn-ghost">
					{isExpanded ? '▼' : '▶'} Alle API-Daten anzeigen
				</button>

				{#if isExpanded}
					<div class="expanded-weather-data">
						<div class="grid grid-cols-2 gap-2 text-sm">
							<p>Temperatur: {weatherData.processed.temperature}°C</p>
							<p>Wetter: {weatherData.processed.weatherDescription}</p>
							<p>Sichtweite: {Math.round(weatherData.processed.visibility / 1000)} km</p>
							<p>Seegang: Stufe {weatherData.processed.seaState}</p>
							{#if weatherData.processed.pressure}
								<p>Luftdruck: {weatherData.processed.pressure} hPa</p>
							{/if}
							{#if weatherData.processed.humidity}
								<p>Luftfeuchtigkeit: {weatherData.processed.humidity}%</p>
							{/if}
							{#if weatherData.raw_data.wave_height}
								<p>Wellenhöhe: {weatherData.raw_data.wave_height} m</p>
							{/if}
							{#if weatherData.raw_data.sea_surface_temperature}
								<p>Wassertemp: {weatherData.raw_data.sea_surface_temperature}°C</p>
							{/if}
						</div>

						<div class="border-base-300 mt-3 border-t pt-3">
							<p class="text-base-content/60 text-xs">
								Abgerufen: {new Date(weatherData.fetched_at).toLocaleString('de-DE')}
								• Quelle: {weatherData.quality.data_source}
								• Konfidenz: {Math.round(weatherData.quality.confidence * 100)}%
							</p>
						</div>
					</div>
				{/if}

				{#if canRefresh}
					<button
						onclick={refreshWeatherData}
						disabled={isRefreshing}
						class="btn btn-xs btn-secondary mt-2"
					>
						{isRefreshing ? '🔄 Laden...' : '🔄 Wetterdaten aktualisieren'}
					</button>
				{/if}
			</div>
		{:else}
			<div class="no-api-data">
				<p class="text-base-content/70">Keine API-Wetterdaten verfügbar</p>
				{#if canRefresh}
					<button
						onclick={refreshWeatherData}
						disabled={isRefreshing}
						class="btn btn-xs btn-primary mt-2"
					>
						{isRefreshing ? '🔄 Laden...' : '🔄 Wetterdaten laden'}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.weather-data-container {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 16px;
		margin: 16px 0;
	}

	.weather-comparison {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
	}

	.forecast-data {
		border-left: 3px solid #3b82f6; /* Blue für Forecast */
	}

	.historical-data {
		border-left: 3px solid #10b981; /* Green für Historical */
	}

	.expanded-weather-data {
		margin-top: 12px;
		padding: 12px;
		background: #f9fafb;
		border-radius: 4px;
	}

	@media (max-width: 768px) {
		.weather-comparison {
			grid-template-columns: 1fr;
		}
	}
</style>
```

### Step 3 Form Hinweise erweitern

```svelte
<!-- Ergänzung für WeatherDataFetcher.svelte -->
{#if weatherData}
	<div class="weather-source-info">
		{#if isToday}
			<div class="alert alert-info alert-sm">
				<span class="text-xs">
					🔮 Da die Sichtung heute stattfindet, werden Vorhersagedaten verwendet.
				</span>
			</div>
		{:else}
			<div class="alert alert-success alert-sm">
				<span class="text-xs"> 📊 Historische Wetterdaten für vergangenes Datum verfügbar. </span>
			</div>
		{/if}
	</div>
{/if}
```

## 6. Angepasste Implementation Roadmap

**Basis**: Erweitere bestehende Weather API Integration aus Schritt 3

### Phase 1: API & Database Integration (Woche 1)

- [ ] ✅ **API bereits vorhanden** - Erweitere `/api/weather/historical` für Forecast-Support
- [ ] Database-Migration für Weather-Storage-Felder
- [ ] Erweitere weatherService.ts um StoredWeatherData Interface
- [ ] Deduplication-Logik für Position/Datum-Caching
- [ ] Integration in sightingRepository.ts für automatisches Speichern

### Phase 2: Enhanced API Logic (Woche 2)

- [ ] Forecast vs Historical API Logic implementieren
- [ ] Erweitere WeatherDataFetcher.svelte um Data-Source-Hinweise
- [ ] Admin-API-Endpoint für Wetterdaten-Nachladen
- [ ] Batch-Update für bestehende Sichtungen ohne Wetterdaten

### Phase 3: Admin Interface Enhancement (Woche 3)

- [ ] WeatherDataDisplay Component für Admin-Interface
- [ ] Integration in bestehende Sichtungs-Detailansicht
- [ ] Data-Source-Indikatoren (Historical vs Forecast)
- [ ] Export-Funktionalität erweitern um Wetterdaten

### Phase 4: Optimization & Polish (Woche 4)

- [ ] Performance-Tests mit Deduplication-Logic
- [ ] UI/UX Polish für Data-Source-Indicators
- [ ] Integration Tests mit realen Sichtungen
- [ ] Dokumentation und Logging verbessern

**Reduzierte Zeitschätzung**: 4 Wochen (statt 5), da Grundfunktionalität bereits vorhanden

## 7. Teststrategien

### API Testing mit bestehenden Datensätzen

```typescript
// Test-Script für Weather API Qualität
async function testWeatherAPIQuality() {
	const sightings = await db
		.select()
		.from(sichtungen)
		.where(isNotNull(sichtungen.latitude))
		.limit(100);

	const weatherService = new WeatherService();
	const results = [];

	for (const sighting of sightings) {
		const weatherData = await weatherService.fetchWeatherData(
			sighting.latitude,
			sighting.longitude,
			sighting.sightingDate
		);

		results.push({
			sightingId: sighting.id,
			hasWeatherData: !!weatherData,
			confidence: weatherData?.quality.confidence || 0,
			provider: weatherData?.provider || null
		});
	}

	// Analyse der Erfolgsquote und Datenqualität
	return analyzeWeatherResults(results);
}
```

### Qualitätsmetriken

- **Erfolgsquote**: Prozentsatz erfolgreich abgerufener Wetterdaten
- **Datenaktualität**: Zeitabweichung zwischen Sichtung und verfügbaren Wetterdaten
- **Provider-Verfügbarkeit**: Uptime und Response-Zeit der APIs
- **Datenqualität**: Plausibilitätschecks und Konfidenz-Scores

## 8. Sicherheit & Performance

### Rate Limiting

```typescript
// Rate-Limiting für Weather API Calls
class WeatherRateLimiter {
	private lastCall = 0;
	private callCount = 0;
	private readonly minInterval = 100; // ms zwischen Calls
	private readonly maxCallsPerHour = 10000;

	async throttle(): Promise<void> {
		// Implementation der Rate-Limiting-Logik
	}
}
```

### Caching Strategy

- **Redis Cache** für identische API-Anfragen
- **Database Cache** für häufig angeforderte Kombinationen
- **CDN Edge Caching** für statische Wetterdaten-Exports

### Error Handling

- **Graceful Degradation**: Formulare funktionieren ohne Wetterdaten
- **Retry Logic**: Automatische Wiederholung bei temporären Fehlern
- **Fallback Providers**: Automatischer Wechsel zu Backup-APIs
- **Error Monitoring**: Pino-Logger Integration für API-Fehler

## 9. Monitoring & Observability

### Metriken

- API-Response-Zeiten
- Erfolgsquoten pro Provider
- Cache-Hit-Raten
- Batch-Job Performance
- Datenqualitäts-Scores

### Alerts

- Provider-Ausfälle
- Hohe Fehlerquoten
- Performance-Degradation
- Rate-Limit-Überschreitungen

## 10. Dokumentation Updates

Nach der Implementierung aktualisieren:

- [ ] `CLAUDE.md` - Neue Weather API Services
- [ ] `README.md` - Setup-Anweisungen
- [ ] API-Dokumentation - Neue Endpoints
- [ ] OpenAPI Spec - Weather-Daten-Schema
- [ ] Admin-Handbuch - Wetterdaten-Management

---

**Gesamtzeitrahmen**: 5 Wochen
**Team**: 1-2 Entwickler
**Priorität**: Medium-High (verbessert Datenqualität erheblich)
**Risiko**: Low (etablierte APIs und Patterns)
