/**
 * Weather icon utilities
 * Maps WMO weather codes and wind directions to appropriate weather icons
 * Supports both CSS-based weather icons (wi- classes) and @iconify/svelte icons
 */

/**
 * Maps WMO weather codes to weather icon names
 * Uses the weather-icons collection which provides comprehensive weather icons
 */
export function getWeatherIconName(wmoCode: number | null): string {
	if (typeof wmoCode !== 'number') {
		return 'wi:na'; // fallback for no data
	}

	// Map WMO 4680 codes to weather-icons
	const weatherIconMap: Record<number, string> = {
		0: 'wi:day-sunny', // Clear sky
		1: 'wi:day-cloudy', // Mainly clear
		2: 'wi:day-cloudy', // Partly cloudy
		3: 'wi:cloudy', // Overcast
		45: 'wi:fog', // Fog
		48: 'wi:fog', // Depositing rime fog
		51: 'wi:sprinkle', // Drizzle: Light intensity
		53: 'wi:sprinkle', // Drizzle: Moderate intensity
		55: 'wi:sprinkle', // Drizzle: Dense intensity
		56: 'wi:sleet', // Freezing drizzle: Light intensity
		57: 'wi:sleet', // Freezing drizzle: Dense intensity
		61: 'wi:rain', // Rain: Slight intensity
		63: 'wi:rain', // Rain: Moderate intensity
		65: 'wi:rain', // Rain: Heavy intensity
		66: 'wi:rain-mix', // Freezing rain: Light intensity
		67: 'wi:rain-mix', // Freezing rain: Heavy intensity
		71: 'wi:snow', // Snow fall: Slight intensity
		73: 'wi:snow', // Snow fall: Moderate intensity
		75: 'wi:snow', // Snow fall: Heavy intensity
		77: 'wi:snow', // Snow grains
		80: 'wi:showers', // Rain showers: Slight intensity
		81: 'wi:showers', // Rain showers: Moderate intensity
		82: 'wi:showers', // Rain showers: Violent intensity
		85: 'wi:snow', // Snow showers: Slight intensity
		86: 'wi:snow', // Snow showers: Heavy intensity
		95: 'wi:thunderstorm', // Thunderstorm: Slight or moderate
		96: 'wi:thunderstorm', // Thunderstorm with slight hail
		99: 'wi:thunderstorm' // Thunderstorm with heavy hail
	};

	return weatherIconMap[wmoCode] || 'wi:na';
}

/**
 * Maps wind direction to appropriate wind icon
 * @param direction - Wind direction (N, NE, E, SE, S, SW, W, NW)
 * @returns Weather icon name for wind direction
 */
export function getWindDirectionIconName(direction: string | null): string {
	if (!direction) {
		return 'wi:wind';
	}

	const directionMap: Record<string, string> = {
		N: 'wi:wind from-n',
		NE: 'wi:wind from-ne',
		E: 'wi:wind from-e',
		SE: 'wi:wind from-se',
		S: 'wi:wind from-s',
		SW: 'wi:wind from-sw',
		W: 'wi:wind from-w',
		NW: 'wi:wind from-nw',
		NO: 'wi:wind from-ne', // German Nordost = NE
		SO: 'wi:wind from-se', // German Südost = SE
		O: 'wi:wind from-e' // German Ost = E
	};

	return directionMap[direction.toUpperCase()] || 'wi:wind';
}

/**
 * Gets wind direction class for transforming wind icon
 * @param direction - Wind direction
 * @returns CSS transform class for wind direction
 */
export function getWindDirectionClass(direction: string | null): string {
	if (!direction) {
		return '';
	}

	const directionClasses: Record<string, string> = {
		N: 'transform rotate-0',
		NE: 'transform rotate-45',
		E: 'transform rotate-90',
		SE: 'transform rotate-135',
		S: 'transform rotate-180',
		SW: 'transform rotate-225',
		W: 'transform rotate-270',
		NW: 'transform rotate-315',
		NO: 'transform rotate-45', // German Nordost = NE
		SO: 'transform rotate-135', // German Südost = SE
		O: 'transform rotate-90' // German Ost = E
	};

	return directionClasses[direction.toUpperCase()] || '';
}

/**
 * CSS-based weather icon class for WMO codes (currently used approach)
 * @param code - WMO weather code
 * @returns CSS class name for weather icon
 */
export function getWeatherIconClass(code: number | undefined): string {
	const supportedCodes = [
		0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
		95, 96, 99
	];
	if (typeof code === 'number' && supportedCodes.includes(code)) {
		return `wi-wmo4680-${code}`;
	}
	return 'wi-na'; // fallback icon class
}

/**
 * CSS-based wind direction icon class
 * @param windDirection - Wind direction in degrees
 * @returns CSS class name for wind direction icon
 */
export function getWindIconClass(windDirection: number): string {
	return `wi-wind from-${Math.round(windDirection)}-deg`;
}

/**
 * CSS-based wind direction icon class from cardinal direction
 * @param direction - Cardinal wind direction (N, NE, E, etc.)
 * @returns CSS class name for wind direction icon
 */
export function getWindDirectionIconClass(direction: string | undefined): string {
	if (!direction) {
		return 'wi-wind';
	}
	return `wi-wind wi-from-${String(direction).toLowerCase()}`;
}
