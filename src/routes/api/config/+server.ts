import { createLogger } from '$lib/logger';
import { logAuditEvent } from '$lib/server/audit/auditService';
import { ConfigRepository } from '$lib/server/db/configRepository';
import {
	filterConfigsByUserAccess,
	canUserAccessConfigKey
} from '$lib/server/config/accessControl';
import { requireUserRole } from '$lib/server/auth/auth';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config');

export const GET: RequestHandler = async ({ url, locals }: RequestEvent) => {
	// SECURITY: Must be outside try/catch so redirect(302) propagates correctly
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	try {
		const category = url.searchParams.get('category');

		let configs;
		if (category) {
			configs = await ConfigRepository.getByCategory(
				category as Parameters<typeof ConfigRepository.getByCategory>[0]
			);
		} else {
			configs = await ConfigRepository.getAll();
		}

		// Filter configurations based on user access level
		const accessibleConfigs = filterConfigsByUserAccess(configs, locals.user);

		return json(accessibleConfigs);
	} catch (error) {
		logger.error({ error }, 'Failed to get configurations');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, url }: RequestEvent) => {
	// SECURITY: Must be outside try/catch so redirect(302) propagates correctly
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	try {
		const body = await request.json();
		const { key, value, description, category } = body;

		if (!key || value === undefined || !category) {
			return json(
				{ success: false, error: 'Missing required fields: key, value, and category are required' },
				{ status: 400 }
			);
		}

		// SECURITY: Check if user has access to this specific configuration key
		if (!canUserAccessConfigKey(locals.user, key)) {
			return json(
				{
					success: false,
					error: 'Forbidden: You do not have permission to modify this configuration'
				},
				{ status: 403 }
			);
		}

		await ConfigRepository.upsert(
			{
				key,
				value,
				description,
				category
			},
			locals.user!.sub // Safe after requireUserRole check
		);

		// Clear entire cache for configuration changes
		ConfigRepository.clearCache();

		await logAuditEvent({
			action: 'config.update',
			resourceType: 'config',
			resourceId: key,
			...(locals.user?.email ? { userEmail: locals.user.email } : {}),
			...(request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip')
				? { ipAddress: (request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'))! }
				: {}),
			details: { key, category }
		});

		logger.info({ key, userId: locals.user!.sub }, 'Configuration updated'); // Safe after requireUserRole check

		return json({ success: true });
	} catch (error) {
		logger.error({ error }, 'Failed to update configuration');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }: RequestEvent) => {
	// SECURITY: Must be outside try/catch so redirect(302) propagates correctly
	requireUserRole(url, locals.user, ['admin', 'superadmin']);

	try {
		const key = url.searchParams.get('key');

		if (!key) {
			return json({ success: false, error: 'Missing required parameter: key' }, { status: 400 });
		}

		// SECURITY: Check if user has access to this specific configuration key
		if (!canUserAccessConfigKey(locals.user, key)) {
			return json(
				{
					success: false,
					error: 'Forbidden: You do not have permission to delete this configuration'
				},
				{ status: 403 }
			);
		}

		await ConfigRepository.delete(key);

		logger.info({ key, userId: locals.user!.sub }, 'Configuration deleted'); // Safe after requireUserRole check

		return json({ success: true });
	} catch (error) {
		logger.error({ error }, 'Failed to delete configuration');
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
