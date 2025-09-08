import { createLogger } from '$lib/logger';
import { mapWeatherToFormFields, type WeatherData } from '$lib/services/weatherService';
import { combineToDate } from '$lib/utils/format/dateTime';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:weather:historical');

/**
 * Convert degrees to cardinal direction
 */
function degreesToCardinal(degrees: number): string {
	const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
	const index = Math.round((degrees % 360) / 45) % 8;
	return directions[index]!;
}

/**
 * Calculate sea state from wind speed (Douglas scale approximation)
 */
function calculateSeaState(windSpeedKmh: number): number {
	if (windSpeedKmh < 2) return 0; // Calm
	if (windSpeedKmh < 12) return 1; // Smooth
	if (windSpeedKmh < 20) return 2; // Slight
	if (windSpeedKmh < 29) return 3; // Moderate
	if (windSpeedKmh < 50) return 4; // Rough
	if (windSpeedKmh < 62) return 5; // Very rough
	if (windSpeedKmh < 75) return 6; // High
	if (windSpeedKmh < 89) return 7; // Very high
	return 8; // Phenomenal
}

/**
 * Map Open-Meteo weather codes to German descriptions
 */
function getWeatherDescription(weatherCode: number): string {
	const weatherMap: Record<number, string> = {
		0: 'Klar',
		1: 'Größtenteils klar',
		2: 'Teilweise bewölkt',
		3: 'Bedeckt',
		45: 'Nebel',
		48: 'Reifnebel',
		51: 'Leichter Nieselregen',
		53: 'Mäßiger Nieselregen',
		55: 'Dichter Nieselregen',
		56: 'Leichter gefrierender Nieselregen',
		57: 'Dichter gefrierender Nieselregen',
		61: 'Leichter Regen',
		63: 'Mäßiger Regen',
		65: 'Starker Regen',
		66: 'Leichter gefrierender Regen',
		67: 'Starker gefrierender Regen',
		71: 'Leichter Schneefall',
		73: 'Mäßiger Schneefall',
		75: 'Starker Schneefall',
		77: 'Schneekörner',
		80: 'Leichte Regenschauer',
		81: 'Mäßige Regenschauer',
		82: 'Heftige Regenschauer',
		85: 'Leichte Schneeschauer',
		86: 'Starke Schneeschauer',
		95: 'Leichtes bis mäßiges Gewitter',
		96: 'Gewitter mit leichtem Hagel',
		99: 'Gewitter mit starkem Hagel'
	};
	return weatherMap[weatherCode] || `Wetter Code ${weatherCode}`;
}

/**
 * Fetch weather data from Open-Meteo API (free alternative)
 */
async function fetchOpenWeatherMapData(
	latitude: number,
	longitude: number,
	date: string,
	time: string
): Promise<WeatherData | null> {
	try {
		// Format date for API
		const dateObj = combineToDate(date, time);
		if (isNaN(dateObj.getTime())) {
			logger.warn({ date }, 'Invalid date format');
			return null;
		}

		const startDate = date;
		const endDate = date;

		// Build API URL for Open-Meteo
		const params = new URLSearchParams({
			latitude: latitude.toString(),
			longitude: longitude.toString(),
			start_date: startDate,
			end_date: endDate,
			hourly:
				'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,visibility,surface_pressure,relative_humidity_2m',
			timezone: 'Europe/Berlin'
		});

		const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

		logger.info({ latitude, longitude, date, time }, 'Fetching weather data from Open-Meteo');

		const response = await fetch(url);

		if (!response.ok) {
			logger.error(
				{ status: response.status, statusText: response.statusText },
				'Open-Meteo API request failed'
			);
			return null;
		}

		const data = await response.json();

		// Defensive checks for hourly data
		const hourly = data.hourly;
		if (
			!hourly ||
			!Array.isArray(hourly.time) ||
			hourly.time.length === 0 ||
			!Array.isArray(hourly.wind_speed_10m) ||
			!Array.isArray(hourly.wind_direction_10m) ||
			!Array.isArray(hourly.temperature_2m) ||
			!Array.isArray(hourly.weather_code)
		) {
			logger.warn('No weather data available or unexpected format for the specified date');
			return null;
		}

		// Find the closest hour index
		let targetIndex = dateObj.getHours() + Math.round(dateObj.getMinutes() / 60);
		if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= hourly.time.length) {
			targetIndex = 12; // Default to noon if out of range
		}

		// Convert wind speed from km/h (Open-Meteo returns km/h)
		const windSpeedKmh = Math.round(hourly.wind_speed_10m[targetIndex] ?? 0);

		// Extract weather data
		const weatherData: WeatherData = {
			time: new Date(hourly.time[targetIndex]).toLocaleDateString('sv-SE', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit'
			}),
			windSpeed: windSpeedKmh,
			windDirection: Math.round(hourly.wind_direction_10m[targetIndex] ?? 0),
			windDirectionCardinal: degreesToCardinal(hourly.wind_direction_10m[targetIndex] ?? 0),
			temperature: Math.round(hourly.temperature_2m[targetIndex] ?? 0),
			weatherCode: hourly.weather_code[targetIndex] ?? 0,
			weatherDescription: getWeatherDescription(hourly.weather_code[targetIndex] ?? 0),
			visibility: Math.round(hourly.visibility?.[targetIndex] ?? 10000),
			seaState: calculateSeaState(windSpeedKmh),
			pressure: Math.round(hourly.surface_pressure?.[targetIndex] ?? 0),
			humidity: Math.round(hourly.relative_humidity_2m?.[targetIndex] ?? 0)
		};

		logger.info({ weatherData }, 'Weather data fetched successfully from Open-Meteo');
		return weatherData;
	} catch (error) {
		logger.error({ error }, 'Failed to fetch weather data from Open-Meteo');
		return null;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Extract query parameters
		const latitudeRaw = url.searchParams.get('lat');
		const longitudeRaw = url.searchParams.get('lng');
		const date = url.searchParams.get('date') || '';
		const time = url.searchParams.get('time') || '';

		const latitude = latitudeRaw ? parseFloat(latitudeRaw) : NaN;
		const longitude = longitudeRaw ? parseFloat(longitudeRaw) : NaN;

		// Validate parameters
		if (isNaN(latitude) || isNaN(longitude) || !date) {
			return json({ error: 'Missing or invalid parameters: lat, lng, date' }, { status: 400 });
		}

		// Validate coordinates are in Baltic Sea region (approximate)
		if (latitude < 53 || latitude > 66 || longitude < 9 || longitude > 31) {
			logger.warn({ latitude, longitude }, 'Coordinates outside Baltic Sea region');
		}

		// Fetch weather data from Open-Meteo
		const weatherData = await fetchOpenWeatherMapData(latitude, longitude, date, time);
		if (!weatherData) {
			return json(
				{ error: 'Could not fetch weather data for the specified location and date' },
				{ status: 404 }
			);
		}

		// Map to form fields (see $lib/services/weatherService for mapping details)
		const formFields = mapWeatherToFormFields(weatherData);

		// Return combined response
		return json({
			success: true,
			weather: weatherData,
			formFields,
			metadata: {
				source: 'Open-Meteo Historical Weather API',
				latitude,
				longitude,
				date,
				time
			}
		});
	} catch (error) {
		logger.error({ error }, 'Failed to process weather request');
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
