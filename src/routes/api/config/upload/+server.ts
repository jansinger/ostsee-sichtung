import { createLogger } from '$lib/logger.server';
import { ServerConfigService } from '$lib/services/configService';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config:upload');

// Public configuration for anonymous users
const PUBLIC_UPLOAD_CONFIG = {
	maxFileSize: 10, // 10 MB
	maxFileSizeBytes: 10 * 1024 * 1024,
	allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
	accept: 'image/jpeg,image/png,image/gif,image/webp'
};

export const GET: RequestHandler = async ({ setHeaders, locals, request }) => {
	const isAuthenticated = !!locals.user;
	const userIdentifier = locals.user?.sub || 'anonymous';
	const clientIp =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

	try {
		// Security: Return limited config for unauthenticated users
		if (!isAuthenticated) {
			logger.info(
				{
					action: 'config_upload_request',
					user: userIdentifier,
					authenticated: false,
					clientIp,
					configType: 'public'
				},
				'Public upload configuration requested'
			);

			// Set cache headers (5 minutes)
			setHeaders({
				'Cache-Control': 'public, max-age=300',
				'Content-Type': 'application/json'
			});

			return json(PUBLIC_UPLOAD_CONFIG);
		}

		// Get full upload configuration for authenticated users
		const uploadConfig = await ServerConfigService.getUploadConfig();

		logger.info(
			{
				action: 'config_upload_request',
				user: userIdentifier,
				authenticated: true,
				clientIp,
				configType: 'full'
			},
			'Full upload configuration requested'
		);

		// Set cache headers (5 minutes)
		setHeaders({
			'Cache-Control': 'public, max-age=300',
			'Content-Type': 'application/json'
		});

		return json({
			maxFileSize: uploadConfig.maxFileSize, // in MB
			maxFileSizeBytes: uploadConfig.maxFileSizeBytes, // in bytes
			allowedTypes: uploadConfig.allowedTypes,
			// Generate accept attribute for HTML inputs
			accept: uploadConfig.allowedTypes
				.map((type) =>
					type.startsWith('image/') ? 'image/*' : type.startsWith('video/') ? 'video/*' : type
				)
				.join(',')
		});
	} catch (error) {
		logger.error(
			{
				error,
				user: userIdentifier,
				clientIp
			},
			'Failed to get upload configuration'
		);
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
