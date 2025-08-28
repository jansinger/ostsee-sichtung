import { createLogger } from '$lib/logger';
import { requireUserRole } from '$lib/server/auth/auth';
import { initializeDefaultConfigurations } from '$lib/server/services/configInitializer';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config:init');

export const POST: RequestHandler = async ({ locals, url }: RequestEvent) => {
	try {
		// SECURITY: Require superadmin role to initialize configurations (system-critical operation)
		requireUserRole(url, locals.user, ['superadmin']);

		await initializeDefaultConfigurations();

		logger.info({ userId: locals.user!.sub }, 'Default configurations initialized'); // Safe after requireUserRole check

		return json({ 
			success: true, 
			message: 'Default configurations have been initialized' 
		});

	} catch (error) {
		logger.error({ error }, 'Failed to initialize default configurations');
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};