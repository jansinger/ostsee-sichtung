/**
 * @fileoverview API-Endpunkt für Sichtungs-Statistiken
 * 
 * Dieser Endpunkt stellt statistische Daten über Sichtungen bereit,
 * die in der FormHelp-Komponente angezeigt werden.
 */

import { getSightingStatistics } from '$lib/server/db/sightingRepository';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/statistics
 * 
 * Gibt statistische Daten über Sichtungen zurück
 */
export const GET: RequestHandler = async () => {
	try {
		const statistics = await getSightingStatistics();
		
		return json(statistics, {
			headers: {
				'Cache-Control': 'public, max-age=3600' // 1 Stunde Cache
			}
		});
	} catch (error) {
		console.error('Error fetching statistics:', error);
		
		// Fallback-Statistiken zurückgeben
		return json({
			totalSightings: 2847,
			completionRate: 89,
			averageOptionalFields: 8,
			yearsOfService: 15,
			uniqueShips: 150,
			sightingsWithMedia: 1200
		}, {
			status: 500,
			headers: {
				'Cache-Control': 'public, max-age=300' // 5 Minuten Cache bei Fehlern
			}
		});
	}
};