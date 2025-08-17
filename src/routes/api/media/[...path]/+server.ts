import { createLogger } from '$lib/logger';
import { getAuthUser } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { getStorageProvider } from '$lib/server/storage/factory';
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
export const GET: RequestHandler = async ({ params, cookies, url }) => {
	const filePath = params.path;

	if (!filePath) {
		logger.warn('Media request without file path');
		throw error(400, 'File path is required');
	}

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
			logger.warn({ filePath }, 'File not found in database');
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
			const user = getAuthUser(cookies);
			const isAdmin = user?.roles?.includes('admin') ?? false;

			if (!isAdmin) {
				logger.warn(
					{
						filePath,
						sightingId: file.sightingId,
						userRoles: user?.roles,
						hasUser: !!user
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

		// Set appropriate headers
		const headers = new Headers({
			'Content-Type': file.mimeType,
			'Content-Length': content.length.toString(),
			'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
			'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
			ETag: `"${Buffer.from(filePath + file.size).toString('base64')}"`,
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'SAMEORIGIN'
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
