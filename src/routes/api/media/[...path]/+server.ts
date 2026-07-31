import { createLogger } from '$lib/logger.server';
import { getClientIp } from '$lib/server/utils/getClientIp';
import { isAdminUser } from '$lib/server/auth/auth';
import { db } from '$lib/server/db';
import { sightingFiles, sightings } from '$lib/server/db/schema';
import { getStorageProvider } from '$lib/server/storage/factory';
import { parseRangeHeader } from '$lib/server/media/rangeHeader';
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
export const GET: RequestHandler = async ({ params, url, request, locals, getClientAddress }) => {
	const filePath = params.path;
	const clientIp = getClientIp(getClientAddress, request) ?? 'unknown';
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

	// Rate limiting based on authentication status. Range-Anfragen (Springen im
	// Video) bekommen ein eigenes, höheres Limit — sonst endet die Wiedergabe
	// mit 429, sobald ein Player mehrfach pro Sekunde einen neuen Bereich anfordert.
	const hasRangeHeader = !!request.headers.get('range');
	const rateLimitConfig = hasRangeHeader
		? isAuthenticated
			? RATE_LIMITS.MEDIA_RANGE_AUTHENTICATED
			: RATE_LIMITS.MEDIA_RANGE_ANONYMOUS
		: isAuthenticated
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

		// Auslieferung als Stream mit Range-Unterstützung.
		//
		// Die frühere Variante las die ganze Datei über getFileContent() in einen
		// Buffer. Bei Bildern von wenigen MB fiel das nicht auf; bei Videos von
		// 100 MB kostet jeder Abruf die volle Größe an Arbeitsspeicher, Springen
		// im Video ist ohne Range unmöglich, und Safari/iOS verweigert bei
		// fehlendem Accept-Ranges in der Regel die Wiedergabe.
		const storage = getStorageProvider();

		// EINE Größenquelle, und zwar der Storage — nicht die Datenbankspalte.
		// Beides zu mischen wäre ein echter Fehler: Die Bereichsrechnung liefe gegen
		// einen anderen Wert als der Content-Range-Header nennt, sobald DB-Größe und
		// Datei auseinanderlaufen, und ein Player bricht auf so einer Antwort ab.
		// Der Storage kennt die Bytes, die er gleich ausliefert.
		const metadata = await storage.getMetadata(filePath);
		if (!metadata) {
			logger.warn({ filePath }, 'File metadata not found in storage');
			throw error(404, 'File not found');
		}
		const totalSize = metadata.size;
		const range = parseRangeHeader(request.headers.get('range'), totalSize);

		const baseHeaders: Record<string, string> = {
			'Content-Type': file.mimeType,
			'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
			'Cache-Control': 'public, max-age=31536000, immutable',
			ETag: `"${Buffer.from(filePath + totalSize).toString('base64')}"`,
			'Accept-Ranges': 'bytes',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'SAMEORIGIN',
			...buildRateLimitHeaders(rateLimitConfig, rateLimitResult)
		};

		if (range.kind === 'unsatisfiable') {
			logger.warn({ filePath, totalSize }, 'Range not satisfiable');
			return new Response(null, {
				status: 416,
				headers: { ...baseHeaders, 'Content-Range': `bytes */${totalSize}` }
			});
		}

		// Bedingte Anfragen: Der Client schickt sein ETag als Query-Parameter
		// (bestehende Konvention dieser Route, nicht If-None-Match).
		const clientETag = url.searchParams.get('etag') || '';
		if (clientETag && clientETag === baseHeaders.ETag) {
			return new Response(null, { status: 304, headers: baseHeaders });
		}

		const requestedRange =
			range.kind === 'satisfiable' ? { start: range.start, end: range.end } : undefined;
		const result = await storage.getFileStream(filePath, requestedRange);

		if (!result) {
			logger.warn({ filePath }, 'File content not found in storage');
			throw error(404, 'File not found');
		}

		// Ob der Storage einen angeforderten Bereich tatsächlich eingehalten hat,
		// steht nicht schon fest, weil der Client ihn angefragt hat — ein CDN vor
		// Vercel Blob darf den Range-Header ignorieren und mit 200 und dem vollen
		// Body antworten (RFC 9110). Nur wenn beides zutrifft — Bereich erfüllbar
		// UND vom Storage geliefert — ist 206 mit Content-Range korrekt. Sonst
		// entstünde eine in sich widersprüchliche Antwort: Status 206 über einem
		// Body, der die ganze Datei enthält.
		if (range.kind === 'satisfiable' && result.rangeDelivered) {
			const length = range.end - range.start + 1;
			logger.debug(
				{ filePath, sightingId: file.sightingId, range, totalSize, isApproved },
				'Serving media file range'
			);
			return new Response(result.stream, {
				status: 206,
				headers: {
					...baseHeaders,
					'Content-Length': String(length),
					'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`
				}
			});
		}

		if (range.kind === 'satisfiable' && !result.rangeDelivered) {
			logger.warn(
				{ filePath, sightingId: file.sightingId, range, totalSize },
				'Storage did not honor range request, falling back to full response'
			);
		}

		logger.debug(
			{ filePath, sightingId: file.sightingId, size: totalSize, isApproved },
			'Serving media file'
		);
		return new Response(result.stream, {
			headers: { ...baseHeaders, 'Content-Length': String(totalSize) }
		});
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
