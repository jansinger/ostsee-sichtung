import { createLogger } from '$lib/logger';
import { convertToStoredWeatherData, type StoredWeatherData, type WeatherData } from '$lib/services/weatherService';
import { degreesToCardinal, getWeatherDescription, calculateSeaState } from '$lib/constants/weather';

const logger = createLogger('service:weather-refresh');

interface OpenMeteoResponse {
	hourly?: {
		time: string[];
		temperature_2m: number[];
		wind_speed_10m: number[];
		wind_direction_10m: number[];
		weather_code: number[];
		visibility: number[];
		relative_humidity_2m?: number[];
		surface_pressure?: number[];
		precipitation?: number[];
		cloud_cover?: number[];
		wave_height?: number[];
		wave_period?: number[];
		sea_surface_temperature?: number[];
	};
	hourly_units?: {
		temperature_2m: string;
		wind_speed_10m: string;
		wind_direction_10m: string;
		weather_code: string;
		visibility: string;
	};
}


/**
 * Fetch weather data directly from Open-Meteo API
 */
export async function fetchWeatherData(
	latitude: number,
	longitude: number,
	date: string,
	time?: string
): Promise<StoredWeatherData> {
	const startDate = date;
	const endDate = date;

	// Prüfe ob das Datum heute oder in der Zukunft ist
	const today = new Date().toISOString().split('T')[0] || '';
	const isToday = date >= today;
	
	// Build Open-Meteo API URL - verwende Forecast API für heutige/zukünftige Daten
	const params = new URLSearchParams({
		latitude: latitude.toString(),
		longitude: longitude.toString(),
		timezone: 'Europe/Berlin'
	});
	
	let url: string;
	if (isToday) {
		// Aktuelle/zukünftige Daten: Forecast API
		params.append('hourly', [
			'temperature_2m',
			'wind_speed_10m', 
			'wind_direction_10m',
			'weather_code',
			'visibility',
			'relative_humidity_2m',
			'surface_pressure',
			'precipitation',
			'cloud_cover'
		].join(','));
		url = `https://api.open-meteo.com/v1/forecast?${params}`;
		logger.debug({ date, isToday, apiType: 'forecast' }, 'Using Forecast API for current/future date');
	} else {
		// Historische Daten: Archive API
		params.append('start_date', startDate);
		params.append('end_date', endDate);
		params.append('hourly', [
			'temperature_2m',
			'wind_speed_10m', 
			'wind_direction_10m',
			'weather_code',
			'visibility',
			'relative_humidity_2m',
			'surface_pressure',
			'precipitation',
			'cloud_cover'
		].join(','));
		url = `https://archive-api.open-meteo.com/v1/archive?${params}`;
		logger.debug({ date, isToday, apiType: 'archive' }, 'Using Archive API for historical date');
	}
	
	logger.debug({ url, latitude, longitude, date, time }, 'Fetching weather data from Open-Meteo');

	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
		}

		const data: OpenMeteoResponse = await response.json();

		if (!data.hourly?.time || data.hourly.time.length === 0) {
			logger.error({ latitude, longitude, date, time, apiResponse: data }, 'No weather data available from Open-Meteo API');
			throw new Error('No weather data available for the specified date and location');
		}
		
		logger.debug({ 
			availableTimes: data.hourly.time.slice(0, 5),
			totalTimeSlots: data.hourly.time.length,
			requestedDate: date,
			requestedTime: time 
		}, 'Available weather data slots from Open-Meteo');

		// Find the closest time match
		let bestIndex = 0;
		if (time) {
			const targetTime = `${date}T${time}:00`;
			let minDiff = Infinity;
			
			data.hourly.time.forEach((t, i) => {
				const diff = Math.abs(new Date(t).getTime() - new Date(targetTime).getTime());
				if (diff < minDiff) {
					minDiff = diff;
					bestIndex = i;
				}
			});
		}

		// Extract weather data for the best matching time
		const hourly = data.hourly;
		const observationTime = hourly.time[bestIndex];
		
		// Debug logging für den bestIndex
		logger.debug({ 
			bestIndex, 
			observationTime, 
			totalSlots: hourly.time.length,
			timeSlotAtIndex: hourly.time[bestIndex],
			temperatureAtIndex: hourly.temperature_2m[bestIndex]
		}, 'Selected weather data slot');
		
		if (!observationTime) {
			logger.error({ bestIndex, totalSlots: hourly.time.length }, 'Invalid bestIndex - no observation time found');
			throw new Error('Invalid time index selected for weather data');
		}
		
		const temperature = hourly.temperature_2m[bestIndex] ?? 0;
		const windSpeed = hourly.wind_speed_10m[bestIndex] ?? 0;
		const windDirection = hourly.wind_direction_10m[bestIndex] ?? 0;
		const weatherCode = hourly.weather_code[bestIndex] ?? 0;
		const visibility = hourly.visibility[bestIndex] ?? 10000;
		
		const weatherData: WeatherData = {
			time: observationTime,
			temperature,
			windSpeed,
			windDirection,
			windDirectionCardinal: degreesToCardinal(windDirection),
			weatherCode,
			weatherDescription: getWeatherDescription(weatherCode),
			visibility,
			seaState: calculateSeaState(windSpeed),
			...(hourly.surface_pressure?.[bestIndex] !== undefined && {
				pressure: hourly.surface_pressure[bestIndex]
			}),
			...(hourly.relative_humidity_2m?.[bestIndex] !== undefined && {
				humidity: hourly.relative_humidity_2m[bestIndex]
			})
		};

		// Build raw data object
		const rawData = {
			temperature_2m: hourly.temperature_2m[bestIndex] ?? 0,
			wind_speed_10m: hourly.wind_speed_10m[bestIndex] ?? 0,
			wind_direction_10m: hourly.wind_direction_10m[bestIndex] ?? 0,
			weather_code: hourly.weather_code[bestIndex] ?? 0,
			visibility: hourly.visibility[bestIndex] ?? 10000,
			...(hourly.relative_humidity_2m?.[bestIndex] !== undefined && {
				relative_humidity_2m: hourly.relative_humidity_2m[bestIndex]
			}),
			...(hourly.surface_pressure?.[bestIndex] !== undefined && {
				surface_pressure: hourly.surface_pressure[bestIndex]
			}),
			...(hourly.precipitation?.[bestIndex] !== undefined && {
				precipitation: hourly.precipitation[bestIndex]
			}),
			...(hourly.cloud_cover?.[bestIndex] !== undefined && {
				cloud_cover: hourly.cloud_cover[bestIndex]
			})
		};

		// Convert to StoredWeatherData format
		const dataType = isToday ? 'forecast' : 'historical';
		const storedWeatherData = convertToStoredWeatherData(
			weatherData,
			rawData,
			dataType,
			latitude,
			longitude
		);

		logger.info({ 
			latitude, 
			longitude, 
			date, 
			time, 
			observationTime,
			temperature: weatherData.temperature,
			weatherCode: weatherData.weatherCode 
		}, 'Weather data successfully fetched from Open-Meteo');

		return storedWeatherData;

	} catch (error) {
		logger.error({ error: error instanceof Error ? error.message : error, latitude, longitude, date, time }, 'Failed to fetch weather data');
		throw error;
	}
}