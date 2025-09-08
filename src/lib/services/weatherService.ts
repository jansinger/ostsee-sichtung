/**
 * Weather data from OpenWeatherMap API
 */
export interface WeatherData {
	time: string; // ISO date-time string
	windSpeed: number; // km/h
	windDirection: number; // degrees
	windDirectionCardinal: string; // N, NO, O, SO, S, SW, W, NW
	temperature: number; // °C
	weatherCode: number; // OpenWeatherMap weather code
	weatherDescription: string; // Weather description in German
	visibility: number; // meters
	seaState?: number; // Beaufort scale (calculated from wind speed)
	pressure?: number; // hPa
	humidity?: number; // %
}

/**
 * Form fields mapped from weather data
 */
export interface WeatherFormFields {
	windForce: string;
	windDirection: string;
	seaState: string;
	visibility: number;
}

// Sichtweiten-Grenzen als Konstanten
const VISIBILITY_CLEAR_KM = 20;
const VISIBILITY_MODERATE_KM = 4;
const VISIBILITY_POOR_KM = 1;

/**
 * Convert wind speed to Beaufort scale
 * https://de.wikipedia.org/wiki/Beaufortskala
 */
export function windSpeedToBeaufort(speedKmh: number): number {
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
 * Convert visibility meters to form value
 */
export function getVisibilityFormValue(visibilityMeters: number): number {
	const visibilityKm = visibilityMeters / 1000;
	if (visibilityKm >= VISIBILITY_CLEAR_KM) return 1; // Klar >20 km
	if (visibilityKm >= VISIBILITY_MODERATE_KM) return 2; // Mäßig 4-20 km
	if (visibilityKm >= VISIBILITY_POOR_KM) return 3; // Schlecht 1-4 km
	return 4; // Neblig
}

/**
 * Map weather data to form fields
 */
export function mapWeatherToFormFields(weather: WeatherData): WeatherFormFields {
	return {
		windForce: windSpeedToBeaufort(weather.windSpeed).toString(),
		windDirection: weather.windDirectionCardinal,
		seaState: weather.seaState?.toString() || '',
		visibility: getVisibilityFormValue(weather.visibility)
	};
}
