import { json } from '@sveltejs/kit';
import { fetchHistoricalWeather, mapWeatherToFormFields } from '$lib/services/weatherService';
import { createLogger } from '$lib/logger';
import type { RequestHandler } from './$types';

const logger = createLogger('api:weather:historical');

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

		// Fetch weather data
		const weatherData = await fetchHistoricalWeather(latitude, longitude, date, hour);

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