import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoredWeatherData } from '$lib/services/weatherService';

vi.mock('$lib/logger.server', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/logger', () => ({
	createLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	})
}));

vi.mock('$lib/services/weatherService', () => ({
	convertToStoredWeatherData: vi.fn(
		(
			w: { time: string },
			_r: unknown,
			_t: string,
			lat: number,
			lon: number
		): StoredWeatherData => ({
			provider: 'open-meteo',
			fetched_at: new Date().toISOString(),
			api_version: 'v1',
			data_type: 'historical',
			location: { latitude: lat, longitude: lon },
			observation_time: w.time,
			raw_data: {
				temperature_2m: 18,
				wind_speed_10m: 15,
				wind_direction_10m: 180,
				weather_code: 0,
				visibility: 10000
			},
			processed: {
				temperature: 18,
				windSpeed: 15,
				windDirection: 180,
				windDirectionCardinal: 'N',
				weatherCode: 0,
				weatherDescription: 'Klarer Himmel',
				visibility: 10000,
				seaState: 1
			},
			quality: {
				confidence: 0.95,
				data_source: 'era5_reanalysis'
			}
		})
	)
}));

vi.mock('$lib/constants/weather', () => ({
	degreesToCardinal: vi.fn(() => 'N'),
	getWeatherDescription: vi.fn(() => 'Klarer Himmel'),
	calculateSeaState: vi.fn(() => 1)
}));

import { fetchWeatherData } from './weatherRefreshService';

// Minimales valides Open-Meteo Response für ein Datum
function makeWeatherResponse(date = '2024-06-15') {
	return {
		hourly: {
			time: [`${date}T12:00`],
			temperature_2m: [18],
			wind_speed_10m: [15],
			wind_direction_10m: [180],
			weather_code: [0],
			visibility: [10000],
			relative_humidity_2m: [60],
			surface_pressure: [1013]
		}
	};
}

function makeMarineResponse() {
	return {
		hourly: {
			time: ['2024-06-15T12:00'],
			wave_height: [0.5],
			wave_direction: [90],
			wave_period: [5]
		}
	};
}

// Heutiges Datum im Format YYYY-MM-DD
function todayString(): string {
	return new Date().toISOString().split('T')[0]!;
}

// Historisches Datum (immer in der Vergangenheit)
const HISTORICAL_DATE = '2024-06-15';

describe('fetchWeatherData', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
		vi.clearAllMocks();
	});

	it('wirft Fehler wenn fetch einen Netzwerkfehler wirft', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Netzwerkfehler'));

		await expect(fetchWeatherData(54.5, 10.5, HISTORICAL_DATE)).rejects.toThrow();
	});

	it('wirft Fehler wenn die Weather API einen HTTP-Fehler zurückgibt', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				json: async () => ({})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await expect(fetchWeatherData(54.5, 10.5, HISTORICAL_DATE)).rejects.toThrow(
			/Open-Meteo Weather API error/
		);
	});

	it('gibt StoredWeatherData zurück bei erfolgreicher historischer Anfrage', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(HISTORICAL_DATE)
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		const result = await fetchWeatherData(54.5, 10.5, HISTORICAL_DATE);

		expect(result).toBeDefined();
		expect(result.provider).toBe('open-meteo');
		expect(result.location.latitude).toBe(54.5);
		expect(result.location.longitude).toBe(10.5);
	});

	it('gibt StoredWeatherData zurück bei erfolgreicher aktueller Anfrage (heutiges Datum)', async () => {
		const today = todayString();
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(today)
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		const result = await fetchWeatherData(54.5, 10.5, today);

		expect(result).toBeDefined();
		expect(result.provider).toBe('open-meteo');
	});

	it('wählt den Archive-API-Endpunkt für historische Daten', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(HISTORICAL_DATE)
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await fetchWeatherData(54.5, 10.5, HISTORICAL_DATE);

		const firstCallUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
		expect(firstCallUrl).toContain('archive-api.open-meteo.com');
	});

	it('wählt den Forecast-API-Endpunkt für das heutige Datum', async () => {
		const today = todayString();
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(today)
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await fetchWeatherData(54.5, 10.5, today);

		const firstCallUrl = vi.mocked(fetch).mock.calls[0]?.[0] as string;
		expect(firstCallUrl).toContain('api.open-meteo.com');
		expect(firstCallUrl).not.toContain('archive-api');
	});

	it('gibt trotzdem Ergebnis zurück wenn die Marine API einen Fehler liefert (graceful degradation)', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(HISTORICAL_DATE)
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: 'Service Unavailable',
				json: async () => ({})
			} as Response);

		// Sollte NICHT werfen, sondern Wetterdaten ohne Meeresdaten zurückgeben
		const result = await fetchWeatherData(54.5, 10.5, HISTORICAL_DATE);
		expect(result).toBeDefined();
		expect(result.provider).toBe('open-meteo');
	});

	it('gibt trotzdem Ergebnis zurück wenn die Marine API einen Netzwerkfehler wirft (graceful degradation)', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(HISTORICAL_DATE)
			} as Response)
			.mockRejectedValueOnce(new Error('Marine API nicht erreichbar'));

		const result = await fetchWeatherData(54.5, 10.5, HISTORICAL_DATE);
		expect(result).toBeDefined();
		expect(result.provider).toBe('open-meteo');
	});

	it('wirft Fehler wenn keine hourly.time Daten vorhanden sind', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ hourly: { time: [], temperature_2m: [] } })
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await expect(fetchWeatherData(54.5, 10.5, HISTORICAL_DATE)).rejects.toThrow(
			/No weather data available/
		);
	});

	it('wirft Fehler wenn hourly komplett fehlt in der API-Antwort', async () => {
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await expect(fetchWeatherData(54.5, 10.5, HISTORICAL_DATE)).rejects.toThrow();
	});

	it('wählt den zeitlich nächstgelegenen Datenpunkt bei Angabe einer Uhrzeit', async () => {
		const { convertToStoredWeatherData } = await import('$lib/services/weatherService');
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					hourly: {
						time: [
							`${HISTORICAL_DATE}T10:00`,
							`${HISTORICAL_DATE}T11:00`,
							`${HISTORICAL_DATE}T14:00`
						],
						temperature_2m: [10, 12, 18],
						wind_speed_10m: [5, 8, 15],
						wind_direction_10m: [180, 180, 180],
						weather_code: [0, 0, 0],
						visibility: [10000, 10000, 10000]
					}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await fetchWeatherData(54.5, 10.5, HISTORICAL_DATE, '14:00');

		// convertToStoredWeatherData wird mit dem WeatherData-Objekt aufgerufen,
		// dessen time dem nächstgelegenen Slot entspricht (14:00)
		expect(vi.mocked(convertToStoredWeatherData)).toHaveBeenCalledWith(
			expect.objectContaining({ time: `${HISTORICAL_DATE}T14:00` }),
			expect.anything(),
			expect.anything(),
			54.5,
			10.5
		);
	});

	it('übergibt latitude und longitude korrekt an convertToStoredWeatherData', async () => {
		const { convertToStoredWeatherData } = await import('$lib/services/weatherService');
		vi.mocked(fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeWeatherResponse(HISTORICAL_DATE)
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => makeMarineResponse()
			} as Response);

		await fetchWeatherData(55.1, 12.3, HISTORICAL_DATE);

		expect(vi.mocked(convertToStoredWeatherData)).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'historical',
			55.1,
			12.3
		);
	});
});
