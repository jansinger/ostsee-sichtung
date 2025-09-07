import { createLogger } from '$lib/logger';

const logger = createLogger('services:weather');

/**
 * Weather data from OpenWeatherMap API
 */
export interface WeatherData {
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
 * Map OpenWeatherMap weather codes to German descriptions
 */
function getWeatherDescription(weatherCode: number): string {
	const weatherMap: Record<number, string> = {
		200: 'Gewitter mit leichtem Regen',
		201: 'Gewitter mit Regen',
		202: 'Gewitter mit starkem Regen',
		210: 'Leichtes Gewitter',
		211: 'Gewitter',
		212: 'Starkes Gewitter',
		221: 'Heftiges Gewitter',
		230: 'Gewitter mit leichtem Nieselregen',
		231: 'Gewitter mit Nieselregen',
		232: 'Gewitter mit starkem Nieselregen',
		300: 'Leichter Nieselregen',
		301: 'Nieselregen',
		302: 'Starker Nieselregen',
		310: 'Leichter Nieselregen mit Regen',
		311: 'Nieselregen mit Regen',
		312: 'Starker Nieselregen mit Regen',
		313: 'Regenschauer mit Nieselregen',
		314: 'Starke Regenschauer mit Nieselregen',
		321: 'Schauerregen',
		500: 'Leichter Regen',
		501: 'Mäßiger Regen',
		502: 'Starker Regen',
		503: 'Sehr starker Regen',
		504: 'Extremer Regen',
		511: 'Eisregen',
		520: 'Leichte Regenschauer',
		521: 'Regenschauer',
		522: 'Starke Regenschauer',
		531: 'Heftiger Schauerregen',
		600: 'Leichter Schnee',
		601: 'Schnee',
		602: 'Starker Schnee',
		611: 'Schneebrei',
		612: 'Leichter Schneebrei',
		613: 'Schneebrei',
		615: 'Leichter Regen mit Schnee',
		616: 'Regen mit Schnee',
		620: 'Leichte Schneeschauer',
		621: 'Schneeschauer',
		622: 'Starke Schneeschauer',
		701: 'Nebel',
		711: 'Rauch',
		721: 'Dunst',
		731: 'Staubwirbel',
		741: 'Nebel',
		751: 'Sand',
		761: 'Staub',
		762: 'Vulkanasche',
		771: 'Böen',
		781: 'Tornado',
		800: 'Klar',
		801: 'Leicht bewölkt',
		802: 'Wolkig',
		803: 'Stark bewölkt',
		804: 'Bedeckt'
	};
	return weatherMap[weatherCode] || `Unbekannt (${weatherCode})`;
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
 * This function is now handled entirely by the server endpoint.
 * Client-side weather service should call /api/weather/historical instead.
 */
export async function fetchHistoricalWeather(
	latitude: number,
	longitude: number,
	date: string, // YYYY-MM-DD
	hour?: number // 0-23
): Promise<WeatherData | null> {
	logger.warn('fetchHistoricalWeather should not be called from client side - use server endpoint instead');
	return null;
}

/**
 * Map weather data to form fields
 */
export function mapWeatherToFormFields(weather: WeatherData) {
	return {
		windForce: windSpeedToBeaufort(weather.windSpeed).toString(),
		windDirection: weather.windDirectionCardinal,
		seaState: weather.seaState?.toString() || '',
		visibility: mapVisibilityToFormValue(weather.visibility)
	};
}

/**
 * Map visibility in meters to form dropdown value
 */
function mapVisibilityToFormValue(visibilityMeters: number): string {
	// Convert to km and map to common visibility categories
	const visibilityKm = visibilityMeters / 1000;
	
	if (visibilityKm >= 50) return '5'; // Sehr gut > 50 km
	if (visibilityKm >= 20) return '4'; // Gut 20-50 km  
	if (visibilityKm >= 10) return '3'; // Mäßig 10-20 km
	if (visibilityKm >= 5) return '2';  // Schlecht 5-10 km
	if (visibilityKm >= 1) return '1';  // Sehr schlecht 1-5 km
	return '0'; // Nebel < 1 km
}