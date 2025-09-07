import { createLogger } from '$lib/logger';

const logger = createLogger('services:weather');

/**
 * Weather data from Open-Meteo API
 */
export interface WeatherData {
	windSpeed: number; // km/h
	windDirection: number; // degrees
	windDirectionCardinal: string; // N, NO, O, SO, S, SW, W, NW
	temperature: number; // °C
	weatherCode: number; // WMO weather code
	seaState?: number; // Beaufort scale (calculated from wind speed)
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
 * Convert km/h to m/s
 */
export function kmhToMs(speedKmh: number): number {
	return Math.round((speedKmh / 3.6) * 10) / 10; // Round to 1 decimal
}

/**
 * Convert degrees to cardinal direction
 */
function degreesToCardinal(degrees: number): string {
	const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
	const index = Math.round(((degrees % 360) / 45)) % 8;
	return directions[index];
}

/**
 * Fetch historical weather data from Open-Meteo API
 */
export async function fetchHistoricalWeather(
	latitude: number,
	longitude: number,
	date: string, // YYYY-MM-DD
	hour?: number // 0-23
): Promise<WeatherData | null> {
	try {
		// Validate inputs
		if (!latitude || !longitude || !date) {
			logger.warn('Missing required parameters for weather fetch');
			return null;
		}

		// Format date for API
		const dateObj = new Date(date);
		if (isNaN(dateObj.getTime())) {
			logger.warn({ date }, 'Invalid date format');
			return null;
		}

		const startDate = date;
		const endDate = date;

		// Build API URL
		const params = new URLSearchParams({
			latitude: latitude.toString(),
			longitude: longitude.toString(),
			start_date: startDate,
			end_date: endDate,
			hourly: 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code',
			timezone: 'Europe/Berlin'
		});

		const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
		
		logger.info({ url, latitude, longitude, date }, 'Fetching weather data');

		// Fetch data
		const response = await fetch(url);
		
		if (!response.ok) {
			logger.error({ status: response.status }, 'Weather API request failed');
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

		// Extract weather data for the target hour
		const weatherData: WeatherData = {
			windSpeed: Math.round(hourly.wind_speed_10m[targetIndex] || 0),
			windDirection: Math.round(hourly.wind_direction_10m[targetIndex] || 0),
			windDirectionCardinal: degreesToCardinal(hourly.wind_direction_10m[targetIndex] || 0),
			temperature: Math.round(hourly.temperature_2m[targetIndex] || 0),
			weatherCode: hourly.weather_code[targetIndex] || 0,
			seaState: windSpeedToBeaufort(hourly.wind_speed_10m[targetIndex] || 0)
		};

		logger.info({ weatherData }, 'Weather data fetched successfully');
		return weatherData;

	} catch (error) {
		logger.error({ error }, 'Failed to fetch weather data');
		return null;
	}
}

/**
 * Map weather data to form fields
 */
export function mapWeatherToFormFields(weather: WeatherData) {
	return {
		windForce: weather.seaState?.toString() || '',
		windDirection: weather.windDirectionCardinal,
		// Optional: Map weather code to visibility/conditions if needed
		// visibility: mapWeatherCodeToVisibility(weather.weatherCode),
		// seaState: weather.seaState?.toString() || ''
	};
}