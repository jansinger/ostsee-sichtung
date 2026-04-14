import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';
import { ServerConfigService } from '$lib/services/configService';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:maintenance-status');

export const GET: RequestHandler = async ({ locals, url }: RequestEvent) => {
	// SECURITY: Require admin role — must be outside try/catch so redirect(302) propagates
	requireUserRole(url, locals.user, ['admin']);

	try {
		const isEnabled = await ServerConfigService.isMaintenanceModeEnabled();
		const message = await ServerConfigService.getString('display.maintenanceMessage');

		logger.info({ isEnabled }, 'Maintenance mode status checked');

		return json({
			enabled: isEnabled,
			message: message,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error({ error }, 'Failed to get maintenance status');
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
