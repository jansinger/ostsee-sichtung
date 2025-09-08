/**
 * Weather-related constants and utility functions
 * Consolidated from various weather services to avoid duplication
 */

/**
 * Weather descriptions mapping from WMO codes
 * Based on Open-Meteo API weather codes
 * Complete mapping with all supported weather conditions
 */
export const WEATHER_DESCRIPTIONS: Record<number, string> = {
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

/**
 * Cardinal directions for wind direction display
 * Ordered by compass position (N=0°, NE=45°, etc.)
 */
export const CARDINAL_DIRECTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'] as const;

/**
 * Convert wind direction in degrees to cardinal direction
 * @param degrees Wind direction in degrees (0-360)
 * @returns Cardinal direction (N, NO, O, SO, S, SW, W, NW)
 */
export function degreesToCardinal(degrees: number): string {
	const index = Math.round(degrees / 45) % 8;
	return CARDINAL_DIRECTIONS[index] ?? 'N';
}

/**
 * Get weather description from WMO weather code
 * @param weatherCode WMO weather code from Open-Meteo API
 * @returns German weather description
 */
export function getWeatherDescription(weatherCode: number): string {
	return WEATHER_DESCRIPTIONS[weatherCode] || `Wetter Code ${weatherCode}`;
}

/**
 * Calculate sea state (Douglas scale approximation) from wind speed
 * @param windSpeedKmh Wind speed in km/h
 * @returns Sea state value (0-8)
 */
export function calculateSeaState(windSpeedKmh: number): number {
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