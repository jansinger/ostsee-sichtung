import {
	PUBLIC_UPLOAD_ACCEPT,
	PUBLIC_UPLOAD_ALLOWED_TYPES,
	PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES,
	PUBLIC_UPLOAD_MAX_FILE_SIZE_MB
} from '$lib/constants/uploadDefaults';
import { createLogger } from '$lib/logger.server';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { ServerConfigService } from '$lib/services/configService';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config:upload');

// Public configuration for anonymous users — shared with the client fallbacks
// in $lib/stores/configStore so both sides can never drift apart.
const PUBLIC_UPLOAD_CONFIG = {
	maxFileSize: PUBLIC_UPLOAD_MAX_FILE_SIZE_MB,
	maxFileSizeBytes: PUBLIC_UPLOAD_MAX_FILE_SIZE_BYTES,
	allowedTypes: [...PUBLIC_UPLOAD_ALLOWED_TYPES],
	accept: PUBLIC_UPLOAD_ACCEPT
};

export const GET: RequestHandler = async ({ setHeaders, locals, request, getClientAddress }) => {
	const isAuthenticated = !!locals.user;
	const userIdentifier = locals.user?.sub || 'anonymous';
	const clientIp = getClientIp(getClientAddress, request) ?? 'unknown';

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
