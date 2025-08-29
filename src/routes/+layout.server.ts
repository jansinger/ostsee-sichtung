import { ServerConfigService } from '$lib/services/configService';
import { isAdminUser } from '$lib/utils/auth';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const isAdmin = isAdminUser(locals.user);

	// Get maintenance mode status for admin banner
	let maintenanceConfig = null;
	if (isAdmin) {
		try {
			maintenanceConfig = {
				enabled: await ServerConfigService.isMaintenanceModeEnabled(),
				message: await ServerConfigService.getString('display.maintenanceMessage')
			};
		} catch (_error) {
			// Ignore error, maintenance config is optional
		}
	}

	return {
		user: locals.user || null,
		isAdmin,
		maintenanceConfig
	};
}) satisfies LayoutServerLoad;
