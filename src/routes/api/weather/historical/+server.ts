import { json } from '@sveltejs/kit';
import { mapWeatherToFormFields, type WeatherData } from '$lib/services/weatherService';
import { createLogger } from '$lib/logger';
import { OPENWEATHERMAP_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const logger = createLogger('api:weather:historical');

/**
 * Convert degrees to cardinal direction
 */
function degreesToCardinal(degrees: number): string {
	const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
	const index = Math.round(((degrees % 360) / 45)) % 8;
	return directions[index];
}

/**
 * Convert wind speed to Beaufort scale
 */
function windSpeedToBeaufort(speedKmh: number): number {
	if (speedKmh < 2) return 0;
	if (speedKmh < 6) return 1;
	if (speedKmh < 12) return 2;
	if (speedKmh < 20) return 3;
	if (speedKmh < 29) return 4;
	if (speedKmh < 39) return 5;
	if (speedKmh < 50) return 6;
	if (speedKmh < 62) return 7;
	if (speedKmh < 75) return 8;
	if (speedKmh < 89) return 9;
	if (speedKmh < 103) return 10;
	if (speedKmh < 118) return 11;
	return 12;
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
	hour?: number
): Promise<WeatherData | null> {
	try {
		// Format date for API
		const dateObj = new Date(date);
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
			hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,visibility,surface_pressure,relative_humidity_2m',
			timezone: 'Europe/Berlin'
		});

		const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
		
		logger.info({ latitude, longitude, date, hour }, 'Fetching weather data from Open-Meteo');

		const response = await fetch(url);
		
		if (!response.ok) {
			logger.error({ status: response.status, statusText: response.statusText }, 'Open-Meteo API request failed');
			return null;
		}

		const data = await response.json();

		// Extract hourly data
		const hourly = data.hourly;
		if (!hourly || !hourly.time || hourly.time.length === 0) {
			logger.warn('No weather data available for the specified date');
			return null;
		}

		// Find the closest hour index
		let targetIndex = hour ?? 12; // Default to noon if no hour specified
		if (hour !== undefined && hour >= 0 && hour < hourly.time.length) {
			targetIndex = hour;
		}

		// Convert wind speed from km/h (Open-Meteo returns km/h)
		const windSpeedKmh = Math.round(hourly.wind_speed_10m[targetIndex] || 0);
		
		// Extract weather data
		const weatherData: WeatherData = {
			windSpeed: windSpeedKmh,
			windDirection: Math.round(hourly.wind_direction_10m[targetIndex] || 0),
			windDirectionCardinal: degreesToCardinal(hourly.wind_direction_10m[targetIndex] || 0),
			temperature: Math.round(hourly.temperature_2m[targetIndex] || 0),
			weatherCode: hourly.weather_code[targetIndex] || 0,
			weatherDescription: getWeatherDescription(hourly.weather_code[targetIndex] || 0),
			visibility: Math.round((hourly.visibility?.[targetIndex] || 10000)),
			seaState: calculateSeaState(windSpeedKmh),
			pressure: Math.round(hourly.surface_pressure?.[targetIndex] || 0),
			humidity: Math.round(hourly.relative_humidity_2m?.[targetIndex] || 0)
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
		const latitude = parseFloat(url.searchParams.get('lat') || '');
		const longitude = parseFloat(url.searchParams.get('lng') || '');
		const date = url.searchParams.get('date') || '';
		const time = url.searchParams.get('time') || '';

		// Validate parameters
		if (!latitude || !longitude || !date) {
			return json(
				{ error: 'Missing required parameters: lat, lng, date' },
				{ status: 400 }
			);
		}

		// Validate coordinates are in Baltic Sea region (approximate)
		if (latitude < 53 || latitude > 66 || longitude < 9 || longitude > 31) {
			logger.warn({ latitude, longitude }, 'Coordinates outside Baltic Sea region');
		}

		// Parse hour from time if provided
		let hour: number | undefined;
		if (time) {
			const [hourStr] = time.split(':');
			hour = parseInt(hourStr);
			if (isNaN(hour) || hour < 0 || hour > 23) {
				hour = undefined;
			}
		}

		// Fetch weather data from OpenWeatherMap
		const weatherData = await fetchOpenWeatherMapData(latitude, longitude, date, hour);

		if (!weatherData) {
			return json(
				{ error: 'Could not fetch weather data for the specified location and date' },
				{ status: 404 }
			);
		}

		// Map to form fields
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
				time: time || `${hour || 12}:00`
			}
		});

	} catch (error) {
		logger.error({ error }, 'Failed to process weather request');
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};