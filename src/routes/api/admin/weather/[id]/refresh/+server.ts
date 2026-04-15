import { createLogger } from '$lib/logger.server';
import { requireUserRole } from '$lib/server/auth/auth';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { getSightingById, updateSightingWeatherData } from '$lib/server/db/sightingRepository';
import { fetchWeatherData } from '$lib/server/services/weatherRefreshService';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:admin:weather:refresh');

/**
 * Admin API endpoint to refresh weather data for a specific sighting
 * Requires authentication for admin access
 */
export const POST: RequestHandler = async ({ params, locals, url }: RequestEvent) => {
	requireUserRole(url, locals.user, ['admin', 'superadmin']);
	const sightingId = parseInt(params.id || '');

	if (isNaN(sightingId)) {
		logger.warn({ sightingId: params.id }, 'Invalid sighting ID provided');
		return json({ success: false, error: 'Invalid sighting ID' }, { status: 400 });
	}

	logger.info({ sightingId }, 'Admin weather refresh request received');

	try {
		// Load sighting from database
		const sighting = await getSightingById(sightingId);
		if (!sighting) {
			logger.warn({ sightingId }, 'Sighting not found');
			return json({ success: false, error: 'Sighting not found' }, { status: 404 });
		}

		// Validate required data for weather fetching
		if (!sighting.latitude || !sighting.longitude || !sighting.sightingDate) {
			logger.warn({ sightingId }, 'Sighting missing position or date data');
			return json(
				{ success: false, error: 'Sighting missing required data for weather fetch' },
				{ status: 400 }
			);
		}

		// Format date for weather API
		const sightingDateStr = sighting.sightingDate.toISOString().split('T')[0] || '';
		const sightingTimeStr =
			sighting.sightingDate.toISOString().split('T')[1]?.split(':').slice(0, 2).join(':') || '';

		logger.debug(
			{
				sightingId,
				latitude: sighting.latitude,
				longitude: sighting.longitude,
				date: sightingDateStr,
				time: sightingTimeStr
			},
			'Fetching weather data directly from Open-Meteo'
		);

		// Fetch weather data directly using our service
		const storedWeatherData = await fetchWeatherData(
			Number(sighting.latitude || 0),
			Number(sighting.longitude || 0),
			sightingDateStr,
			sightingTimeStr
		);

		logger.debug(
			{
				sightingId,
				weatherDataType: storedWeatherData.data_type,
				weatherProvider: storedWeatherData.provider
			},
			'Weather data converted, updating database'
		);

		// Update sighting with new weather data
		const updateSuccess = await updateSightingWeatherData(sightingId, storedWeatherData);

		if (!updateSuccess) {
			logger.error({ sightingId }, 'Failed to update sighting with weather data');
			return json(
				{ success: false, error: 'Failed to update sighting with weather data' },
				{ status: 500 }
			);
		}

		logger.info(
			{
				sightingId,
				weatherDataType: storedWeatherData.data_type,
				weatherFetchedAt: storedWeatherData.fetched_at
			},
			'Weather data successfully refreshed for sighting'
		);

		void logAuditEvent({
			action: 'sighting.weather.refresh',
			resourceType: 'sighting',
			resourceId: String(sightingId),
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			details: { provider: storedWeatherData.provider, dataType: storedWeatherData.data_type }
		});

		return json({
			success: true,
			weatherData: storedWeatherData,
			message: 'Weather data refreshed successfully'
		});
	} catch (error) {
		logger.error(
			{
				error: error instanceof Error ? error.message : error,
				stack: error instanceof Error ? error.stack : undefined,
				sightingId
			},
			'Error refreshing weather data'
		);
		return json(
			{
				success: false,
				error: 'Internal server error while refreshing weather data'
			},
			{ status: 500 }
		);
	}
};
