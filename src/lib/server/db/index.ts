import { env } from '$env/dynamic/private';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Check if database is configured - don't throw immediately to allow app startup
const DATABASE_URL = env.DATABASE_POSTGRES_URL;

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
			_initError = 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';
			return;
		}

		// postgres() returns immediately - actual connection is lazy
		const client = postgres(DATABASE_URL);
		_realDb = drizzle(client, { schema });
	} catch (error) {
		_initError = error instanceof Error ? error.message : String(error);
	}
}

// Create a proxy that lazily initializes the database connection on first access
// This allows TypeScript to treat db as non-null while still handling missing DB gracefully
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
	get(_target, prop) {
		// Initialize database on first access if not already done
		if (_realDb === null && _initError === null) {
			initializeDb();
		}

		// Check if initialization succeeded
		if (!_realDb) {
			const errorMsg = _initError
				? `Database connection failed: ${_initError}`
				: 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';
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
	// Trigger lazy initialization if not already done
	if (_realDb === null && _initError === null) {
		initializeDb();
	}
	return _realDb !== null;
}

// Helper function to get db with proper error if not available
export function getDb(): PostgresJsDatabase<typeof schema> {
	// Trigger lazy initialization if not already done
	if (_realDb === null && _initError === null) {
		initializeDb();
	}

	if (!_realDb) {
		const errorMsg = _initError
			? `Database connection failed: ${_initError}`
			: 'Database is not configured. Set DATABASE_POSTGRES_URL environment variable.';
		throw new Error(errorMsg);
	}
	return _realDb;
}
