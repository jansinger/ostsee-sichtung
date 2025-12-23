import { env } from '$env/dynamic/private';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if database is configured - don't throw immediately to allow app startup
const DATABASE_URL = env.DATABASE_POSTGRES_URL;

// Error message constant for consistency
const DB_NOT_CONFIGURED_ERROR = 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';

// Track database connection state
let _realDb: PostgresJsDatabase<typeof schema> | null = null;
let _initError: string | null = null;

/**
 * Lazy initialization of database connection.
 * Since postgres.js creates connections lazily, this function completes synchronously.
 * The actual database connection will be established when the first query is executed.
 */
function initializeDb(): void {
	// If already initialized (success or failure), return immediately
	if (_realDb !== null || _initError !== null) {
		return;
	}

	try {
		if (!DATABASE_URL) {
			_initError = DB_NOT_CONFIGURED_ERROR;
			return;
		}

		// postgres() returns immediately - actual connection is lazy
		const client = postgres(DATABASE_URL);
		_realDb = drizzle(client, { schema });
	} catch (error) {
		_initError = error instanceof Error ? error.message : String(error);
	}
}

/**
 * Ensures database is initialized before use.
 * Called by all public APIs that need database access.
 */
function ensureInitialized(): void {
	if (_realDb === null && _initError === null) {
		initializeDb();
	}
}

// Create a proxy that lazily initializes the database connection on first access
// This allows TypeScript to treat db as non-null while still handling missing DB gracefully
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
	get(_target, prop) {
		// Initialize database on first access if not already done
		ensureInitialized();

		// Check if initialization succeeded
		if (!_realDb) {
			const errorMsg = _initError
				? `Database connection failed: ${_initError}`
				: DB_NOT_CONFIGURED_ERROR;
			throw new Error(errorMsg);
		}

		// Return the actual property/method from the initialized database
		const value = _realDb[prop as keyof typeof _realDb];
		if (typeof value === 'function') {
			return value.bind(_realDb);
		}
		return value;
	}
});

// Helper function to check if database is available (for graceful degradation)
export function isDatabaseAvailable(): boolean {
	ensureInitialized();
	return _realDb !== null;
}

// Helper function to get db with proper error if not available
export function getDb(): PostgresJsDatabase<typeof schema> {
	ensureInitialized();

	if (!_realDb) {
		const errorMsg = _initError
			? `Database connection failed: ${_initError}`
			: DB_NOT_CONFIGURED_ERROR;
		throw new Error(errorMsg);
	}
	return _realDb;
}
