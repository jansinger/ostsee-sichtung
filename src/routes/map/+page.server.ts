import { ServerConfigService } from '$lib/services/configService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
};