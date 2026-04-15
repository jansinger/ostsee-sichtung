import { createLogger } from '$lib/logger.server';
import { isAdminUser } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { getStorageProvider } from '$lib/server/storage/factory';
import {
	RATE_LIMITS,
	enforceRateLimit,
	createRateLimitIdentifier,
	buildRateLimitHeaders
} from '$lib/server/middleware/rateLimit';
import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

const logger = createLogger('MediaAPI');

/**
 * Secure media serving endpoint
 *
 * Rules:
 * - Public access for approved sightings
 * - Admin-only access for unapproved sightings
 * - File not found for invalid/missing files
 */
export const GET: RequestHandler = async ({ params, url, request, locals }) => {
	const filePath = params.path;
	const clientIp =
		request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
	const isAuthenticated = !!locals.user;
	const userIdentifier = locals.user?.sub || 'anonymous';

	if (!filePath) {
		logger.warn(
			{
				action: 'media_access_invalid',
				clientIp,
				error: 'no_file_path'
			},
			'Media request without file path'
		);
		throw error(400, 'File path is required');
	}

	// Rate limiting based on authentication status
	const rateLimitConfig = isAuthenticated
		? RATE_LIMITS.MEDIA_ACCESS_AUTHENTICATED
		: RATE_LIMITS.MEDIA_ACCESS_ANONYMOUS;

	const rateLimitIdentifier = createRateLimitIdentifier(userIdentifier, clientIp, isAuthenticated);

	const rateLimitResult = enforceRateLimit(rateLimitIdentifier, rateLimitConfig, 'media_access');

	// Security audit log for all media access attempts
	logger.info(
		{
			action: 'media_access_attempt',
			filePath,
			clientIp,
			authenticated: isAuthenticated,
			user: userIdentifier,
			userAgent: request.headers.get('user-agent') || 'unknown'
		},
		'Media file access requested'
	);

	try {
		// Get the file record from database to check access permissions
		const fileRecord = await db
			.select({
				id: sightingFiles.id,
				sightingId: sightingFiles.sightingId,
				fileName: sightingFiles.fileName,
				filePath: sightingFiles.filePath,
				mimeType: sightingFiles.mimeType,
				size: sightingFiles.size,
				originalName: sightingFiles.originalName,
				// Get sighting approval status
				approvedAt: sightings.approvedAt,
				verified: sightings.verified
			})
			.from(sightingFiles)
			.innerJoin(sightings, eq(sightingFiles.sightingId, sightings.id))
			.where(eq(sightingFiles.filePath, filePath))
			.limit(1);

		if (fileRecord.length === 0) {
			logger.warn(
				{
					action: 'media_access_not_found',
					filePath,
					clientIp
				},
				'File not found in database'
			);
			throw error(404, 'File not found');
		}

		const file = fileRecord[0];
		if (!file) {
			logger.warn({ filePath }, 'File record not found');
			throw error(404, 'File not found');
		}

		const isApproved = !!file.approvedAt; // File is approved if approvedAt is not null

		// Check permissions
		if (!isApproved) {
			// File is not approved - check if user is admin
			const user = locals.user;
			const isAdmin = isAdminUser(user);

			if (!isAdmin) {
				logger.warn(
					{
						action: 'media_access_unauthorized',
						filePath,
						sightingId: file.sightingId,
						userRoles: user?.roles,
						hasUser: !!user,
						clientIp
					},
					'Unauthorized access to unapproved media file'
				);
				throw error(404, 'File not found'); // Don't reveal that file exists
			}

			logger.info(
				{
					filePath,
					sightingId: file.sightingId,
					userId: user?.sub
				},
				'Admin accessing unapproved media file'
			);
		}

		// Get file content from storage
		const storage = getStorageProvider();
		const content = await storage.getFileContent(filePath);

		if (!content) {
			logger.warn({ filePath }, 'File content not found in storage');
			throw error(404, 'File not found');
		}

		// Set appropriate headers including rate limiting
		const rateLimitHeaders = buildRateLimitHeaders(rateLimitConfig, rateLimitResult);
		const headers = new Headers({
			'Content-Type': file.mimeType,
			'Content-Length': content.length.toString(),
			'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
			'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
			ETag: `"${Buffer.from(filePath + file.size).toString('base64')}"`,
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'SAMEORIGIN',
			...rateLimitHeaders
		});

		// Handle conditional requests (ETags/If-Modified-Since)
		const clientETag = url.searchParams.get('etag') || '';
		const serverETag = headers.get('ETag') || '';

		if (clientETag && clientETag === serverETag) {
			return new Response(null, { status: 304, headers });
		}

		logger.debug(
			{
				filePath,
				sightingId: file.sightingId,
				size: content.length,
				mimeType: file.mimeType,
				isApproved
			},
			'Serving media file'
		);

		// Convert Buffer to Uint8Array for proper Response body
		const bodyContent = new Uint8Array(content);
		return new Response(bodyContent, { headers });
	} catch (err: unknown) {
		if (typeof err === 'object' && err && 'status' in err) {
			// If the error is a SvelteKit error, re-throw it
			logger.warn({ error: err, filePath }, 'SvelteKit error serving media file');
			throw err; // Re-throw SvelteKit errors
		}

		logger.error({ error: err, filePath }, 'Unexpected error serving media file');
		throw error(500, 'Internal server error');
	}
};
