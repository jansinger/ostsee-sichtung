import { createLogger } from '$lib/logger';
import { ServerConfigService, DEFAULT_VALUES } from '$lib/services/configService';
import type { PageServerLoad } from './$types';

const logger = createLogger('map-page');

// Default map configuration fallback
const defaultMapConfig = {
	center: DEFAULT_VALUES['display.defaultMapCenter'],
	zoom: DEFAULT_VALUES['display.defaultMapZoom'],
	tileProvider: DEFAULT_VALUES['integration.mapTileProvider'],
	showUnapprovedSightings: DEFAULT_VALUES['display.showUnapprovedOnMap']
};

export const load: PageServerLoad = async () => {
	try {
		// Load map configuration for server-side rendering
		const mapConfig = await ServerConfigService.getMapConfig();

		return {
			mapConfig: {
				center: mapConfig.center,
				zoom: mapConfig.zoom,
				tileProvider: mapConfig.tileProvider,
				showUnapprovedSightings: mapConfig.showUnapprovedSightings
			}
		};
	} catch (error) {
		// Log the error but return default config to allow page to render
		logger.warn({ error }, 'Failed to load map configuration from database, using defaults');
		return {
			mapConfig: defaultMapConfig
		};
	}
};