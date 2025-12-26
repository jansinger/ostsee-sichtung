import { createLogger } from '$lib/logger';
import { isDatabaseAvailable, testDatabaseConnection } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

const logger = createLogger('databaseCheck');

// Cache the database status to avoid checking on every request
let lastCheckTime = 0;
let lastCheckResult = false;
const CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Paths that should work without database access.
 * These pages have their own error handling or fallback values.
 */
const DB_OPTIONAL_PATHS = [
	'/health',
	'/api/health',
	'/db-unavailable',
	'/maintenance',
	'/_app',
	'/favicon',
	'/.well-known',
	// Map page has default config fallback
	'/map',
	// Main form page works without DB for initial display
	// (submission will fail gracefully with proper error)
	'/'
];

/**
 * Paths that REQUIRE database access.
 * If DB is unavailable, these will show a 503 error.
 */
const DB_REQUIRED_PATHS = [
	'/admin',
	'/api/upload',
	'/api/sightings',
	'/api/map/sightings',
	'/sichtungen'
];

/**
 * Check if the current path strictly requires database access.
 * Uses a whitelist approach: only specified paths require DB.
 */
function requiresDatabase(pathname: string): boolean {
	// First check if it's explicitly optional
	if (DB_OPTIONAL_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
		return false;
	}

	// Then check if it's explicitly required
	if (DB_REQUIRED_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
		return true;
	}

	// For API endpoints not in the optional list, require DB
	if (pathname.startsWith('/api/')) {
		return true;
	}

	// Default: don't require DB (let page handle errors gracefully)
	return false;
}

/**
 * Check database availability with caching
 */
async function checkDatabaseAvailability(): Promise<boolean> {
	const now = Date.now();

	// Use cached result if still valid
	if (now - lastCheckTime < CHECK_INTERVAL) {
		return lastCheckResult;
	}

	// First check if DB is configured
	if (!isDatabaseAvailable()) {
		lastCheckTime = now;
		lastCheckResult = false;
		return false;
	}

	// Then test actual connectivity
	try {
		const isConnected = await testDatabaseConnection();
		lastCheckTime = now;
		lastCheckResult = isConnected;
		return isConnected;
	} catch (err) {
		logger.error({ error: err }, 'Database connection test failed');
		lastCheckTime = now;
		lastCheckResult = false;
		return false;
	}
}

/**
 * Reset the database check cache (useful for testing or after config changes)
 */
export function resetDatabaseCheckCache(): void {
	lastCheckTime = 0;
	lastCheckResult = false;
}

/**
 * Database availability middleware
 *
 * Checks if the database is available and redirects to an error page if not.
 * This prevents confusing errors in the UI when the database is down.
 */
export const databaseCheck: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Skip check for paths that don't require database
	if (!requiresDatabase(pathname)) {
		return resolve(event);
	}

	// Check database availability
	const isAvailable = await checkDatabaseAvailability();

	if (!isAvailable) {
		logger.warn({ pathname }, 'Database unavailable, returning error');

		// For API requests, return JSON error
		if (pathname.startsWith('/api/')) {
			throw error(503, {
				message: 'Datenbank nicht verfügbar. Bitte versuchen Sie es später erneut.'
			});
		}

		// For page requests, redirect to error page
		// Use error() instead of redirect to show the error properly
		throw error(503, {
			message: 'Die Datenbank ist nicht erreichbar. Bitte versuchen Sie es später erneut.'
		});
	}

	return resolve(event);
};
