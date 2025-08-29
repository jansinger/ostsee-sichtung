import { ServerConfigService } from '$lib/services/configService';
import { isAdminUser } from '$lib/server/auth/auth';
import type { PublicUser } from '$lib/types/User';
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

	// Security: Only send minimal user data to frontend
	// Remove sensitive role information
	const publicUser: PublicUser | null = locals.user ? {
		sub: locals.user.sub,
		email: locals.user.email,
		name: locals.user.name,
		picture: locals.user.picture,
		nickname: locals.user.nickname,
		// REMOVED: roles - this prevents frontend manipulation
	} : null;

	return {
		user: publicUser,
		// Server-side computed admin status for UI rendering
		showAdminMenu: isAdmin,
		maintenanceConfig
	};
}) satisfies LayoutServerLoad;
