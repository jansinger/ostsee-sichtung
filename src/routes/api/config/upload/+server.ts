import { createLogger } from '$lib/logger';
import { ServerConfigService } from '$lib/services/configService';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const logger = createLogger('api:config:upload');

export const GET: RequestHandler = async ({ setHeaders }) => {
	try {
		// Get upload configuration
		const uploadConfig = await ServerConfigService.getUploadConfig();

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
				.map(type => 
					type.startsWith('image/') ? 'image/*' : 
					type.startsWith('video/') ? 'video/*' : type
				)
				.join(',')
		});

	} catch (error) {
		logger.error({ error }, 'Failed to get upload configuration');
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};